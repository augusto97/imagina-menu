# 01 — Arquitectura

## Visión general

```
                 ADMIN (React)                                  FRONTEND (visitante)
┌──────────────────────────────────────────┐        ┌──────────────────────────────────────────┐
│ Constructor ─► REST imagina-menu/v1      │        │ plugins_loaded: include config.php       │
│ Vista previa (iframe de celular)         │        │   (OPcache, 0 SQL) ─► ¿hay perfil? no ─► │
└──────────────┬───────────────────────────┘        │   salir sin registrar hooks              │
               │ guardar                              │ template_redirect: evaluar reglas       │
               ▼                                      │ wp_head: CSS crítico inline (<1,5 KB)   │
┌──────────────────────────────────────────┐        │          + <link> CSS compilado          │
│ COMPILADOR                               │        │ wp_footer: fragmentos HTML cacheados     │
│  1. valida (JSON Schema)                 │──────► │          + aria-current por str_replace  │
│  2. resuelve fuentes (WP menu, Woo...)   │ genera │          + <script type="module"> core   │
│  3. por idioma: renderiza fragmentos     │        │ JS: core (~3 KB) + módulos bajo demanda  │
│  4. CSS con tokens y solo módulos usados │        └──────────────────────────────────────────┘
│  5. config.php (var_export) atómico      │
└──────────────────────────────────────────┘
       ▲ invalidación: guardar menú, wp_update_nav_menu, editar product_cat,
         cambiar enlaces permanentes, cambiar tema, cambiar idioma activo…
```

La idea central, heredada de Imagina Turbo: **todo el trabajo caro se hace al guardar, no al visitar**. El frontend solo incluye un archivo PHP compilado, decide qué perfil aplica y vuelca HTML ya renderizado.

## Estructura de carpetas

```
imagina-menu/
├── imagina-menu.php            # Archivo principal (compatible con Imagina Updater, sin namespace)
├── uninstall.php               # Borra CPT, opciones, tabla y archivos compilados (si el usuario lo pidió)
├── composer.json               # PSR-4 ImaginaMenu\ → src/
├── icons/                      # icons.json (Lucide + marcas) y tags.json: los usa el compilador y el selector del admin
├── src/
│   ├── Plugin.php · Container.php
│   ├── Core/                   # ModuleInterface, ModuleRegistry, Capabilities, Migrations, Logger
│   ├── Model/                  # Profile, Menu, Item, Block, BottomBar, Design, Rule (value objects)
│   ├── Repository/             # ProfileRepository, MenuRepository (CPT), SettingsRepository
│   ├── Sources/                # ManualSource, WpMenuSource, WooCategorySource, TaxonomySource, PagesSource
│   ├── Compiler/               # Compiler, ConfigWriter, CssBuilder, FragmentBuilder, Invalidator, Lock
│   ├── Frontend/               # Bootstrap, RuleMatcher, Renderer, AssetLoader, Hydration
│   ├── Modules/                # Drawer, BottomBar, Search, TopBar, Analytics, Promo…
│   ├── Integrations/           # WooCommerce, ImaginaTurbo, ImaginaSearch, Wpml, Polylang,
│   │                           # Elementor, Gutenberg, CachePlugins (LSCache, WP Rocket, Perfmatters)
│   ├── Rest/                   # Controladores de imagina-menu/v1
│   ├── Admin/                  # AdminPage, AdminAssets, PreviewController
│   └── Licensing/ImaginaUpdater.php
├── templates/                  # Parciales PHP del render (sobrescribibles desde el tema: /imagina-menu/)
├── frontend/                   # Fuente del frontend
│   ├── src/core.ts             # Apertura, drill-down, foco, gestos, delegación de eventos
│   ├── src/modules/*.ts        # two-pane, tabs, search, hide-on-scroll, cart, analytics, prefetch
│   └── css/                    # base.css, drawer.css, bottom-bar.css, modes/*.css, presets/*.css
├── assets/dist/                # Salida del build del frontend (con hash en el nombre)
├── admin/                      # App React (Vite + @kucrut/vite-for-wp)
├── blocks/toggle/              # Bloque de Gutenberg «Botón de menú» (block.json, sin JS en el front)
├── icons/                      # Subconjunto de Lucide en SVG + manifiesto (se incrustan solo los usados)
├── tests/                      # PHPUnit, Playwright (e2e móvil), Lighthouse CI, bench del render
└── docs/
```

## Modelo de datos

Tres entidades. Todas se guardan como JSON validado por `Model\Normalizer` (lista blanca guiada por `Model\Defaults`) con `schema_version` para migraciones.

### 1. Menú (`imm_menu`, custom post type no público)

