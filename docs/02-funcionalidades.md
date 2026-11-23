# 02 — Funcionalidades

Cada módulo se activa por separado. Un módulo apagado no carga PHP, CSS ni JS. Entre paréntesis, la fase del roadmap en la que llega (ver `docs/05`).

## M1. Disparador (botón del menú) — fase 1

Cómo se abre el panel.

| Opción | Valores | Por defecto |
|---|---|---|
| Modo | `theme_selector` (vincular al botón del tema), `block` (bloque de Gutenberg), `shortcode` (`[imagina_menu_toggle]`), `elementor` (widget), `floating` (botón flotante), `php` (`imagina_menu_toggle()`) | `floating` hasta que se configure otro |
| Selector del botón del tema | Selector CSS. El JS intercepta su clic y abre el panel. Sin JS, el tema mantiene su comportamiento (respaldo seguro). | — |
| Ocultar menú móvil del tema | Selector CSS que se oculta dentro de la media query móvil | apagado |
| Icono | Hamburguesa clásica, hamburguesa con 2 líneas, 4 puntos (rejilla), icono propio | clásica |
| Animación del icono | Ninguna, a «X», a flecha | a «X» |
| Etiqueta | Texto opcional junto al icono («Menú», «Categorías») | sin etiqueta |
| Botón flotante | Posición (esquina), tamaño, sombra, color, distancia del borde, ocultar al hacer scroll | inferior izquierda |

El botón es un `<button popovertarget="imm-drawer" aria-controls aria-expanded>`: abre el panel sin JS.

Implementado (v0.1): si la barra inferior ya tiene un ítem que abre el panel, el botón flotante no se imprime. Desde la v0.5.10, tampoco en celulares si la barra superior está activa (ya tiene el botón del menú): ahí sale solo en escritorio, donde la barra no se ve.

**Diseño del botón flotante** (v0.5.10): galería de 8 plantillas con miniaturas (con la posición, el icono y los colores actuales): Clásico, Con texto, Cuadrado suave, Extendido, Pequeño, Claro, Claro con texto y Vidrio. Ajustes sueltos: **forma** (redonda o cuadrado suave), **estilo** (sólido con los colores del botón; claro con el fondo del panel y borde fino; vidrio translúcido con desenfoque), **tamaño** (36–80 px) y **distancia al borde** (0–80 px). Estos dos últimos existían en el admin pero no se aplicaban: ahora sí, con variables de CSS que el compilador fija solo si cambian. Colores de un clic: oscuro, como la cabecera y con el acento. Sin texto el botón es un círculo exacto; con texto, una píldora con su relleno (antes el relleno del texto no se aplicaba).

**CSS solo si se usa** (v0.5.10): el CSS del botón flotante va en el crítico solo si el perfil lo muestra (`fab.css` y sus variantes en `fab/`), y el del botón del shortcode, bloque o Elementor (`toggle.css`, 0,32 KB gzip) se imprime una vez junto al primer botón, solo en las páginas que lo tienen. El CSS crítico base queda en 0,49 KB gzip.

Compatibilidad verificada (v0.2, Playwright en móvil, `tests/e2e/themes.cjs`): el botón del tema abre el panel de Imagina Menu (y no el menú del tema) en **Twenty Twenty-Five, Astra, Kadence, Blocksy, GeneratePress, Storefront y OceanWP**. **Hello Elementor** no imprime botón de menú sin el constructor de cabeceras de Elementor: no se sugiere su selector y, como red de seguridad en el modo «botón del tema», si el selector no encuentra ningún botón visible el JS muestra el botón flotante de respaldo. WoodMart y Flatsome (de pago) no se pudieron probar. En una instalación nueva con un tema conocido, el botón del menú móvil del tema abre el panel (modo `theme_selector`, sugerido automáticamente).

**Aceptación**: abrir/cerrar funciona con JS desactivado (Chrome, Safari ≥ 17, Firefox ≥ 125); el botón tiene nombre accesible; el selector del tema funciona con Astra, GeneratePress, Kadence, Blocksy, Hello Elementor, WoodMart y Flatsome (lista de selectores sugeridos en el admin).

## M2. Panel lateral (drawer) — fase 1

**Plantillas** (v0.5.11, en la pantalla Panel lateral): 8 estructuras con miniaturas que usan los colores del diseño: Deslizante, Acordeón, Dos columnas, Pestañas, Rejilla de iconos, Desde la derecha, Hoja inferior y Pantalla completa. Cada una fija el modo de submenú, el lado, el ancho y el botón cerrar; los menús, colores y estilo no cambian. Debajo, el estilo visual actual (de los 12 estilos con capturas reales de Diseño, M9) con un acceso directo para cambiarlo.

