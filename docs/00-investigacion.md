# 00 — Investigación: cómo navegan las grandes tiendas en el celular

> Análisis de patrones de UX de las webs móviles (no las apps nativas) de los grandes marketplaces, más una revisión de los plugins de menú móvil de WordPress. Los detalles visuales de estas webs cambian a menudo: lo que importa son los patrones, no los píxeles. Antes de la fase 1 conviene capturar pantallazos actuales en un celular real para el tablero de referencia.

## 1. Patrones de las grandes marcas

### Amazon (web móvil)

- **Disparador**: hamburguesa en la barra superior, a la izquierda del logo. Arriba siempre está la búsqueda (es su navegación principal).
- **Panel**: drawer desde la izquierda que ocupa ~85 % del ancho; detrás queda una capa oscura y una "X" fuera del panel.
- **Cabecera del panel**: saludo personalizado ("Hola, inicia sesión" / "Hola, Juan") con icono de cuenta. Es un gancho de conversión: empuja al login.
- **Secciones con títulos** separadas por divisores: "Tendencias", "Contenido digital", "Comprar por categoría", "Programas", "Ayuda y configuración". Cada sección muestra pocos ítems y un "Ver todo".
- **Drill-down horizontal**: al tocar una categoría, el nivel actual se desliza a la izquierda y entra el submenú desde la derecha. Arriba aparece "← MENÚ PRINCIPAL" para volver. Es exactamente el patrón que se quiere.
- **Lección**: jerarquía clara, títulos de sección, "Ver todo" en cada nivel, saludo de cuenta arriba y ayuda/idioma abajo.

### Mercado Libre (web móvil)

- Hamburguesa que abre un **panel a pantalla completa** desde arriba con lista de iconos + texto: Inicio, Ofertas, Historial, Supermercado, Moda, Vender, Ayuda, y luego "Categorías".
- Cabecera amarilla con botón grande "Ingresa / Crea tu cuenta" (bloque de conversión).
- **Lección**: iconos en cada ítem de primer nivel mejoran el escaneo; el CTA de cuenta grande convierte.

### AliExpress (web móvil)

- **Barra inferior** tipo app: Inicio, Categorías, Carrito (con insignia), Cuenta. Es su navegación principal; el drawer casi no existe.
- **Pantalla de categorías en dos columnas**: a la izquierda un rail vertical de categorías de primer nivel (la activa resaltada con color y barra lateral); a la derecha subcategorías como **rejilla de imágenes circulares/cuadradas con texto**, agrupadas por títulos.
- Banners de campañas dentro de la pantalla de categorías.
- **Lección**: el modo "dos columnas" es el mejor para catálogos grandes; las imágenes en las subcategorías venden más que el texto plano.

### Temu (web móvil)

- **Barra inferior** muy visual: Inicio, Categorías, Tú/Cuenta, Carrito, con insignias y colores de marca fuertes.
- Categorías en **dos columnas** con imágenes de producto real como icono de subcategoría; rail izquierdo con fondo gris claro y el activo en blanco.
- Insignias de urgencia ("Ofertas", "-70 %", "Tiempo limitado") y mucho color en los acentos.
- **Lección**: insignias por ítem y colores de acento llamativos aumentan clics; las imágenes deben cargarse solo cuando se ve la categoría (lazy).

### Shein (web móvil)

- Categorías con **pestañas superiores** (Mujer, Hombre, Niños, Hogar…) que cambian todo el árbol, debajo un rail izquierdo y una rejilla de imágenes.
- **Lección**: el modo "pestañas" sirve cuando el catálogo tiene varios públicos o departamentos.

### Linio / Falabella (web móvil)

- Hamburguesa con drawer y **submenús que se deslizan**, cabecera con cuenta y accesos a "Mis pedidos", "Ayuda", "Vende con nosotros".
- **Lección**: los accesos de servicio (pedidos, ayuda, contacto) en el pie del drawer reducen fricción.

### Patrones comunes que adoptamos

| Patrón | Dónde | Módulo en Imagina Menu |
|---|---|---|
| Drill-down horizontal con flecha de regreso y título del padre | Amazon, Linio | Modo de submenú **Deslizante** (por defecto) |
| Rail izquierdo + rejilla de imágenes | AliExpress, Temu, Shein | Modo **Dos columnas** |
| Pestañas de departamento arriba | Shein | Modo **Pestañas** |
| Barra inferior con insignias | AliExpress, Temu, Mercado Libre app | Módulo **Barra inferior** |
| Saludo y CTA de cuenta en la cabecera del panel | Amazon, Mercado Libre | Bloque **Cuenta** |
| Secciones con título y "Ver todo" | Amazon | Bloque **Sección** + opción "Ver todo" por ítem |
| Insignias "Nuevo", "-50 %", "Hot" | Temu, AliExpress | Opción **Insignia** por ítem |
| Iconos en primer nivel | Mercado Libre | Opción **Icono** por ítem (Lucide + SVG propio) |
| Banners de campaña dentro del menú | AliExpress, Temu | Bloque **Banner/Promo** con fechas |
| Búsqueda omnipresente | Todas | Módulo **Buscador** (overlay) integrado con Imagina Search |
| Ayuda, pedidos, contacto al pie | Amazon, Linio | Bloque **Enlaces de servicio** + **WhatsApp** |

