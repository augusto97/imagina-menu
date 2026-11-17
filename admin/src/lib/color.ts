/** Contraste WCAG 2.x entre dos colores #rrggbb. */
function luminance( hex: string ): number {
	let value = hex.replace( '#', '' );
	if ( value.length === 3 ) {
		value = value.split( '' ).map( ( c ) => c + c ).join( '' );
	}
	const rgb = [ 0, 2, 4 ].map( ( i ) => parseInt( value.slice( i, i + 2 ), 16 ) / 255 );
	const [ r = 0, g = 0, b = 0 ] = rgb.map( ( c ) => ( c <= 0.03928 ? c / 12.92 : ( ( c + 0.055 ) / 1.055 ) ** 2.4 ) );
	return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast( a: string, b: string ): number {
	if ( ! /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test( a ) || ! /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test( b ) ) {
		return 0;
	}
	const [ l1, l2 ] = [ luminance( a ), luminance( b ) ].sort( ( x, y ) => y - x ) as [ number, number ];
	return ( l1 + 0.05 ) / ( l2 + 0.05 );
}

export function isHex( value: string ): boolean {
	return /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test( value );
}