| Opción | Valores | Por defecto |
|---|---|---|
| Lado | izquierda, derecha, abajo (bottom sheet con arrastre), arriba, pantalla completa | izquierda |
| Ancho | `vw` y máximo en px | 86 vw / 420 px |
| Fondo (overlay) | color, opacidad, desenfoque (`backdrop-filter`, apagado por defecto por costo en gama baja) | negro 50 % |
| Botón cerrar | dentro arriba, fuera del panel (estilo Amazon), abajo (zona del pulgar), ninguno | fuera del panel |
| Cerrar | toque en el fondo, Esc, deslizar hacia el borde, botón atrás del navegador (opcional, con `history.pushState`) | todos menos el botón atrás |
| Animación de entrada | deslizar, deslizar + escala del contenido (efecto «push»), fundido | deslizar |
| Recordar nivel | al reabrir vuelve al último submenú visitado en la sesión | apagado |
| Abrir en el ítem activo | al abrir, mostrar el nivel donde está la página actual | encendido |
| Cabecera | Logo, bloque Cuenta, Buscador, título libre | Cuenta + Buscador |
| Pie | Enlaces de servicio, WhatsApp, redes sociales, idioma, moneda, modo oscuro | Enlaces de servicio |

Estructura HTML (simplificada):

```html
<nav id="imm-drawer" class="imm-drawer imm-drawer--left" popover aria-label="Menú principal">
  <header class="imm-drawer__head">…cuenta, buscador…</header>
  <div class="imm-levels" data-mode="slide">
    <ul class="imm-level" id="imm-l-root" role="list">
      <li><a href="/ofertas/">Ofertas</a></li>
      <li>
        <a href="/celulares/">Celulares</a>
        <button class="imm-next" aria-controls="imm-l-i_7f3a" aria-expanded="false">
          <span class="imm-sr">Ver subcategorías de Celulares</span>›</button>
        <ul class="imm-level" id="imm-l-i_7f3a" role="list" hidden>…</ul>
      </li>
    </ul>
  </div>
  <footer class="imm-drawer__foot">…</footer>
</nav>
```

**Decisión de UX importante**: toda la fila del padre abre el submenú (más fácil de tocar) y, como el padre ya no se puede tocar como enlace, cada submenú lleva **«Ver todo {padre}»** con el enlace a su página. Desde v0.4 va **al final** del submenú (opción `drawer.view_all_position`: al final o al inicio; el texto admite `%s`: «Todo en %s»). Se puede quitar por ítem (`view_all`). No se genera si el padre no tiene página (vacío o `#`). Sin flecha: es un enlace, no un submenú (igual que el bloque de cuenta, que tampoco lleva flecha).

**Aceptación**: foco atrapado y devuelto al disparador al cerrar; scroll del `body` bloqueado sin salto; `inert` en el resto de la página; funciona en RTL; 60 fps en la animación en un Moto G (perfil de CPU 4× en DevTools).

## M3. Modos de submenú — fases 1, 4 y 5

### 3.1 Deslizante (drill-down) — fase 1, por defecto

- El nivel actual se desplaza a la izquierda (`translateX(-30%)` con leve oscurecimiento, efecto paralaje tipo iOS) y el submenú entra desde la derecha (`translateX(100%) → 0`).
- **Barra de regreso** arriba: flecha `←` + título del padre (o «Menú principal» en el primer nivel). Opción de mostrar migas de pan cortas («Inicio › Tecnología › Celulares»).
- **Título del nivel** grande opcional y enlace «Ver todo {categoría}».
- Gestos: deslizar a la derecha = volver.
- Duración configurable (150–400 ms, por defecto 260 ms) y curva (`cubic-bezier(.2,.8,.2,1)` por defecto). Con `prefers-reduced-motion`: fundido de 120 ms.
- Altura: cada nivel tiene su propio scroll; el scroll del nivel anterior se conserva al volver.

### 3.2 Acordeón — fase 1

- Submenús que se expanden en el sitio con animación de altura (`grid-template-rows: 0fr → 1fr`, sin medir con JS).
- Sin JS funciona con `<details>/<summary>` (mejora progresiva).
- Opción «solo uno abierto a la vez».

### 3.3 Dos columnas (estilo AliExpress/Temu) — implementado en v0.1 (adelantado de la fase 4)

Sin JS funciona con radios + CSS (`:checked + .imm-tp-pane`); el JS marca la pestaña activa, carga las imágenes del panel visible y abre la categoría de la página actual. Los ítems sin hijos del primer nivel quedan como enlaces directos en el rail; los encabezados de sección se aplanan. Su CSS solo se incluye si algún perfil usa este modo. Con ancho ≥ 92 % el botón de cerrar pasa dentro del panel.

- Rail izquierdo (25–35 % del ancho) con las categorías de primer nivel: icono o imagen pequeña + texto, la activa resaltada con barra de acento y fondo.
- Derecha: subcategorías como **rejilla de imágenes** (2, 3 o 4 columnas) agrupadas por título (segundo nivel = título, tercer nivel = tarjetas). Banner opcional arriba de cada categoría.
- Las imágenes de la columna derecha se cargan **solo cuando se selecciona la categoría** (`data-src` → `src` + `decoding="async"`), con el contenedor de tamaño fijo para no saltar.
- Funciona mejor como pantalla completa o como destino del botón «Categorías» de la barra inferior.

