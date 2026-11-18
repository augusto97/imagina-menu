# 03 — Rendimiento, SEO y accesibilidad

## Presupuesto (se verifica en CI)

| Métrica | Límite | Cómo se mide |
|---|---|---|
| CSS total del frontend | ≤ 6 KB gzip (todos los módulos activos) | `size-limit` en el build |
| CSS crítico inline | ≤ 1,7 KB gzip (v0.1: 1,43 KB) | `npm run size` |
| JS inicial (`core.js`) | ≤ 4 KB gzip | `size-limit` |
| Cada módulo JS bajo demanda | ≤ 3 KB gzip | `size-limit` |
| Sprite de iconos inline | ≤ 3 KB sin comprimir con 12 iconos | test del compilador |
| Nodos DOM añadidos (menú de 60 ítems, 3 niveles, modo deslizante) | ≤ 400 | Playwright cuenta nodos |
| PHP propio por request (caché caliente) | < 1 ms, < 300 KB | benchmark `tests/Performance` |
| Consultas SQL propias en el frontend | 0 | test con `$wpdb->num_queries` / Query Monitor |
| Peticiones HTTP propias en la carga | 2 (CSS + `core.js`); 1 con «JS al interactuar» | Lighthouse CI |
| CLS aportado | 0 | Lighthouse CI + Playwright (`layout-shift` observer) |
| INP al abrir el panel | < 100 ms con CPU 4× | Playwright + `PerformanceObserver` de `event` |
| Lighthouse móvil en un tema base (Twenty Twenty-Five) | diferencia ≤ 1 punto contra el mismo sitio sin el plugin | Lighthouse CI, 5 corridas, mediana |

Si algún cambio rompe el presupuesto, se rediseña. Subir un límite requiere acuerdo explícito.

## Técnicas de alto rendimiento

### 1. Abrir sin JavaScript: Popover API

`<nav popover>` + `<button popovertarget>` abre y cierra el panel de forma nativa, en la capa superior (top layer), con cierre por toque fuera y Esc incluidos. Soporte: Chrome/Edge 114+, Safari 17+, Firefox 125+ (Baseline 2024). Consecuencias:

- El usuario puede abrir el menú **antes** de que cargue el JS → INP excelente aunque el hilo principal esté ocupado con otros scripts del sitio.
- Plugins que «retrasan el JS hasta la interacción» (WP Rocket, LiteSpeed, Perfmatters, FlyingPress) no rompen el menú.
- Animación de entrada/salida en CSS puro con `@starting-style` y `transition-behavior: allow-discrete` (Chrome 117+, Safari 17.5+, Firefox 129+); sin soporte, aparece sin animación (degradación aceptable).
- Respaldo: si `HTMLElement.prototype.togglePopover` no existe, `core.js` gestiona la apertura con clases.

Con JS cargado se añade: `inert` en el contenido principal, foco atrapado, bloqueo de scroll, gestos, drill-down.

### 2. Drill-down sin JS pesado

- Todos los niveles están en el HTML como listas anidadas. El JS solo cambia atributos (`data-level`, `hidden`, `aria-expanded`) y el CSS anima con `transform` y `opacity` (propiedades del compositor: sin layout ni paint en cada frame).
- Sin JS, los submenús funcionan como acordeón con `<details>` (modo de respaldo), así nada queda inaccesible.
- `will-change: transform` solo durante la animación (se quita al terminar para no reservar memoria de GPU).
- `contain: layout paint` en cada nivel y `content-visibility: auto` en los niveles ocultos → el navegador no calcula el layout de submenús que nadie ha abierto.

### 3. Tamaño del DOM bajo control

Los menús de WooCommerce con cientos de categorías inflan el DOM (Lighthouse avisa por encima de ~1 400 nodos y penaliza estilo/layout). Estrategia configurable por perfil («Profundidad en el HTML»):

