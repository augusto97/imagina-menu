/**
 * Imagina Menu — vista previa en vivo. Solo se carga con ?imm_preview=… (token firmado del admin);
 * nunca en el sitio público.
 *
 * Antes, cada cambio recargaba la página del iframe: parpadeo, un segundo de espera, el panel
 * animándose otra vez y, peor, el foco saltaba al iframe mientras el usuario escribía en el admin.
 * Ahora el admin llama a immPreview.refresh() al guardar el borrador: se pide de nuevo esta misma
 * página (con fetch, sin navegar) y se cambian solo las partes del menú cuya huella (data-imm-h)
 * cambió. El panel sigue abierto en el mismo nivel y el foco se queda en el admin.
 */
export {};

type Menu = { open: () => void; search: () => void; goTo: ( id: string ) => void; r: () => void };
type Level = HTMLElement & { _from?: HTMLElement };
type Mode = 'none' | 'drawer' | 'search';

const doc = document;
const DRAWER = 'dialog#imm-drawer.imm-drawer';
const SEARCH = 'dialog#imm-search.imm-search';
const PARTS = [ 'div.imm-appbar', 'svg.imm-sprite', 'button.imm-fab', DRAWER, SEARCH, 'nav.imm-bbar' ];
const TOKEN = /^\d+\.\d+\.[a-f0-9]{32}$/;

const qs = <T extends Element>( sel: string, ctx: ParentNode = doc ) => ctx.querySelector<T>( sel );
const menu = () => ( window as unknown as { immMenu?: Menu } ).immMenu;
const isOpen = ( el: HTMLDialogElement | null ) => !! el && ( el.open || el.matches( ':popover-open' ) );

// core.js con la misma URL que la página (mismo módulo: no se ejecuta dos veces).
const coreUrl = new URL( 'core.js', import.meta.url );
coreUrl.search = new URL( import.meta.url ).search;
const ready = import( /* @vite-ignore */ coreUrl.href ).catch( () => {} );

/**
 * Ejecuta sin mover el foco: el diálogo se abre como popover (no modal) y focus() no hace nada.
 * Así quien está escribiendo en el admin no pierde el cursor cuando la vista previa se actualiza.
 * Se restaura un instante después: los eventos close/toggle (que devuelven el foco) son asíncronos.
 * Solo afecta a este iframe (el admin tiene sus propios prototipos).
 */
const D = HTMLDialogElement.prototype;
const E = HTMLElement.prototype;
const showModal = D.showModal;
const focus = E.focus;
let restore = 0;
function quiet( fn: () => void ): void {
	D.showModal = function () {
		throw new Error( 'preview' ); // core.js pasa a showPopover().
	};
	E.focus = function () {};
	for ( const el of doc.querySelectorAll( '.imm-search [autofocus]' ) ) el.removeAttribute( 'autofocus' );
	// Abrir un <dialog> (también como popover) enfoca su primer elemento: inerte mientras se abre, no.
	const dialogs = [ qs<HTMLDialogElement>( DRAWER ), qs<HTMLDialogElement>( SEARCH ) ].filter( ( x ): x is HTMLDialogElement => !! x && ! x.inert );
	for ( const x of dialogs ) x.inert = true;
	clearTimeout( restore );
	try {
		fn();
	} finally {
		for ( const x of dialogs ) x.inert = false;
		restore = window.setTimeout( () => {
			D.showModal = showModal;
			E.focus = focus;
		}, 80 );
	}
}

function hide( el: HTMLDialogElement | null ): void {
	if ( el?.open ) el.close();
	else if ( el?.matches( ':popover-open' ) ) el.hidePopover();
}

/** Muestra el panel, el buscador o la página, en un nivel o pestaña si se indica. */
function show( mode: Mode, level = '', tab = '' ): void {
	const d = qs<HTMLDialogElement>( DRAWER );
	const s = qs<HTMLDialogElement>( SEARCH );
	const m = menu();
	quiet( () => {
		if ( mode !== 'search' ) hide( s );
		if ( mode !== 'drawer' ) hide( d );
		const el = mode === 'drawer' ? d : mode === 'search' ? s : null;
		if ( ! el ) return;
		if ( ! m ) {
			// Sin JS del menú: la Popover API nativa.
			if ( ! isOpen( el ) ) el.showPopover();
			return;
		}
		if ( el === s ) {
			if ( ! isOpen( s ) ) m.search();
			return;
		}
		if ( ! isOpen( el ) ) m.open();
		if ( level.startsWith( 'imm-s-' ) && doc.getElementById( level ) ) m.goTo( level.slice( 6 ) );
		const radio = tab ? doc.getElementById( tab ) : null;
		if ( radio instanceof HTMLInputElement && radio.matches( '.imm-tp-r' ) && ! radio.checked ) {
			radio.checked = true;
			radio.dispatchEvent( new Event( 'change', { bubbles: true } ) );
		}
	} );
}

