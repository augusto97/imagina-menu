// Presupuesto de rendimiento (docs/03): falla si algún archivo lo supera.
import { readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';

const budget = [
	[ 'assets/dist/core.js', 4096, 'JS inicial' ],
	[ 'assets/dist/track.js', 3072, 'Módulo de analítica (bajo demanda)' ],
	[ 'assets/dist/critical.css', 1700, 'CSS crítico (gzip)' ],
	[ [ 'assets/dist/critical.css', 'assets/dist/drawer.css', 'assets/dist/two-pane.css', 'assets/dist/tabs.css' ], 6144, 'CSS total (modo más pesado: pestañas)' ],
	[ [ 'assets/dist/critical.css', 'assets/dist/drawer.css', 'assets/dist/two-pane.css', 'assets/dist/tabs.css', 'assets/dist/grid.css' ], 6656, 'CSS de todos los modos juntos (referencia)' ],
];
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
