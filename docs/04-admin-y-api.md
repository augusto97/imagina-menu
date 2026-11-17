# 04 — Admin, constructor y API

## Stack del admin

El mismo de Imagina Turbo, para reutilizar componentes y estética:

- React 18 + TypeScript + Vite con `@kucrut/vite-for-wp`.
- shadcn/ui (Radix) con **Tailwind v4 y prefijo `imm`** (`imm:flex`). Sin preflight global: reset limitado a `.imm-root`; utilidades con `important` para ganarle al CSS del admin de WordPress (mismo `index.css` que Turbo, cambiando el prefijo).
- TanStack Query (datos del servidor), Zustand (estado del constructor, con historial para deshacer/rehacer), React Hook Form + Zod (formularios; Zod generado desde `schema/*.json`), Lucide (iconos), Inter (`@fontsource-variable/inter`).
- Nuevos para este plugin: `@dnd-kit/core` + `@dnd-kit/sortable` (árbol arrastrable con teclado accesible), `react-colorful` (selector de color, ~2 KB).
- Estética tipo Linear/Vercel: fondo zinc claro, tarjetas con borde fino, tipografía Inter, mucho aire, modo oscuro del admin opcional.
- Solo se carga en la pantalla del plugin (`admin.php?page=imagina-menu`); cero impacto en el resto del admin.

## Disposición general

```
┌───────────────┬─────────────────────────────────────────────┬──────────────────────┐
│ Navegación    │ Contenido de la pantalla                    │ Vista previa         │
│ lateral       │                                             │ ┌──────────────────┐ │
│               │                                             │ │  marco de celular│ │
│ ◉ Panel       │                                             │ │  (iframe real)   │ │
│ ☰ Menús       │                                             │ │                  │ │
│ ◧ Perfiles    │                                             │ └──────────────────┘ │
│ ▭ Barra inf.  │                                             │ iPhone · Android ·   │
│ 🎨 Diseño     │                                             │ tablet · claro/oscuro│
│ 📈 Analítica  │                                             │                      │
│ 🔌 Integrac.  │                                             │                      │
│ ⚙ Ajustes     │                                             │                      │
└───────────────┴─────────────────────────────────────────────┴──────────────────────┘
  Barra superior: perfil activo ▾ · estado «Cambios sin publicar» · Deshacer/Rehacer · [Publicar]
```

**Borrador y publicar**: los cambios se guardan como borrador automáticamente (cada 2 s de inactividad) y se ven en la vista previa; solo «Publicar» compila y llega a los visitantes. Así el usuario puede experimentar sin miedo.

## Pantallas

| Pantalla | Contenido |
|---|---|
| **Panel** | Estado: perfiles activos, última compilación, peso real del frontend (CSS/JS en KB, nodos DOM estimados) con semáforo contra el presupuesto, avisos (plugin de optimización sin exclusiones, `wp-content` no escribible, menú del tema sin ocultar, enlaces rotos). Resumen de analítica de 7 días. Accesos rápidos y asistente de primera configuración. |
| **Asistente inicial** | 4 pasos: 1) elegir preset (tarjetas con vista previa animada), 2) elegir qué menú usar (menú de WordPress existente, categorías de WooCommerce o empezar vacío), 3) cómo se abre (detecta el tema y sugiere el selector del botón), 4) barra inferior sí/no con ítems sugeridos. Publica y muestra la vista previa. |
| **Menús** | Lista de menús (tarjetas con número de ítems, perfiles que lo usan, última edición). Crear, duplicar, importar desde un menú de WordPress, eliminar. |
| **Constructor de menú** | Ver detalle abajo. |
| **Perfiles** | Lista ordenable (arrastrar = prioridad). Cada perfil: reglas (constructor de condiciones «Mostrar cuando… y/o…»), disparador, panel (menú, lado, modo de submenú, cabecera/pie), barra inferior (activar y elegir), barra superior, diseño (preset + sobrescrituras). Indicador «Este perfil se muestra en: …» con ejemplos de URLs. |
| **Barra inferior** | Editor visual: la barra se dibuja grande arriba; los ítems se arrastran; cada ítem tiene acción, icono, etiqueta, insignia; opciones de estilo/indicador/comportamiento con vista previa en vivo (incluido el ocultar-al-scroll simulado). |
| **Diseño** | Presets en tarjetas; editor de tokens agrupado (Colores, Tipografía, Espaciado, Forma, Movimiento, Insignias) con controles visuales (selector de color con contraste AA calculado, deslizadores de radio/duración, curvas de animación con previsualización). Claro/oscuro. CSS personalizado (editor con resaltado ligero). Exportar/importar diseño. |
| **Analítica** | Ítems más tocados, ítems sin clics, aperturas, uso de barra inferior y buscador, embudo, filtro por perfil y rango. Exportar CSV. Configuración: activar, destino (servidor/GA4/ambos), muestreo, retención. |
| **Integraciones** | Detectadas (WooCommerce, Imagina Turbo, Imagina Search, WPML/Polylang, Elementor, plugins de caché/optimización) con su estado y acciones: «Añadir exclusiones automáticamente», instrucciones paso a paso cuando no se puede. |
| **Ajustes** | Carga de assets (JS al interactuar, inline vs archivo), profundidad en el HTML (completo/híbrido/diferido), cookies de hidratación (carrito, nombre), prefetch, «solo móvil» por defecto y punto de corte, eliminar datos al desinstalar, exportar/importar todo, recompilar, kill switch, licencia (Imagina Updater), modo depuración. |

