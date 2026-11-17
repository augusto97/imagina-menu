# CLAUDE.md — Imagina Menu

> Nombre de trabajo provisional. Slug `imagina-menu`, namespace PHP `ImaginaMenu\`, prefijo `imm_` / `IMM_` (CSS: `imm-`, Tailwind del admin: `imm:`). Si cambia el nombre, cambiar solo estas tres cosas.

## Qué es

Plugin de navegación **mobile-first** para WordPress y WooCommerce. No es un mega menú de escritorio: es la navegación que un usuario de celular espera de una app de comercio como Amazon, Mercado Libre, AliExpress o Temu.

Piezas principales:

1. **Panel lateral (drawer)** con submenús que se deslizan horizontalmente (drill-down), flecha superior para regresar y animación suave. Otros modos: acordeón, dos columnas (rail de categorías + rejilla con imágenes), pestañas y rejilla de iconos.
2. **Barra de navegación inferior** opcional, con aspecto de app: iconos, etiquetas, insignias (carrito, favoritos), botón central destacado y ocultar al hacer scroll.
3. **Bloques de conversión dentro del panel**: saludo y cuenta, buscador, categorías con imagen, banners de promoción, botones de llamada a la acción, WhatsApp, idioma/moneda.
4. **Constructor visual** en el admin con vista previa en un celular, presets de un clic y reglas de visualización.

Tiene que ser **el menú más rápido del mercado**: HTML renderizado en el servidor (enlaces reales para SEO), apertura sin esperar JavaScript, cero jQuery, cero dependencias en el frontend, CLS = 0 y sin consultas a la base de datos en el frontend.

## Contexto del entorno

- Desarrollador: Edison, Imagina WP (Manizales, Colombia). ~30 sitios de clientes en LATAM, muchos con WooCommerce y tráfico mayoritariamente móvil.
- Servidores: Hetzner con ServerAvatar (OpenLiteSpeed + LiteSpeed Cache) y Plesk (Apache/nginx + WP Rocket), Cloudflare delante.
- Plugins propios con los que se integra (no se reconstruye lo que ya hacen):
  - **Imagina Turbo** (`augusto97/Imagina-Turbo`): Speculation Rules, carrito por Store API, purga por tags. Si está activo, el menú no emite sus propias reglas de prefetch y le avisa qué purgar.
  - **Imagina Search** (`augusto97/imagina-search`): la búsqueda del panel y de la barra inferior la delega en él cuando existe.
  - **Imagina Updater** (`augusto97/imagina-updater`): licencias y actualizaciones.

## Reglas no negociables

1. **Presupuesto de rendimiento** (se mide en CI, ver `docs/03-rendimiento-y-seo.md`):
   - CSS del frontend ≤ 6 KB gzip en total; JS inicial ≤ 4 KB gzip; cada módulo bajo demanda ≤ 3 KB gzip.
   - 0 peticiones a terceros, 0 fuentes web, 0 jQuery, 0 consultas SQL propias en el frontend.
   - PHP propio < 1 ms y < 300 KB por request con la caché caliente.
   - CLS aportado = 0. Abrir el panel: INP < 100 ms en un Moto G de gama media.
2. **El HTML se renderiza en el servidor** con `<a href>` reales. Nada de menús construidos con JavaScript ni enlaces `#` con `onclick`. El menú funciona (abre, cierra, navega) aunque el JS no haya cargado.
3. **Mejora progresiva**: la apertura usa la Popover API nativa; el JS solo añade animaciones, gestos, foco y extras. Sin la Popover API (navegadores viejos) el JS hace de respaldo.
4. **Configuración compilada**: al guardar en el admin se generan un archivo PHP de configuración (vive en OPcache), un CSS con los tokens y los fragmentos HTML por menú e idioma. El frontend nunca lee opciones grandes ni recorre árboles en cada request.
5. **Compatible con caché de página**: nada en el HTML depende del usuario anónimo. Lo dinámico (contador del carrito, nombre del usuario) se hidrata en el cliente y solo si hace falta (sin petición si no hay cookie de carrito).
6. **Accesible**: WCAG 2.2 AA, navegación completa por teclado, `aria-*` correctos, foco atrapado en el panel, `prefers-reduced-motion` y RTL.
7. **Coexistencia**: no romper el tema. Ocultar el menú móvil del tema solo si el usuario lo pide (selector CSS configurable). Detectar Imagina Turbo, Perfmatters, WP Rocket (retraso de JS) y LiteSpeed (Guest Mode / delay JS) y documentar exclusiones.
8. **Todo es opcional**: un módulo desactivado no carga PHP, CSS ni JS.
9. **Seguridad**: nonces, capacidades, sanitización y escape en todo; el HTML que pega el usuario pasa por `wp_kses` con lista permitida; los SVG subidos se sanitizan.

