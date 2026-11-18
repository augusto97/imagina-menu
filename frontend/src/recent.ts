/**
 * Imagina Menu — búsquedas recientes (módulo bajo demanda: se descarga al abrir el buscador, si el
 * perfil las usa). Se guardan en el navegador del visitante, sin cookies ni servidor.
 */
export {};

const KEY = 'imm-recent';
const started = new WeakSet<HTMLElement>();

/** Validadas: localStorage lo puede tocar cualquier script del dominio. */
function read(): string[] {
	try {
		const v: unknown = JSON.parse( localStorage.getItem( KEY ) || '[]' );
		return Array.isArray( v ) ? v.filter( ( t ): t is string => typeof t === 'string' && t.length > 0 && t.length <= 100 ).slice( 0, 8 ) : [];
	} catch {
		return [];
	}
}

/** Pinta las recientes y, la primera vez, empieza a guardar las búsquedas del formulario propio. */
export function open( s: HTMLDialogElement ): void {
	const recent = s.querySelector<HTMLElement>( '.imm-s-recent' );
	const list = recent?.querySelector( 'ul' );
	const form = s.querySelector<HTMLFormElement>( 'form.imm-s-form' );
	if ( ! recent || ! list || ! form ) return;
	if ( ! started.has( s ) ) {
		started.add( s );
		form.addEventListener( 'submit', () => {
			const term = form.querySelector<HTMLInputElement>( '.imm-s-input' )?.value.trim().slice( 0, 100 );
			if ( ! term ) return;
			const items = [ term, ...read().filter( ( t ) => t.toLowerCase() !== term.toLowerCase() ) ].slice( 0, 8 );
			try {
				localStorage.setItem( KEY, JSON.stringify( items ) );
			} catch {}
		} );
	}
	const items = read();
	recent.hidden = ! items.length;
	list.textContent = '';
	for ( const term of items ) {
		const url = new URL( form.action );
		for ( const [ k, v ] of new FormData( form ) ) url.searchParams.set( k, k === 's' ? term : String( v ) );
		const li = document.createElement( 'li' );
		const a = document.createElement( 'a' );
		a.href = url.href;
		a.textContent = term;
		li.append( a );
		list.append( li );
	}
}
