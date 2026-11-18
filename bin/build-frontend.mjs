// Build del frontend: TS → ES module minificado; CSS → minificado. Sin dependencias en runtime.
import { build } from 'esbuild';
import { transform } from 'lightningcss';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

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
console.log( 'Frontend compilado en assets/dist' );