/** Estado visible: qué está abierto, en qué nivel o pestaña y el desplazamiento. */
function state(): { mode: Mode; level: string; tab: string; top: number } {
	const d = qs<HTMLDialogElement>( DRAWER );
	const cur = d ? qs<Level>( '.imm-vp > .imm-level[data-pos="cur"]', d ) : null;
	return {
		mode: isOpen( qs( SEARCH ) ) ? 'search' : isOpen( d ) ? 'drawer' : 'none',
		level: cur?._from?.id || '',
		tab: ( d && qs<HTMLInputElement>( '.imm-tp-r:checked', d )?.id ) || '',
		top: ( cur || ( d && qs( '.imm-d-in', d ) ) )?.scrollTop || 0,
	};
}

/** Cambia el CSS y las partes del menú que cambiaron. */
function swap( next: Document ): void {
	const before = state();
	for ( const id of [ 'imm-critical', 'imm-css' ] ) {
		const a = doc.getElementById( id );
		const b = next.getElementById( id );
		if ( b && a?.outerHTML !== b.outerHTML ) {
			const n = doc.importNode( b, true );
			if ( a ) a.replaceWith( n );
			else ( id === 'imm-critical' ? doc.head : doc.body ).append( n );
		} else if ( ! b ) {
			a?.remove();
		}
	}
	let changed = false;
	for ( const sel of PARTS ) {
		const a = qs( sel );
		const b = qs( sel, next );
		if ( ( a?.getAttribute( 'data-imm-h' ) || '' ) === ( b?.getAttribute( 'data-imm-h' ) || '' ) ) continue;
		changed = true;
		const n = b ? doc.importNode( b, true ) : null;
		if ( a ) {
			quiet( () => hide( a as HTMLDialogElement ) );
			if ( n ) a.replaceWith( n );
			else a.remove();
		} else if ( n ) {
			doc.body.append( n );
		}
	}
	if ( ! changed ) return;
	doc.documentElement.classList.remove( 'imm-lock' );
	menu()?.r();
	show( before.mode, before.level, before.tab );
	const d = qs<HTMLDialogElement>( DRAWER );
	const cur = d ? qs<HTMLElement>( '.imm-vp > .imm-level[data-pos="cur"]', d ) || qs<HTMLElement>( '.imm-d-in', d ) : null;
	if ( cur ) cur.scrollTop = before.top;
}

let running: Promise<void> | null = null;
let queued = '';

/** Pide de nuevo esta página con el borrador actual y aplica los cambios (en cola si ya hay una). */
async function refresh( token = '' ): Promise<void> {
	if ( running ) {
		queued = token || 'again';
		return running;
	}
	running = ( async () => {
		await ready;
		const url = new URL( location.href );
		if ( TOKEN.test( token ) ) url.searchParams.set( 'imm_preview', token );
		url.searchParams.set( '_r', String( Date.now() ) );
		const res = await fetch( url, { credentials: 'same-origin', cache: 'no-store' } );
		if ( ! res.ok ) throw new Error( String( res.status ) );
		const next = new DOMParser().parseFromString( await res.text(), 'text/html' );
		if ( ! qs( '[data-imm-h]', next ) && ! next.getElementById( 'imm-critical' ) ) throw new Error( 'sin menú' );
		swap( next );
	} )();
	try {
		await running;
	} finally {
		running = null;
	}
	if ( queued ) {
		const t = queued === 'again' ? token : queued;
		queued = '';
		await refresh( t );
	}
}

( window as unknown as { immPreview: unknown } ).immPreview = {
	refresh,
	show: ( mode: Mode ) => ready.then( () => show( mode ) ),
};