## Constructor de menú (pantalla estrella)

```
┌─ Ítems ─────────────────────────────┬─ Propiedades del ítem ─────────┬─ Vista previa ─┐
│ [+ Añadir ▾] [Buscar ítem…]          │ Celulares                      │  ┌──────────┐  │
│ ⋮⋮ 🔥 Ofertas            [Oferta]   │ ───────────────────────────    │  │ ← Menú   │  │
│ ⋮⋮ 📱 Celulares          ›  (12)    │ Etiqueta  [Celulares      ]    │  │ Celulares│  │
│    ⋮⋮ Ver todo (auto)               │ Enlace    [🔎 Categoría ▾ ]    │  │ Ver todo │  │
│    ⋮⋮ Samsung                       │ Icono     [📱 smartphone ▾]    │  │ Samsung  │  │
│    ⋮⋮ Apple                         │ Imagen    [Elegir…]            │  │ Apple    │  │
│ ⋮⋮ ⚡ Categorías Woo (dinámico) ↻   │ Insignia  [-30 %] [Oferta ▾]   │  │ …        │  │
│ ── Ayuda ──────── (encabezado)       │ Descripción [            ]    │  └──────────┘  │
│ ⋮⋮ Mis pedidos                      │ ☑ Ver todo  ☐ Destacado        │                │
└──────────────────────────────────────┴ Visibilidad ▸  Avanzado ▸ ─────┴────────────────┘
```

- **Árbol arrastrable** con niveles ilimitados (aviso por encima de 4), arrastrar para anidar, atajos de teclado (Tab/Shift+Tab para anidar/desanidar, Supr, Ctrl+D duplicar, Ctrl+Z/Ctrl+Shift+Z).
- **Añadir**: enlace personalizado, página/entrada/producto/categoría (buscador con autocompletado vía REST), encabezado, divisor, bloque, **fuente dinámica** (menú de WordPress, categorías de Woo, taxonomía, páginas hijas) con su configuración (profundidad, excluir, orden, límite, con imágenes) y botón «Convertir en ítems manuales» para personalizar.
- **Edición en lote**: seleccionar varios ítems → aplicar icono/insignia/visibilidad.
- **Sincronización con la vista previa**: seleccionar un ítem en el árbol navega la vista previa hasta su nivel y lo resalta; tocar un ítem en la vista previa lo selecciona en el árbol.
- **Validación en vivo**: textos genéricos, enlaces vacíos, 404 (se comprueba al publicar con peticiones HEAD en lote), imágenes faltantes, niveles demasiado profundos, contraste.
- **Importar** desde un menú de WordPress (una vez o sincronizado) o desde JSON.

## Vista previa

- **Iframe con el sitio real** (la portada u otra URL elegida) cargado con un parámetro firmado `?imm_preview={token}` que hace que el frontend use el **borrador** en lugar de la compilación publicada. Así se ve con el tema real, sus fuentes y colores: lo que se ve es exactamente lo que se publica.
- Marcos: iPhone (390 × 844), Android (412 × 915), tablet, y botón para escritorio.
- Cambios de tokens de diseño: se aplican al instante vía `postMessage` (sin recargar el iframe). Cambios de estructura: re-render del fragmento por REST (`/preview/render`, < 150 ms) e inyección en el iframe.
- Controles: abrir/cerrar panel, ir a un nivel, simular usuario conectado, simular carrito con N productos, modo claro/oscuro, `prefers-reduced-motion`.
- Botón «Ver en mi celular»: muestra un QR con la URL de vista previa firmada (válida 1 h).

