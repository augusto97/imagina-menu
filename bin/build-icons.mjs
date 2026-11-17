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
		.replace( /\s*\n\s*/g, '' )
		.replace( /\s+\/>/g, '/>' )
		.trim();

const lucide = {};
for ( const file of readdirSync( lucideDir ).sort() ) {
	if ( ! file.endsWith( '.svg' ) ) continue;
	lucide[ file.slice( 0, -4 ) ] = inner( readFileSync( join( lucideDir, file ), 'utf8' ) );
}

const brandNames = [ 'whatsapp', 'facebook', 'instagram', 'tiktok', 'youtube', 'x', 'pinterest', 'telegram', 'threads', 'spotify', 'messenger' ];
const brands = {};
for ( const name of brandNames ) {
	try {
		brands[ name ] = inner( readFileSync( join( simpleDir, name + '.svg' ), 'utf8' ) );
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
