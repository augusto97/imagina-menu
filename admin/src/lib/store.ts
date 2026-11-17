import { create } from 'zustand';
import { api } from './api';
import type { Env, Menu, Preset, Profile, Settings, State, CompileState, MenuItem, BottomItem } from './types';

/**
 * Copias de trabajo del admin. Cada cambio local marca su documento como pendiente; useAutosave
 * los guarda como borrador (PUT) con un retardo y recarga la vista previa. «Publicar» guarda lo
 * pendiente y compila.
 *
 * Las respuestas del servidor no reemplazan lo que el usuario está escribiendo (el servidor recorta
 * espacios y eso borraría el espacio que acabas de teclear): solo se hidrata al cargar, publicar o
 * descartar.
 */
interface Store {
	loaded: boolean;
	settings: Settings | null;
	menus: Menu[];
	profiles: Profile[];
	presets: Record<string, Preset>;
	defaults: State[ 'defaults' ] | null;
	env: Env | null;
	compile: CompileState;
	serverDrafts: number;
	activeProfileId: number;
	activeMenuId: number;
	selectedItemId: string;
	pending: Record<string, true>;
	saving: boolean;
	saveError: string;
	previewNonce: number;

	hydrate: ( state: State ) => void;
	setActiveProfile: ( id: number ) => void;
	setActiveMenu: ( id: number ) => void;
	selectItem: ( id: string ) => void;
	updateProfile: ( fn: ( profile: Profile ) => Profile ) => void;
	updateMenu: ( id: number, fn: ( menu: Menu ) => Menu ) => void;
	updateSettings: ( fn: ( settings: Settings ) => Settings ) => void;
	addMenu: ( menu: Menu ) => void;
	removeMenu: ( id: number ) => void;
	addProfile: ( profile: Profile ) => void;
	removeProfile: ( id: number ) => void;
	flush: () => Promise<void>;
	reloadPreview: () => void;
}

export const useStore = create<Store>( ( set, get ) => ( {
	loaded: false,
	settings: null,
	menus: [],
	profiles: [],
	presets: {},
	defaults: null,
	env: null,
	compile: {},
	serverDrafts: 0,
	activeProfileId: 0,
	activeMenuId: 0,
	selectedItemId: '',
	pending: {},
	saving: false,
	saveError: '',
	previewNonce: 0,

	hydrate: ( state ) => {
		const current = get();
		const profileId = state.profiles.some( ( p ) => p.id === current.activeProfileId ) ? current.activeProfileId : state.profiles[ 0 ]?.id ?? 0;
		const profile = state.profiles.find( ( p ) => p.id === profileId );
		const menuId = state.menus.some( ( m ) => m.id === current.activeMenuId )
			? current.activeMenuId
			: state.menus.find( ( m ) => m.id === profile?.drawer.menu_id )?.id ?? state.menus[ 0 ]?.id ?? 0;
		set( {
			loaded: true,
			settings: state.settings,
			menus: state.menus,
			profiles: state.profiles,
			presets: state.presets,
			defaults: state.defaults,
			env: state.env,
			compile: state.compile,
			serverDrafts: state.drafts,
			activeProfileId: profileId,
			activeMenuId: menuId,
			pending: {},
			previewNonce: current.previewNonce + 1,
		} );
	},

	setActiveProfile: ( id ) => set( { activeProfileId: id } ),
	setActiveMenu: ( id ) => set( { activeMenuId: id, selectedItemId: '' } ),
	selectItem: ( id ) => set( { selectedItemId: id } ),

	updateProfile: ( fn ) =>
		set( ( s ) => ( {
			profiles: s.profiles.map( ( p ) => ( p.id === s.activeProfileId ? fn( p ) : p ) ),
			pending: { ...s.pending, [ `profile:${ s.activeProfileId }` ]: true },
		} ) ),

	updateMenu: ( id, fn ) =>
		set( ( s ) => ( {
			menus: s.menus.map( ( m ) => ( m.id === id ? fn( m ) : m ) ),
			pending: { ...s.pending, [ `menu:${ id }` ]: true },
		} ) ),

	updateSettings: ( fn ) =>
		set( ( s ) => ( {
			settings: s.settings ? fn( s.settings ) : s.settings,
			pending: { ...s.pending, settings: true },
		} ) ),

	addMenu: ( menu ) => set( ( s ) => ( { menus: [ ...s.menus, menu ], activeMenuId: menu.id, selectedItemId: '' } ) ),
	removeMenu: ( id ) =>
		set( ( s ) => {
			const menus = s.menus.filter( ( m ) => m.id !== id );
			return { menus, activeMenuId: s.activeMenuId === id ? menus[ 0 ]?.id ?? 0 : s.activeMenuId };
		} ),
	addProfile: ( profile ) => set( ( s ) => ( { profiles: [ ...s.profiles, profile ], activeProfileId: profile.id } ) ),
	removeProfile: ( id ) =>
		set( ( s ) => {
			const profiles = s.profiles.filter( ( p ) => p.id !== id );
			return { profiles, activeProfileId: s.activeProfileId === id ? profiles[ 0 ]?.id ?? 0 : s.activeProfileId };
		} ),

	flush: async () => {
		const { pending, saving } = get();
		const keys = Object.keys( pending );
		if ( saving || ! keys.length ) {
			return;
		}
		set( { saving: true, pending: {}, saveError: '' } );
		try {
			for ( const key of keys ) {
				const s = get();
				const [ kind, rawId ] = key.split( ':' );
				const id = Number( rawId );
				if ( kind === 'settings' && s.settings ) {
					await api( 'settings', 'PUT', { settings: s.settings } );
				} else if ( kind === 'menu' ) {
					const menu = s.menus.find( ( m ) => m.id === id );
					if ( menu ) {
						await api( `menus/${ id }`, 'PUT', { menu } );
					}
				} else if ( kind === 'profile' ) {
					const profile = s.profiles.find( ( p ) => p.id === id );
					if ( profile ) {
						await api( `profiles/${ id }`, 'PUT', { profile } );
					}
				}
			}
			set( ( s ) => ( { saving: false, serverDrafts: Math.max( 1, s.serverDrafts ), previewNonce: s.previewNonce + 1 } ) );
		} catch ( error ) {
			// Lo que no se guardó vuelve a quedar pendiente.
			set( ( s ) => ( {
				saving: false,
				saveError: error instanceof Error ? error.message : String( error ),
				pending: { ...Object.fromEntries( keys.map( ( k ) => [ k, true as const ] ) ), ...s.pending },
			} ) );
		}
	},

	reloadPreview: () => set( ( s ) => ( { previewNonce: s.previewNonce + 1 } ) ),
} ) );

