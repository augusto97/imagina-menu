/**
 * Imagina Menu — escritorio (módulo bajo demanda: solo se descarga en pantallas anchas y si el
 * perfil usa la cascada o «pasar el mouse»).
 *
 * - Cascada (Falabella, Mercado Libre): la lista principal queda a la izquierda; al pasar el mouse
 *   (o con clic o flecha derecha) por una categoría se abre su columna de subcategorías a la
 *   derecha, con los grupos ya desplegados. Los títulos de grupo llevan a su página («Ver todo»).
 * - Dos columnas / pestañas: la categoría cambia al pasar el mouse.
 *
 * Usa la API pública del menú (immMenu.goTo) para mover los niveles: el estado sigue en core.js.
 */
export {};

type Level = HTMLElement & { _from?: HTMLDetailsElement };
type Api = { goTo: ( id: string ) => void };

/** Tiempo de intención: al cruzar la lista en diagonal no se cambia de categoría. */
const INTENT = 90;

export function start( d: HTMLDialogElement ): void {
	const mq = matchMedia( d.dataset.desk || '' ); // «(min-width:1025px)»
	const hover = d.dataset.hover === '1';
	const root = d.querySelector<Level>( '.imm-vp > .imm-root' );
	const api = ( window as unknown as { immMenu?: Api } ).immMenu;
	let timer = 0;
	let pending: Element | null = null;

	/** Programa una acción al quedarse el mouse sobre un elemento (se cancela si se mueve a otro). */
	const intend = ( target: Element | null, run: () => void ) => {
		if ( target === pending ) return;
		clearTimeout( timer );
		pending = target;
		if ( target ) timer = window.setTimeout( run, INTENT );
	};

	if ( ! d.classList.contains( 'imm-casc' ) || ! root || ! api ) {
		// Dos columnas / pestañas: cambiar de categoría al pasar el mouse.
		if ( ! hover ) return;
		d.addEventListener( 'pointerover', ( e ) => {
			if ( e.pointerType !== 'mouse' || ! mq.matches ) return;
			const tab = ( e.target as Element ).closest<HTMLLabelElement>( 'label.imm-tp-tab:not(.imm-on)' );
			intend( tab, () => tab?.click() );
		} );
		return;
	}

	const top = ( level: Level | null ): HTMLDetailsElement | null => {
		let from = level?._from || null;
		while ( from && from.closest( '.imm-level' ) !== root ) from = ( from.closest( '.imm-level' ) as Level )._from || null;
		return from;
	};

	/** Abre la columna de una categoría del primer nivel (o la cierra con null). */
	const show = ( sub: HTMLDetailsElement | null ) => {
		if ( sub?.hasAttribute( 'data-on' ) ) return;
		api.goTo( sub ? sub.id.slice( 6 ) : '' ); // id="imm-s-{id}"
	};

	/** Tras cada cambio de nivel: la lista principal sigue activa y los grupos se ven desplegados. */
	const sync = () => {
		if ( ! mq.matches ) return;
		root.inert = false;
		const cur = d.querySelector<Level>( '.imm-vp > .imm-level[data-pos="cur"]' );
		const on = top( cur );
		for ( const x of root.querySelectorAll( '.imm-sub[data-on]' ) ) if ( x !== on ) x.removeAttribute( 'data-on' );
		on?.setAttribute( 'data-on', '' );
		if ( cur && cur !== root ) for ( const x of cur.querySelectorAll<HTMLDetailsElement>( ':scope > li > details' ) ) x.open = true;
	};
	new MutationObserver( sync ).observe( d, { attributes: true, attributeFilter: [ 'data-depth' ] } );

	// Al abrir en la página actual (que puede estar dos niveles abajo) se muestra su categoría.
	document.addEventListener( 'imm:open', () => {
		if ( ! mq.matches ) return;
		const cur = d.querySelector<Level>( '.imm-vp > .imm-level[data-pos="cur"]' );
		const on = top( cur );
		if ( on && cur?._from !== on ) api.goTo( on.id.slice( 6 ) );
	} );

	const rootSummary = ( t: EventTarget | null ) => {
		const s = ( t as Element ).closest?.( 'summary' );
		return s && s.parentElement?.parentElement?.parentElement === root ? ( s.parentElement as HTMLDetailsElement ) : null;
	};

	if ( hover ) {
		d.addEventListener( 'pointerover', ( e ) => {
			if ( e.pointerType !== 'mouse' || ! mq.matches ) return;
			const t = e.target as Element;
			if ( ! root.contains( t ) ) {
				intend( null, () => {} );
				return;
			}
			// Una categoría sin submenú cierra la columna.
			const li = t.closest( '.imm-root > li' );
			const sub = li?.querySelector<HTMLDetailsElement>( ':scope > details.imm-sub' ) || null;
			intend( li, () => show( sub ) );
		} );
	}

	// Fase de captura: antes que el deslizamiento del celular (core.js).
	d.addEventListener( 'click', ( e ) => {
		if ( ! mq.matches ) return;
		const t = e.target as Element;
		const sub = rootSummary( t );
		if ( sub ) {
			e.preventDefault();
			e.stopPropagation();
			show( sub );
			return;
		}
		// Título de un grupo en la columna: lleva a su página («Ver todo …») en vez de desplegarse.
		const group = t.closest( 'summary' );
		if ( group && ! root.contains( group ) ) {
			e.stopPropagation();
			const link = group.parentElement?.querySelector<HTMLAnchorElement>( ':scope > .imm-level > .imm-all > a' );
			if ( link ) {
				e.preventDefault();
				link.click();
			}
		}
	}, true );

	d.addEventListener( 'keydown', ( e ) => {
		if ( e.key !== 'ArrowRight' || ! mq.matches ) return;
		const sub = rootSummary( e.target );
		if ( ! sub ) return;
		e.preventDefault();
		e.stopPropagation();
		show( sub );
		( sub as unknown as { _level?: Level } )._level?.querySelector<HTMLElement>( '.imm-a' )?.focus();
	}, true );

	sync();
}
