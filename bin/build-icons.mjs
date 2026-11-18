// Genera icons/icons.json: todos los iconos de Lucide (trazo) y los de marca de Simple Icons (relleno).
// Solo se guarda el contenido interior del <svg>. Lo usan el compilador PHP (sprite con los iconos
// usados) y el selector de iconos del admin (se descarga bajo demanda, no va en el bundle).
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';

import { dirname, join } from 'node:path';


const lucideDir = 'node_modules/lucide-static/icons';
const simpleDir = 'node_modules/simple-icons/icons';
const tags = JSON.parse( readFileSync( join( dirname( lucideDir ), 'tags.json' ), 'utf8' ) );

const inner = ( svg ) =>
	svg
		.replace( /<!--[\s\S]*?-->/g, '' )
		.replace( /^[\s\S]*?<svg[^>]*>/, '' )
		.replace( /<\/svg>[\s\S]*$/, '' )
		.replace( /<title>[\s\S]*?<\/title>/g, '' )
		// Los saltos de línea separan atributos: se cambian por un espacio (no se borran).
		.replace( /\s*\n\s*/g, ' ' )
		.replace( />\s+</g, '><' )
		.replace( /\s+\/>/g, '/>' )
		.trim();

/**
 * Defensa ante la cadena de suministro: estos SVG se imprimen tal cual en el sitio y en el admin.
 * Solo se aceptan elementos y atributos geométricos; un icono con cualquier otra cosa se descarta.
 */
const TAGS = new Set( [ 'path', 'circle', 'rect', 'line', 'polyline', 'polygon', 'ellipse', 'g' ] );
const ATTRS = new Set( [ 'd', 'cx', 'cy', 'r', 'rx', 'ry', 'x', 'y', 'x1', 'y1', 'x2', 'y2', 'width', 'height', 'points', 'transform', 'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'fill-rule', 'clip-rule', 'opacity' ] );
const safe = ( name, body ) => {
	const tags = body.match( /<\/?[^>]*>/g ) || [];
	for ( const tag of tags ) {
		const m = tag.match( /^<\/?([a-zA-Z0-9-]+)((?:\s+[a-zA-Z0-9:-]+="[^"<>]*")*)\s*\/?>$/ );
		if ( ! m || ! TAGS.has( m[ 1 ] ) ) return console.warn( 'Icono descartado (elemento):', name, tag ), false;
		for ( const [ , attr, value ] of m[ 2 ].matchAll( /([a-zA-Z0-9:-]+)="([^"]*)"/g ) ) {
			if ( ! ATTRS.has( attr ) || /[^-0-9a-zA-Z.,\s#()%]/.test( value ) ) return console.warn( 'Icono descartado (atributo):', name, attr ), false;
		}
	}
	return body.replace( /<[^>]*>/g, '' ).trim() === '';
};

const lucide = {};
for ( const file of readdirSync( lucideDir ).sort() ) {
	if ( ! file.endsWith( '.svg' ) ) continue;
	const name = file.slice( 0, -4 );
	const body = inner( readFileSync( join( lucideDir, file ), 'utf8' ) );
	if ( safe( name, body ) ) lucide[ name ] = body;
}

const brandNames = [ 'whatsapp', 'facebook', 'instagram', 'tiktok', 'youtube', 'x', 'pinterest', 'telegram', 'threads', 'spotify', 'messenger' ];
const brands = {};
for ( const name of brandNames ) {
	try {
		const body = inner( readFileSync( join( simpleDir, name + '.svg' ), 'utf8' ) );
		if ( safe( name, body ) ) brands[ name ] = body;
	} catch {
		console.warn( 'Sin icono de marca:', name );
	}
}

const compactTags = {};
for ( const [ name, list ] of Object.entries( tags ) ) {
	if ( lucide[ name ] ) compactTags[ name ] = list.slice( 0, 6 ).join( ' ' );
}

writeFileSync( 'icons/icons.json', JSON.stringify( { lucide, brands } ) );
writeFileSync( 'icons/tags.json', JSON.stringify( compactTags ) );
console.log( `Lucide: ${ Object.keys( lucide ).length } · Marcas: ${ Object.keys( brands ).length }` );
