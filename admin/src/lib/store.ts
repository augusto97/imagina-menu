import { create } from 'zustand';
import { api } from './api';
import type { Env, Menu, Preset, Profile, Settings, State, CompileState, MenuItem, BottomItem } from './types';
import { fillStyle } from './style';

interface Snapshot {
	menus: Menu[];
	profiles: Profile[];
}

const HISTORY_CAP = 100;
const COALESCE_MS = 500;

/** Rellena los campos nuevos si el servidor todavía no los envía (compatibilidad hacia atrás). */
function withProfileDefaults( p: Profile, presets?: Record<string, Preset> ): Profile {
	return {
		...p,
		design: {
			...p.design,
			// Sin design.style (servidor anterior): el del preset y, si no, los valores de respaldo.
			style: fillStyle( p.design?.style, presets?.[ p.design?.preset ]?.style ),
		},
		rules: {
			match: p.rules?.match === 'any' ? 'any' : 'all',
			conditions: Array.isArray( p.rules?.conditions ) ? p.rules.conditions.map( ( c ) => ( { type: c.type, not: !! c.not, value: c.value ?? '', ids: Array.isArray( c.ids ) ? c.ids : [] } ) ) : [],
		},
		drawer: {
			...p.drawer,
			// PHP serializa un arreglo asociativo vacío como []: se normaliza a objeto.
			menu_by_lang: p.drawer.menu_by_lang && ! Array.isArray( p.drawer.menu_by_lang ) ? p.drawer.menu_by_lang : {},
			language_switcher: p.drawer.language_switcher ?? true,
		},
	};
}

function withSettingsDefaults( s: Settings ): Settings {
	return {
		...s,
		html_depth: s.html_depth ?? 'auto',
		prefetch: s.prefetch ?? true,
		analytics: Object.assign( { enabled: false, server: true, ga4: true, sample: 100, retention: 180 }, s.analytics as Partial<Settings[ 'analytics' ]> | undefined ),
	};
}

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
	past: Snapshot[];
	future: Snapshot[];
	lastEdit: { key: string; at: number };

	hydrate: ( state: State ) => void;
	setActiveProfile: ( id: number ) => void;
	setActiveMenu: ( id: number ) => void;
	selectItem: ( id: string ) => void;
	updateProfile: ( fn: ( profile: Profile ) => Profile ) => void;
	updateProfileById: ( id: number, fn: ( profile: Profile ) => Profile ) => void;
	reorderProfiles: ( ids: number[] ) => Promise<void>;
	undo: () => void;
	redo: () => void;
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
	past: [],
	future: [],
	lastEdit: { key: '', at: 0 },

	hydrate: ( raw ) => {
		const presets = raw.presets ?? {};
		const state: State = { ...raw, settings: withSettingsDefaults( raw.settings ), profiles: raw.profiles.map( ( p ) => withProfileDefaults( p, presets ) ) };
		if ( state.defaults?.profile ) {
			state.defaults = { ...state.defaults, profile: withProfileDefaults( state.defaults.profile, presets ) };
		}
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
			past: [],
			future: [],
			lastEdit: { key: '', at: 0 },
		} );
	},

	setActiveProfile: ( id ) => set( { activeProfileId: id } ),
	setActiveMenu: ( id ) => set( { activeMenuId: id, selectedItemId: '' } ),
	selectItem: ( id ) => set( { selectedItemId: id } ),

	updateProfile: ( fn ) => get().updateProfileById( get().activeProfileId, fn ),

	updateProfileById: ( id, fn ) =>
		set( ( s ) => ( {
			...record( s, `profile:${ id }` ),
			profiles: s.profiles.map( ( p ) => ( p.id === id ? fn( p ) : p ) ),
			pending: { ...s.pending, [ `profile:${ id }` ]: true },
		} ) ),

	updateMenu: ( id, fn ) =>
		set( ( s ) => ( {
			...record( s, `menu:${ id }` ),
			menus: s.menus.map( ( m ) => ( m.id === id ? fn( m ) : m ) ),
			pending: { ...s.pending, [ `menu:${ id }` ]: true },
		} ) ),

	reorderProfiles: async ( ids ) => {
		const before = get().profiles;
		const byId = new Map( before.map( ( p ) => [ p.id, p ] ) );
		const ordered = ids.map( ( id ) => byId.get( id ) ).filter( ( p ): p is Profile => !! p );
		set( { profiles: [ ...ordered, ...before.filter( ( p ) => ! ids.includes( p.id ) ) ] } );
		try {
			await api( 'profiles/order', 'PUT', { ids } );
			set( ( s ) => ( { serverDrafts: Math.max( 1, s.serverDrafts ), previewNonce: s.previewNonce + 1 } ) );
		} catch ( error ) {
			set( { profiles: before, saveError: error instanceof Error ? error.message : String( error ) } );
		}
	},

	undo: () => set( ( s ) => travel( s, 'undo' ) ),
	redo: () => set( ( s ) => travel( s, 'redo' ) ),

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
	addProfile: ( profile ) => set( ( s ) => ( { profiles: [ ...s.profiles, withProfileDefaults( profile, s.presets ) ], activeProfileId: profile.id } ) ),
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

/**
 * Historial para deshacer: guarda el estado anterior antes de cada cambio. Las ediciones seguidas
 * del mismo documento en menos de 500 ms (escribir en un campo) cuentan como una sola.
 */
function record( s: Store, key: string ): Partial<Store> {
	const now = Date.now();
	if ( s.lastEdit.key === key && now - s.lastEdit.at < COALESCE_MS ) {
		return { lastEdit: { key, at: now }, future: [] };
	}
	const past = [ ...s.past, { menus: s.menus, profiles: s.profiles } ].slice( -HISTORY_CAP );
	return { past, future: [], lastEdit: { key, at: now } };
}

/**
 * Restaura una instantánea documento por documento (por id): se conservan el orden actual de los
 * perfiles y los menús o perfiles creados o borrados después (eso ya está en el servidor). Los
 * documentos que cambian quedan pendientes para que el autoguardado los envíe.
 */
function travel( s: Store, direction: 'undo' | 'redo' ): Partial<Store> {
	const from = direction === 'undo' ? s.past : s.future;
	const target = from[ from.length - 1 ];
	if ( ! target ) {
		return {};
	}
	const current: Snapshot = { menus: s.menus, profiles: s.profiles };
	const pending = { ...s.pending };
	const menuMap = new Map( target.menus.map( ( m ) => [ m.id, m ] ) );
	const profileMap = new Map( target.profiles.map( ( p ) => [ p.id, p ] ) );
	const menus = s.menus.map( ( m ) => {
		const next = menuMap.get( m.id );
		if ( next && next !== m ) {
			pending[ `menu:${ m.id }` ] = true;
			return next;
		}
		return m;
	} );
	const profiles = s.profiles.map( ( p ) => {
		const next = profileMap.get( p.id );
		if ( next && next !== p ) {
			pending[ `profile:${ p.id }` ] = true;
			return next;
		}
		return p;
	} );
	const rest = from.slice( 0, -1 );
	const other = direction === 'undo' ? [ ...s.future, current ] : [ ...s.past, current ];
	return {
		menus,
		profiles,
		pending,
		lastEdit: { key: '', at: 0 },
		...( direction === 'undo' ? { past: rest, future: other } : { future: rest, past: other } ),
	};
}

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
