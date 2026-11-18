# Imagina Menu

Navegación móvil tipo app para WordPress y WooCommerce: panel lateral con submenús que se deslizan, barra de navegación inferior y buscador a pantalla completa. Hecho para no tocar PageSpeed: HTML renderizado en el servidor, sin jQuery y con el menú funcionando incluso antes de que cargue el JavaScript.

| | |
|---|---|
| JS en la carga | 3,8 KB gzip (opcional: 0 KB hasta el primer toque) |
| CSS total | ~4 KB gzip con un estilo típico, 5,2 KB en el peor caso (1,45 KB inline crítico) |
| PHP por visita | ~0,03 ms, 0 consultas a la base de datos |
| CLS | 0 |
| Dependencias en el frontend | ninguna |

## Funciones

- **Panel lateral** (izquierda, derecha o abajo) con submenús **deslizantes** tipo app (flecha de regreso, título del nivel, «Ver todo», gestos) o **acordeón**.
- **Barra inferior** con iconos, etiquetas, insignias (contador del carrito sin peticiones al servidor), botón central destacado, estilo isla flotante y ocultar al hacer scroll.
- **Buscador** a pantalla completa con búsquedas recientes y populares.
- **Bloques de conversión**: saludo y cuenta, WhatsApp, botón CTA, enlaces de servicio, redes sociales.
- **Fuentes dinámicas**: menús de WordPress, categorías de WooCommerce (con imágenes) o cualquier taxonomía. Se recompila solo cuando cambian.
- **Por ítem**: icono (1.850 de Lucide + marcas), imagen, insignia, descripción, destacado, visibilidad por sesión, `rel`.
- **12 estilos prediseñados** (Aurora, Ajustes, Editorial, Material, Medianoche, Pop…) y **16 opciones de diseño** del panel (forma flotante o cristal, cabecera en degradado o con imagen, ítems en tarjetas, píldoras o grupos, iconos multicolor, tipografía, movimiento con rebote, entrada escalonada…). Cada sitio descarga solo el CSS de su estilo.
- **Constructor visual** con vista previa en un celular; borradores que no tocan el sitio hasta «Publicar».
- **Accesible**: diálogo modal con foco atrapado, teclado completo, `aria-current`, `prefers-reduced-motion`, RTL.
- Licencia y actualizaciones con **Imagina Updater**.

## Instalación

1. Sube la carpeta `imagina-menu` a `wp-content/plugins/` (o el ZIP desde Plugins → Añadir nuevo).
2. Actívalo. Se crea un menú inicial: categorías de WooCommerce, el menú del tema o tus páginas.
3. Ve a **Imagina Menu** en el admin, ajusta y pulsa **Publicar**.

Formas de abrir el panel: botón flotante, el botón del menú móvil de tu tema (selector CSS), el bloque «Botón de Imagina Menu», el shortcode `[imagina_menu_toggle label="Menú"]`, cualquier elemento con `data-imm-open`, o `immMenu.open()` desde JS.

## Desarrollo

```bash
npm ci && npm run build      # frontend (assets/dist) — sin dependencias en runtime
npm run size                 # presupuesto de rendimiento
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
