# 05 — Roadmap y pruebas

## Principio

Primero el núcleo que más se usa y más se nota (panel deslizante rápido y accesible), con el presupuesto de rendimiento vigilado en CI desde el primer día. Después la barra inferior, luego WooCommerce y los modos visuales (dos columnas), y al final la analítica y el pulido.

Antes de la fase 1: elegir 3 sitios de clientes representativos (WooCommerce con muchas categorías, corporativo con Elementor, blog) y medir su Lighthouse móvil y su RUM (Imagina Turbo) con su menú actual. Es la línea base.

## Fases

### Fase 0 — Fundaciones
- Archivo principal compatible con Imagina Updater, Composer (PSR-4), contenedor, `ModuleInterface`, registro de módulos, migraciones.
- `schema/*.json` + validador PHP + generación de Zod para el admin.
- CPT `imm_menu` e `imm_profile`, repositorios, ajustes.
- `Compiler` (sin fuentes dinámicas todavía): `config.php` atómico, CSS con tokens, fragmentos, bloqueo, invalidación básica.
- `Frontend\Bootstrap` y `RuleMatcher` (perfil por defecto únicamente).
- Toolchain del frontend (TypeScript + esbuild, `size-limit`) y del admin (Vite + shadcn/ui con prefijo `imm`, mismo `index.css` base que Turbo).
- Esqueleto del admin: layout, navegación, Panel, Ajustes, `/status`, `/settings`, `/compile`.
- CI en GitHub Actions: PHPUnit, PHPStan, PHPCS, `tsc`, `size-limit`.
- **Aceptación**: con el plugin activo y sin perfiles, 0 hooks de frontend registrados y < 0,1 ms; compilar dos veces en paralelo no corrompe `config.php`; si se borra `config.php` el sitio no da error y el admin ofrece recompilar.

### Fase 1 — Panel deslizante (MVP usable)
- M1 Disparador: botón flotante, shortcode, función PHP, bloque de Gutenberg, vincular al botón del tema por selector, ocultar menú del tema.
- M2 Panel: lados izquierda/derecha, overlay, botón cerrar (3 posiciones), Popover API + respaldo, foco, `inert`, bloqueo de scroll, cierre por gesto.
- M3.1 Modo deslizante con barra de regreso, título, «Ver todo» y gestos; M3.2 acordeón (con `<details>` como respaldo sin JS).
- M4 parcial: etiqueta, enlace, icono (Lucide), insignia, «Ver todo», destino.
- M5 parcial: bloques Cuenta, Buscador (formulario simple a `/?s=`), Sección, Enlaces de servicio.
- Fuente «Menú de WordPress» (sincronizada).
- `aria-current` en el servidor, abrir en el nivel activo, RTL, `prefers-reduced-motion`.
- Admin: Menús (lista) + constructor básico (árbol arrastrable y propiedades), Diseño (tokens básicos y 2 presets: Marketplace y Minimal), vista previa en iframe con borrador.
- **Aceptación**: presupuesto de `docs/03` cumplido (Lighthouse CI en verde); funciona sin JS; pasa axe sin errores; probado en Safari iOS 17+, Chrome Android, Firefox Android; probado con Astra, GeneratePress, Kadence, Blocksy, Hello Elementor, WoodMart y Flatsome.

### Fase 2 — Constructor completo y diseño
- Constructor: añadir objetos con autocompletado, edición en lote, deshacer/rehacer, atajos, validación en vivo, revisiones.
- M4 completo (imagen, descripción, destacado, visibilidad por sesión/rol/fechas, `rel`, clases).
- M5: WhatsApp/llamar, redes, botón CTA.
- M9: editor de tokens completo, claro/oscuro, CSS personalizado, exportar/importar diseño, más presets.
- Vista previa: marcos de dispositivo, simulaciones (conectado, carrito), QR.
- Asistente inicial.
- **Aceptación**: un usuario no técnico configura un menú completo desde cero en < 10 min (prueba con 2 personas del equipo); la vista previa coincide píxel a píxel con el frontend publicado.

