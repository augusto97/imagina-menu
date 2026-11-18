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

Implementado (v0.1): si la barra inferior ya tiene un ítem que abre el panel, el botón flotante no se imprime.

Compatibilidad verificada (v0.2, Playwright en móvil, `tests/e2e/themes.cjs`): el botón del tema abre el panel de Imagina Menu (y no el menú del tema) en **Twenty Twenty-Five, Astra, Kadence, Blocksy, GeneratePress, Storefront y OceanWP**. **Hello Elementor** no imprime botón de menú sin el constructor de cabeceras de Elementor: no se sugiere su selector y, como red de seguridad en el modo «botón del tema», si el selector no encuentra ningún botón visible el JS muestra el botón flotante de respaldo. WoodMart y Flatsome (de pago) no se pudieron probar. En una instalación nueva con un tema conocido, el botón del menú móvil del tema abre el panel (modo `theme_selector`, sugerido automáticamente).

**Aceptación**: abrir/cerrar funciona con JS desactivado (Chrome, Safari ≥ 17, Firefox ≥ 125); el botón tiene nombre accesible; el selector del tema funciona con Astra, GeneratePress, Kadence, Blocksy, Hello Elementor, WoodMart y Flatsome (lista de selectores sugeridos en el admin).

## M2. Panel lateral (drawer) — fase 1

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

**Decisión de UX importante**: el texto del ítem padre es un enlace real a la categoría y la flecha `›` es el botón que abre el submenú (dos áreas táctiles). Opción alternativa «toda la fila abre el submenú» + «Ver todo {padre}» como primer ítem del submenú (patrón Amazon). Ambas disponibles; la segunda por defecto en móvil porque es más fácil de tocar.

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

## M5. Bloques del panel — fases 1–4

Piezas que se colocan en la cabecera, entre ítems o en el pie del panel.

| Bloque | Qué hace | Fase |
|---|---|---|
| **Cuenta** | «Hola, inicia sesión» + botón «Ingresar/Registrarse» (o «Hola, {nombre}» + accesos «Mis pedidos», «Favoritos», «Salir»). Con WooCommerce usa los endpoints de Mi cuenta. | 1 |
| **Buscador** | Campo que abre el overlay de búsqueda (M7). | 1 |
| **Sección** | Título + lista de ítems + «Ver todo». | 1 |
| **Enlaces de servicio** | Ayuda, pedidos, contacto, devoluciones. | 1 |
| **WhatsApp / Llamar** | Botón con número y mensaje predefinido (`wa.me`), horario de atención opcional. | 2 |
| **Redes sociales** | Iconos (SVG del sprite). | 2 |
| **Banner / Promo** | Imagen o tarjeta con texto, CTA, color, fechas de inicio/fin y cuenta regresiva opcional (JS bajo demanda). | 3 |
| **Rejilla de categorías** | Tarjetas con imagen (Woo o manual), 2–4 columnas. | 4 |
| **Botón CTA** | Botón grande («Vende con nosotros», «Agenda tu cita»). | 2 |
| **Idioma** | WPML / Polylang / TranslatePress. | 5 |
| **Moneda** | WOOCS / CURCY / Aelia (si existen). | 5 |
| **Modo oscuro** | Interruptor (solo si el tema lo soporta o se usa el modo oscuro del menú). | 5 |
| **Vistos recientemente** | Desde localStorage (sin consultas). | 6 |
| **HTML / Shortcode** | Contenido libre, con aviso de rendimiento (los shortcodes se renderizan al compilar, no en cada visita, cuando son estáticos). | 3 |

## M6. Barra de navegación inferior — fase 3

La «app» dentro de la web.