## Stack y convenciones

- PHP 8.1+ con `declare(strict_types=1);`, PSR-4 vía Composer (`classmap-authoritative` en producción), patrón Repository/Service y contenedor simple propio (igual que Imagina Turbo).
- WordPress 6.5+ (API de Script Modules y `wp_register_script_module`). WooCommerce opcional.
- **Frontend**: TypeScript compilado con esbuild/Vite a ES modules sin dependencias. CSS escrito a mano con custom properties y `@layer imm`; sin Tailwind en el frontend.
- **Admin**: React 18 + TypeScript + Vite con `@kucrut/vite-for-wp`, shadcn/ui con Tailwind v4 y prefijo `imm` (`@import 'tailwindcss/utilities.css' layer(utilities) prefix(imm) important;`, reset limitado a `.imm-root`), TanStack Query, Zustand, React Hook Form + Zod, Lucide, fuente Inter. Añadidos propios de este plugin: `@dnd-kit` (árbol arrastrable) y `react-colorful` (selector de color). Estética tipo Linear/Vercel.
- Textos de interfaz en español con i18n preparado (text domain `imagina-menu`).
- El archivo principal (`imagina-menu.php`) debe seguir siendo compatible con la inyección de licencia de Imagina Updater: sin `strict_types` ni `namespace`, con la comprobación de `ABSPATH` y sin otro `.php` en la raíz que contenga `Plugin Name:`.
- Estándares: WordPress Coding Standards, PHPStan nivel 6+, ESLint + Prettier en TS.

## Mapa de documentación

| Archivo | Contenido |
|---|---|
| `docs/00-investigacion.md` | Cómo resuelven la navegación móvil Amazon, Mercado Libre, AliExpress, Temu, Shein, Linio/Falabella; qué hacen mal los plugins actuales; patrones que se adoptan. |
| `docs/01-arquitectura.md` | Estructura de carpetas, modelo de datos, compilador, pipeline de render, carga de assets, almacenamiento, licencia. |
| `docs/02-funcionalidades.md` | Cada módulo con sus opciones, valores por defecto y criterios de aceptación. |
| `docs/03-rendimiento-y-seo.md` | Técnicas de alto rendimiento, presupuestos, Core Web Vitals, SEO, accesibilidad y compatibilidad con plugins de caché/optimización. |
| `docs/04-admin-y-api.md` | Pantallas del admin, constructor visual, vista previa, endpoints REST, opciones y tablas. |
| `docs/05-roadmap-y-pruebas.md` | Fases con criterios de aceptación, estrategia de pruebas, decisiones abiertas. |

## Cómo trabajar en este repo

- Avanzar **por fases** (`docs/05-roadmap-y-pruebas.md`). No empezar una fase sin cumplir los criterios de aceptación de la anterior.
- Antes de cada fase: leer el doc correspondiente, proponer el plan de archivos y esperar confirmación si hay decisiones abiertas.
- Cada módulo implementa `ModuleInterface`; ningún módulo carga código si está desactivado.
- Cada cambio del frontend pasa el presupuesto (`npm run size` + Lighthouse CI). Si un cambio lo rompe, se rediseña; no se sube el presupuesto sin acordarlo.
- Commits pequeños y descriptivos en español. Ramas por fase: `fase-0-fundaciones`, `fase-1-panel`, etc.
- Si una decisión de los docs resulta técnicamente inviable, detenerse y explicarlo; no improvisar un reemplazo silencioso.