### Fase 3 — Barra inferior
- M6 completo: ítems, acciones (enlace, panel, buscar, carrito, cuenta, WhatsApp, llamar, arriba, compartir), estilos, indicador, botón central, insignias, ocultar al scroll, isla flotante, área segura, reserva de espacio, ocultar con teclado y en checkout.
- Hidratación: cookie de contador del carrito y eventos de WooCommerce clásico, bloques e Imagina Turbo.
- M5: bloque Banner/Promo con fechas y cuenta regresiva bajo demanda; bloque HTML/shortcode.
- Admin: editor visual de la barra.
- **Aceptación**: CLS = 0 con la barra; contador correcto sin peticiones extra (verificado en la pestaña de red); INP sin cambios con hide-on-scroll activo.

### Fase 4 — WooCommerce y modo dos columnas
- Fuentes «Categorías de WooCommerce» (con imágenes, profundidad, exclusiones, límite) y «Taxonomía».
- M3.3 Dos columnas (rail + rejilla de imágenes con carga al seleccionar).
- M5: rejilla de categorías.
- M7 Buscador overlay (recientes, populares, sugerencias por Store API) + integración con Imagina Search.
- Profundidad en el HTML: completo / híbrido (`<template>`) / diferido (JSON estático).
- Preset «App de compras».
- **Aceptación**: tienda con 300 categorías en modo híbrido: ≤ 600 nodos DOM añadidos y Lighthouse sin aviso de DOM excesivo atribuible al menú; las imágenes de categorías no se descargan hasta abrir.

### Fase 5 — Perfiles, reglas, i18n y modos extra
- Perfiles múltiples con reglas (M11) y prioridad.
- WPML / Polylang / TranslatePress: compilación por idioma, registro de textos, selector de idioma; selector de moneda.
- M3.4 Pestañas y M3.5 Rejilla de iconos.
- M8 Barra superior móvil (opcional).
- Presets restantes (Moda, Corporativo, Restaurante, Oscuro premium).
- **Aceptación**: un sitio bilingüe muestra cada idioma sin consultas extra; tres perfiles con reglas se resuelven en < 0,05 ms.

### Fase 6 — Analítica e integraciones
- M10 analítica (servidor y/o GA4), pantalla de Analítica, endpoint `/hit` con cola y límite de tasa.
- Integraciones: Imagina Turbo (purga, speculation, eventos), Elementor (widget), exclusiones automáticas en LSCache/WP Rocket/Perfmatters, prefetch propio cuando no hay Turbo.
- Bloque «Vistos recientemente».
- **Aceptación**: `/hit` soporta 50 peticiones/s en el servidor de pruebas sin escribir en la base de datos por petición; con Turbo activo no hay reglas de speculation duplicadas.

### Fase 7 — Pulido y lanzamiento
- Auditoría de accesibilidad manual (VoiceOver, TalkBack), revisión de rendimiento en los 3 sitios de la línea base, documentación de usuario, capturas, `readme.txt`, empaquetado para Imagina Updater, plan de migración desde WP Mobile Menu / Responsive Menu (importador de sus menús y colores si es viable).
- Favoritos (YITH, TI Wishlist) en la barra inferior.
- **Aceptación**: los 3 sitios reales no empeoran ninguna métrica de Core Web Vitals p75 (RUM, 14 días) y mejoran el uso del menú (clics por sesión) frente al menú anterior.

### Después del lanzamiento (backlog)
- Pruebas A/B de ítems destacados y modos.
- Menú contextual por categoría en páginas de producto («Más en Celulares»).
- Notificaciones dentro del menú (punto en «Ofertas» cuando hay campaña nueva).
- Plantillas compartidas entre sitios de la agencia (exportar/importar desde un hub).
- Mega menú de escritorio ligero reutilizando el mismo árbol (si se pide).

## Estrategia de pruebas

