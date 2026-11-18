/**
 * Imagina Menu — mejora progresiva del menú.
 *
 * El HTML ya funciona sin este archivo (Popover API + <details>). Aquí se añade:
 * - Apertura como diálogo modal (foco atrapado, fondo inerte) y bloqueo del scroll.
 * - Submenús deslizantes con barra de regreso, título del nivel y gestos.
 * - Barra inferior que se oculta al bajar, contador del carrito por cookie, búsquedas recientes.
 *
 * Sin dependencias. Un listener delegado por tipo de evento. Listeners de scroll/touch pasivos.
 */

export {};

type Level = HTMLUListElement & { _from?: HTMLDetailsElement };

const doc = document;
const root = doc.documentElement;
const qs = <T extends Element>( sel: string, ctx: ParentNode = doc ) => ctx.querySelector<T>( sel );
const qsa = <T extends Element>( sel: string, ctx: ParentNode = doc ) => Array.from( ctx.querySelectorAll<T>( sel ) );
const RECENT_KEY = 'imm-recent';
const LEVEL_KEY = 'imm-level';

const drawer = qs<HTMLDialogElement>( '#imm-drawer' );
const search = qs<HTMLDialogElement>( '#imm-search' );

// ── Utilidades de diálogos (modal con JS; popover si ya se abrió sin JS) ─────────────────────────

const isOpen = ( el: HTMLDialogElement ) => el.open || el.matches( ':popover-open' );

function show( el: HTMLDialogElement ): void {
	if ( isOpen( el ) ) return;
	try {
		el.showModal();
	} catch {
		el.showPopover?.();
	}
	root.classList.add( 'imm-lock' );
}

function hide( el: HTMLDialogElement ): void {
	if ( el.open ) el.close();
	else if ( el.matches( ':popover-open' ) ) el.hidePopover();
}

function afterHide(): void {
	if ( ! ( drawer && isOpen( drawer ) ) && ! ( search && isOpen( search ) ) ) {
		root.classList.remove( 'imm-lock' );
	}
}

function setExpanded( id: string, value: boolean ): void {
	for ( const el of qsa( `[aria-controls="${ id }"]` ) ) el.setAttribute( 'aria-expanded', String( value ) );
}

/** Clic fuera del panel (en el fondo) cierra, como un popover. */
function lightDismiss( el: HTMLDialogElement ): void {
	el.setAttribute( 'closedby', 'any' );
	el.addEventListener( 'click', ( e ) => {
		if ( e.target !== el ) return;
		const r = el.getBoundingClientRect();
		const x = ( e as MouseEvent ).clientX;
		const y = ( e as MouseEvent ).clientY;
		if ( x < r.left || x > r.right || y < r.top || y > r.bottom ) hide( el );
	} );
}

/** Carga las imágenes de un nivel (data-src → src) solo cuando se muestra. */
function loadImages( level: Element | null ): void {
	if ( ! level ) return;
	for ( const img of qsa<HTMLImageElement>( 'img[data-src]', level ) ) {
		if ( ! level.classList.contains( 'imm-level' ) || img.closest( '.imm-level' ) === level ) {
			img.src = img.dataset.src as string;
			img.removeAttribute( 'data-src' );
		}
	}
}

/**
 * Catálogos grandes: los niveles profundos llegan en <template> (no cuentan como DOM hasta usarse).
 * Se clonan la primera vez que se abren.
 */
function fill( host: Element | null, target?: Element | null ): void {
	const tpl = host?.querySelector<HTMLTemplateElement>( ':scope > template.imm-tpl' );
	if ( ! tpl ) return;
	( target || host )?.append( tpl.content );
	tpl.remove();
}

/** Enlace de la página actual, aunque esté dentro de un <template> todavía sin clonar. */
function findCurrent( d: Element ): Element | null {
	for ( let i = 0; i < 6; i++ ) {
		const found = qs( 'a[aria-current]', d );
		if ( found ) return found;
		const tpl = qsa<HTMLTemplateElement>( 'template.imm-tpl', d ).find( ( t ) => hasCurrent( t.content ) );
		if ( ! tpl ) return null;
		const host = tpl.parentElement;
		fill( host, host?.querySelector( ':scope > .imm-level' ) || host );
	}
	return null;
}

