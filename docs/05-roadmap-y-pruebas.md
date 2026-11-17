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

## Decisiones abiertas (confirmar antes de la fase 0)

1. **Nombre y prefijo**: ¿«Imagina Menu» con prefijo `imm`? (Cambiarlo después cuesta poco si se hace antes de la fase 0.)
2. **Fuente principal del menú**: propuesta = constructor propio (CPT) que puede **sincronizarse** con un menú de WordPress o con las categorías de Woo. Alternativa más simple = extender el editor de menús de WordPress con campos extra (iconos, insignias), pero ese editor es lento y limitado para lo visual. Recomendación: constructor propio.
3. **Versiones mínimas**: PHP 8.1+ y WordPress 6.5+ (Script Modules). ¿Hay clientes por debajo?
4. **Navegadores**: el objetivo es Popover API (Safari 17+, ~2023). En iOS 16 o anteriores funcionaría el respaldo JS. ¿Aceptable?
5. **Licencia**: ¿premium con Imagina Updater desde el inicio, o una versión gratuita en wordpress.org con un Pro? (Afecta al empaquetado y a qué módulos van en cada versión.)
6. **Cookie con el primer nombre del usuario** para el saludo en páginas cacheadas: ¿activada por defecto o solo bajo demanda por privacidad? Propuesta: apagada por defecto (los usuarios conectados normalmente no reciben caché y ven su nombre igual).
7. **Analítica en el servidor**: ¿se quiere guardar agregados propios o basta con enviar eventos a GA4? Propuesta: ambos, configurable, servidor apagado por defecto.
8. **Mini-carrito en hoja inferior** desde la barra inferior: ¿lo hace este plugin o se integra con el mini-carrito del tema/Imagina Turbo? Propuesta: integración primero; mini-carrito propio solo si no existe ninguno.
