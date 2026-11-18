// Presupuesto de rendimiento (docs/03): falla si algún archivo lo supera.
import { readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';

const budget = [
	[ 'assets/dist/core.js', 4096, 'JS inicial' ],
	[ 'assets/dist/track.js', 3072, 'Módulo de analítica (bajo demanda)' ],
	[ 'assets/dist/prefetch.js', 3072, 'Módulo de precarga (bajo demanda)' ],
	[ 'assets/dist/desktop.js', 3072, 'Módulo de escritorio (bajo demanda, solo pantallas anchas)' ],
	[ 'assets/dist/preview.js', 3072, 'Vista previa en vivo (solo en el admin)' ],
	[ [ 'assets/dist/critical.css', 'assets/dist/drawer.css', 'assets/dist/cascade.css' ], 6144, 'CSS en escritorio con cascada' ],
	[ 'assets/dist/critical.css', 1700, 'CSS crítico (gzip)' ],
	[ [ 'assets/dist/critical.css', 'assets/dist/drawer.css', 'assets/dist/two-pane.css', 'assets/dist/tabs.css' ], 6144, 'CSS total (modo más pesado: pestañas)' ],
	[ [ 'assets/dist/critical.css', 'assets/dist/drawer.css', 'assets/dist/two-pane.css', 'assets/dist/tabs.css', 'assets/dist/grid.css' ], 6656, 'CSS de todos los modos juntos (referencia)' ],
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
const worst = [ 'assets/dist/critical.css', 'assets/dist/drawer.css', 'assets/dist/two-pane.css', 'assets/dist/tabs.css', 'assets/dist/styles/panel-floating.css', 'assets/dist/styles/panel-glass.css', 'assets/dist/styles/stagger.css', ...Object.values( heaviest ).map( ( [ f ] ) => `assets/dist/styles/${ f }` ) ];
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