function hasCurrent( frag: DocumentFragment ): boolean {
	if ( frag.querySelector( 'a[aria-current]' ) ) return true;
	return Array.from( frag.querySelectorAll<HTMLTemplateElement>( 'template.imm-tpl' ) ).some( ( t ) => hasCurrent( t.content ) );
}

// ── Analítica y prefetch (opcionales, configurados en data-imm-cfg) ─────────────────────────────

export type Cfg = { p?: number; pf?: number; a?: { s: number; g: number; r: number; u: string } };
let cfg: Cfg = {};
try {
	cfg = JSON.parse( qs<HTMLElement>( '[data-imm-cfg]' )?.dataset.immCfg || '{}' );
} catch {}
const sampled = !! cfg.a && Math.random() * 100 < cfg.a.r;

/**
 * Evento de analítica. El código de envío vive en track.js y solo se descarga en sitios con la
 * analítica activa, con el primer evento (sendBeacon sobrevive a la navegación).
 */
function track( e: 'open' | 'click' | 'search' | 'bbar', id = '', label = '' ): void {
	if ( ! cfg.a || ! sampled ) return;
	const ver = new URL( import.meta.url ).search;
	const mod = './track.js' + ver;
	import( /* @vite-ignore */ mod ).then( ( m: { send: ( c: Cfg, e: string, id: string, label: string ) => void } ) => m.send( cfg, e, id, label ) ).catch( () => {} );
}

const prefetched = new Set<string>();

/** Prefetch del destino al tocar un enlace (~100–300 ms antes del clic). Con Imagina Turbo no se usa. */
function prefetch( a: HTMLAnchorElement ): void {
	const url = a.href;
	if ( ! cfg.pf || prefetched.has( url ) || a.origin !== location.origin || a.target === '_blank' || url.split( '#' )[ 0 ] === location.href.split( '#' )[ 0 ] ) return;
	prefetched.add( url );
	const supports = ( HTMLScriptElement as unknown as { supports?: ( t: string ) => boolean } ).supports;
	if ( supports?.( 'speculationrules' ) ) {
		const s = doc.createElement( 'script' );
		s.type = 'speculationrules';
		s.textContent = JSON.stringify( { prefetch: [ { source: 'list', urls: [ url ] } ] } );
		doc.head.append( s );
	} else {
		const l = doc.createElement( 'link' );
		l.rel = 'prefetch';
		l.href = url;
		doc.head.append( l );
	}
}

// ── Panel ───────────────────────────────────────────────────────────────────────────────────────

let stack: Level[] = [];
let opener: HTMLElement | null = null;

