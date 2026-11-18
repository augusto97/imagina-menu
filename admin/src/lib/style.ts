import type { DesignStyle, Preset, Profile, Tokens } from './types';

/** Valores de respaldo si el servidor todavía no envía design.style. */
export const DEFAULT_STYLE: DesignStyle = {
	panel: 'flat',
	header: 'solid',
	header_image: { id: 0, url: '' },
	items: 'list',
	icons: 'plain',
	font: 'theme',
	weight: 'medium',
	headings: 'caps',
	active: 'text',
	chevron: 'chevron',
	badge: 'solid',
	search: 'filled',
	overlay: 'dim',
	shadow: 'soft',
	motion: 'smooth',
	stagger: false,
};

/** Claves que se comparan para saber si el diseño está personalizado (la imagen es contenido, no estilo). */
const STYLE_KEYS = ( Object.keys( DEFAULT_STYLE ) as ( keyof DesignStyle )[] ).filter( ( k ) => k !== 'header_image' );

/** Completa un estilo parcial: primero lo que llega, luego el del preset y por último los valores de respaldo. */
export function fillStyle( style: Partial<DesignStyle> | undefined | null, base?: Partial<DesignStyle> ): DesignStyle {
	const out = { ...DEFAULT_STYLE, ...( base ?? {} ), ...( style && ! Array.isArray( style ) ? style : {} ) } as DesignStyle;
	const image = out.header_image as Partial<DesignStyle[ 'header_image' ]> | unknown[] | undefined;
	out.header_image = image && ! Array.isArray( image ) ? { id: Number( image.id ) || 0, url: String( image.url ?? '' ) } : { id: 0, url: '' };
	out.stagger = !! out.stagger;
	return out;
}

/** Estilo de un preset (con respaldo si es un servidor antiguo). */
export function presetStyle( preset: Preset | undefined ): DesignStyle {
	return fillStyle( preset?.style );
}

function sameToken( a: string | number | undefined, b: string | number | undefined ): boolean {
	return String( a ?? '' ).toLowerCase() === String( b ?? '' ).toLowerCase();
}

/** Diferencias entre el diseño del perfil y su preset (colores y estilo). */
export function designDiff( profile: Profile, preset: Preset | undefined ): { tokens: string[]; style: ( keyof DesignStyle )[] } {
	if ( ! preset ) {
		return { tokens: [], style: [] };
	}
	const tokens = Object.keys( preset.tokens ).filter( ( k ) => ! sameToken( profile.design.tokens[ k ], preset.tokens[ k ] ) );
	const ps = presetStyle( preset );
	const style = STYLE_KEYS.filter( ( k ) => profile.design.style[ k ] !== ps[ k ] );
	return { tokens, style };
}

export function isPersonalized( profile: Profile, preset: Preset | undefined ): boolean {
	const d = designDiff( profile, preset );
	return d.tokens.length + d.style.length > 0;
}

/** Aplica tokens + estilo de un preset (sin tocar la estructura ni la imagen de cabecera). */
export function withPresetDesign( profile: Profile, key: string, preset: Preset ): Profile {
	const style = presetStyle( preset );
	return {
		...profile,
		design: {
			...profile.design,
			preset: key,
			tokens: { ...preset.tokens } as Tokens,
			style: { ...style, header_image: profile.design.style?.header_image ?? { id: 0, url: '' } },
		},
	};
}

/** Pilas de fuentes del sistema (no se cargan fuentes web): mismas que usa el CSS del menú. */
export const FONT_STACKS: Record<DesignStyle[ 'font' ], string> = {
	theme: 'inherit',
	system: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
	rounded: 'ui-rounded, "SF Pro Rounded", "Nunito", "Varela Round", system-ui, sans-serif',
	serif: 'ui-serif, "New York", Georgia, "Times New Roman", serif',
};

/** Curvas aproximadas para la demostración de movimiento del admin. */
export const MOTION_EASING: Record<DesignStyle[ 'motion' ], string> = {
	smooth: 'cubic-bezier(.2,.8,.2,1)',
	snappy: 'cubic-bezier(.16,1,.3,1)',
	// Igual que el frontend: resorte suave (≈4 % de rebote) para submenús e ítems.
	spring: 'linear(0,.157 7.4%,.483 15.3%,.788 24.2%,.958 32.4%,1.032 40.6%,1.045 47.6%,1.03 56.5%,1.008 68.5%,.998 82%,1)',
};