El contenido: un árbol de ítems y, opcionalmente, bloques. Reutilizable por varios perfiles. Se guarda en `post_content` (JSON) para tener **revisiones** gratis (deshacer y comparar versiones) y estado borrador/publicado.

```jsonc
{
  "schema_version": 1,
  "title": "Menú principal tienda",
  "items": [
    {
      "id": "i_7f3a",                 // estable, sirve para analítica y traducciones
      "type": "link",                  // link | source | heading | divider | block
      "label": "Celulares",
      "url": "/categoria/celulares/",  // o "object": {"kind":"term","taxonomy":"product_cat","id":12}
      "icon": {"set": "lucide", "name": "smartphone"},   // o {"set":"svg","id":123} o {"set":"emoji","value":"📱"}
      "image": {"id": 456},            // miniatura para modos dos columnas / rejilla
      "badge": {"text": "-30 %", "style": "sale"},       // new | sale | hot | custom (colores)
      "description": "Las mejores marcas",
      "highlight": false,              // ítem destacado (color de acento)
      "view_all": true,                // añadir «Ver todo Celulares» al abrir su submenú
      "target": "_self",
      "rel": "",                       // nofollow / sponsored opcionales
      "visibility": {"auth": "any", "roles": [], "schedule": null},
      "children": [ /* mismo formato */ ]
    },
    {
      "id": "i_9b10",
      "type": "source",                // nodo dinámico: se expande al compilar
      "source": {"kind": "woo_categories", "parent": 0, "depth": 3, "hide_empty": true,
                  "exclude": [15], "orderby": "menu_order", "with_images": true, "limit": 40}
    }
  ]
}
```

Fuentes (`Sources/`): **Manual**, **Menú de WordPress** (sincronizado: si cambias el menú en Apariencia → Menús, se recompila), **Categorías de WooCommerce**, **Cualquier taxonomía**, **Páginas hijas**. Las fuentes se expanden al compilar; en el frontend no hay `get_terms()` ni `wp_get_nav_menu_items()`.

### 2. Perfil de navegación (`imm_profile`, CPT no público)

Qué se muestra, cómo y dónde. Un sitio tiene un perfil por defecto y puede tener perfiles con reglas (por ejemplo, uno para la tienda y otro para el blog). **Gana el primer perfil cuyas reglas coinciden** (orden arrastrable).

```jsonc
{
  "schema_version": 1,
  "title": "Tienda",
  "priority": 10,
  "rules": {"match": "all", "conditions": [{"type": "woocommerce", "value": "any_shop_page"}]},
  "devices": {"max_width": 1024},                // en escritorio no aparece (o sí, configurable)
  "trigger": {"mode": "theme_selector", "selector": ".menu-toggle", "hide_theme_menu": true,
              "fallback_floating": true},
  "drawer": {"enabled": true, "menu_id": 42, "side": "left", "width": "86vw", "max_width": 420,
             "submenu_mode": "slide",           // slide | accordion | two_pane | tabs | grid
             "header": ["account", "search"], "footer": ["service_links", "whatsapp", "language"],
             "blocks": ["promo_banner_1"], "remember_level": true, "close_position": "top"},
  "bottom_bar": {"enabled": true, "items": [
      {"action": "link", "label": "Inicio", "icon": "house", "url": "/"},
      {"action": "open_drawer", "label": "Categorías", "icon": "layout-grid", "drawer_mode": "two_pane"},
      {"action": "search", "label": "Buscar", "icon": "search", "prominent": true},
      {"action": "cart", "label": "Carrito", "icon": "shopping-cart", "badge": "cart_count"},
      {"action": "account", "label": "Cuenta", "icon": "user"}],
    "style": "labels", "hide_on_scroll": true, "indicator": "pill"},
  "top_bar": {"enabled": false},
  "design": {"preset": "marketplace", "overrides": {"--imm-accent": "#ff5a00"}}
}
```

### 3. Ajustes globales (opción `imm_settings`, `autoload = no`)

Módulos activados, tokens de diseño globales, integraciones, analítica, modo de carga de assets, selector del menú del tema a ocultar, licencia. Solo se lee en el admin y al compilar.

### Por qué CPT y no opciones

- Revisiones nativas = historial y deshacer sin código extra.
- WPML/Polylang pueden asociar menús por idioma si se quiere un menú distinto por idioma.
- Exportar/importar con las herramientas de WordPress además del JSON propio.
- Nada de esto se lee en el frontend: el CPT es solo almacenamiento del admin.

## Compilador

`Compiler::compile()` se ejecuta al guardar en el admin y cuando el `Invalidator` marca la compilación como sucia.