| Modo | Qué va en el HTML | SEO | DOM |
|---|---|---|---|
| **Completo** (por defecto si ≤ 150 ítems) | Todos los niveles | Todos los enlaces rastreables | Mayor |
| **Híbrido** (por defecto si > 150 ítems) | Niveles 1–2 como HTML; niveles ≥ 3 dentro de `<template>` (no cuenta como DOM activo hasta que se clona) | Niveles 1–2 rastreables; los profundos se alcanzan desde las páginas de categoría | Bajo |
| ~~Diferido~~ | Descartado en la v0.2: el híbrido ya deja el DOM mínimo sin una petición extra al abrir el panel (que costaría INP y no funcionaría sin red) | — | — |

Implementado (v0.2): ajuste `html_depth` = `auto` (híbrido con más de 150 ítems), `full` o `hybrid`. En el modo híbrido cada submenú del 3.er nivel en adelante deja en el HTML su enlace «Ver todo» (sin JS sigue llevando a la categoría) y el resto va en `<template class="imm-tpl">`, que el JS clona al abrirlo. En dos columnas/pestañas, el contenido de los paneles que no son el primero va en `<template>`. Medido: 372 → 194 nodos con 40 categorías.

HTML mínimo por ítem: un `<li>` + `<a>` + (si tiene hijos) `<button>` y el sprite referenciado con `<svg><use href="#imm-i-x"/></svg>`. Nada de `div` envolventes innecesarios.

### 4. CSS

- Escrito a mano, **sin `@layer`** (una regla sin capa del tema, como `button{…}`, ganaría a cualquier regla en capa) y con custom properties para todo el diseño → un solo archivo sirve a cualquier diseño; cambiar colores no genera CSS nuevo, solo tokens.
- El compilador incluye **solo** el CSS de módulos y modos que usa algún perfil.
- **CSS crítico inline** (botón flotante, barra inferior, reserva de espacio, ocultar menú del tema): evita CLS y FOUC sin bloquear.
- El resto se carga con `<link rel="stylesheet">` normal al final del `head`. Como el panel está cerrado al cargar, ese CSS no afecta el primer pintado; es pequeño (≤ 6 KB) y se sirve con caché larga (nombre con hash, `Cache-Control: immutable` vía el servidor).
- Sin fuentes web: hereda la tipografía del tema.
- Sin `backdrop-filter` por defecto (costoso en gama baja); disponible como opción.
- Media queries para «solo móvil». No se detecta el dispositivo en PHP.

### 5. JavaScript

- ES modules nativos vía Script Modules API (diferidos, sin bloquear). Sin jQuery, sin frameworks, sin polyfills (objetivo: navegadores con Popover API; los demás reciben el respaldo).
- **Un listener delegado por tipo de evento** en `document` (`click`, `keydown`, `pointerdown`), no uno por ítem.
- Listeners de `touch*`/`pointer*`/`scroll` con `{ passive: true }`; el ocultar-al-scroll lee `scrollY` en `requestAnimationFrame`, sin `getBoundingClientRect` en bucle.
- Trabajo largo partido con `scheduler.yield()` (con respaldo a `setTimeout`) para no generar tareas > 50 ms.
- Módulos con `import()` solo cuando se necesitan; precarga en `pointerdown` (unos 100 ms antes del `click`).
- «JS al interactuar»: opción para no descargar nada hasta el primer gesto del usuario.
- El código se escribe en TypeScript y se compila a ES2020 con esbuild; `size-limit` en CI.

### 6. Imágenes del menú

- Ninguna imagen del panel se descarga si el panel no se abre: `loading="lazy"` no basta en todos los navegadores para elementos ocultos en la top layer, así que se usa `data-src` → `src` al mostrar el nivel/categoría.
- Tamaños propios pequeños (`imm-thumb` 96 px, `imm-thumb-2x` 192 px) con `srcset`, `width`/`height` explícitos (sin saltos), `decoding="async"`.
- WebP/AVIF si el sitio los genera (EWWW, ShortPixel, LiteSpeed): se respeta la URL que devuelve WordPress.
- Iconos como sprite SVG inline (sin peticiones) con solo los usados.