function initDrawer( d: HTMLDialogElement ): void {
	let shown = false;
	d.classList.add( 'imm-js' );
	lightDismiss( d );
	const slide = d.classList.contains( 'imm-mode-slide' );
	const vp = qs<HTMLElement>( '.imm-vp', d );
	const rootLevel = qs<Level>( '.imm-root', d );
	const bar = qs<HTMLElement>( '.imm-nav-bar', d );
	const backLabel = qs<HTMLElement>( '.imm-back-l', d );
	const title = qs<HTMLElement>( '.imm-level-t', d );
	const tp = qs<HTMLElement>( '.imm-tp', d );
	if ( tp ) initTwoPane( d, tp );
	if ( ! vp || ! rootLevel ) {
		open = ( from?: HTMLElement | null ) => {
			opener = from || ( doc.activeElement as HTMLElement );
			if ( tp ) loadImages( qs( '.imm-tp-r:checked + .imm-tp-pane', tp ) );
			show( d );
			shown = true;
			setExpanded( 'imm-drawer', true );
			track( 'open' );
		};
		d.addEventListener( 'close', onClose );
		return;
	}

	rootLevel.dataset.pos = 'cur';
	stack = [ rootLevel ];

	const render = () => {
		const depth = stack.length - 1;
		d.dataset.depth = String( depth );
		if ( ! bar ) return;
		bar.hidden = depth === 0;
		const current = stack[ depth ];
		const parent = stack[ depth - 1 ];
		if ( backLabel ) backLabel.textContent = parent && parent !== rootLevel ? parent.dataset.title || '' : d.dataset.back || '';
		if ( title ) title.textContent = depth ? current.dataset.title || '' : '';
	};

	const focusFirst = ( level: Element ) => {
		qs<HTMLElement>( '.imm-a', level )?.focus( { preventScroll: true } );
	};

	/** Entra al submenú de un <details>. */
	const forward = ( details: HTMLDetailsElement, animate = true ) => {
		let level = details.querySelector<Level>( ':scope > .imm-level' ) || ( details as unknown as { _level?: Level } )._level;
		if ( ! level ) return;
		fill( details, level );
		if ( level.parentElement !== vp ) {
			// Primer uso: el nivel se saca del árbol y se coloca como panel hermano.
			( details as unknown as { _level?: Level } )._level = level;
			level._from = details;
			level.id = level.id || 'imm-l-' + details.id;
			vp.appendChild( level );
		}
		const current = stack[ stack.length - 1 ];
		loadImages( level );
		if ( ! animate ) {
			level.classList.add( 'imm-now' );
			current.classList.add( 'imm-now' );
		}
		void level.offsetWidth; // Fija la posición inicial antes de animar.
		level.dataset.pos = 'cur';
		current.dataset.pos = 'prev';
		current.inert = true;
		level.inert = false;
		level.scrollTop = 0;
		stack.push( level );
		render();
		if ( animate ) {
			focusFirst( level );
		} else {
			requestAnimationFrame( () => {
				level.classList.remove( 'imm-now' );
				current.classList.remove( 'imm-now' );
			} );
		}
	};

	const back = () => {
		if ( stack.length < 2 ) return;
		const current = stack.pop() as Level;
		const previous = stack[ stack.length - 1 ];
		delete current.dataset.pos;
		current.inert = true;
		previous.dataset.pos = 'cur';
		previous.inert = false;
		render();
		current._from?.querySelector<HTMLElement>( 'summary' )?.focus( { preventScroll: true } );
	};

	const reset = () => {
		while ( stack.length > 1 ) {
			const l = stack.pop() as Level;
			l.classList.add( 'imm-now' );
			delete l.dataset.pos;
			l.inert = true;
			requestAnimationFrame( () => l.classList.remove( 'imm-now' ) );
		}
		rootLevel.dataset.pos = 'cur';
		rootLevel.inert = false;
		render();
	};

	/** Abre los submenús que llevan a un elemento (página actual o nivel recordado). */
	const reveal = ( target: Element | null ) => {
		if ( ! target ) return;
		const chain: HTMLDetailsElement[] = [];
		let node: Element | null = target;
		while ( node && node !== d ) {
			if ( node instanceof HTMLUListElement && ( node as Level )._from ) node = ( node as Level )._from as Element;
			if ( node instanceof HTMLDetailsElement && node !== target ) chain.unshift( node );
			node = node.parentElement;
		}
		for ( const details of chain ) {
			if ( slide ) forward( details, false );
			else details.open = true;
		}
	};

	d.addEventListener( 'click', ( e ) => {
		const t = e.target as Element;
		if ( t.closest( '[data-imm-back]' ) ) {
			back();
			return;
		}
		const summary = t.closest( 'summary' );
		if ( summary && slide ) {
			e.preventDefault();
			forward( summary.parentElement as HTMLDetailsElement );
		}
	} );

	d.addEventListener( 'toggle', ( e ) => {
		const t = e.target as HTMLElement;
		if ( t instanceof HTMLDetailsElement && t.open ) {
			const level = qs( ':scope > .imm-level', t );
			fill( t, level );
			loadImages( level );
		}
	}, true );

	d.addEventListener( 'keydown', ( e ) => {
		const t = e.target as HTMLElement;
		if ( ! slide ) return;
		if ( e.key === 'ArrowRight' && t.matches( 'summary' ) ) {
			e.preventDefault();
			forward( t.parentElement as HTMLDetailsElement );
		} else if ( e.key === 'ArrowLeft' && stack.length > 1 ) {
			e.preventDefault();
			back();
		}
	} );

	// Gestos: deslizar hacia el borde cierra; hacia el otro lado vuelve un nivel.
	if ( d.dataset.swipe === '1' ) {
		let x0 = 0;
		let y0 = 0;
		const rtl = getComputedStyle( d ).direction === 'rtl';
		d.addEventListener( 'touchstart', ( e ) => {
			x0 = e.touches[ 0 ].clientX;
			y0 = e.touches[ 0 ].clientY;
		}, { passive: true } );
		d.addEventListener( 'touchend', ( e ) => {
			const dx = ( e.changedTouches[ 0 ].clientX - x0 ) * ( rtl ? -1 : 1 );
			const dy = e.changedTouches[ 0 ].clientY - y0;
			if ( Math.abs( dx ) < 60 || Math.abs( dy ) > Math.abs( dx ) * 0.7 ) return;
			const right = d.classList.contains( 'imm-side-right' );
			if ( d.classList.contains( 'imm-side-bottom' ) ) {
				if ( dx > 0 && stack.length > 1 ) back();
				return;
			}
			if ( ( dx < 0 && ! right ) || ( dx > 0 && right && stack.length < 2 ) ) hide( d );
			else if ( dx > 0 && stack.length > 1 ) back();
		}, { passive: true } );
	}

	d.addEventListener( 'close', onClose );
	d.addEventListener( 'toggle', ( e ) => {
		if ( e.target === d && ( e as ToggleEvent ).newState === 'closed' ) onClose();
	} );

	function onClose() {
		if ( ! shown ) return; // 'close' y 'toggle' pueden llegar los dos.
		shown = false;
		setExpanded( 'imm-drawer', false );
		afterHide();
		if ( d.dataset.recall === '1' ) {
			try {
				const last = stack[ stack.length - 1 ];
				sessionStorage.setItem( LEVEL_KEY, last._from ? last._from.id : '' );
			} catch {}
		}
		opener?.focus( { preventScroll: true } );
		opener = null;
		doc.dispatchEvent( new CustomEvent( 'imm:close' ) );
	}

	open = ( from?: HTMLElement | null ) => {
		opener = from || ( doc.activeElement as HTMLElement );
		reset();
		loadImages( rootLevel );
		show( d );
		shown = true;
		setExpanded( 'imm-drawer', true );
		let target: Element | null = null;
		if ( d.dataset.recall === '1' ) {
			try {
				const id = sessionStorage.getItem( LEVEL_KEY );
				if ( id ) target = doc.getElementById( id );
			} catch {}
			if ( target instanceof HTMLDetailsElement ) {
				reveal( target );
				forward( target, false );
				target = null;
			}
		}
		if ( d.dataset.active === '1' && ! target && stack.length === 1 ) {
			reveal( findCurrent( d ) );
		}
		doc.dispatchEvent( new CustomEvent( 'imm:open' ) );
		track( 'open' );
	};

	goTo = ( id: string ) => {
		const details = doc.getElementById( 'imm-s-' + id );
		if ( ! isOpen( d ) ) open( null );
		reset();
		if ( details instanceof HTMLDetailsElement ) {
			reveal( details );
			if ( slide ) forward( details, false );
			else details.open = true;
		}
	};

	// Botón del menú del tema: se intercepta antes que su propio JS (fase de captura).
	const themeSelector = d.dataset.trigger;
	if ( themeSelector ) {
		addEventListener( 'click', ( e ) => {
			let match: Element | null = null;
			try {
				match = ( e.target as Element ).closest( themeSelector );
			} catch {}
			if ( match && ! d.contains( match ) ) {
				e.preventDefault();
				e.stopImmediatePropagation();
				open( match as HTMLElement );
			}
		}, true );
	}

	// Saludo por nombre en páginas en caché (cookie opcional imm_un).
	const account = qs<HTMLElement>( '.imm-account[data-hello]', d );
	const name = cookie( 'imm_un' );
	if ( account && name ) {
		const small = qs( 'small', account );
		const strong = qs( 'strong', account );
		if ( small ) small.textContent = ( account.dataset.hello || '%s' ).replace( '%s', name );
		if ( strong ) strong.textContent = account.dataset.cta || '';
	}
}