### 3.4 Pestañas (estilo Shein) — fase 5

- Pestañas horizontales con scroll arriba (primer nivel) y debajo lista o rejilla del árbol de esa pestaña. Útil para «Mujer / Hombre / Niños» o «Productos / Servicios».

### 3.5 Rejilla de iconos — fase 5

- Primer nivel como rejilla de tarjetas con icono/imagen (3 o 4 columnas), los niveles siguientes en modo deslizante. Ideal para sitios de servicios, restaurantes o apps de contenidos.

## M4. Opciones por ítem — fases 1–2

| Opción | Detalle |
|---|---|
| Tipo | enlace, encabezado de sección (sin enlace), divisor, bloque, fuente dinámica |
| Icono | Lucide (subconjunto de ~400 iconos con buscador), SVG propio (sanitizado), emoji, imagen |
| Imagen | para dos columnas/rejilla; se genera `imm-thumb` |
| Insignia | «Nuevo», «Oferta», «Hot», «-X %», texto libre; colores por estilo; opción de pulso animado (desactivable) |
| Descripción | segunda línea de texto pequeña |
| Destacado | color de acento / fondo suave para resaltar (p. ej. «Ofertas del día») |
| «Ver todo» | añade el enlace al padre como primer ítem del submenú |
| Destino | `_self` / `_blank` (con `rel="noopener"`), `rel` opcional (`nofollow`, `sponsored`) |
| Visibilidad | conectado / no conectado, roles, programación (desde/hasta fecha), dispositivo |
| Clases CSS | extra, para personalizar |
| Atributos de seguimiento | etiqueta de evento para GA4 (ver M10) |

### Fuentes dinámicas: ocultar categorías (v0.5.5)

En la fuente «Categorías de WooCommerce» o «Taxonomía», la vista «Así se verá» del Constructor tiene un ojo en cada categoría: ocultarla la quita del menú (con sus subcategorías) y las demás se siguen agregando solas. Caso típico: una categoría «Ofertas» que solo se usa en una página. Se guarda como `source.exclude` (ids de término; con WPML/Polylang se excluye también su traducción). Las ocultas se ven tachadas en la vista previa para poder volver a mostrarlas, y no se copian al «Convertir en ítems editables».

## M5. Bloques del panel — fases 1–4

Piezas que se colocan en la cabecera, entre ítems o en el pie del panel.

