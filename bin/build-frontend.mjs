// Build del frontend: TS → ES module minificado; CSS → minificado. Sin dependencias en runtime.
import { build } from 'esbuild';
import { transform } from 'lightningcss';
import { minify } from 'terser';
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';

mkdirSync( 'assets/dist', { recursive: true } );

const entries = [ 'core', 'track', 'prefetch', 'desktop', 'preview', 'gestures', 'recent', 'hours' ];
await build( {
	entryPoints: entries.map( ( name ) => `frontend/src/${ name }.ts` ),
	outdir: 'assets/dist',
	bundle: true,
	format: 'esm',
	target: [ 'es2020' ],
	minify: true,
	legalComments: 'none',
	logLevel: 'warning',
} );
// Segunda pasada con terser: ~3 % menos que esbuild solo (el JS inicial tiene un tope de 4 KB).
for ( const name of entries ) {
	const file = `assets/dist/${ name }.js`;
	const { code } = await minify( readFileSync( file, 'utf8' ), {
		module: true,
		ecma: 2020,
		compress: { passes: 3, pure_getters: true, unsafe_arrows: true },
		mangle: true,
		format: { comments: false },
	} );
	writeFileSync( file, code );
}

for ( const name of [ 'critical', 'fab', 'toggle', 'bbar', 'drawer', 'two-pane', 'tabs', 'grid', 'cascade', 'appbar' ] ) {
	const { code } = transform( {
		filename: `${ name }.css`,
		code: readFileSync( `frontend/css/${ name }.css` ),
		minify: true,
		// Sin targets: no se reescriben las propiedades modernas (@starting-style, :popover-open…).
	} );
	writeFileSync( `assets/dist/${ name }.css`, code );
}
// Variantes (estilos del panel, posición del botón flotante, barra inferior, barra superior): una por opción; el compilador PHP
// incluye solo las elegidas.
for ( const dir of [ 'styles', 'fab', 'bbar', 'appbar' ] ) {
	mkdirSync( `assets/dist/${ dir }`, { recursive: true } );
	for ( const file of readdirSync( `frontend/css/${ dir }` ) ) {
		if ( ! file.endsWith( '.css' ) ) continue;
		const { code } = transform( { filename: file, code: readFileSync( `frontend/css/${ dir }/${ file }` ), minify: true } );
		writeFileSync( `assets/dist/${ dir }/${ file }`, code );
	}
}
console.log( 'Frontend compilado en assets/dist' );
