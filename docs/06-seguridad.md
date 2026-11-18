# 06 — Seguridad

Auditoría completa el 18-11-2026 (v0.3.1): revisión propia + dos revisores independientes (PHP y JavaScript del sitio y del admin), con cada hallazgo confirmado en un WordPress real y corregido con su prueba de regresión. Ningún hallazgo crítico ni alto; se corrigieron todos los medios y bajos (detalle al final).

## Modelo de amenazas

| Quién | Qué puede tocar | Qué no debe poder hacer |
|---|---|---|
| Visitante anónimo | Páginas públicas, `POST /hit` (analítica), cookies y localStorage de su navegador | Ejecutar código, leer archivos privados, inflar las estadísticas, tumbar el sitio |
| Autor o colaborador | Contenido de entradas (sin `unfiltered_html`) | Desviar o romper el menú metiendo atributos o ids en una entrada |
| Usuario con `imm_manage` sin `edit_css` (p. ej. gestor de tienda) | Menús, perfiles, diseño, analítica por la API del plugin | CSS global, selectores que ocultan o capturan partes del tema, borrar datos al desinstalar, cookie con nombres, leer contenido privado |
| Editor o gestor **sin** `imm_manage` | Lo que su rol permite en WordPress | Escribir o borrar los datos del menú por cualquier vía (XML-RPC, edición rápida…) |
| Quien tenga un enlace de vista previa | Ver los borradores del menú durante 30 min | Usarlo para forzar compilaciones costosas o para nada más |
| Paquete de terceros comprometido (iconos, dependencias del admin) | El build | Inyectar código en el sitio |

## Defensas por capa

**Entrada de datos**
- `Model\Normalizer`: lista blanca guiada por los valores por defecto. Enumerados cerrados (también los nombres de archivos de estilo: sin rutas), números con rango, colores hexadecimales, ids `[a-z0-9_]`, iconos por expresión regular contra una biblioteca fija, URLs solo `http(s)`, `mailto`, `tel`, relativas o anclas (`//x` → `https://x`), selectores CSS sin `{ } ; < /* */ @`, sin barra final y con paréntesis, corchetes y comillas equilibrados, CSS propio sin `<`, `@import` ni `expression(`.
- Límites: 1.500 ítems, profundidad 6, 20 condiciones × 200 ids, 30 menús/perfiles por importación, cuerpo de `/hit` ≤ 256 bytes.

**Permisos**
- API REST: `imm_manage` + nonce `wp_rest` en todo salvo `/hit`. Los ids se comprueban contra el tipo de contenido.
- Los CPT `imm_menu` e `imm_profile` usan permisos propios mapeados a `imm_manage` (no los de páginas) y solo se escriben desde `JsonPostRepository`: cualquier otra vía (XML-RPC, edición rápida, otros plugins) se aborta (`wp_insert_post_empty_content`, `pre_delete_post`, `pre_trash_post`); además, en WordPress 7.1.1+, `xmlrpc_allow_post_type_writes` los excluye.
- CSS propio y selectores del tema: solo con `edit_css` (como el «CSS adicional» de WordPress); a los demás se les conserva el valor (el admin los muestra bloqueados).
- «Borrar al desinstalar», «cookie con el nombre» e importar ajustes globales: solo con `manage_options`.
- La búsqueda de contenidos, los nombres de las reglas, las URLs del constructor y las fuentes dinámicas solo muestran contenido publicado, sin contraseña, de tipos y taxonomías públicos.

**Salida**
- Todo el HTML se escapa al compilar (`esc_html`, `esc_attr`, `esc_url`); el nombre del usuario y el selector de idioma se insertan escapados en tiempo de ejecución.
- `config-{hash}.php` se escribe con `var_export` de arrays y escalares (sin objetos ni código del usuario) y empieza con la comprobación de `ABSPATH`.
- El cargador inline usa `wp_get_inline_script_tag` (compatible con nonces de CSP).
- El JS no usa `innerHTML`, `eval` ni nada equivalente: todo texto va con `textContent`.

