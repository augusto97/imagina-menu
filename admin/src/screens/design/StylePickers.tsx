import { ArrowRight, ChevronRight, Search } from 'lucide-react';
import type { CSSProperties, ReactNode } from 'react';
import { __ } from '@/lib/i18n';
import { FONT_STACKS, MOTION_EASING } from '@/lib/style';
import type { DesignStyle, Tokens } from '@/lib/types';
import { cn } from '@/lib/utils';

export interface TileOption<T extends string> {
	value: T;
	label: string;
	hint: string;
	art: ReactNode;
}

/**
 * Selector visual: cada opción es una tarjeta con un dibujo mínimo de la variante. Debajo se
 * explica la opción elegida (cuándo conviene).
 */
export function OptionTiles<T extends string>( { value, options, onChange, label }: { value: T; options: TileOption<T>[]; onChange: ( value: T ) => void; label: string } ) {
	return (
		<div role="radiogroup" aria-label={ label } className="imm:grid imm:gap-2" style={ { gridTemplateColumns: `repeat(${ Math.max( options.length, 3 ) }, minmax(0, 1fr))` } }>
			{ options.map( ( option ) => {
				const selected = option.value === value;
				return (
					<button
						key={ option.value }
						type="button"
						role="radio"
						aria-checked={ selected }
						title={ option.hint }
						onClick={ () => onChange( option.value ) }
						className={ cn(
							'imm:group imm:flex imm:min-w-0 imm:flex-col imm:rounded-lg imm:border imm:bg-white imm:p-1.5 imm:text-left imm:transition-all imm:hover:border-zinc-400',
							selected ? 'imm:border-zinc-900 imm:ring-1 imm:ring-zinc-900' : 'imm:border-zinc-200'
						) }
					>
						<span className="imm:relative imm:block imm:h-16 imm:overflow-hidden imm:rounded-md imm:bg-zinc-50">{ option.art }</span>
						<span className={ cn( 'imm:mt-1.5 imm:truncate imm:px-0.5 imm:text-center imm:text-[12px] imm:font-medium', selected ? 'imm:text-zinc-900' : 'imm:text-zinc-600' ) }>{ option.label }</span>
					</button>
				);
			} ) }
		</div>
	);
}

export function hintOf<T extends string>( options: TileOption<T>[], value: T ): string {
	return options.find( ( o ) => o.value === value )?.hint ?? '';
}

// ── Piezas de dibujo ──────────────────────────────────────────────────────────────────────────

const c = ( t: Tokens, k: string, fallback = '#888888' ) => String( t[ k ] ?? fallback );

function Line( { w, color, opacity = 1, h = 3, style }: { w: string | number; color: string; opacity?: number; h?: number; style?: CSSProperties } ) {
	return <span style={ { display: 'block', width: w, height: h, borderRadius: 9, background: color, opacity, flex: 'none', ...style } } />;
}

/** Fondo de "página" que se ve detrás del panel (para notar el cristal y la sombra). */
function Page() {
	return (
		<span className="imm:absolute imm:inset-0 imm:flex imm:flex-col imm:gap-1.5 imm:bg-zinc-200 imm:p-2 imm:pl-[58%]">
			<Line w="80%" color="#a1a1aa" />
			<Line w="60%" color="#a1a1aa" />
			<span className="imm:block imm:h-5 imm:rounded" style={ { background: 'linear-gradient(135deg,#fca5a5,#93c5fd)' } } />
			<Line w="70%" color="#a1a1aa" />
		</span>
	);
}

function Rows( { t, n = 3, gap = 5 }: { t: Tokens; n?: number; gap?: number } ) {
	return (
		<span className="imm:flex imm:flex-col" style={ { gap } }>
			{ Array.from( { length: n } ).map( ( _, i ) => (
				<Line key={ i } w={ `${ 80 - i * 14 }%` } color={ c( t, 'fg' ) } opacity={ 0.55 } />
			) ) }
		</span>
	);
}

// ── Forma del panel ───────────────────────────────────────────────────────────────────────────