## 2. Principios de UX que se derivan

1. **Zona del pulgar**: en celular el 75 % de las interacciones son con el pulgar. La barra inferior y un drawer que se puede cerrar deslizando son más alcanzables que una "X" arriba a la derecha. Opción de poner el botón de cerrar abajo.
2. **Máximo 5 ítems** en la barra inferior (Material Design y Apple HIG recomiendan 3–5). Con etiquetas siempre visibles: los iconos solos se entienden peor.
3. **Objetivos táctiles ≥ 48 × 48 px** (Lighthouse y WCAG 2.2 piden ≥ 24 px, Google recomienda 48).
4. **Contexto en el drill-down**: el título del nivel actual y "← Volver a {padre}" siempre visibles. El usuario nunca debe preguntarse dónde está.
5. **"Ver todo {categoría}"** como primer ítem de cada submenú: el padre también es un destino (si no, el usuario no puede ir a la página de la categoría padre).
6. **Animación corta**: 200–300 ms con curva de desaceleración; con `prefers-reduced-motion` se reemplaza por un fundido.
7. **Gestos**: deslizar a la derecha = volver un nivel; deslizar el panel hacia su borde = cerrar. Siempre con equivalente por botón.
8. **Recordar el estado**: al reabrir el panel en la misma sesión, volver al último nivel visitado (opcional) y marcar la página actual.
9. **No bloquear el scroll de forma brusca**: bloquear el scroll del `body` mientras el panel está abierto, sin saltos (compensar la barra de scroll en escritorio).
10. **Conversión**: CTA de cuenta arriba, promos con fecha de vencimiento, insignias de urgencia, contacto por WhatsApp a un toque, contador del carrito visible.

## 3. Plugins de WordPress existentes (competencia)

| Plugin | Lo bueno | Lo malo (lo que no repetiremos) |
|---|---|---|
| WP Mobile Menu (Mobmenu) | Popular, barra superior + drawer, WooCommerce | jQuery, CSS grande, muchas opciones guardadas como `autoload`, estilos inline extensos, fuentes de iconos completas |
| Responsive Menu | Muy configurable | jQuery, CSS generado enorme, admin anticuado |
| Max Mega Menu | Excelente en escritorio | Pensado para escritorio; en móvil es un acordeón básico; jQuery |
| ShiftNav | Drawer limpio | jQuery, sin drill-down real en la versión gratuita, sin barra inferior |
| Superfly | Visualmente vistoso | Pesado, carga todo siempre, varias fuentes |
| QuadMenu / UberMenu | Potentes | Escritorio primero, peso alto |
| Plugins de "bottom navigation" sueltos | Barra inferior simple | Sin integración con el drawer, sin insignias reales, a veces con fuentes de iconos completas (Font Awesome entero) |
| Menús de constructores (Elementor, Divi) | Integrados en el tema | Construidos con JS, DOM pesado, a veces enlaces generados en cliente |

**Hueco de mercado**: ningún plugin combina (a) drill-down horizontal de calidad app, (b) modo dos columnas con imágenes estilo AliExpress/Temu, (c) barra inferior integrada con el drawer y el carrito, (d) un presupuesto de rendimiento estricto sin jQuery y (e) un admin moderno con vista previa en un celular. Ese es el posicionamiento de Imagina Menu.

## 4. Errores frecuentes que hunden PageSpeed en los menús

- Cargar jQuery u otra librería solo para abrir un panel.
- Fuentes de iconos completas (Font Awesome: 70–150 KB) para usar 8 iconos.
- Construir el menú con JS después de cargar (los enlaces no existen para el rastreador y aparece CLS).
- Insertar barras fijas sin reservar espacio (el contenido salta → CLS) o insertar el botón en la cabecera con JS después del primer pintado.
- Imágenes de categorías cargadas al inicio aunque el panel esté cerrado.
- DOM enorme: menús de WooCommerce con cientos de categorías renderizadas en todos los niveles (Lighthouse avisa con > 1 400 nodos).
- Escuchar `scroll` sin `passive: true` o con trabajo pesado (afecta INP).
- `setTimeout` de animación con `left`/`width` en lugar de `transform` (provoca layout y jank).