**Archivos**
- Todos los PHP cortan si se piden directo por URL (`defined( 'ABSPATH' ) || exit`). Las carpetas llevan `index.php`.
- La cola de analítica y los temporales de la carpeta privada son `.php` (con `exit`) de nombre impredecible: no se pueden descargar aunque el servidor ignore `.htaccess` (OpenLiteSpeed, nginx).
- Escritura atómica (temporal aleatorio + `rename`). La configuración cambia de nombre en cada compilación y una opción con autocarga apunta a la vigente: OPcache nunca sirve una versión vieja (compilaciones por WP-CLI o cron del sistema, `validate_timestamps=0`).
- `bin/build-zip.sh` empaqueta por lista blanca: ni tests, ni herramientas, ni documentación, ni `composer.*`/`package*`, ni mapas de fuentes. Falla si algún PHP no tiene la protección de acceso directo.

**Endpoint público `/hit`**
- Solo existe con la analítica en el servidor activa; responde siempre 204.
- Solo acepta eventos conocidos y ítems que existen en el menú publicado; rechaza envíos de otros sitios (`Sec-Fetch-Site`, `Origin`).
- Nada de base de datos por petición: una línea en la cola (con cerrojo y cabecera garantizada); se agrega cada 5 min.
- Antirrelleno al agregar: por visitante anónimo (hash diario de IP + navegador; sin guardar la IP) 60 eventos/día y 3 por ítem; por IP 400/día y 50 por ítem (aunque se cambie de navegador). `CF-Connecting-IP` solo se cree si la conexión viene de los rangos de Cloudflare. Con APCu, además, freno de 120 peticiones/min por IP. Con la cola casi llena se muestrea en vez de perderlo todo.
- Medido: 300 clics falsos → 0 (ids inventados); 150 clics de un mismo origen → 3; 120 cambiando de navegador → 50.

**Frontend (JS)**
- Configuración leída solo de los nodos propios (`dialog#imm-drawer.imm-drawer`…) y validada; la analítica solo se envía al mismo origen. Un `data-imm-cfg` o un `id="imm-drawer"` en una entrada no desvía ni rompe nada.
- Cookies y localStorage se validan; cada parte del JS arranca aislada (un fallo no deja al resto sin funcionar) y el popover solo se intercepta cuando su JS está listo.
- Precarga (solo si ni WordPress 6.8+ ni Imagina Turbo la hacen): nunca URLs con parámetros (`?add-to-cart=`), `wp-login`/`wp-admin`/`wp-content`, descargas, `nofollow`/`sponsored`/`ugc`, `.no-prefetch` ni con ahorro de datos; con el dedo espera intención y se cancela si es un desplazamiento.
- Iconos: lista blanca de elementos y atributos geométricos al compilar `icons.json`.

**Vista previa**
- Token HMAC-SHA256 (sales de WordPress), formato y caducidad estrictos (30 min), comparado con `hash_equals`, inválido si el usuario pierde `imm_manage`.
- Respuestas `no-store`, `DONOTCACHEPAGE`, sin caché de LiteSpeed, `X-Robots-Tag: noindex` y `Referrer-Policy: no-referrer`. Sin analítica.
- La compilación del borrador se guarda 10 min por revisión: un enlace filtrado no fuerza compilaciones.

**Rendimiento como seguridad (DoS)**
- Cero consultas propias por visita (las reglas por categoría llevan las subcategorías precalculadas). `admin_init` no hace trabajo en `admin-ajax.php` ni para visitantes; la actualización tras cambiar de versión se agenda en WP-Cron con cerrojo atómico.
- Compilación con cerrojo atómico; si el resultado no cambió, no se reescribe ni se vacía la caché del sitio.

## Riesgos aceptados (documentados)

- **Dependencias de compilación del admin**: `picomatch` (vía Vite) tiene un aviso de ReDoS que afecta a todas sus versiones publicadas. Solo corre al compilar el admin en la máquina de desarrollo; nunca en el sitio. Las dependencias que llegan al navegador: 0 avisos.
- **Vista previa dentro del admin**: el iframe es del mismo origen y sin `sandbox` (hace falta para abrir el panel desde el admin). Un script de terceros cargado en el sitio podría leer el nonce del admin desde ahí, lo mismo que ya puede hacer cuando un administrador navega el sitio con su sesión.
- **El token de vista previa va en la URL** (QR, historial, analítica de terceros del sitio): da acceso solo a ver los borradores del menú durante 30 min.
- **CSS propio** (solo administradores) puede usar `url()` a otros dominios; es decisión de quien lo escribe.
- **Analítica**: es imposible distinguir con certeza un clic real de uno falso sin rastrear a la persona; los topes acotan el daño, no lo eliminan. No es un dato de seguridad.

