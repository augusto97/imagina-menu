// Presupuesto de rendimiento (docs/03): falla si algún archivo lo supera.
import { readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';

// La barra inferior y la superior van en el CSS crítico solo si el perfil las usa, con solo las
// variantes elegidas (bbar/, appbar/). Peor caso: la variante más pesada de cada opción.
const dist = 'assets/dist/';
const size = ( f ) => readFileSync( dist + f ).length;
const heaviestOf = ( files ) => files.reduce( ( a, b ) => ( size( a ) >= size( b ) ? a : b ) );
const bbarWorst = [ 'bbar.css', heaviestOf( [ 'bbar/ind-pill.css', 'bbar/ind-line.css', 'bbar/ind-dot.css' ] ), 'bbar/labels-hidden.css', heaviestOf( [ 'bbar/floating.css', 'bbar/rounded.css' ] ), 'bbar/blur.css', 'bbar/main.css' ];
// El logo centrado y la distribución en una fila no van juntos.
const appbarWorst = [ 'appbar.css', heaviestOf( [ 'appbar/shape-curved.css', 'appbar/shape-floating.css', 'appbar/shape-line.css' ] ), heaviestOf( [ 'appbar/field-rounded.css', 'appbar/field-soft.css' ] ), 'appbar/glass.css', heaviestOf( [ 'appbar/inline.css', 'appbar/center.css' ] ), heaviestOf( [ 'appbar/size-sm.css', 'appbar/size-lg.css' ] ), 'appbar/cta.css' ];
const fabWorst = [ 'fab.css', heaviestOf( [ 'fab/bottom-left.css', 'fab/bottom-right.css', 'fab/top-left.css', 'fab/top-right.css' ] ), 'fab/shape-rounded.css', heaviestOf( [ 'fab/style-light.css', 'fab/style-glass.css' ] ) ];
// Peor caso: el botón flotante y la barra inferior con la variante más pesada de cada opción (el
// botón flotante sale con la barra inferior si esta no abre el panel; con la superior, en escritorio).
const critical = [ 'critical.css', ...fabWorst, ...bbarWorst ].map( ( f ) => dist + f );

const budget = [
	[ 'assets/dist/core.js', 4096, 'JS inicial' ],
	[ 'assets/dist/track.js', 3072, 'Módulo de analítica (bajo demanda)' ],
	[ 'assets/dist/prefetch.js', 3072, 'Módulo de precarga (bajo demanda)' ],
	[ 'assets/dist/gestures.js', 3072, 'Módulo de gestos (bajo demanda, al abrir el panel)' ],
	[ 'assets/dist/hours.js', 3072, 'Módulo de horario de WhatsApp (bajo demanda, al abrir el panel)' ],
	[ 'assets/dist/recent.js', 3072, 'Módulo de búsquedas recientes (bajo demanda, al abrir el buscador)' ],
	[ 'assets/dist/desktop.js', 3072, 'Módulo de escritorio (bajo demanda, solo pantallas anchas)' ],
	[ 'assets/dist/preview.js', 3072, 'Vista previa en vivo (solo en el admin)' ],
	[ [ ...critical, 'assets/dist/drawer.css', 'assets/dist/cascade.css' ], 6144, 'CSS en escritorio con cascada' ],
	[ 'assets/dist/critical.css', 1700, 'CSS crítico base (sin botón flotante ni barras)' ],
	[ [ 'critical.css', ...fabWorst ].map( ( f ) => dist + f ), 1700, 'CSS crítico con el botón flotante (peor caso de sus variantes)' ],
	[ critical, 1700, 'CSS crítico con botón flotante y barra inferior (peor caso)' ],
	[ [ ...critical, ...appbarWorst.map( ( f ) => dist + f ) ], 2150, 'CSS crítico con las dos barras y botón flotante (peor caso)' ],
	[ 'assets/dist/toggle.css', 1024, 'CSS del botón del shortcode/bloque (solo en páginas que lo usan)' ],
	[ [ ...critical, 'assets/dist/drawer.css', 'assets/dist/two-pane.css', 'assets/dist/tabs.css' ], 6144, 'CSS total (modo más pesado: pestañas)' ],
	[ [ ...critical, 'assets/dist/drawer.css', 'assets/dist/two-pane.css', 'assets/dist/tabs.css', 'assets/dist/grid.css' ], 6656, 'CSS de todos los modos juntos (referencia)' ],
];

// Peor caso de estilos: la variante más pesada de cada opción + entrada escalonada.
import { readdirSync } from 'node:fs';
const heaviest = {};
for ( const f of readdirSync( 'assets/dist/styles' ) ) {
	const group = f.split( '-' )[ 0 ];
	const size = readFileSync( `assets/dist/styles/${ f }` ).length;
	if ( group === 'stagger' || group === 'panel' ) continue;
	if ( ! heaviest[ group ] || heaviest[ group ][ 1 ] < size ) heaviest[ group ] = [ f, size ];
}
const worst = [ ...critical, 'assets/dist/drawer.css', 'assets/dist/two-pane.css', 'assets/dist/tabs.css', 'assets/dist/styles/panel-floating.css', 'assets/dist/styles/panel-glass.css', 'assets/dist/styles/stagger.css', ...Object.values( heaviest ).map( ( [ f ] ) => `assets/dist/styles/${ f }` ) ];
budget.push( [ worst, 6144, 'CSS peor caso (modo pestañas + el estilo más pesado de cada opción)' ] );

let fail = false;
for ( const [ files, max, label ] of budget ) {
	const list = Array.isArray( files ) ? files : [ files ];
	const raw = Buffer.concat( list.map( ( f ) => readFileSync( f ) ) );
	const gz = gzipSync( raw, { level: 9 } ).length;
	const ok = gz <= max;
	fail ||= ! ok;
	console.log( `${ ok ? '✔' : '✘' } ${ label }: ${ ( gz / 1024 ).toFixed( 2 ) } KB gzip (${ ( raw.length / 1024 ).toFixed( 2 ) } KB sin comprimir) · límite ${ ( max / 1024 ).toFixed( 2 ) } KB` );
}
process.exit( fail ? 1 : 0 );