### 7. Caché de página y edge

- El HTML del menú es idéntico para todos los visitantes anónimos de una misma URL → 100 % cacheable por LiteSpeed, WP Rocket, Cloudflare.
- Lo dinámico se hidrata en el cliente (cookies propias legibles por JS: contador del carrito y, opcional, primer nombre). Sin `admin-ajax`, sin «cart fragments» de WooCommerce.
- Ninguna cookie se crea para visitantes anónimos sin carrito (no rompe la caché por variación de cookies).
- Al recompilar se purga la caché de página (integración con Imagina Turbo, LSCache, WP Rocket); el admin lo muestra.

### 8. Navegación instantánea

- Prefetch del destino en `pointerdown`/`touchstart` del enlace (≈ 100–300 ms ganados) mediante Speculation Rules dinámicas (`<script type="speculationrules">` con `eagerness: "immediate"` para esa URL), con respaldo a `<link rel="prefetch">`.
- Si Imagina Turbo gestiona Speculation Rules, el menú **no** añade las suyas (evita duplicados) y solo marca sus enlaces como candidatos.
- Compatible con bfcache: sin `unload`, sin `Cache-Control: no-store` propio; al volver con el botón atrás, el panel se cierra en `pageshow` si quedó abierto.

## SEO

1. **Enlaces reales en el HTML del servidor** (`<a href>` absolutos/relativos válidos). Google renderiza JS, pero no hace clic ni dispara eventos: los menús construidos al tocar un botón no transmiten enlazado interno. Aquí todo está en el HTML inicial.
2. **Contenido oculto**: con indexación mobile-first, Google trata los enlaces de un menú plegado o en un panel como enlaces normales. No se usa `display:none` vía JS en la carga, solo el estado nativo del popover.
3. **Un solo `<nav>` principal** con `aria-label`. Si el tema ya imprime su menú, el nuestro no lo duplica en escritorio: el admin permite «solo móvil» (oculto por CSS en escritorio) y avisa de enlaces duplicados excesivos.
4. **`aria-current="page"`** marcado en el servidor: ayuda a accesibilidad y no cuesta nada.
5. **Textos ancla descriptivos**: el constructor avisa de ítems con textos genéricos («Ver más», «Click aquí») y de enlaces rotos (404) o con redirección al compilar.
6. **`rel` por ítem** (`nofollow`, `sponsored`) para enlaces de afiliados o externos.
7. **Datos estructurados**: `SiteNavigationElement` opcional (apagado por defecto: Google no lo usa para resultados enriquecidos; se ofrece solo por quien lo pida). Los breadcrumbs del drill-down no se marcan como `BreadcrumbList` (ya lo hace el plugin SEO en la página).
8. **Sin impacto en Core Web Vitals** (son señal de ranking): ver presupuesto.
9. **Profundidad**: en modo híbrido/diferido, los niveles profundos no están en el HTML; el admin lo explica y recomienda que las páginas de categoría enlacen a sus subcategorías.

## Accesibilidad (WCAG 2.2 AA)

- Objetivos táctiles ≥ 48 px de alto por defecto (mínimo configurable 44 px; WCAG 2.5.8 exige ≥ 24 px).
- Foco visible propio (`:focus-visible` con anillo de 2 px y contraste ≥ 3:1).
- Foco atrapado y devuelto; `inert` al resto; anuncio del nivel con `aria-live="polite"`.
- `prefers-reduced-motion`: sin deslizamientos, solo fundidos cortos; sin pulso en insignias.
- `prefers-contrast: more`: bordes más marcados.
- Texto ampliable hasta 200 % sin cortar (unidades `rem`, alturas mínimas, no fijas).
- Pruebas con axe-core en Playwright y revisión manual con VoiceOver (iOS) y TalkBack (Android) antes de cada versión mayor.