| Tipo | Herramienta | Qué cubre |
|---|---|---|
| Unitarias PHP | PHPUnit + Brain Monkey | Validador de esquema, compilador, fuentes, `RuleMatcher`, sanitizadores (SVG, CSS, HTML), migraciones |
| Integración PHP | PHPUnit con wp-env | CPT, REST (permisos, validación, códigos de error), invalidación, WPML/Polylang |
| Rendimiento PHP | Bench propio (`tests/Performance`) | Tiempo y memoria del frontend con 1, 3 y 10 perfiles |
| Tipos y lint | `tsc`, ESLint, PHPStan 6+, PHPCS (WPCS) | Todo |
| Tamaño | `size-limit` | CSS y JS contra el presupuesto |
| E2E móvil | Playwright (Moto G Power, iPhone 13; CPU 4×; 4G lenta) | Abrir/cerrar con y sin JS, drill-down, gestos, foco, teclado, barra inferior, carrito, buscador, RTL, reduced-motion |
| Accesibilidad | `@axe-core/playwright` + revisión manual | WCAG 2.2 AA |
| Web vitals | Lighthouse CI + `PerformanceObserver` en Playwright | CLS, INP, TBT, DOM |
| Visual | Capturas de Playwright por preset | Regresiones de diseño |
| Compatibilidad | Matriz de temas (7) y plugins de optimización (4) | Selector del tema, exclusiones |

## Decisiones tomadas (planeación cerrada el 17-11-2026)

El dueño aprobó todas las recomendaciones:

1. **Nombre y prefijo**: «Imagina Menu», slug `imagina-menu`, prefijo `imm`.
2. **Fuente del menú**: constructor propio (CPT `imm_menu`) que puede sincronizarse con un menú de WordPress o con las categorías de WooCommerce.
3. **Versiones mínimas**: PHP 8.1+ y WordPress 6.5+.
4. **Navegadores**: objetivo Popover API (Safari 17+, Chrome 114+, Firefox 125+); en navegadores anteriores el JS hace de respaldo.
5. **Licencia**: premium con **Imagina Updater** desde el inicio (sin versión en wordpress.org por ahora).
6. **Cookie con el nombre del usuario**: apagada por defecto (`name_cookie`).
7. **Analítica**: servidor y GA4 configurables; servidor apagado por defecto (fase 6).
8. **Mini-carrito**: integración primero (tema o Imagina Turbo); mini-carrito propio solo si no existe ninguno.

## Estado de la implementación (v0.1.0)

Hecho en la primera iteración (rama `claude/wordpress-mobile-menu-plugin-1txjk9`; el entorno exige esa rama en lugar de `fase-N-…`):

- **Fase 0 completa**: archivo principal compatible con Imagina Updater, autoload PSR-4, CPT `imm_menu`/`imm_profile` con borrador en meta y publicado con revisiones, `Normalizer` (lista blanca), `Compiler` (config PHP atómica en OPcache, CSS con hash, invalidación por dependencias + WP-Cron), purga de cachés al publicar.
- **Fase 1 completa**: disparador (flotante, shortcode `[imagina_menu_toggle]`, bloque, selector del tema), panel modal con Popover API como respaldo sin JS, modo deslizante con barra de regreso, título del nivel, «Ver todo», gestos y teclado; modo acordeón; cuenta, buscador, enlaces de servicio; fuente «menú de WordPress»; `aria-current` en el servidor; RTL y `prefers-reduced-motion`.
- **De la fase 2**: opciones por ítem completas (icono, imagen, insignia, descripción, destacado, visibilidad, `rel`), WhatsApp, CTA, redes, presets (6), modo claro/oscuro/automático, CSS propio.
- **Fase 3 completa** (barra inferior): acciones, estilos, indicadores, botón central, isla flotante, ocultar al bajar y con teclado, reserva de espacio, contador del carrito por cookie sin peticiones.
- **De la fase 4**: fuentes «categorías de WooCommerce» y «taxonomía» con imágenes cargadas al mostrar el nivel; buscador a pantalla completa con recientes y populares.
- **Admin** React (constructor, barra inferior, diseño, ajustes, vista previa en un celular).
- **Pruebas**: unitarias (Normalizer, Renderer) y e2e móviles (`npm run test:e2e`).

- **Modo dos columnas** (adelantado de la fase 4), con y sin JS.

Medido en el sitio de pruebas (WordPress + WooCommerce, 40 categorías en 3 niveles, Pixel 7 emulado): JS 3,2 KB gzip, CSS 4,1 KB gzip con todos los modos (1,45 KB inline), PHP 0,034 ms por visita, CLS 0, 319–372 nodos DOM, axe sin violaciones, 0 peticiones para el contador del carrito.

