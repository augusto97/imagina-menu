/**
 * Precarga del destino al tocar un enlace del menú (módulo bajo demanda).
 *
 * Solo se usa en sitios donde ni WordPress 6.8+ ni Imagina Turbo precargan ya. Con el dedo espera un
 * instante y se cancela si en realidad es un desplazamiento; con ratón, al presionar.
 */
const doc = document;
const done = new Set<string>();
let pending: { timer: number; x: number; y: number } | null = null;

/**
 * ¿Se puede precargar sin efectos? Nunca URLs con parámetros (?add-to-cart=, ?s=…), archivos del
 * sistema (wp-login.php?action=logout, wp-admin), descargas, enlaces de afiliado o nofollow, ni con
 * «ahorro de datos». Mismas exclusiones que las Speculation Rules de WordPress.
 */
function allowed( a: HTMLAnchorElement ): boolean {
	const conn = ( navigator as unknown as { connection?: { saveData?: boolean } } ).connection;
	return a.origin === location.origin
		&& ( a.protocol === 'https:' || a.protocol === 'http:' )
		&& ! a.search
		&& a.target !== '_blank'
		&& ! a.hasAttribute( 'download' )
		&& ! /(^|\s)(nofollow|sponsored|ugc)(\s|$)/i.test( a.rel )
		&& ! /\/wp-[^/]*\.php|\/wp-admin\/|\/wp-content\//.test( a.pathname )
		&& ! a.closest( '.no-prefetch' )
		&& ! conn?.saveData
		&& a.href.split( '#' )[ 0 ] !== location.href.split( '#' )[ 0 ];
}

function prefetch( a: HTMLAnchorElement ): void {
	const url = a.href;
	if ( done.has( url ) || ! allowed( a ) ) return;
	done.add( url );
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

const cancel = () => {
	if ( pending ) clearTimeout( pending.timer );
	pending = null;
};

function down( e: PointerEvent ): void {
	if ( ! ( e.target instanceof Element ) ) return;
	const a = e.target.closest<HTMLAnchorElement>( 'a[href]' );
	if ( ! a || ! a.closest( '.imm-drawer, .imm-bbar, .imm-search' ) ) return;
	cancel();
	if ( e.pointerType === 'mouse' ) {
		prefetch( a );
		return;
	}
	pending = { timer: window.setTimeout( () => prefetch( a ), 90 ), x: e.clientX, y: e.clientY };
}

let started = false;

export function start( first: PointerEvent ): void {
	if ( started ) return;
	started = true;
	doc.addEventListener( 'pointerdown', down, { passive: true } );
	doc.addEventListener( 'pointermove', ( e ) => {
		if ( pending && Math.hypot( e.clientX - pending.x, e.clientY - pending.y ) > 10 ) cancel();
	}, { passive: true } );
	doc.addEventListener( 'pointercancel', cancel, { passive: true } );
	down( first );
}