| Opción | Valores | Por defecto |
|---|---|---|
| Ítems | 2–5 (aviso por encima de 5) | Inicio, Categorías, Buscar, Carrito, Cuenta |
| Acción por ítem | enlace, abrir panel (con modo y nivel inicial), abrir buscador, carrito (página o mini-carrito en hoja inferior), cuenta, WhatsApp, llamar, volver arriba, compartir (Web Share API), abrir un perfil distinto | — |
| Estilo | iconos + etiquetas, solo iconos, etiqueta solo en el activo | iconos + etiquetas |
| Indicador del activo | color, píldora detrás del icono (Material 3), línea superior, punto | píldora |
| Botón central destacado | círculo elevado con color de acento (estilo «vender» / «buscar») | apagado |
| Insignias | contador del carrito, favoritos, número libre, punto | carrito |
| Comportamiento | fijo, ocultar al bajar y mostrar al subir, ocultar en páginas concretas (checkout) | ocultar al bajar |
| Forma | barra completa, flotante con bordes redondeados y margen («isla») | barra completa |
| Fondo | color, transparencia con desenfoque, borde superior, sombra | sólido |
| Área segura | `env(safe-area-inset-bottom)` siempre | — |
| Reserva de espacio | `padding-bottom` en `body` (o selector) para no tapar el pie de página | encendido |
| Háptica | `navigator.vibrate(10)` opcional en Android | apagado |

Reglas: se oculta automáticamente en checkout y cuando el teclado virtual está abierto (`visualViewport`), y en escritorio salvo que se pida.

**Aceptación**: CLS = 0 con la barra activa (el espacio se reserva en el CSS crítico); el ítem activo se marca sin JS (vía `aria-current` del servidor); contador del carrito correcto tras añadir un producto con AJAX sin recargar; el ocultar-al-scroll no aumenta el INP (listener pasivo + `requestAnimationFrame`).

## M7. Buscador (overlay) — fase 4

- Overlay a pantalla completa con campo enfocado y teclado abierto al instante (el input existe en el HTML; el foco se da en el mismo gesto del usuario para que iOS abra el teclado).
- Búsquedas recientes (localStorage), búsquedas populares (configurables) y categorías sugeridas.
- **Con Imagina Search activo**: delega en su motor y su UI de resultados (integración, no reimplementación).
- Sin Imagina Search: formulario normal a `/?s=` (y `post_type=product` si hay WooCommerce). Sugerencias en vivo opcionales con la Store API de productos (con `debounce`, solo tras 3 caracteres).

## M8. Barra superior móvil (app bar) — fase 5, opcional

Para temas cuya cabecera móvil es mala: barra fija con hamburguesa, logo, buscar y carrito; opción de buscador siempre visible debajo (patrón Amazon/Mercado Libre) y ocultar al bajar. Reemplaza la cabecera del tema en móvil vía selector. Riesgo de CLS: se reserva el alto en el CSS crítico.

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

## M12. Integraciones — fases 4–6

| Integración | Qué hace |
|---|---|
| WooCommerce | Fuente de categorías con imágenes, cuenta, carrito (contador por cookie, mini-carrito opcional), ocultar en checkout. |
| Imagina Turbo | Si está activo: no emitir prefetch propio, usar su purga, respetar su navegación (View Transitions), evento de carrito de su Store API. |
| Imagina Search | Delegar el buscador. |
| WPML / Polylang / TranslatePress | Compilar por idioma, registrar textos, selector de idioma. |
| Elementor | Widget «Botón Imagina Menu» y aviso para excluir el script del «delay JS» de Elementor si aplica. |
| Gutenberg | Bloque «Botón de menú» (sin JS en el front) y patrón de cabecera móvil. |
| LiteSpeed Cache / WP Rocket / Perfmatters / FlyingPress | Detección y recomendaciones: el script module de `core` puede retrasarse sin problema (la apertura no depende de él), pero no debe combinarse con otros archivos. Purga al recompilar. |
| Plugins de favoritos (YITH, TI) | Contador en la barra inferior — fase 7. |
| Plugins de moneda | Selector en el pie del panel. |

## M13. Accesibilidad e i18n — transversal

- Roles y atributos: `nav` con `aria-label`, `aria-expanded`, `aria-controls`, `aria-current="page"`, anuncios en vivo al cambiar de nivel («Celulares, 12 elementos»).
- Teclado: Tab/Shift+Tab dentro del panel, Esc cierra o vuelve un nivel (configurable), flecha derecha entra al submenú y flecha izquierda vuelve.
- Contraste: el admin avisa si la combinación de colores no cumple AA.
- RTL completo (los lados y las animaciones se invierten con propiedades lógicas: `inset-inline-start`, `translate` con `--imm-dir`).
- Todos los textos traducibles; los textos del usuario, registrables en WPML/Polylang.