/** Dos columnas: marca la pestaña activa y carga las imágenes del panel visible. */
function initTwoPane( d: HTMLElement, tp: HTMLElement ): void {
	const select = ( radio: HTMLInputElement ) => {
		for ( const l of qsa( '.imm-tp-tab.imm-on', tp ) ) l.classList.remove( 'imm-on' );
		qs( `label[for="${ radio.id }"]`, tp )?.classList.add( 'imm-on' );
		const pane = radio.nextElementSibling as HTMLElement | null;
		fill( pane );
		loadImages( pane );
		if ( pane ) pane.scrollTop = 0;
	};
	tp.addEventListener( 'change', ( e ) => {
		const t = e.target as HTMLInputElement;
		if ( t.matches( '.imm-tp-r' ) ) select( t );
	} );
	// Abrir en la categoría de la página actual.
	const current = findCurrent( tp );
	const radio = current?.closest( '.imm-tp-pane' )?.previousElementSibling as HTMLInputElement | null;
	if ( radio?.matches( '.imm-tp-r' ) && d.dataset.active === '1' ) {
		radio.checked = true;
		select( radio );
	}
}

let open: ( from?: HTMLElement | null ) => void = () => {};
let goTo: ( id: string ) => void = () => {};

// ── Buscador ────────────────────────────────────────────────────────────────────────────────────

