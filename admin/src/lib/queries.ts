import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { api } from './api';
import { useStore } from './store';
import type { State } from './types';

/** Carga /state una vez y lo pasa al store. */
export function useBootstrap() {
	const hydrate = useStore( ( s ) => s.hydrate );
	const query = useQuery( { queryKey: [ 'state' ], queryFn: () => api<State>( 'state' ), refetchOnWindowFocus: false, staleTime: Infinity } );
	useEffect( () => {
		if ( query.data ) {
			hydrate( query.data );
		}
	}, [ query.data, hydrate ] );
	return query;
}

/** Guarda los borradores ~800 ms después del último cambio. */
export function useAutosave() {
	const pending = useStore( ( s ) => s.pending );
	const flush = useStore( ( s ) => s.flush );
	useEffect( () => {
		if ( ! Object.keys( pending ).length ) {
			return;
		}
		const timer = window.setTimeout( () => void flush(), 800 );
		return () => window.clearTimeout( timer );
	}, [ pending, flush ] );

	// Evita perder cambios al cerrar la pestaña con algo sin guardar.
	useEffect( () => {
		const handler = ( event: BeforeUnloadEvent ) => {
			if ( Object.keys( useStore.getState().pending ).length || useStore.getState().saving ) {
				event.preventDefault();
			}
		};
		window.addEventListener( 'beforeunload', handler );
		return () => window.removeEventListener( 'beforeunload', handler );
	}, [] );
}