## Compatibilidad con plugins de optimización

| Plugin | Qué hacer |
|---|---|
| LiteSpeed Cache (JS diferido / Guest Mode / UCSS) | Excluir `imm-` del CSS no usado (UCSS no ve el CSS del panel cerrado) y del «combinar CSS». El JS puede retrasarse. El admin muestra los pasos exactos. |
| WP Rocket (Delay JS, Remove Unused CSS) | Igual: excluir `imagina-menu` de Remove Unused CSS (safelist `.imm-`); Delay JS no rompe la apertura. |
| Perfmatters | Excluir de «Remove Unused CSS»; el script manager no debe desactivar el plugin en móviles. |
| Autoptimize | No agregar el CSS compilado (ya está minificado y es pequeño). |
| Cloudflare (Rocket Loader) | Funciona; recomendado apagar Rocket Loader en general. |
| Imagina Turbo | Integración nativa (ver `docs/02`, M12). |

Los módulos `track.js` (analítica), `prefetch.js` (precarga), `desktop.js` (cascada y «pasar el mouse» en escritorio, solo en pantallas anchas), `gestures.js` (deslizar para cerrar o volver, con la primera apertura del panel), `hours.js` (horario de WhatsApp, al abrir el panel) y `recent.js` (búsquedas recientes, al abrir el buscador) se cargan bajo demanda junto a `core.js`: si un optimizador combina o mueve `core.js`, debe excluirlos también (o excluir `imagina-menu` completo). `preview.js` solo se carga en la vista previa del admin.

Desde v0.4 el build hace una segunda pasada con terser sobre la salida de esbuild (~3 % menos gzip): `core.js` queda en 3,99 KB con la integración de Imagina Search, el arranque reutilizable para la vista previa en vivo y el cargador del módulo de escritorio. Con Imagina Search activo, su plantilla añade ~0,14 ms por visita (su código; el del menú sigue en ~0,04 ms).

El plugin **detecta** estos plugins y, cuando es posible, añade las exclusiones por sus filtros públicos (p. ej. `rocket_rucss_safelist`, `litespeed_optm_ucss_whitelist`… **verificar los nombres vigentes en su documentación antes de implementar**); si no, muestra instrucciones.

## Cómo se mide

- **Bench PHP** (`tests/Performance`): 1 000 requests simulados de render con un perfil de 60 ítems → tiempo y memoria propios.
- **Lighthouse CI** en GitHub Actions contra un WordPress de prueba (wp-env) con tres escenarios: tema base sin plugin, tema base con plugin (todos los módulos), WooCommerce con 300 categorías en modo híbrido.
- **Playwright** con emulación de Moto G Power y iPhone 13, CPU 4×, red 4G lenta: abrir/cerrar, drill-down, barra inferior, CLS, INP, conteo de nodos, axe.
- **Sitios reales**: 3 sitios de clientes (WooCommerce grande, corporativo con Elementor, blog) con RUM de Imagina Turbo antes/después.

### v0.5

- `core.js` baja a 3,69 KB gzip (de 3,99) al pasar a módulos bajo demanda los gestos (0,31 KB), las búsquedas recientes (0,51 KB) y el horario de WhatsApp (0,38 KB): ningún sitio paga por lo que no usa.
- La barra superior móvil va en el CSS crítico solo si está activa (el crítico con ella: 1,87 KB gzip, tope 2,1 KB) y reserva su alto: CLS = 0, medido.
- Los banners no cuestan nada en la carga: `loading="lazy"` dentro del panel cerrado (se descargan al abrirlo).
- Las campañas no hacen consultas por visita: marcas de tiempo precalculadas y un evento de WP-Cron en cada límite.
- Análisis estático y CI: PHPStan nivel 6 sin errores, ESLint, presupuesto y build en GitHub Actions en cada push.