function initSearch( s: HTMLDialogElement ): void {
	lightDismiss( s );
	const input = qs<HTMLInputElement>( '.imm-s-input', s );
	const recent = qs<HTMLElement>( '.imm-s-recent', s );
	const list = recent ? qs<HTMLElement>( 'ul', recent ) : null;
	const form = qs<HTMLFormElement>( 'form', s );

	const read = (): string[] => {
		try {
			return JSON.parse( localStorage.getItem( RECENT_KEY ) || '[]' );
		} catch {
			return [];
		}
	};

	const paint = () => {
		if ( ! recent || ! list || ! form ) return;
		const items = read();
		recent.hidden = ! items.length;
		list.textContent = '';
		for ( const term of items ) {
			const url = new URL( form.action );
			for ( const [ k, v ] of new FormData( form ) ) url.searchParams.set( k, k === 's' ? term : String( v ) );
			const li = doc.createElement( 'li' );
			const a = doc.createElement( 'a' );
			a.href = url.href;
			a.textContent = term;
			li.append( a );
			list.append( li );
		}
	};

	form?.addEventListener( 'submit', () => {
		track( 'search' );
		const term = input?.value.trim();
		if ( ! term || ! recent ) return;
		const items = [ term, ...read().filter( ( t ) => t.toLowerCase() !== term.toLowerCase() ) ].slice( 0, 8 );
		try {
			localStorage.setItem( RECENT_KEY, JSON.stringify( items ) );
		} catch {}
	} );

	openSearch = ( from?: HTMLElement | null ) => {
		searchOpener = from || null;
		paint();
		show( s );
		input?.focus();
	};

	s.addEventListener( 'close', () => {
		afterHide();
		searchOpener?.focus( { preventScroll: true } );
	} );
	s.addEventListener( 'toggle', ( e ) => {
		if ( e.target === s && ( e as ToggleEvent ).newState === 'closed' ) afterHide();
	} );
}

let openSearch: ( from?: HTMLElement | null ) => void = () => {};
let searchOpener: HTMLElement | null = null;

// ── Barra inferior, botón flotante y carrito ────────────────────────────────────────────────────

function cookie( name: string ): string {
	const m = doc.cookie.match( new RegExp( '(?:^|; )' + name + '=([^;]*)' ) );
	return m ? decodeURIComponent( m[ 1 ] ) : '';
}

function updateCart(): void {
	const n = parseInt( cookie( 'imm_cc' ), 10 ) || 0;
	for ( const el of qsa<HTMLElement>( '[data-imm-count="cart"]' ) ) {
		el.textContent = n > 99 ? '99+' : String( n );
		el.hidden = n < 1;
	}
}