## Recomendaciones de servidor

- OpenLiteSpeed y nginx no leen `.htaccess`: no hace falta configurar nada (los archivos privados son `.php` que no devuelven nada), pero se puede reforzar con una regla que niegue `wp-content/imagina-menu/`.
- Plugins de optimización: no combinar ni retrasar por separado `assets/dist/core.js`, `track.js` y `prefetch.js` (los dos últimos se cargan bajo demanda junto a `core.js`); excluir `.imm-` de «CSS no usado» (ver `docs/03`).

## Antes de cada versión

```bash
composer test && npm run size && (cd admin && npm audit --omit=dev)
IMM_URL=http://sitio-de-pruebas npm run test:e2e
bash bin/release.sh   # empaqueta con bin/build-zip.sh y publica en la rama release
```

## Hallazgos de la auditoría del 18-11-2026 (todos corregidos)

| Gravedad | Hallazgo | Corrección |
|---|---|---|
| Media | Editores y gestores sin `imm_manage` podían escribir los datos del menú por XML-RPC (permisos de páginas) y saltarse el bloqueo de CSS | Permisos propios + escritura solo desde el repositorio + filtro de XML-RPC |
| Media | `/hit` aceptaba ids inventados y relleno ilimitado; la cola era descargable en OpenLiteSpeed/nginx | Ids válidos, topes, origen, cola `.php` |
| Media | Un JSON con comillas o barras se guardaba roto (menú vacío) y kses alteraba el JSON | `wp_slash` y escritura sin kses solo para el JSON validado |
| Media | Precarga de URLs con efectos (`?add-to-cart=`, cerrar sesión, afiliados) al desplazarse | Exclusiones e intención; módulo bajo demanda |
| Media | CSS compilado desde CLI quedaba en `http://` (contenido mixto) y OPcache podía servir config vieja | Esquema en tiempo de ejecución y config con nombre versionado |
| Baja–media | `data-imm-cfg` o ids del contenido podían desviar la analítica o romper el menú | Nodos propios y validación |
| Baja–media | Cada recompilación vaciaba toda la caché aunque nada cambiara | Se compara el hash |
| Baja | Datos privados (borradores, cupones…) visibles para `imm_manage` vía reglas, URLs y fuentes | Solo contenido y taxonomías públicos |
| Baja | Ajustes del dueño (borrar al desinstalar, cookie con nombres) abiertos a `imm_manage`; CSS a usuarios sin `edit_css` | `manage_options` / `edit_css` |
| Baja | Trabajo en `admin_init` para visitantes de `admin-ajax.php` | Solo usuarios del plugin; actualización en cron |
| Baja | Reglas por categoría hacían consultas por visita | Subcategorías precalculadas |
| Baja | Cookie o localStorage malformados detenían el JS; cookie del nombre doblemente codificada | Validación, arranque aislado, `setrawcookie` |
| Baja | Analítica desde la vista previa; pestaña con `opener`; token de 1 h que forzaba compilaciones | Sin analítica, sin opener, 30 min y caché |
| Baja | Saneador de selectores rompía `>` y escapes y no impedía comentarios ni comillas abiertas | Nuevo saneador con equilibrio |
| Baja | Archivos de desarrollo y docs accesibles por URL; PHP con error 500 al pedirlos directo | ZIP por lista blanca y `ABSPATH` en todos |
| Baja | Enlaces de búsquedas populares sin codificar; JSON malformado → 500; `wp_login` con un argumento → fatal | Corregidos |
| Info | Restos al desinstalar, revisiones ilimitadas, temporales legibles, iconos sin validar, bloque sin dependencias, cargador sin nonce CSP | Corregidos |
