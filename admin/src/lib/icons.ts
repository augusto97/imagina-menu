import { useEffect, useState } from 'react';
import { config } from './config';

export interface IconLibrary {
	lucide: Record<string, string>;
	brands: Record<string, string>;
	tags: Record<string, string>;
}

let promise: Promise<IconLibrary> | null = null;
let loaded: IconLibrary | null = null;

/** La librería (~80 KB gzip) se descarga una sola vez, cuando hace falta el primer icono. */
export function loadIcons(): Promise<IconLibrary> {
	if ( ! promise ) {
		promise = Promise.all( [
			fetch( config.iconsUrl ).then( ( r ) => r.json() as Promise<{ lucide: Record<string, string>; brands: Record<string, string> }> ),
			fetch( config.tagsUrl )
				.then( ( r ) => r.json() as Promise<Record<string, string>> )
				.catch( () => ( {} ) ),
		] ).then( ( [ icons, tags ] ) => {
			loaded = { lucide: icons.lucide ?? {}, brands: icons.brands ?? {}, tags };
			return loaded;
		} );
		promise.catch( () => {
			promise = null;
		} );
	}
	return promise;
}

export function useIcons(): IconLibrary | null {
	const [ lib, setLib ] = useState<IconLibrary | null>( loaded );
	useEffect( () => {
		if ( ! lib ) {
			loadIcons().then( setLib, () => undefined );
		}
	}, [ lib ] );
	return lib;
}

export function iconBody( lib: IconLibrary | null, name: string ): { body: string; brand: boolean } | null {
	if ( ! lib || ! name ) {
		return null;
	}
	if ( name.startsWith( 'si-' ) ) {
		const body = lib.brands[ name.slice( 3 ) ];
		return body ? { body, brand: true } : null;
	}
	const body = lib.lucide[ name ];
	return body ? { body, brand: false } : null;
}