export function panelOptions( t: Tokens ): TileOption<DesignStyle[ 'panel' ]>[] {
	const panel = ( style: CSSProperties ) => (
		<>
			<Page />
			<span className="imm:absolute imm:flex imm:flex-col imm:gap-1.5 imm:p-2" style={ { background: c( t, 'bg' ), ...style } }>
				<Line w="70%" color={ c( t, 'accent' ) } />
				<Rows t={ t } n={ 3 } gap={ 4 } />
			</span>
		</>
	);
	return [
		{ value: 'flat', label: __( 'Plano' ), hint: __( 'Panel de borde a borde, recto. Clásico y sobrio.' ), art: panel( { left: 0, top: 0, bottom: 0, width: '55%' } ) },
		{ value: 'rounded', label: __( 'Redondeado' ), hint: __( 'Esquinas suaves en el lado abierto: más amable y moderno.' ), art: panel( { left: 0, top: 0, bottom: 0, width: '55%', borderRadius: '0 12px 12px 0' } ) },
		{ value: 'floating', label: __( 'Flotante' ), hint: __( 'Separado de los bordes con esquinas redondeadas y sombra: se siente como una app.' ), art: panel( { left: 5, top: 5, bottom: 5, width: '52%', borderRadius: 9, boxShadow: '0 6px 14px rgba(0,0,0,.25)' } ) },
		{
			value: 'glass',
			label: __( 'Cristal' ),
			hint: __( 'Translúcido con desenfoque del sitio detrás. Muy vistoso; ideal con fondos oscuros o de color.' ),
			art: panel( { left: 0, top: 0, bottom: 0, width: '62%', borderRadius: '0 12px 12px 0', background: `color-mix(in srgb, ${ c( t, 'bg' ) } 55%, transparent)`, backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' } ),
		},
	];
}

// ── Cabecera ──────────────────────────────────────────────────────────────────────────────────

function Account( { fg }: { fg: string } ) {
	return (
		<span className="imm:flex imm:items-center imm:gap-1.5">
			<span className="imm:block imm:size-3.5 imm:rounded-full" style={ { background: fg, opacity: 0.35 } } />
			<span className="imm:flex imm:flex-col imm:gap-1">
				<Line w={ 26 } color={ fg } opacity={ 0.6 } h={ 2 } />
				<Line w={ 38 } color={ fg } h={ 3 } />
			</span>
		</span>
	);
}

export function headerOptions( t: Tokens ): TileOption<DesignStyle[ 'header' ]>[] {
	const frame = ( head: ReactNode ) => (
		<span className="imm:absolute imm:inset-0 imm:flex imm:flex-col" style={ { background: c( t, 'bg' ) } }>
			{ head }
			<span className="imm:flex imm:flex-col imm:gap-1.5 imm:p-2">
				<Rows t={ t } n={ 2 } gap={ 4 } />
			</span>
		</span>
	);
	const hf = c( t, 'head_fg' );
	return [
		{ value: 'solid', label: __( 'Sólida' ), hint: __( 'Bloque de color de marca con el saludo y la cuenta.' ), art: frame( <span className="imm:block imm:p-2" style={ { background: c( t, 'head_bg' ) } }><Account fg={ hf } /></span> ) },
		{
			value: 'gradient',
			label: __( 'Degradado' ),
			hint: __( 'Degradado entre los dos colores de cabecera: el toque más «premium».' ),
			art: frame( <span className="imm:block imm:p-2" style={ { background: `linear-gradient(135deg, ${ c( t, 'head_bg' ) }, ${ c( t, 'head_bg2', c( t, 'accent' ) ) })` } }><Account fg={ hf } /></span> ),
		},
		{ value: 'minimal', label: __( 'Minimal' ), hint: __( 'Sin bloque de color: la cuenta sobre el fondo del panel, separada por una línea.' ), art: frame( <span className="imm:block imm:border-b imm:p-2" style={ { borderColor: c( t, 'border' ) } }><Account fg={ c( t, 'fg' ) } /></span> ) },
		{
			value: 'card',
			label: __( 'Tarjeta' ),
			hint: __( 'La cuenta dentro de una tarjeta redondeada que flota sobre el panel.' ),
			art: frame(
				<span className="imm:block imm:p-1.5">
					<span className="imm:block imm:rounded-md imm:p-1.5 imm:shadow-sm" style={ { background: c( t, 'head_bg' ) } }>
						<Account fg={ hf } />
					</span>
				</span>
			),
		},
		{
			value: 'image',
			label: __( 'Imagen' ),
			hint: __( 'Una foto de tu marca detrás del saludo, con un velo oscuro para que el texto se lea.' ),
			art: frame(
				<span className="imm:relative imm:block imm:overflow-hidden imm:p-2" style={ { background: 'linear-gradient(160deg,#0f766e,#0c4a6e)' } }>
					<svg viewBox="0 0 60 20" className="imm:absolute imm:inset-x-0 imm:bottom-0 imm:h-4 imm:w-full" preserveAspectRatio="none" aria-hidden>
						<path d="M0 20 L12 8 L22 15 L34 4 L48 14 L60 7 L60 20 Z" fill="rgba(255,255,255,.25)" />
					</svg>
					<span className="imm:relative">
						<Account fg="#ffffff" />
					</span>
				</span>
			),
		},
	];
}

// ── Ítems ─────────────────────────────────────────────────────────────────────────────────────

export function itemsOptions( t: Tokens ): TileOption<DesignStyle[ 'items' ]>[] {
	const fg = c( t, 'fg' );
	const row = ( w: string, style: CSSProperties = {} ) => (
		<span className="imm:flex imm:items-center imm:gap-1.5 imm:px-1.5 imm:py-[3px]" style={ style }>
			<span className="imm:block imm:size-1.5 imm:rounded-full" style={ { background: c( t, 'muted' ) } } />
			<Line w={ w } color={ fg } opacity={ 0.6 } />
		</span>
	);
	const wrap = ( children: ReactNode, style: CSSProperties = {} ) => (
		<span className="imm:absolute imm:inset-0 imm:flex imm:flex-col imm:justify-center imm:gap-0.5 imm:p-1.5" style={ { background: c( t, 'bg' ), ...style } }>
			{ children }
		</span>
	);
	const border = c( t, 'border' );
	return [
		{ value: 'list', label: __( 'Lista' ), hint: __( 'Filas limpias de borde a borde. Lo más rápido de leer.' ), art: wrap( <>{ row( '70%' ) }{ row( '55%' ) }{ row( '62%' ) }</> ) },
		{ value: 'divided', label: __( 'Separadores' ), hint: __( 'Una línea fina entre ítems: ordenado y clásico.' ), art: wrap( <>{ row( '70%', { borderBottom: `1px solid ${ border }` } ) }{ row( '55%', { borderBottom: `1px solid ${ border }` } ) }{ row( '62%' ) }</> ) },
		{
			value: 'cards',
			label: __( 'Tarjetas' ),
			hint: __( 'Cada ítem en una tarjeta con aire alrededor: visual y táctil.' ),
			art: wrap( <span className="imm:flex imm:flex-col imm:gap-1">{ [ '70%', '55%', '62%' ].map( ( w ) => <span key={ w } className="imm:block imm:rounded" style={ { border: `1px solid ${ border }`, background: c( t, 'bg' ) } }>{ row( w ) }</span> ) }</span>, { background: c( t, 'hover_bg' ) } ),
		},
		{
			value: 'pills',
			label: __( 'Píldoras' ),
			hint: __( 'Filas con margen y esquinas redondeadas, como los menús de Android y Material.' ),
			art: wrap( <>{ row( '70%', { background: `color-mix(in srgb, ${ c( t, 'accent' ) } 16%, transparent)`, borderRadius: 99, margin: '0 2px' } ) }{ row( '55%', { margin: '0 2px' } ) }{ row( '62%', { margin: '0 2px' } ) }</> ),
		},
		{
			value: 'grouped',
			label: __( 'Agrupados' ),
			hint: __( 'Secciones en bloques redondeados sobre fondo gris, como los Ajustes del iPhone.' ),
			art: wrap(
				<span className="imm:block imm:overflow-hidden imm:rounded-md" style={ { background: c( t, 'bg' ) } }>
					{ row( '70%', { borderBottom: `1px solid ${ border }` } ) }
					{ row( '55%', { borderBottom: `1px solid ${ border }` } ) }
					{ row( '62%' ) }
				</span>,
				{ background: c( t, 'hover_bg' ) }
			),
		},
	];
}

// ── Iconos ────────────────────────────────────────────────────────────────────────────────────

const MULTI = [ '#ff9500', '#34c759', '#007aff' ];

export function iconsOptions( t: Tokens ): TileOption<DesignStyle[ 'icons' ]>[] {
	const accent = c( t, 'accent' );
	const rows = ( icon: ( i: number ) => ReactNode ) => (
		<span className="imm:absolute imm:inset-0 imm:flex imm:flex-col imm:justify-center imm:gap-1.5 imm:px-2" style={ { background: c( t, 'bg' ) } }>
			{ [ 0, 1, 2 ].map( ( i ) => (
				<span key={ i } className="imm:flex imm:items-center imm:gap-1.5">
					{ icon( i ) }
					<Line w={ `${ 60 - i * 10 }%` } color={ c( t, 'fg' ) } opacity={ 0.55 } />
				</span>
			) ) }
		</span>
	);
	const box = ( style: CSSProperties, inner?: ReactNode ) => (
		<span className="imm:flex imm:size-3.5 imm:flex-none imm:items-center imm:justify-center" style={ style }>
			{ inner }
		</span>
	);
	const dot = ( color: string ) => <span className="imm:block imm:size-1.5 imm:rounded-full" style={ { background: color } } />;
	return [
		{ value: 'plain', label: __( 'Simples' ), hint: __( 'El icono de línea, sin fondo. Discreto.' ), art: rows( () => box( { border: `1.5px solid ${ c( t, 'muted' ) }`, borderRadius: 3, width: 10, height: 10 } ) ) },
		{ value: 'soft', label: __( 'Círculo suave' ), hint: __( 'Icono en el color de acento dentro de un círculo tenue.' ), art: rows( () => box( { borderRadius: 99, background: `color-mix(in srgb, ${ accent } 16%, transparent)` }, dot( accent ) ) ) },
		{ value: 'tile', label: __( 'Cuadro de acento' ), hint: __( 'Icono blanco sobre un cuadro del color de acento: llamativo y de marca.' ), art: rows( () => box( { borderRadius: 4, background: accent }, dot( '#ffffff' ) ) ) },
		{ value: 'color', label: __( 'Multicolor' ), hint: __( 'Cada ítem con un color distinto, como los Ajustes del iPhone. Alegre y fácil de escanear.' ), art: rows( ( i ) => box( { borderRadius: 4, background: MULTI[ i ] }, dot( '#ffffff' ) ) ) },
		{ value: 'none', label: __( 'Sin iconos' ), hint: __( 'Solo texto (las imágenes de categorías se mantienen). Editorial y minimal.' ), art: rows( () => null ) },
	];
}

// ── Ítem activo / al pasar ────────────────────────────────────────────────────────────────────

export function activeOptions( t: Tokens ): TileOption<DesignStyle[ 'active' ]>[] {
	const accent = c( t, 'accent' );
	const rows = ( active: CSSProperties, line: string ) => (
		<span className="imm:absolute imm:inset-0 imm:flex imm:flex-col imm:justify-center imm:gap-1" style={ { background: c( t, 'bg' ) } }>
			<span className="imm:px-2 imm:py-[3px]"><Line w="55%" color={ c( t, 'fg' ) } opacity={ 0.5 } /></span>
			<span className="imm:relative imm:px-2 imm:py-[3px]" style={ active }><Line w="65%" color={ line } /></span>
			<span className="imm:px-2 imm:py-[3px]"><Line w="48%" color={ c( t, 'fg' ) } opacity={ 0.5 } /></span>
		</span>
	);
	return [
		{ value: 'text', label: __( 'Color del texto' ), hint: __( 'Solo cambia el color del ítem actual. Lo más sutil.' ), art: rows( {}, accent ) },
		{ value: 'bar', label: __( 'Barra lateral' ), hint: __( 'Una barra de acento a la izquierda y un fondo tenue. Muy claro dónde estás.' ), art: rows( { boxShadow: `inset 3px 0 0 ${ accent }`, background: `color-mix(in srgb, ${ accent } 10%, transparent)` }, accent ) },
		{ value: 'pill', label: __( 'Píldora' ), hint: __( 'Fondo redondeado del color de acento suave, estilo Material.' ), art: rows( { background: `color-mix(in srgb, ${ accent } 16%, transparent)`, borderRadius: 99, margin: '0 4px' }, accent ) },
	];
}

// ── Flecha de submenú ─────────────────────────────────────────────────────────────────────────

export function chevronOptions( t: Tokens ): TileOption<DesignStyle[ 'chevron' ]>[] {
	const row = ( icon: ReactNode ) => (
		<span className="imm:absolute imm:inset-0 imm:flex imm:flex-col imm:justify-center imm:gap-2 imm:px-2" style={ { background: c( t, 'bg' ), color: c( t, 'muted' ) } }>
			{ [ 0, 1 ].map( ( i ) => (
				<span key={ i } className="imm:flex imm:items-center imm:justify-between">
					<Line w={ i ? '45%' : '58%' } color={ c( t, 'fg' ) } opacity={ 0.55 } />
					{ icon }
				</span>
			) ) }
		</span>
	);
	return [
		{ value: 'chevron', label: __( 'Ángulo' ), hint: __( 'El clásico «›»: indica que hay más adentro.' ), art: row( <ChevronRight className="imm:size-3.5" strokeWidth={ 2.5 } aria-hidden /> ) },
		{ value: 'arrow', label: __( 'Flecha' ), hint: __( 'Flecha completa «→»: más gráfica y moderna.' ), art: row( <ArrowRight className="imm:size-3.5" strokeWidth={ 2.5 } aria-hidden /> ) },
		{ value: 'none', label: __( 'Ninguna' ), hint: __( 'Sin indicador: más limpio, pero el usuario no ve qué ítems tienen submenú.' ), art: row( null ) },
	];
}

// ── Títulos de sección ────────────────────────────────────────────────────────────────────────

export function headingOptions( t: Tokens ): TileOption<DesignStyle[ 'headings' ]>[] {
	const frame = ( title: ReactNode ) => (
		<span className="imm:absolute imm:inset-0 imm:flex imm:flex-col imm:justify-center imm:gap-1.5 imm:px-2" style={ { background: c( t, 'bg' ) } }>
			{ title }
			<Line w="62%" color={ c( t, 'fg' ) } opacity={ 0.5 } />
			<Line w="48%" color={ c( t, 'fg' ) } opacity={ 0.5 } />
		</span>
	);
	return [
		{ value: 'caps', label: __( 'Mayúsculas' ), hint: __( 'Pequeños, en mayúsculas y gris: separan sin robar protagonismo.' ), art: frame( <span className="imm:text-[8px] imm:font-bold imm:tracking-[.12em]" style={ { color: c( t, 'muted' ) } }>SECCIÓN</span> ) },
		{ value: 'bold', label: __( 'Negrita' ), hint: __( 'Más grandes y en negrita, sin mayúsculas: estilo editorial.' ), art: frame( <span className="imm:text-[11px] imm:font-bold" style={ { color: c( t, 'fg' ) } }>Sección</span> ) },
		{
			value: 'accent',
			label: __( 'Acento' ),
			hint: __( 'En el color de marca con una línea corta: destaca las secciones.' ),
			art: frame(
				<span className="imm:flex imm:items-center imm:gap-1 imm:text-[8px] imm:font-bold imm:tracking-[.12em]" style={ { color: c( t, 'accent' ) } }>
					SECCIÓN <span className="imm:block imm:h-px imm:flex-1" style={ { background: c( t, 'accent' ), opacity: 0.4 } } />
				</span>
			),
		},
	];
}

// ── Tipografía ────────────────────────────────────────────────────────────────────────────────

export function fontOptions( t: Tokens ): TileOption<DesignStyle[ 'font' ]>[] {
	const sample = ( family: string ) => (
		<span className="imm:absolute imm:inset-0 imm:flex imm:items-center imm:justify-center imm:gap-2" style={ { background: c( t, 'bg' ), color: c( t, 'fg' ), fontFamily: family } }>
			<span className="imm:text-[22px] imm:leading-none imm:font-semibold">Aa</span>
			<span className="imm:text-[10px] imm:leading-tight imm:opacity-70">Menú<br />Ofertas</span>
		</span>
	);
	return [
		{ value: 'theme', label: __( 'Del tema' ), hint: __( 'La misma tipografía de tu sitio: coherencia total (aquí se muestra la del admin).' ), art: sample( 'inherit' ) },
		{ value: 'system', label: __( 'Sistema' ), hint: __( 'San Francisco en iPhone y Roboto en Android: se siente nativo y no descarga nada.' ), art: sample( FONT_STACKS.system ) },
		{ value: 'rounded', label: __( 'Redondeada' ), hint: __( 'Letras redondeadas (SF Rounded en Apple): cercana y amable. Donde no existe, usa la del sistema.' ), art: sample( FONT_STACKS.rounded ) },
		{ value: 'serif', label: __( 'Serif' ), hint: __( 'Con remates, elegante: moda, joyería, gastronomía.' ), art: sample( FONT_STACKS.serif ) },
	];
}

// ── Buscador ──────────────────────────────────────────────────────────────────────────────────

export function searchOptions( t: Tokens ): TileOption<DesignStyle[ 'search' ]>[] {
	const field = ( style: CSSProperties ) => (
		<span className="imm:absolute imm:inset-0 imm:flex imm:items-center imm:px-2" style={ { background: c( t, 'bg' ) } }>
			<span className="imm:flex imm:h-6 imm:w-full imm:items-center imm:gap-1 imm:px-2" style={ { color: c( t, 'muted' ), ...style } }>
				<Search className="imm:size-3" aria-hidden />
				<Line w="45%" color={ c( t, 'muted' ) } opacity={ 0.6 } h={ 2 } />
			</span>
		</span>
	);
	return [
		{ value: 'filled', label: __( 'Relleno' ), hint: __( 'Campo gris redondeado: el más reconocible.' ), art: field( { background: c( t, 'hover_bg' ), borderRadius: 99 } ) },
		{ value: 'outline', label: __( 'Contorno' ), hint: __( 'Solo un borde fino: ligero y elegante.' ), art: field( { border: `1.5px solid ${ c( t, 'border' ) }`, borderRadius: 99 } ) },
		{ value: 'underline', label: __( 'Subrayado' ), hint: __( 'Una línea debajo, sin caja: minimal y editorial.' ), art: field( { borderBottom: `1.5px solid ${ c( t, 'fg' ) }`, borderRadius: 0 } ) },
	];
}

// ── Movimiento ────────────────────────────────────────────────────────────────────────────────

export function motionOptions( t: Tokens ): TileOption<DesignStyle[ 'motion' ]>[] {
	const demo = ( easing: string, ms: number ) => (
		<span className="imm:absolute imm:inset-0 imm:flex imm:items-center imm:px-3" style={ { background: c( t, 'bg' ) } }>
			<span className="imm:relative imm:block imm:h-1 imm:w-full imm:rounded-full" style={ { background: c( t, 'border' ) } }>
				<span
					className="imm:absolute imm:top-1/2 imm:left-0 imm:block imm:size-3.5 imm:-translate-y-1/2 imm:rounded-full imm:shadow imm:group-hover:left-[calc(100%-14px)]"
					style={ { background: c( t, 'accent' ), transition: `left ${ ms }ms ${ easing }` } }
				/>
			</span>
		</span>
	);
	return [
		{ value: 'smooth', label: __( 'Suave' ), hint: __( 'Desacelera con calma al final. Natural para cualquier sitio. (Pasa el cursor para verlo).' ), art: demo( MOTION_EASING.smooth, 700 ) },
		{ value: 'snappy', label: __( 'Ágil' ), hint: __( 'Arranca rápido y frena en seco: se siente veloz y preciso. (Pasa el cursor para verlo).' ), art: demo( MOTION_EASING.snappy, 450 ) },
		{ value: 'spring', label: __( 'Con rebote' ), hint: __( 'Un pequeño rebote al llegar, como en las apps nativas. Juguetón. (Pasa el cursor para verlo).' ), art: demo( MOTION_EASING.spring, 700 ) },
	];
}

// ── Insignias (control segmentado con muestra) ────────────────────────────────────────────────

export function BadgeSample( { t, variant }: { t: Tokens; variant: DesignStyle[ 'badge' ] } ) {
	const bg = c( t, 'badge_bg' );
	const style: CSSProperties =
		variant === 'solid'
			? { background: bg, color: c( t, 'badge_fg', '#fff' ) }
			: variant === 'soft'
				? { background: `color-mix(in srgb, ${ bg } 15%, transparent)`, color: bg }
				: { boxShadow: `inset 0 0 0 1.5px ${ bg }`, color: bg };
	return (
		<span className="imm:inline-flex imm:h-4 imm:items-center imm:rounded-full imm:px-1.5 imm:text-[9px] imm:font-bold imm:leading-none" style={ style }>
			-30%
		</span>
	);
}
