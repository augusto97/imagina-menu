/**
 * Imagina Menu — horario de atención de WhatsApp (módulo bajo demanda: se descarga al abrir el panel
 * si el botón tiene horario). Fuera de horario cambia el texto (el enlace sigue). Lo decide el
 * navegador con la hora del sitio, porque las páginas están en caché:
 * data-imm-hours = días|desde|hasta|desfase UTC en minutos. Un atributo malformado no cambia nada.
 */
export {};

const min = ( s: string ) => ( /^\d\d:\d\d$/.test( s ) ? +s.slice( 0, 2 ) * 60 + +s.slice( 3 ) : NaN );

export function start( root: ParentNode ): void {
	for ( const a of root.querySelectorAll<HTMLElement>( '[data-imm-hours]' ) ) {
		const [ days = '', from = '', to = '', off = '' ] = ( a.dataset.immHours || '' ).split( '|' );
		const f = min( from );
		const e = min( to );
		if ( isNaN( f + e + parseInt( off, 10 ) ) ) continue;
		const t = new Date( Date.now() + parseInt( off, 10 ) * 6e4 ); // La hora UTC de t es la hora del sitio.
		const m = t.getUTCHours() * 60 + t.getUTCMinutes();
		const open = days.split( ',' ).includes( String( t.getUTCDay() ) ) && ( f <= e ? m >= f && m < e : m >= f || m < e );
		a.classList.toggle( 'imm-off', ! open );
		const label = a.querySelector( 'span' );
		if ( ! open && label ) label.textContent = ( a.dataset.off || '' ).slice( 0, 60 );
	}
}