function initHideOnScroll(): void {
	const els = qsa<HTMLElement>( '.imm-bbar[data-hide-scroll], .imm-fab.imm-hide-scroll' );
	if ( ! els.length ) return;
	let last = scrollY;
	let ticking = false;
	addEventListener( 'scroll', () => {
		if ( ticking ) return;
		ticking = true;
		requestAnimationFrame( () => {
			const y = scrollY;
			if ( Math.abs( y - last ) > 8 ) {
				const down = y > last && y > 80;
				for ( const el of els ) el.classList.toggle( 'imm-hidden', down );
				last = y;
			}
			ticking = false;
		} );
	}, { passive: true } );
}

/** Con el teclado virtual abierto la barra estorba: se oculta. */
function initKeyboardWatch(): void {
	const bar = qs<HTMLElement>( '.imm-bbar' );
	const vv = window.visualViewport;
	if ( ! bar || ! vv ) return;
	vv.addEventListener( 'resize', () => {
		bar.style.display = vv.height < innerHeight * 0.72 ? 'none' : '';
	}, { passive: true } );
}

// ── Delegación global ───────────────────────────────────────────────────────────────────────────

doc.addEventListener( 'click', ( e ) => {
	const t = e.target as Element;
	const tracked = t.closest<HTMLElement>( '[data-imm-id]' );
	if ( tracked ) track( tracked.closest( '.imm-bbar' ) ? 'bbar' : 'click', tracked.dataset.immId, ( tracked.textContent || '' ).trim().slice( 0, 60 ) );
	const btn = t.closest<HTMLElement>( '[popovertarget]' );
	if ( btn ) {
		const id = btn.getAttribute( 'popovertarget' );
		const action = btn.getAttribute( 'popovertargetaction' );
		const target = id ? ( doc.getElementById( id ) as HTMLDialogElement | null ) : null;
		if ( target && ( target === drawer || target === search ) ) {
			e.preventDefault();
			if ( action === 'hide' || ( action !== 'show' && isOpen( target ) ) ) {
				hide( target );
			} else if ( target === drawer ) {
				open( btn );
			} else {
				if ( drawer && isOpen( drawer ) ) hide( drawer );
				openSearch( btn );
			}
			return;
		}
	}
	const custom = t.closest<HTMLElement>( '[data-imm-open]:not([popovertarget])' );
	if ( custom ) {
		e.preventDefault();
		const value = custom.dataset.immOpen;
		if ( value ) goTo( value );
		else open( custom );
		return;
	}
	if ( t.closest( '[data-imm-top]' ) ) {
		e.preventDefault();
		scrollTo( { top: 0, behavior: matchMedia( '(prefers-reduced-motion: reduce)' ).matches ? 'auto' : 'smooth' } );
	}
} );

doc.addEventListener( 'pointerdown', ( e ) => {
	const a = ( e.target as Element ).closest?.<HTMLAnchorElement>( 'a[href]' );
	if ( a && a.closest( '.imm-drawer, .imm-bbar, .imm-search' ) ) prefetch( a );
}, { passive: true } );

// Al volver con el botón atrás (bfcache) el panel no debe quedar abierto.
addEventListener( 'pageshow', ( e ) => {
	if ( e.persisted ) {
		if ( drawer ) hide( drawer );
		if ( search ) hide( search );
		root.classList.remove( 'imm-lock' );
	}
	updateCart();
} );

doc.addEventListener( 'visibilitychange', () => {
	if ( ! doc.hidden ) updateCart();
} );

for ( const ev of [ 'wc-blocks_added_to_cart', 'wc-blocks_removed_from_cart' ] ) {
	doc.body.addEventListener( ev, () => setTimeout( updateCart, 300 ) );
}

// WooCommerce clásico dispara sus eventos con jQuery: se escuchan solo si jQuery ya existe.
const jq = ( window as unknown as { jQuery?: ( el: unknown ) => { on: ( ev: string, fn: () => void ) => void } } ).jQuery;
jq?.( doc.body ).on( 'added_to_cart removed_from_cart updated_cart_totals wc_fragments_refreshed', () => setTimeout( updateCart, 50 ) );

if ( drawer ) initDrawer( drawer );
if ( search ) initSearch( search );
updateCart();
initHideOnScroll();
initKeyboardWatch();

( window as unknown as { immMenu: unknown } ).immMenu = {
	open: () => open( null ),
	close: () => drawer && hide( drawer ),
	goTo: ( id: string ) => goTo( id ),
	search: () => openSearch( null ),
};
