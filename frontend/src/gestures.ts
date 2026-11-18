/**
 * Imagina Menu — gestos del panel (módulo bajo demanda: se descarga la primera vez que se abre el
 * panel, si «Cerrar deslizando» está activo). Deslizar hacia el borde cierra; hacia el otro lado
 * vuelve un nivel.
 */
export {};

export type Nav = { back: () => void; depth: () => number; hide: () => void };

export function start( d: HTMLDialogElement, nav: Nav ): void {
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
		const deep = nav.depth() > 0;
		if ( d.classList.contains( 'imm-side-bottom' ) ) {
			if ( dx > 0 && deep ) nav.back();
			return;
		}
		if ( ( dx < 0 && ! right ) || ( dx > 0 && right && ! deep ) ) nav.hide();
		else if ( dx > 0 && deep ) nav.back();
	}, { passive: true } );
}
