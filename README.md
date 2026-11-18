# Imagina Menu

Navegación móvil tipo app para WordPress y WooCommerce: panel lateral con submenús que se deslizan, barra de navegación inferior y buscador a pantalla completa. Hecho para no tocar PageSpeed: HTML renderizado en el servidor, sin jQuery y con el menú funcionando incluso antes de que cargue el JavaScript.

| | |
|---|---|
| JS en la carga | 3,7 KB gzip (opcional: 0 KB hasta el primer toque) |
| CSS total | ~4 KB gzip con un estilo típico, 5,2 KB en el peor caso (1,45 KB inline crítico) |
| PHP por visita | ~0,03 ms, 0 consultas a la base de datos |
| CLS | 0 |
| Dependencias en el frontend | ninguna |

## Funciones

- **Panel lateral** (izquierda, derecha o abajo) con submenús **deslizantes** tipo app (flecha de regreso, título del nivel, «Ver todo», gestos) o **acordeón**.
- **Barra inferior** con iconos, etiquetas, insignias (contador del carrito sin peticiones al servidor), botón central destacado, estilo isla flotante y ocultar al hacer scroll.
- **Buscador** a pantalla completa con búsquedas recientes y populares; con **Imagina Search** activo muestra sus resultados instantáneos (foto, precio, categorías) dentro del mismo buscador.
- **Escritorio**: el mismo panel con un botón «☰ Todo» en la cabecera (como Amazon) o en **cascada**, con las subcategorías en una columna a la derecha al pasar el mouse (como Falabella o Mercado Libre).
- **«Ver todo {categoría}»** al final de cada submenú: la categoría padre siempre tiene su enlace.
- **Barra superior móvil** tipo app con el buscador siempre visible (como Amazon y Mercado Libre), sin mover la página (CLS 0).
- **Campañas programadas**: perfiles, ítems y banners con fecha de inicio y fin (Hot Sale, Black Friday…); el menú se actualiza y la caché se vacía solos.
- **Banners de promoción** dentro del panel y **WhatsApp** con el producto que se está viendo y horario de atención.
- **Favoritos** (YITH o TI Wishlist) con contador en la barra inferior; widget de **Elementor** y comandos **WP-CLI** para replicar la configuración entre sitios.
- **Bloques de conversión**: saludo y cuenta, WhatsApp, botón CTA, enlaces de servicio, redes sociales.
- **Fuentes dinámicas**: menús de WordPress, categorías de WooCommerce (con imágenes) o cualquier taxonomía. Se recompila solo cuando cambian.
- **Por ítem**: icono (1.850 de Lucide + marcas), imagen, insignia, descripción, destacado, visibilidad por sesión, `rel`.
- **12 estilos prediseñados** (Aurora, Ajustes, Editorial, Material, Medianoche, Pop…) y **16 opciones de diseño** del panel (forma flotante o cristal, cabecera en degradado o con imagen, ítems en tarjetas, píldoras o grupos, iconos multicolor, tipografía, movimiento con rebote, entrada escalonada…). Cada sitio descarga solo el CSS de su estilo.
- **Constructor visual** con vista previa en vivo (celular o escritorio) que se actualiza sin recargar; borradores que no tocan el sitio hasta «Publicar».
- **Accesible**: diálogo modal con foco atrapado, teclado completo, `aria-current`, `prefers-reduced-motion`, RTL.
- **Seguro por diseño**: auditado (ver [docs/06-seguridad.md](docs/06-seguridad.md)); nada privado descargable aunque el servidor ignore `.htaccess`, analítica sin cookies y a prueba de relleno, CSS global solo para administradores.
- Licencia y actualizaciones con **Imagina Updater**.

## Descargar

El plugin listo para instalar está en la rama [`release`](https://github.com/augusto97/imagina-menu/tree/release): [última versión (imagina-menu.zip)](https://github.com/augusto97/imagina-menu/raw/release/imagina-menu.zip) y todas las anteriores con sus sumas SHA-256.

## Instalación

1. Sube la carpeta `imagina-menu` a `wp-content/plugins/` (o el ZIP desde Plugins → Añadir nuevo).
2. Actívalo. Se crea un menú inicial: categorías de WooCommerce, el menú del tema o tus páginas.
3. Ve a **Imagina Menu** en el admin, ajusta y pulsa **Publicar**.

Formas de abrir el panel: botón flotante, el botón del menú móvil de tu tema (selector CSS), el bloque «Botón de Imagina Menu», el shortcode `[imagina_menu_toggle label="Menú"]` (en escritorio: `[imagina_menu_toggle label="Todo" only="desktop" style="solid"]`), cualquier elemento con `data-imm-open`, o `immMenu.open()` desde JS.

## Desarrollo

```bash
bash bin/release.sh          # publica la versión actual en la rama release (prueba, empaqueta y sube)
bash bin/build-zip.sh        # solo genera el ZIP de distribución en dist/
npm ci && npm run build      # frontend (assets/dist) — sin dependencias en runtime
npm run size                 # presupuesto de rendimiento
npm run lint                 # ESLint (frontend y admin)
composer phpstan             # PHPStan nivel 6
wp imagina-menu export --file=menu.json   # y import, publish, status, recompile
npm run icons                # regenerar icons/icons.json
cd admin && npm ci && npm run build   # admin React
composer install && composer test     # pruebas unitarias
IMM_URL=http://localhost:8890 npm run test:e2e   # e2e móviles (datos: tests/e2e/seed-demo.php)
```

La especificación completa está en [`CLAUDE.md`](CLAUDE.md) y [`docs/`](docs/):

- [00 — Investigación](docs/00-investigacion.md)
- [01 — Arquitectura](docs/01-arquitectura.md)
- [02 — Funcionalidades](docs/02-funcionalidades.md)
- [03 — Rendimiento, SEO y accesibilidad](docs/03-rendimiento-y-seo.md)
- [04 — Admin, constructor y API](docs/04-admin-y-api.md)
- [05 — Roadmap y pruebas](docs/05-roadmap-y-pruebas.md) (incluye el estado de la implementación)
- [06 — Seguridad](docs/06-seguridad.md)
