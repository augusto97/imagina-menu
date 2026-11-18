// Build del frontend: TS → ES module minificado; CSS → minificado. Sin dependencias en runtime.
import { build } from 'esbuild';
import { transform } from 'lightningcss';
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';

mkdirSync( 'assets/dist', { recursive: true } );

await build( {
	entryPoints: [ 'frontend/src/core.ts', 'frontend/src/track.ts' ],
	outdir: 'assets/dist',
	bundle: true,
	format: 'esm',
	target: [ 'es2020' ],
	minify: true,
	legalComments: 'none',
	logLevel: 'warning',
} );

for ( const name of [ 'critical', 'drawer', 'two-pane', 'tabs', 'grid' ] ) {
	const { code } = transform( {
		filename: `${ name }.css`,
		code: readFileSync( `frontend/css/${ name }.css` ),
		minify: true,
		// Sin targets: no se reescriben las propiedades modernas (@starting-style, :popover-open…).
	} );
	writeFileSync( `assets/dist/${ name }.css`, code );
}
// Variantes de estilo del panel: una por opción; el compilador PHP incluye solo las elegidas.
mkdirSync( 'assets/dist/styles', { recursive: true } );
for ( const file of readdirSync( 'frontend/css/styles' ) ) {
	if ( ! file.endsWith( '.css' ) ) continue;
	const { code } = transform( { filename: file, code: readFileSync( `frontend/css/styles/${ file }` ), minify: true } );
	writeFileSync( `assets/dist/styles/${ file }`, code );
}
console.log( 'Frontend compilado en assets/dist' );