## Estado de la implementación (v0.2.0)

- **Modos pestañas y rejilla** (M3.4, M3.5): pestañas reutiliza el marcado de dos columnas (radios + CSS, sin JS funciona); rejilla es el modo deslizante con el primer nivel como tarjetas. Cada modo solo añade su CSS si un perfil lo usa.
- **Catálogos grandes**: `html_depth` (auto/full/hybrid) con `<template>` para los niveles profundos.
- **Perfiles con reglas** (M11): portada, blog, páginas concretas, tipo de contenido, término (incluye descendientes y productos de esa categoría), páginas de WooCommerce, URL, sesión, rol e idioma; «todas» o «cualquiera» y negación. Los perfiles con condiciones se evalúan primero, en su orden; los generales al final. Evaluación en < 0,01 ms con condicionales de WordPress ya resueltos.
- **Multi-idioma**: WPML y Polylang (compilación por idioma, cadenas registradas en su pantalla de traducción, contenidos y categorías traducidos, menú distinto por idioma, selector de idioma en el pie del panel); TranslatePress traduce el HTML final por su cuenta.
- **Analítica** (M10): servidor (cola en archivo + agregados diarios) y/o GA4, muestreo y retención; pantalla en el admin.
- **Prefetch** al tocar un enlace del menú (Speculation Rules con respaldo `<link rel=prefetch>`). Solo se activa si no lo hace ya otro: con Imagina Turbo o con WordPress 6.8+ (que trae Speculation Rules «conservative» en todo el sitio, menú incluido) queda apagado.
- **Admin**: pantalla de perfiles con reglas y orden, menú por idioma, analítica, deshacer/rehacer, QR de la vista previa.

Probado en el sitio de pruebas (WordPress 7.1 + WooCommerce + Polylang es/en): e2e móvil en verde en los dos idiomas (menú, textos propios, categorías, portada y buscador por idioma; selector de idioma), perfiles por reglas (archivo de categoría, subcategorías y productos de esas subcategorías), analítica de punta a punta (beacon → cola → cron → /stats; evento GA4 en dataLayer) y 7 temas (ver `docs/02`, M1). PHP por visita: 0,031 ms + 0,009 ms de reglas.

## Estado de la implementación (v0.3.0) — diseño premium

- Sistema de estilos del panel (16 opciones) y 12 estilos prediseñados con capturas reales (ver `docs/02`, M9).
- Herramientas: `bin/presets/render.php` (páginas de demostración por preset) y `bin/presets/shoot.cjs` (capturas y miniaturas).
- Probado: e2e completo en el sitio real con Aurora, Ajustes, Medianoche y Editorial; axe sin violaciones en los 12 presets.

Pendiente: integración con Imagina Search (cuando se comparta su código), barra superior móvil (M8), bloques Banner/Promo, Moneda y Vistos recientemente, favoritos en la barra inferior, Lighthouse CI en GitHub Actions y pruebas en Safari/iPhone reales (aquí solo hay Chromium).

### Cambios respecto a la planeación (justificados)

- **Sin JSON Schema**: el modelo se valida con `Model\Normalizer` (lista blanca guiada por `Model\Defaults`); el admin usa tipos TypeScript equivalentes. Menos piezas y la misma garantía: nada entra sin pasar por la lista blanca.
- **Fragmentos dentro de `config.php`** en lugar de archivos `.html` sueltos: un solo `include` servido por OPcache, sin lecturas de disco por request.
- **Sin `@layer` en el CSS del frontend**: las reglas sin capa del tema (`button{…}`) ganarían a las nuestras; se usan selectores con elemento + clase y resets mínimos.
- **CSS crítico**: ~4,5 KB sin comprimir / 1,4 KB gzip (la planeación decía 1,5 KB sin comprimir); incluye la barra inferior completa para no tener saltos. Presupuesto ajustado a ≤ 1,7 KB gzip.
- **Plantillas sobrescribibles desde el tema**: pospuestas (el render vive en `Compiler\Renderer`); llegan con los filtros de la fase 6.