export function useActiveProfile(): Profile | undefined {
	return useStore( ( s ) => s.profiles.find( ( p ) => p.id === s.activeProfileId ) );
}

export function useActiveMenu(): Menu | undefined {
	return useStore( ( s ) => s.menus.find( ( m ) => m.id === s.activeMenuId ) );
}

export function newId( prefix = 'i_' ): string {
	const bytes = new Uint8Array( 4 );
	crypto.getRandomValues( bytes );
	return prefix + Array.from( bytes, ( b ) => b.toString( 16 ).padStart( 2, '0' ) ).join( '' );
}

export function makeItem( patch: Partial<MenuItem> = {} ): MenuItem {
	const base = useStore.getState().defaults?.item;
	const item = structuredClone( base ) as MenuItem;
	return { ...item, id: newId(), children: [], ...patch };
}

export function makeBottomItem( patch: Partial<BottomItem> = {} ): BottomItem {
	const base = useStore.getState().defaults?.bottom_item;
	return { ...( structuredClone( base ) as BottomItem ), id: newId( 'b_' ), ...patch };
}

/** Actualiza un valor anidado de forma inmutable: setIn(obj, ['drawer','side'], 'right'). */
export function setIn<T>( obj: T, path: ( string | number )[], value: unknown ): T {
	if ( ! path.length ) {
		return value as T;
	}
	const [ head, ...rest ] = path as [ string | number, ...( string | number )[] ];
	const source = obj as unknown as Record<string | number, unknown>;
	const copy = ( Array.isArray( obj ) ? [ ...( obj as unknown[] ) ] : { ...source } ) as Record<string | number, unknown>;
	copy[ head ] = setIn( source[ head ], rest, value );
	return copy as unknown as T;
}

/** Cambia un valor del perfil activo por ruta: setProfile(['drawer', 'side'], 'right'). */
export function setProfile( path: ( string | number )[], value: unknown ): void {
	useStore.getState().updateProfile( ( p ) => setIn( p, path, value ) );
}