1. **Validar** cada perfil y menú contra el JSON Schema. Si falla, no se publica nada y el admin muestra el error.
2. **Resolver fuentes**: expandir nodos `source` (menús de WP, categorías de Woo con su miniatura) a ítems concretos. Resolver `object` → URL con `get_permalink()` / `get_term_link()`.
3. **Por cada idioma activo** (WPML/Polylang; si no hay, solo uno): cambiar el idioma, traducir textos registrados y renderizar los fragmentos HTML con `templates/` → `fragments/{perfil}-{idioma}-{parte}.html`.
4. **CSS**: construir un archivo con los tokens del diseño (custom properties), el CSS base y **solo** el CSS de los módulos y modos usados por algún perfil. Minificar. `imm-{hash}.css`. Generar también el CSS crítico (botón, barra inferior, reserva de espacio) para insertar inline.
5. **Iconos**: recolectar los iconos usados y crear un sprite SVG mínimo que se incrusta una vez en el HTML (`<svg hidden><symbol id="imm-i-house">…`). Con 10 iconos son ~2–3 KB sin comprimir.
6. **Config**: escribir `config.php` con `var_export` (escritura atómica: archivo temporal + `rename`), que contiene: perfiles ordenados con sus reglas ya reducidas a comprobaciones simples, rutas de fragmentos y CSS, lista de módulos JS que necesita cada perfil, versión y hash.
7. Avisar a la caché de página (integración): purga total si cambió el HTML del menú (está en todas las páginas). Con Imagina Turbo se usa su API de purga; con LSCache/WP Rocket, sus funciones públicas.

**Invalidación** (`Invalidator`): guardar menú/perfil/ajustes; `wp_update_nav_menu`; `created/edited/deleted_product_cat` (y taxonomías usadas por fuentes); `save_post` de páginas enlazadas por objeto (si cambia el slug); `permalink_structure`; `switch_theme`; activación de WPML/Polylang. Se marca una bandera "sucia" y se recompila **en segundo plano** (Action Scheduler si está disponible; si no, `shutdown` del request de admin que lo provocó) con un bloqueo para no compilar dos veces. Mientras tanto se sirve la compilación anterior (nunca se queda el sitio sin menú).

**Respaldo**: si `wp-content` no es escribible, los fragmentos y el CSS van a opciones `autoload = no` y el CSS se imprime inline. El admin lo avisa.

## Render en el frontend

| Momento | Qué hace | Costo |
|---|---|---|
| `plugins_loaded` | `include` de `config.php` (OPcache). Si no hay perfiles activos o el request no es de frontend (REST, AJAX, cron, feed, admin) → no registra nada más. | ~0,05 ms |
| `template_redirect` | `RuleMatcher` elige el perfil. Las condiciones están precompiladas (tipo de página, post type, término, usuario conectado/rol, ancho de dispositivo vía CSS no vía PHP, URL con patrón). | ~0,05 ms |
| `wp_head` (prioridad 1) | CSS crítico inline y `<link rel="stylesheet">` del CSS compilado con `fetchpriority="low"`. Si hay que ocultar el menú del tema: regla CSS con su selector dentro de la media query móvil. | — |
| `wp_body_open` | Botón flotante si el perfil lo usa (si no, el botón lo pone el tema/bloque/shortcode). | — |
| `wp_footer` | Volcar fragmentos (sprite, drawer, barra inferior, overlay de búsqueda). Marcar la página actual: `str_replace('href="'.$url.'"', 'href="'.$url.'" aria-current="page"')` sobre el fragmento. Registrar el script module `core`. | ~0,2 ms |

**Marcar el ítem activo** con `str_replace` permite que el fragmento siga siendo estático y que la caché de página (que ya es por URL) lo sirva correcto. Para los padres del activo (para abrir el panel en el nivel correcto) el JS busca `[aria-current]` y sube por el árbol.

**Datos dinámicos sin romper la caché de página** (`Frontend/Hydration`):
- **Contador del carrito**: el plugin escribe una cookie propia legible por JS (`imm_cc`, solo el número) en `woocommerce_set_cart_cookies`. El JS la lee: **cero peticiones**. Escucha también los eventos de añadir al carrito (WooCommerce clásico, bloques y los de Imagina Turbo) para actualizar sin recargar.
- **Saludo del usuario**: el HTML trae «Hola, inicia sesión». Para usuarios conectados (que normalmente no reciben caché de página) se renderiza el nombre en el servidor; como respaldo, una cookie opcional `imm_un` con el primer nombre (desactivable por privacidad).
- **Favoritos**: contador desde la cookie/localStorage del plugin de favoritos si se integra (YITH, TI Wishlist): en fases posteriores.