| Bloque | Qué hace | Fase |
|---|---|---|
| **Cuenta** | «Hola, inicia sesión» + botón «Ingresar/Registrarse» (o «Hola, {nombre}» + accesos «Mis pedidos», «Favoritos», «Salir»). Con WooCommerce usa los endpoints de Mi cuenta. | 1 |
| **Buscador** | Campo que abre el overlay de búsqueda (M7). | 1 |
| **Sección** | Título + lista de ítems + «Ver todo». | 1 |
| **Enlaces de servicio** | Ayuda, pedidos, contacto, devoluciones. | 1 |
| **WhatsApp / Llamar** | Botón con número y mensaje (`wa.me`). **v0.5**: el mensaje admite `{titulo}` y `{url}` de la página o producto que se está viendo (se reemplazan en el servidor en cada página, compatible con la caché) y **horario de atención** (días y horas en la hora del sitio): fuera de horario el botón muestra otro texto; lo decide el navegador (`hours.js`, bajo demanda) porque las páginas están en caché. Verde oscurecido (#0e7a55) para cumplir AA con texto blanco. | 2 |
| **Redes sociales** | Iconos (SVG del sprite). | 2 |
| **Banner / Promo** | **v0.5**: hasta 6 imágenes con enlace (proporción 2:1), arriba o antes del pie del panel; con varias, carrusel con `scroll-snap` sin JS (se asoma la siguiente). Carga perezosa (se descargan al abrir el panel). Cada una con fechas de campaña (M15). La cuenta regresiva queda fuera (necesitaría JS en cada página). | 3 |
| **Rejilla de categorías** | Tarjetas con imagen (Woo o manual), 2–4 columnas. | 4 |
| **Botón CTA** | Botón grande («Vende con nosotros», «Agenda tu cita»). | 2 |
| **Idioma** | WPML / Polylang / TranslatePress. | 5 |
| **Moneda** | Pendiente: hoy se resuelve con los enlaces de servicio (`?currency=USD` en WOOCS, `?wmc-currency=USD` en CURCY). | 5 |
| **Modo oscuro** | Interruptor (solo si el tema lo soporta o se usa el modo oscuro del menú). | 5 |
| **Vistos recientemente** | Descartado: es recomendación de productos, no navegación (lo hace Imagina Turbo). | — |
| **HTML / Shortcode** | Contenido libre, con aviso de rendimiento (los shortcodes se renderizan al compilar, no en cada visita, cuando son estáticos). | 3 |

## M6. Barra de navegación inferior — fase 3

La «app» dentro de la web.

| Opción | Valores | Por defecto |
|---|---|---|
| Ítems | 2–5 (aviso por encima de 5) | Inicio, Categorías, Buscar, Carrito, Cuenta |
| Acción por ítem | enlace, abrir panel (con modo y nivel inicial), abrir buscador, carrito (página o mini-carrito en hoja inferior), cuenta, **favoritos** (v0.5: página de YITH o TI Wishlist; sin plugin, el ítem no se muestra), WhatsApp, llamar, volver arriba, compartir (Web Share API), abrir un perfil distinto | — |
| Estilo | iconos + etiquetas, solo iconos, etiqueta solo en el activo | iconos + etiquetas |
| Indicador del activo | color, píldora detrás del icono (Material 3), línea superior, punto | píldora |
| Botón central destacado | círculo elevado con color de acento (estilo «vender» / «buscar») | apagado |
| Insignias | colores propios opcionales para los contadores de la barra (v0.5.2; apagado: los de las insignias del panel); contador del carrito (cookie `imm_cc`), **favoritos** (v0.5, cookie `imm_wl` que se actualiza al añadir o quitar en YITH o TI Wishlist; el JS escucha sus eventos `added_to_wishlist`, `removed_from_wishlist`, `tinvwl_wishlist_ajax_response`), número libre, punto | carrito |
| Comportamiento | fijo, ocultar al bajar y mostrar al subir, ocultar en páginas concretas (checkout) | ocultar al bajar |
| Forma | barra completa, redondeada (esquinas de arriba redondeadas y sombra suave, v0.5.9), flotante con bordes redondeados y margen («isla») | barra completa |
| Fondo | color, transparencia con desenfoque, borde superior, sombra | sólido |
| Área segura | `env(safe-area-inset-bottom)` siempre | — |
| Reserva de espacio | `padding-bottom` en `body` (o selector) para no tapar el pie de página | encendido |
| Háptica | `navigator.vibrate(10)` opcional en Android | apagado |

**Plantillas** (v0.5.9): galería con miniaturas que usan los accesos y colores actuales: Clásica, Línea superior, Minimal, Solo iconos, Redondeada, Isla flotante, Botón central y Vidrio. Cada una fija forma, etiquetas, indicador, translúcida y botón central (que se pone en el acceso del medio entre los que se ven; con un número par de accesos el admin avisa que no queda centrado); los accesos no cambian. **Paletas de color** de un clic (clara, gris, oscura y con el acento) que cambian los colores de la barra en el diseño del perfil. El CSS de cada opción va en su archivo (`assets/dist/bbar/`) y solo se incluye el elegido.

Reglas: se oculta automáticamente en checkout y cuando el teclado virtual está abierto (`visualViewport`), y en escritorio salvo que se pida.

**Aceptación**: CLS = 0 con la barra activa (el espacio se reserva en el CSS crítico); el ítem activo se marca sin JS (vía `aria-current` del servidor); contador del carrito correcto tras añadir un producto con AJAX sin recargar; el ocultar-al-scroll no aumenta el INP (listener pasivo + `requestAnimationFrame`).

## M7. Buscador (overlay) — fase 4

- Overlay a pantalla completa con campo enfocado y teclado abierto al instante (el input existe en el HTML; el foco se da en el mismo gesto del usuario para que iOS abra el teclado).
- Búsquedas recientes (localStorage), búsquedas populares (configurables) y categorías sugeridas.
- **Con Imagina Search activo** (implementado en v0.4, `search.provider = auto`): el diálogo del menú muestra el widget de Imagina Search en lugar del campo propio: resultados instantáneos con foto, precio y categorías mientras se escribe, y su página de resultados con Enter. La flecha del menú queda a la izquierda del campo y los resultados ocupan el resto de la pantalla (se anula la barra fija y la segunda flecha que Imagina Search pone en celulares). Las búsquedas populares del menú se ven antes de escribir. Se decide **en cada visita** (dos marcadores en el HTML compilado): activar o desactivar Imagina Search no exige volver a publicar. Se usa un diseño de desplegable (standard/compact/amazon; los de capa propia no caben dentro de otro diálogo) y una sola versión del widget. Al cerrar el diálogo se cierra su desplegable (libera el scroll). Con `search.provider = native` se usa siempre el buscador propio.
- Sin Imagina Search: formulario normal a `/?s=` (y `post_type=product` si hay WooCommerce). Sugerencias en vivo opcionales con la Store API de productos (con `debounce`, solo tras 3 caracteres).

## M8. Barra superior móvil (app bar) — implementada en v0.5

Barra fija tipo app con hamburguesa (abre el panel), logo (o el nombre del sitio), botones a la derecha (por defecto cuenta y carrito con contador) y, debajo, el **buscador siempre visible** (patrón Amazon/Mercado Libre; abre el buscador a pantalla completa, con Imagina Search si está activo). Pantalla **Barra superior** del admin.

| Opción | Valores | Por defecto |
|---|---|---|
| Activar | sí / no | no |
| Buscador visible | sí / no | sí |
| Logo | sí / no | sí |
| Botones de la derecha | hasta 3 (ver abajo) | cuenta y carrito |
| Al bajar | ocultar solo la fila de arriba (queda el buscador), toda la barra, nada | solo la fila de arriba |

- Se imprime en `wp_body_open` (al inicio del `<body>`, visible en el primer pintado) con los iconos dibujados en línea (el sprite llega al final). Temas sin `wp_body_open`: se imprime en el pie, igual fija arriba.
- **Diseño** (v0.5.8): galería de 8 plantillas con miniaturas que usan los colores y botones actuales (elegir una no cambia los colores): Clásica, Compacta, Curva, Isla flotante, Minimal, Vidrio, Isla compacta y Compacta minimal. Cada plantilla combina cuatro ajustes que también se cambian sueltos: **distribución** (buscador debajo, o todo en una fila: 52 px en vez de 102), **forma** (recta, curva con las esquinas de abajo redondeadas, isla flotante separada 8 px de los bordes, minimal sin sombra con una línea fina), **campo de búsqueda** (píldora, redondeado, o suave: translúcido del color de la barra) y **efecto vidrio** (fondo translúcido con desenfoque; con un degradado usa el primer color). En una fila el logo no se puede centrar y al bajar se oculta toda la barra. **Paletas de color** de un clic en «Colores»: como el panel, clara, oscura, con el acento y degradado.
- **Tamaño del campo** (v0.5.9): pequeño, mediano o grande (debajo: 36, 42 o 48 px; en una fila: 32, 38 o 44 px); el alto reservado en la página se ajusta solo.
- **Logo en una fila** (corregido en v0.5.9): el logo conserva su «Ancho máximo» y el campo ocupa el resto (mínimo 112 px; si no cabe, el logo se reduce). Antes el logo quedaba limitado al 26 % del ancho de la pantalla. Para un campo más ancho, se baja el ancho del logo.
- **Al bajar** (corregido en v0.5.8): con «Solo la fila de arriba», el buscador queda con un margen de 8 px arriba (antes quedaba pegado al borde de la pantalla) y la fila de arriba se esconde al terminar de subir, así no asoma bajo la barra de estado en celulares con muesca.
- **Botones de la derecha** (v0.5.7): hasta 3, en el orden que se elija. Cada uno tiene una **acción** (enlace, WhatsApp, llamar, buscar, mi cuenta, carrito con contador, favoritos con contador), un **aspecto** (icono, o botón con texto como «Cotizar», «Agendar cita» o «Reservar», con icono opcional), un nombre o texto (en los iconos no se ve: lo leen los lectores de pantalla; vacío = el nombre de la acción) y su enlace o número. Atajos en el admin: «Tienda: cuenta y carrito», «Contacto: WhatsApp y llamar», «Botón Cotizar» y «Ninguno». Un botón sin destino no se imprime (el carrito sin WooCommerce, WhatsApp o llamar sin número, un enlace vacío). El botón con texto lleva por defecto los colores de la barra invertidos (el mismo contraste que los iconos); con «Colores propios» tiene fondo y texto propios con comprobación de contraste. Buscar como botón abre el mismo buscador aunque el campo de búsqueda esté apagado. Los perfiles anteriores conservan lo que tenían (los interruptores de cuenta y carrito se convierten en los botones equivalentes) y, si ya tenían colores propios, el botón con texto parte de la barra invertida.
- Su CSS va en el crítico solo si se usa, con solo las variantes elegidas (`assets/dist/appbar/`: forma, campo, vidrio, una fila, logo centrado, botón con texto). Presupuesto: el crítico con las dos barras y la variante más pesada de cada opción ≤ 2,1 KB gzip (2,08 KB en v0.5.8), comprobado en `npm run size` y su alto (52 px, 102 px con el buscador) queda reservado en el `<body>`: **CLS = 0**. Solo hasta el breakpoint (en escritorio no se muestra).
- **Colores** (v0.5.1): por defecto los de la cabecera del panel (`head_bg`, `head_fg`); con «Colores propios», fondo (sólido o degradado), iconos y texto, fondo y texto del buscador y el contador del carrito, con comprobación de contraste AA en el admin. Son los mismos en modo claro y oscuro. Se respeta la barra de administración de WordPress.
- **Logo** (v0.5.1): mostrar u ocultar (sin logo: el nombre del sitio), otra imagen solo para la barra (por ejemplo, el logo en blanco para un fondo oscuro), alto (16–44 px), ancho máximo (60–240 px) y posición (junto al menú o centrado). El tamaño se fija con `!important` dentro de una caja que recorta: un tema o un plugin de imágenes (WebP en `<picture>`, «height: auto» en todo `<img>`) no lo puede agrandar ni hacer que se salga de la barra. El logo del panel lateral tiene la misma protección.
- **Reemplazar la cabecera del tema** (v0.5.1): selector de la cabecera del tema (con sugerencias por tema: `#masthead`, `.site-header`, `header.wp-block-template-part`, `.elementor-location-header`…) que se oculta **solo en celulares y solo mientras la barra esté activa**; en escritorio la del tema sigue igual. Requiere `edit_css`.
- **SEO al reemplazar la cabecera**: la cabecera del tema sigue en el HTML (solo se oculta con CSS en celulares), así que Google, que indexa la versión móvil, encuentra sus enlaces igual que antes; no es *cloaking* porque todos reciben el mismo HTML. La barra y el panel también son enlaces reales renderizados en el servidor (logo → portada, cuenta, carrito y todo el menú), y el CSS reservado evita saltos (CLS 0). Recomendación: que el H1 de cada página esté en el contenido (WooCommerce ya pone el nombre del producto como H1) y no solo en la cabecera, porque el texto oculto con `display:none` pesa menos.

## M9. Diseño, estilos y presets — implementado en v0.3

Tres capas, todas editables en **Diseño** con vista previa en el celular:

1. **Estilos prediseñados** (galería con capturas reales en `assets/presets/*.webp`). Cada uno copia al perfil sus colores, su estilo visual y una estructura sugerida; después todo se ajusta y el admin muestra «Basado en «X» · personalizado» con «Restablecer estilo».

| Preset | Idea |
|---|---|
| Marketplace | Cabecera oscura con la cuenta, iconos en círculo suave, barra lateral en el ítem activo. |
| Aurora | Panel flotante, cabecera en degradado violeta → rosa, ítems en píldora, fondo desenfocado, rebote y entrada escalonada. |
| Ajustes | Grupos en tarjetas sobre gris e iconos multicolor (estilo app de Ajustes). |
| Editorial | Serif grande, líneas finas, sin iconos, flecha larga, insignias de contorno. |
| Material | Tarjeta de cuenta tonal, píldoras, tipografía redondeada. |
| Medianoche | Cristal oscuro translúcido con degradado índigo → cian. |
| Pop | Tarjetas, iconos multicolor, tipografía redondeada y rebote. |
| App de compras | Iconos en cuadros de acento, cuenta en tarjeta. |
| Minimal | Blanco y negro, sin iconos. |
| Corporativo | Separadores finos, iconos suaves, cuenta en tarjeta. |
| Fresco | Verde, tarjetas, degradado. |
| Oscuro premium | Negro y dorado, serif, líneas finas. |

2. **Estilo visual** (`design.style`): forma del panel (plano, redondeado, flotante, cristal), cabecera (sólida, degradado, minimal, tarjeta, imagen), ítems (lista, separadores, tarjetas, píldoras, agrupados), iconos (simples, círculo suave, cuadro de acento, multicolor, sin iconos), tipografía (del tema, sistema, redondeada, serif — siempre fuentes del sistema, nunca fuentes web), peso, títulos de sección (mayúsculas, negrita, acento), ítem activo (texto, barra, píldora), flecha (corta, larga, ninguna), insignias (sólida, suave, contorno), buscador (relleno, contorno, subrayado), fondo (oscurecer, desenfocar), sombra, movimiento (suave, ágil, con rebote) y entrada escalonada de los ítems.

3. **Tokens** de color y medidas (fondo, texto, acento, cabecera y su segundo color `head_bg2` para degradados, insignias, barra inferior, radio, alto de ítem, tamaño de letra, duración, intensidad del fondo), modo claro/oscuro/automático y CSS propio.

**Cómo se mantiene ligero**: cada opción no predeterminada es un archivo CSS pequeño (`frontend/css/styles/{opción}-{valor}.css`) y el compilador incluye **solo** los que usa el perfil. El peor caso (modo pestañas + la variante más pesada de cada opción) pesa 5,2 KB gzip; un preset típico, ~4 KB. El rebote solo se aplica a submenús e ítems (el panel nunca rebota para no dejar un hueco en el borde) y usa `linear()` con respaldo a `cubic-bezier`. Los efectos de :hover solo existen con ratón (`@media (hover: hover)`) para que no se queden pegados en táctiles; al tocar hay respuesta con `:active`. Los 12 presets pasan axe (WCAG 2 AA) con el panel abierto y en un submenú.

## M10. Analítica y conversión — fase 6

- **Clics por ítem** (agregados diarios en `imm_stats`, sin cookies ni datos personales): qué ítems se tocan, desde qué perfil y modo, profundidad media de navegación, aperturas del panel, uso de la barra inferior y del buscador.
- Pantalla con ranking de ítems, ítems nunca tocados (candidatos a quitar), embudo «abrió panel → tocó ítem».
- Envío de `navigator.sendBeacon` a un endpoint ligero propio (`/wp-json/imagina-menu/v1/hit`, con límite de tasa) o **solo** a GA4/`dataLayer` (`imm_menu_click`, `imm_menu_open`) si se prefiere no guardar nada en el servidor.
- Muestreo configurable (por defecto 100 %; bajar en sitios grandes).
- **Pruebas A/B** sencillas de ítems destacados o de modo de submenú: en una fase posterior a la 7 (requiere asignación en el cliente para no romper la caché).

## M11. Reglas de visualización — fase 5

Condiciones por perfil y por ítem: tipo de página (portada, entrada, página, archivo, búsqueda, 404), post type, taxonomía/término, páginas de WooCommerce (tienda, producto, carrito, checkout, cuenta), URL que contiene/coincide (patrón), usuario conectado/rol, idioma, fecha/hora (promos), ancho de pantalla (por CSS, no por PHP, para no fragmentar la caché por dispositivo).

**Importante**: nunca se detecta el dispositivo en PHP (user agent): rompería la caché de página. El «solo móvil» se resuelve con media queries.

### Dónde no se muestra (v0.5.6)

Ajustes → «Dónde no se muestra». En esas páginas no se carga **nada** del menú (ni HTML, ni CSS, ni JS, ni el botón del shortcode o del widget de Elementor). Es una lista global que se revisa antes que los perfiles:

| Opción | Por defecto | Cómo se decide |
|---|---|---|
| Plantillas en blanco | Sí | En el servidor: la página usa una plantilla cuyo nombre contiene `blank` o `canvas` (Elementor Canvas, «Blank Page» de Divi, plantillas «Blank» de temas de bloques). Las landings sin cabecera del tema. |
| Dentro de un iframe de otro sitio | Sí | En el navegador (la página en caché es la misma): un script mínimo en el `<head>` comprueba si la página está dentro de un marco de **otro origen** y marca `<html class="imm-framed">`; el CSS crítico oculta el botón flotante, las barras y los botones del menú, no reserva su espacio y no oculta la cabecera ni el menú del tema. En el propio sitio (incluida la vista previa del admin y el Personalizador, que son del mismo origen) se ve normal. |
| Páginas | — | En el servidor: páginas, entradas o productos concretos (por id; la tienda de WooCommerce también cuenta). |
| Direcciones (URL) | — | En el servidor: una ruta por línea, sin dominio ni parámetros (si se pega la URL completa se toma la ruta). La ruta contiene el texto (`/landing/` excluye esa página y lo de debajo), `*` es comodín (`/promo-*/gracias`) y `/` sola es la portada. Sin distinguir mayúsculas; hasta 50. Los demás caracteres se toman literalmente (no son expresiones regulares). |

Siempre, sin opción: dentro de los editores visuales (Elementor, Beaver Builder, Divi, Oxygen, Bricks, Brizy, Thrive, Breakdance), donde el menú taparía lo que se edita. Filtro para casos propios: `imm/excluded` (bool).

**Al revés** («que solo cargue donde yo decida»): dale condiciones al perfil general en Perfiles (por ejemplo «Página es…» o «La URL contiene…»); donde ningún perfil coincide, no se carga nada.

Todo se decide por URL, no por visitante: compatible con la caché de página (cada URL tiene un solo HTML) y sin consultas propias (la plantilla sale de la caché de metadatos de la consulta principal). Los cambios se aplican al publicar.

## M12. Integraciones — fases 4–6

| Integración | Qué hace |
|---|---|
| WooCommerce | Fuente de categorías con imágenes, cuenta, carrito (contador por cookie, mini-carrito opcional), ocultar en checkout. |
| Imagina Turbo | Si está activo: no emitir prefetch propio, usar su purga, respetar su navegación (View Transitions), evento de carrito de su Store API. |
| Imagina Search (Woo Smart Search) | Su widget dentro del buscador del menú (v0.4, ver M7). |
| WPML / Polylang / TranslatePress | Compilar por idioma, registrar textos, selector de idioma. |
| Elementor | **v0.5**: widget nativo «Botón de Imagina Menu» (texto, estilo, color, solo escritorio/celular). |
| YITH / TI WooCommerce Wishlist | **v0.5**: acción «Favoritos» e insignia con contador en la barra inferior (probado con YITH 4.21). |
| WP-CLI | **v0.5**: `wp imagina-menu status | publish | recompile [--no-purge] | export [--file=] | import <archivo> [--settings] [--enable] [--publish]` para replicar la configuración entre sitios. |
| Gutenberg | Bloque «Botón de menú» (sin JS en el front) y patrón de cabecera móvil. |
| LiteSpeed Cache / WP Rocket / Perfmatters / FlyingPress | Detección y recomendaciones: el script module de `core` puede retrasarse sin problema (la apertura no depende de él), pero no debe combinarse con otros archivos. Purga al recompilar. |
| Plugins de moneda | Selector en el pie del panel. |

## M13. Accesibilidad e i18n — transversal

- Roles y atributos: `nav` con `aria-label`, `aria-expanded`, `aria-controls`, `aria-current="page"`, anuncios en vivo al cambiar de nivel («Celulares, 12 elementos»).
- Teclado: Tab/Shift+Tab dentro del panel, Esc cierra o vuelve un nivel (configurable), flecha derecha entra al submenú y flecha izquierda vuelve.
- Contraste: el admin avisa si la combinación de colores no cumple AA.
- RTL completo (los lados y las animaciones se invierten con propiedades lógicas: `inset-inline-start`, `translate` con `--imm-dir`).
- Todos los textos traducibles; los textos del usuario, registrables en WPML/Polylang.

## M14. Escritorio — implementado en v0.4

Cómo lo hacen las tiendas grandes en computador (y por qué hay clientes que lo quieren igual):

| Tienda | Botón | Qué abre |
|---|---|---|
| Amazon, Walmart | «☰ Todo» / «Departamentos» a la izquierda de la cabecera | El **mismo panel** del celular (~365 px), con submenús que se deslizan y flecha de regreso. |
| Falabella (y Linio, que se integró a Falabella) | «☰ Menú» junto al logo | La lista de categorías a la izquierda y, **al pasar el mouse**, una columna ancha a la derecha con las subcategorías agrupadas («Ver todo …»). |
| Mercado Libre, AliExpress, Temu, Shein | «Categorías» | Lista a la izquierda y subcategorías a la derecha al pasar el mouse (con fotos en Temu/Shein). |

Opciones por perfil (`desktop`, pantalla **Escritorio** del admin):

| Opción | Valores | Por defecto |
|---|---|---|
| Usar el menú en escritorio | sí / no (sin activarlo, el panel se abre en escritorio solo con el bloque o el shortcode, con el ancho del celular) | no |
| Estilo | **Panel** (Amazon) o **Cascada** (Falabella, Mercado Libre; necesita el modo deslizante o rejilla) | panel |
| Ancho del panel | 280–640 px | 380 px |
| Ancho de la columna de subcategorías | 320–1000 px (con ≥ 600 px se reparten en varias columnas) | 640 px |
| Abrir al pasar el mouse | cascada y dos columnas/pestañas (con 90 ms de intención para cruzar en diagonal) | sí |
| Botón | bloque «Botón de Imagina Menu» o `[imagina_menu_toggle label="Todo" only="desktop" style="solid"]` en la cabecera; un **elemento del tema** (selector, p. ej. `.imm-open > a`, solo con `edit_css`); o el botón flotante también en escritorio | — |
| Barra inferior en escritorio | sí / no | no |

Notas:

- El ancho de corte es el `breakpoint` de Ajustes (escritorio = más ancho). Todo se decide con CSS: nada depende del dispositivo en PHP (compatible con la caché de página).
- La cascada usa el mismo HTML del celular: el compilador añade `cascade.css` dentro de `@media (min-width: …)` y `desktop.js` (0,9 KB gzip) se descarga **solo en pantallas anchas** y solo si el perfil la usa. Mueve los niveles con la API pública del menú (`immMenu.goTo`): el estado sigue en `core.js`.
- Teclado: flecha derecha abre la columna y enfoca su primer enlace; flecha izquierda vuelve; Esc cierra. Los títulos de grupo llevan a la página del grupo.
- Si la barra inferior es la que abre el panel en el celular, el botón flotante de escritorio se genera solo para escritorio (`imm-only-desktop`).

## M15. Campañas programadas — implementado en v0.5

Hot Sale, CyberLunes, Black Friday, Navidad: lo que se enciende y se apaga solo.

- **Perfiles**: condición «Fechas (campaña)» (desde / hasta, cualquiera opcional) en el editor de reglas. Ejemplo: un perfil «Black Friday» con otro menú, otros colores y banners, del 27 al 30 de noviembre.
- **Ítems**: campo «Campaña» en el constructor; fuera de sus fechas el ítem no se compila.
- **Banners**: fechas por banner.

Cómo funciona sin romper la caché: las fechas se escriben en la hora del sitio (`datetime-local`). Al publicar, el compilador reúne los inicios y fines futuros y agenda **un** evento de WP-Cron (`imm_schedule_tick`) en el próximo. Ese evento recompila (los ítems y banners entran o salen del HTML) y vacía la caché del sitio (los perfiles por fecha cambian de página sin que cambie el HTML), y agenda el siguiente. Las reglas por fecha comparan marcas de tiempo precalculadas: cero consultas por visita. Con WP-Cron por visitas (sin cron del sistema), el cambio ocurre con la primera visita después de la hora; en ServerAvatar/Plesk conviene el cron del sistema (como ya recomienda WordPress).