## Endpoints REST

Namespace `imagina-menu/v1`. Todos requieren la capacidad `imm_manage` (asignada a administradores; se puede dar a editores de tienda) y nonce `wp_rest`, salvo `/hit`. Validación con el JSON Schema.

| Método | Ruta | Uso |
|---|---|---|
| GET | `/status` | Estado general, compilación, peso del frontend, avisos, integraciones detectadas |
| GET / POST | `/menus` | Listar · crear (desde cero, preset o importando un menú de WP) |
| GET / PUT / DELETE | `/menus/{id}` | Leer · guardar borrador (`{data, publish?: bool}`) · eliminar (409 si lo usa un perfil) |
| POST | `/menus/{id}/duplicate` | Duplicar |
| GET | `/menus/{id}/revisions` · POST `/menus/{id}/revisions/{rev}/restore` | Historial · restaurar |
| GET / POST | `/profiles` | Listar (ordenados) · crear |
| GET / PUT / DELETE | `/profiles/{id}` | Leer · guardar · eliminar (no se puede eliminar el perfil por defecto) |
| PUT | `/profiles/order` | Nuevo orden de prioridad |
| GET / PUT | `/settings` | Ajustes globales |
| GET / PUT | `/design` | Tokens globales y presets |
| GET | `/presets` | Presets disponibles con su JSON |
| POST | `/compile` | Compilar y publicar ahora (devuelve tamaños, avisos y si purgó la caché) |
| POST | `/preview/token` | Token firmado para la vista previa (iframe/QR) |
| POST | `/preview/render` | Renderizar el fragmento de un borrador (para la vista previa) |
| GET | `/search/objects` | Autocompletado de páginas, entradas, productos y términos para enlazar |
| GET | `/sources/preview` | Vista de cómo se expandirá una fuente dinámica |
| POST | `/links/check` | Comprobar enlaces del menú (HEAD en lote, en pasos de ~8 s) |
| GET | `/integrations` · POST `/integrations/{id}/apply` | Estado de integraciones · aplicar exclusiones automáticas |
| GET | `/stats` | Analítica (`period`, `profile`) |
| POST | `/hit` | **Público**, para la analítica: `{p, i, e}` (perfil, ítem, evento). Sin cookies, con límite de tasa por IP (hash) y validación estricta de ids contra la config compilada. Respuesta 204. |
| GET / POST | `/export` · `/import` | Exportar/importar todo (menús, perfiles, diseño, ajustes) en JSON; la importación valida y muestra un resumen antes de aplicar |

## Capacidades y seguridad

- Capacidad propia `imm_manage` (se añade a `administrator` al activar).
- Sanitización: textos con `sanitize_text_field`, URLs con `esc_url_raw` (+ lista de protocolos: http, https, mailto, tel, whatsapp), HTML de bloques con `wp_kses` y lista propia, SVG subidos con un sanitizador (lista blanca de elementos/atributos, sin `script`, sin `on*`, sin `href` externos).
- CSS personalizado: se bloquean `</style`, `@import` externos y `expression(`.
- La vista previa con borrador solo se activa con un token firmado (HMAC con salts de WP), de vida corta y ligado al usuario.
- El endpoint `/hit` nunca escribe en cada petición: acumula en la caché de objetos (o en un archivo de cola) y vuelca en lote cada 5 minutos vía Action Scheduler.

## Datos

| Dónde | Qué |
|---|---|
| CPT `imm_menu` | Menús (JSON en `post_content`), con revisiones |
| CPT `imm_profile` | Perfiles (JSON en `post_content`), `menu_order` = prioridad |
| `imm_settings` (no autoload) | Ajustes globales, diseño global |
| `imm_compile_state` (no autoload) | Hash, fecha, tamaños, avisos de la última compilación, bandera de «sucio» |
| `imm_db_version` | Versión del esquema para migraciones |
| Tabla `imm_stats` | Agregados diarios de analítica (solo si se activa) |
| `wp-content/imagina-menu/` | `config.php`, `fragments/`, `.lock` |
| `wp-content/uploads/imagina-menu/` | CSS compilado, JSON de niveles diferidos |