## Carga de JavaScript

- **Script Modules API** de WordPress (`wp_register_script_module`): se emite `<script type="module">`, que es diferido por naturaleza, sin bloquear el render.
- `core.js` (~3 KB gzip): delegación de eventos en `document` (un solo listener por tipo), control del popover, drill-down, foco, gestos (pointer events pasivos), bloqueo del scroll.
- Módulos con `import()` **solo si el perfil los usa y cuando se necesitan**:
  - `two-pane.js`, `tabs.js` — al abrir el panel en ese modo.
  - `search.js` — al tocar buscar (antes, en `pointerdown`, para ganar ~100 ms).
  - `hide-on-scroll.js` — en `requestIdleCallback` si la barra lo usa.
  - `cart.js` — solo si hay cookie de carrito o se dispara un evento de carrito.
  - `analytics.js` — al primer clic en un ítem (usa `navigator.sendBeacon`).
  - `prefetch.js` — solo si Imagina Turbo no está gestionando Speculation Rules.
- **Opción "Cargar JS al interactuar"**: no se descarga `core.js` hasta el primer `pointerdown`/`keydown`/`scroll`. Como la apertura funciona con Popover API sin JS, el usuario no nota nada y el JS en la carga inicial es 0 KB.

## Almacenamiento

- CPT: `imm_menu`, `imm_profile` (no públicos, `show_in_rest = false`; el admin usa endpoints propios).
- Opciones: `imm_settings` (no autoload), `imm_db_version`, `imm_compile_state` (no autoload).
- Tabla (solo si se activa la analítica): `{$wpdb->prefix}imm_stats` (`day`, `profile_id`, `item_id`, `event`, `count`) con agregados diarios; retención 180 días.
- Archivos:
  - `wp-content/uploads/imagina-menu/` → `imm-{hash}.css`, imágenes optimizadas de categorías si se generan tamaños propios. Público.
  - `wp-content/imagina-menu/` → `config.php`, `fragments/*.html`, `.lock`. Protegido con `index.php` vacío y reglas de denegación (`.htaccess` / aviso para nginx).
- Tamaños de imagen propios: `imm-thumb` (96 × 96, recorte) y `imm-thumb-2x` (192 × 192) para iconos de categoría. Se sirven con `srcset` y en WebP/AVIF si el sitio los genera.

## Extensibilidad

- **Plantillas sobrescribibles**: copiar `templates/drawer/item.php` a `tema/imagina-menu/drawer/item.php`.
- **Filtros**: `imm/profile/match`, `imm/menu/items` (al compilar), `imm/item/classes`, `imm/bottom_bar/items`, `imm/css/tokens`, `imm/compile/after`.
- **Acciones**: `imm/compiled`, `imm/before_drawer`, `imm/after_drawer`.
- **API JS mínima** (`window.immMenu`): `open(profile?, path?)`, `close()`, `goTo(itemId)`, eventos `imm:open`, `imm:close`, `imm:navigate` en `document`.
- **Atributos de datos**: cualquier elemento con `data-imm-open` abre el panel; `data-imm-open="two_pane:i_7f3a"` lo abre en una categoría concreta.

## Licencia (Imagina Updater)

Igual que en Imagina Turbo: la extensión de licencias inyecta un bloque de protección en el archivo principal justo después de la comprobación de `ABSPATH`. Por eso:

- `imagina-menu.php` no declara `strict_types` ni `namespace`, conserva `if ( ! defined( 'ABSPATH' ) ) { exit; }` seguido de salto de línea y es el único `.php` de la raíz con `Plugin Name:`. `uninstall.php` no debe contener esa cadena.
- Slug = `Text Domain` = `imagina-menu`. `Licensing\ImaginaUpdater` solo lee el estado de la licencia.
- Si la licencia no es válida, el plugin no arranca: el frontend deja de mostrar el menú y el tema vuelve a su menú propio (no se rompe nada porque el CSS que oculta el menú del tema tampoco se imprime).
- Nota heredada de Turbo: el código inyectado llama a `get_transient()` en cada request; sin caché de objetos es una consulta. Medirlo en el benchmark y, si hace falta, pedir el cambio en imagina-updater.

## Desinstalación y modo seguro

- Desactivar: no borra nada. Desinstalar: borra todo **solo** si en Ajustes → Avanzado está marcado «Borrar datos al desinstalar».
- Kill switch: constante `IMM_DISABLE` en `wp-config.php` o `?imm_off=1` para administradores (vista sin el menú, útil para comparar).
- Si `config.php` falta o está corrupto: el frontend no imprime nada (el tema sigue con su menú) y el admin muestra el aviso con el botón «Recompilar».
