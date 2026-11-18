import { ColorField } from '@/components/ColorField';
import { PageHeader, Range, Row, Section, Segmented, ToggleRow } from '@/components/common';
import { MediaField } from '@/components/MediaField';
import { Textarea } from '@/components/ui/input';
import { contrast } from '@/lib/color';
import { __ } from '@/lib/i18n';
import { setProfile, useActiveProfile, useStore } from '@/lib/store';
import type { DesignStyle, Profile } from '@/lib/types';
import { cn } from '@/lib/utils';
import { PresetGallery } from './design/PresetGallery';
import {
	activeOptions,
	BadgeSample,
	chevronOptions,
	fontOptions,
	headerOptions,
	headingOptions,
	hintOf,
	iconsOptions,
	itemsOptions,
	motionOptions,
	OptionTiles,
	panelOptions,
	searchOptions,
} from './design/StylePickers';

const GROUPS: { title: string; description?: string; keys: [ string, string ][] }[] = [
	{
		title: __( 'Panel' ),
		keys: [
			[ 'bg', __( 'Fondo' ) ],
			[ 'fg', __( 'Texto' ) ],
			[ 'muted', __( 'Texto secundario' ) ],
			[ 'border', __( 'Bordes' ) ],
			[ 'hover_bg', __( 'Fondo al tocar' ) ],
		],
	},
	{
		title: __( 'Cabecera del panel' ),
		description: __( 'El segundo color se usa en la cabecera con degradado.' ),
		keys: [
			[ 'head_bg', __( 'Fondo' ) ],
			[ 'head_bg2', __( 'Segundo color (degradado)' ) ],
			[ 'head_fg', __( 'Texto' ) ],
		],
	},
	{
		title: __( 'Acento e insignias' ),
		description: __( 'El color de marca: destacados, botón central, CTA.' ),
		keys: [
			[ 'accent', __( 'Acento' ) ],
			[ 'accent_fg', __( 'Texto sobre el acento' ) ],
			[ 'badge_bg', __( 'Fondo de insignia' ) ],
			[ 'badge_fg', __( 'Texto de insignia' ) ],
		],
	},
	{
		title: __( 'Barra inferior' ),
		keys: [
			[ 'bbar_bg', __( 'Fondo' ) ],
			[ 'bbar_fg', __( 'Iconos' ) ],
			[ 'bbar_active', __( 'Activo' ) ],
			[ 'bbar_active_bg', __( 'Fondo del activo' ) ],
		],
	},
	{
		title: __( 'Botón flotante' ),
		keys: [
			[ 'fab_bg', __( 'Fondo' ) ],
			[ 'fab_fg', __( 'Icono' ) ],
		],
	},
];

const PAIRS: [ string, string, string ][] = [
	[ 'fg', 'bg', __( 'Texto del panel' ) ],
	[ 'head_fg', 'head_bg', __( 'Cabecera' ) ],
	[ 'accent_fg', 'accent', __( 'Texto sobre acento' ) ],
	[ 'badge_fg', 'badge_bg', __( 'Insignias' ) ],
	[ 'bbar_active', 'bbar_bg', __( 'Activo de la barra' ) ],
	[ 'fab_fg', 'fab_bg', __( 'Botón flotante' ) ],
];

const DARK_KEYS = [ 'bg', 'fg', 'muted', 'border', 'hover_bg', 'head_bg', 'head_fg', 'bbar_bg', 'bbar_fg', 'bbar_active_bg' ];

export function Design() {
	const profile = useActiveProfile();
	const canEditCss = useStore( ( s ) => s.env?.can_edit_css );
	if ( ! profile ) {
		return null;
	}
	const d = profile.design;
	const tokens = d.tokens;
	const style = d.style;
	const setToken = ( key: string, value: string | number ) => setProfile( [ 'design', 'tokens', key ], value );
	const setStyle = <K extends keyof DesignStyle>( key: K, value: DesignStyle[ K ] ) => setProfile( [ 'design', 'style', key ], value );

	const panel = panelOptions( tokens );
	const header = headerOptions( tokens );
	const items = itemsOptions( tokens );
	const icons = iconsOptions( tokens );
	const active = activeOptions( tokens );
	const chevron = chevronOptions( tokens );
	const headings = headingOptions( tokens );
	const fonts = fontOptions( tokens );
	const search = searchOptions( tokens );
	const motion = motionOptions( tokens );

	return (
		<>
			<PageHeader
				title={ __( 'Diseño' ) }
				description={ __( 'Elige un estilo prediseñado y ajústalo a tu marca: forma del panel, cabecera, ítems, iconos, tipografía, colores y movimiento. Sin fuentes web: nada que afecte a PageSpeed.' ) }
			/>
			<div className="imm:flex imm:flex-col imm:gap-5">
				<PresetGallery profile={ profile } />

				<Section title={ __( 'Forma y fondo' ) } description={ __( 'Cómo se ve el panel sobre tu sitio.' ) }>
					<Row stacked label={ __( 'Forma del panel' ) } hint={ hintOf( panel, style.panel ) }>
						<OptionTiles label={ __( 'Forma del panel' ) } value={ style.panel } options={ panel } onChange={ ( v ) => setStyle( 'panel', v ) } />
					</Row>
					<Row label={ __( 'Redondeo' ) } hint={ __( 'Esquinas del panel, tarjetas, píldoras y campos.' ) }>
						<Range value={ Number( tokens.radius ) } min={ 0 } max={ 32 } unit="px" onChange={ ( v ) => setToken( 'radius', v ) } />
					</Row>
					<Row label={ __( 'Sombra del panel' ) }>
						<Segmented value={ style.shadow } onChange={ ( v ) => setStyle( 'shadow', v ) } options={ [ { value: 'none', label: __( 'Ninguna' ) }, { value: 'soft', label: __( 'Suave' ) }, { value: 'strong', label: __( 'Marcada' ) } ] } />
					</Row>
					<Row label={ __( 'Fondo detrás del panel' ) } hint={ style.overlay === 'blur' ? __( 'Oscurece y desenfoca el sitio. En celulares muy básicos el desenfoque puede costar fluidez.' ) : __( 'Oscurece el sitio para centrar la atención en el menú.' ) }>
						<Segmented value={ style.overlay } onChange={ ( v ) => setStyle( 'overlay', v ) } options={ [ { value: 'dim', label: __( 'Oscurecer' ) }, { value: 'blur', label: __( 'Desenfocar' ) } ] } />
					</Row>
					<Row label={ __( 'Intensidad del fondo' ) }>
						<Range value={ Number( tokens.overlay ) } min={ 0 } max={ 95 } unit="%" onChange={ ( v ) => setToken( 'overlay', v ) } />
					</Row>
				</Section>

				<Section title={ __( 'Cabecera' ) } description={ __( 'El saludo y la cuenta arriba del panel: lo primero que se ve.' ) }>
					<Row stacked label={ __( 'Estilo de la cabecera' ) } hint={ hintOf( header, style.header ) }>
						<OptionTiles label={ __( 'Estilo de la cabecera' ) } value={ style.header } options={ header } onChange={ ( v ) => setStyle( 'header', v ) } />
					</Row>
					{ ( style.header === 'gradient' || style.header === 'solid' || style.header === 'card' ) && (
						<Row label={ style.header === 'gradient' ? __( 'Colores del degradado' ) : __( 'Color de la cabecera' ) } hint={ style.header === 'gradient' ? __( 'De izquierda a derecha, en diagonal. El texto usa «Texto» de la cabecera.' ) : undefined }>
							<div className="imm:flex imm:flex-wrap imm:items-center imm:gap-2">
								<ColorField label={ __( 'Fondo de la cabecera' ) } value={ String( tokens.head_bg ?? '#000000' ) } onChange={ ( v ) => setToken( 'head_bg', v ) } />
								{ style.header === 'gradient' && (
									<>
										<span className="imm:text-zinc-400" aria-hidden>→</span>
										<ColorField label={ __( 'Segundo color del degradado' ) } value={ String( tokens.head_bg2 ?? tokens.accent ?? '#000000' ) } onChange={ ( v ) => setToken( 'head_bg2', v ) } />
									</>
								) }
							</div>
						</Row>
					) }
					{ style.header === 'image' && (
						<Row label={ __( 'Imagen de la cabecera' ) } hint={ __( 'Horizontal, de 800 px de ancho o más. Se le aplica un velo oscuro para que el texto se lea; solo se descarga al abrir el panel.' ) }>
							<MediaField size="large" wide value={ style.header_image } onChange={ ( v ) => setStyle( 'header_image', v ) } />
						</Row>
					) }
				</Section>

				<Section title={ __( 'Ítems' ) } description={ __( 'Cómo se dibuja cada enlace del menú.' ) }>
					<Row stacked label={ __( 'Estilo de los ítems' ) } hint={ hintOf( items, style.items ) }>
						<OptionTiles label={ __( 'Estilo de los ítems' ) } value={ style.items } options={ items } onChange={ ( v ) => setStyle( 'items', v ) } />
					</Row>
					<Row stacked label={ __( 'Iconos' ) } hint={ hintOf( icons, style.icons ) }>
						<OptionTiles label={ __( 'Iconos' ) } value={ style.icons } options={ icons } onChange={ ( v ) => setStyle( 'icons', v ) } />
					</Row>
					<Row stacked label={ __( 'Ítem actual y al pasar' ) } hint={ hintOf( active, style.active ) }>
						<OptionTiles label={ __( 'Ítem actual y al pasar' ) } value={ style.active } options={ active } onChange={ ( v ) => setStyle( 'active', v ) } />
					</Row>
					<div className="imm:grid imm:divide-y imm:divide-zinc-100 imm:lg:grid-cols-2 imm:lg:divide-x imm:lg:divide-y-0">
						<Row stacked label={ __( 'Flecha de submenú' ) } hint={ hintOf( chevron, style.chevron ) }>
							<OptionTiles label={ __( 'Flecha de submenú' ) } value={ style.chevron } options={ chevron } onChange={ ( v ) => setStyle( 'chevron', v ) } />
						</Row>
						<Row stacked label={ __( 'Títulos de sección' ) } hint={ hintOf( headings, style.headings ) }>
							<OptionTiles label={ __( 'Títulos de sección' ) } value={ style.headings } options={ headings } onChange={ ( v ) => setStyle( 'headings', v ) } />
						</Row>
					</div>
					<Row label={ __( 'Insignias' ) } hint={ __( '«Nuevo», «-30 %», «Hot»… Suave y contorno son más discretas.' ) }>
						<Segmented
							value={ style.badge }
							onChange={ ( v ) => setStyle( 'badge', v ) }
							options={ ( [ 'solid', 'soft', 'outline' ] as const ).map( ( v ) => ( {
								value: v,
								label: (
									<>
										<BadgeSample t={ tokens } variant={ v } />
										{ v === 'solid' ? __( 'Sólida' ) : v === 'soft' ? __( 'Suave' ) : __( 'Contorno' ) }
									</>
								),
							} ) ) }
						/>
					</Row>
					<Row label={ __( 'Alto de cada ítem' ) } hint={ __( '48 px o más: fácil de tocar con el pulgar.' ) }>
						<Range value={ Number( tokens.item_height ) } min={ 40 } max={ 80 } unit="px" onChange={ ( v ) => setToken( 'item_height', v ) } />
					</Row>
				</Section>

				<Section title={ __( 'Tipografía' ) } description={ __( 'Solo pilas de fuentes del sistema: cero descargas, cero impacto en PageSpeed.' ) }>
					<Row stacked label={ __( 'Familia' ) } hint={ hintOf( fonts, style.font ) }>
						<OptionTiles label={ __( 'Familia tipográfica' ) } value={ style.font } options={ fonts } onChange={ ( v ) => setStyle( 'font', v ) } />
					</Row>
					<Row label={ __( 'Peso del texto' ) }>
						<Segmented
							value={ style.weight }
							onChange={ ( v ) => setStyle( 'weight', v ) }
							options={ [
								{ value: 'regular', label: <span className="imm:font-normal">{ __( 'Normal' ) }</span> },
								{ value: 'medium', label: <span className="imm:font-medium">{ __( 'Media' ) }</span> },
								{ value: 'semibold', label: <span className="imm:font-semibold">{ __( 'Semi-negrita' ) }</span> },
							] }
						/>
					</Row>
					<Row label={ __( 'Tamaño del texto' ) }>
						<Range value={ Number( tokens.font_size ) } min={ 12 } max={ 24 } unit="px" onChange={ ( v ) => setToken( 'font_size', v ) } />
					</Row>
				</Section>

				<Section title={ __( 'Buscador' ) } description={ __( 'El campo de búsqueda del panel.' ) }>
					<Row stacked label={ __( 'Estilo del campo' ) } hint={ hintOf( search, style.search ) }>
						<OptionTiles label={ __( 'Estilo del campo' ) } value={ style.search } options={ search } onChange={ ( v ) => setStyle( 'search', v ) } />
					</Row>
				</Section>

				<Section title={ __( 'Movimiento' ) } description={ __( 'Con «reducir movimiento» activado en el celular se usa un fundido corto.' ) }>
					<Row stacked label={ __( 'Curva de animación' ) } hint={ hintOf( motion, style.motion ) }>
						<OptionTiles label={ __( 'Curva de animación' ) } value={ style.motion } options={ motion } onChange={ ( v ) => setStyle( 'motion', v ) } />
					</Row>
					<Row label={ __( 'Duración' ) } hint={ __( 'Entre 200 y 320 ms se siente natural.' ) }>
						<Range value={ Number( tokens.duration ) } min={ 0 } max={ 800 } step={ 10 } unit="ms" onChange={ ( v ) => setToken( 'duration', v ) } />
					</Row>
					<ToggleRow
						label={ __( 'Entrada escalonada de los ítems' ) }
						hint={ __( 'Al abrir el panel o un submenú, los ítems aparecen uno tras otro con un leve desplazamiento. Solo CSS: no pesa.' ) }
						checked={ style.stagger }
						onChange={ ( v ) => setStyle( 'stagger', v ) }
					/>
				</Section>

				<Section title={ __( 'Modo de color' ) }>
					<Row label={ __( 'Esquema' ) } hint={ d.color_mode === 'auto' ? __( 'Sigue la preferencia del celular del visitante (modo oscuro del sistema).' ) : undefined }>
						<Segmented value={ d.color_mode } onChange={ ( v ) => setProfile( [ 'design', 'color_mode' ], v ) } options={ [ { value: 'light', label: __( 'Claro' ) }, { value: 'dark', label: __( 'Oscuro' ) }, { value: 'auto', label: __( 'Automático' ) } ] } />
					</Row>
				</Section>

				<Section
					title={ __( 'Colores' ) }
					description={ __( 'Toca una muestra para elegir o escribe el código hexadecimal.' ) }
				>
					<div className="imm:grid imm:gap-x-8 imm:gap-y-5 imm:p-5 imm:md:grid-cols-2">
						{ GROUPS.map( ( group ) => (
							<div key={ group.title } className="imm:flex imm:flex-col imm:gap-2.5">
								<div>
									<p className="imm:text-xs imm:font-semibold imm:tracking-wide imm:text-zinc-500 imm:uppercase">{ group.title }</p>
									{ group.description && <p className="imm:text-[11px] imm:text-zinc-500">{ group.description }</p> }
								</div>
								{ group.keys.map( ( [ key, label ] ) => (
									<div key={ key } className="imm:flex imm:items-center imm:justify-between imm:gap-3">
										<span className="imm:text-[13px] imm:text-zinc-700">{ label }</span>
										<ColorField label={ label } value={ String( tokens[ key ] ?? ( key === 'head_bg2' ? tokens.accent : '#000000' ) ) } onChange={ ( v ) => setToken( key, v ) } />
									</div>
								) ) }
							</div>
						) ) }
						<div className="imm:flex imm:flex-col imm:gap-2">
							<p className="imm:text-xs imm:font-semibold imm:tracking-wide imm:text-zinc-500 imm:uppercase">{ __( 'Contraste (WCAG)' ) }</p>
							{ PAIRS.map( ( [ fg, bg, label ] ) => (
								<ContrastRow key={ fg + bg } label={ label } fg={ String( tokens[ fg ] ) } bg={ String( tokens[ bg ] ) } />
							) ) }
						</div>
					</div>
				</Section>

				{ d.color_mode !== 'light' && <DarkTokens profile={ profile } /> }

				<Section title={ __( 'CSS personalizado' ) } description={ __( 'Se añade al final del CSS del menú. Las clases empiezan por .imm-' ) }>
					<div className="imm:p-5">
						<Textarea rows={ 8 } value={ d.custom_css } disabled={ canEditCss === false } onChange={ ( e ) => setProfile( [ 'design', 'custom_css' ], e.target.value ) } placeholder={ '.imm-drawer .imm-a {\n  font-weight: 600;\n}' } spellCheck={ false } />
						{ canEditCss === false && <p className="imm:mt-2 imm:text-[12px] imm:text-amber-700">{ __( 'Solo un administrador puede cambiar esto: afecta a todo el sitio, igual que el «CSS adicional» de WordPress.' ) }</p> }
					</div>
				</Section>
			</div>
		</>
	);
}

function DarkTokens( { profile }: { profile: Profile } ) {
	const dark = profile.design.dark_tokens;
	return (
		<Section title={ __( 'Colores en modo oscuro' ) } description={ __( 'Se aplican cuando el esquema es Oscuro, o en Automático si el celular está en modo oscuro.' ) }>
			<div className="imm:grid imm:gap-x-8 imm:gap-y-2.5 imm:p-5 imm:md:grid-cols-2">
				{ DARK_KEYS.map( ( key ) => (
					<div key={ key } className="imm:flex imm:items-center imm:justify-between imm:gap-3">
						<span className="imm:font-mono imm:text-xs imm:text-zinc-600">{ key }</span>
						<ColorField label={ key } value={ String( dark[ key ] ?? '#000000' ) } onChange={ ( v ) => setProfile( [ 'design', 'dark_tokens', key ], v ) } />
					</div>
				) ) }
			</div>
		</Section>
	);
}

export function ContrastRow( { label, fg, bg }: { label: string; fg: string; bg: string } ) {
	const ratio = contrast( fg, bg );
	const tone = ratio >= 4.5 ? 'imm:bg-emerald-50 imm:text-emerald-700' : ratio >= 3 ? 'imm:bg-amber-50 imm:text-amber-800' : 'imm:bg-red-50 imm:text-red-700';
	return (
		<div className="imm:flex imm:items-center imm:gap-2">
			<span className="imm:flex imm:h-7 imm:w-10 imm:items-center imm:justify-center imm:rounded-md imm:border imm:border-zinc-200 imm:text-xs imm:font-bold" style={ { color: fg, background: bg } }>
				Aa
			</span>
			<span className="imm:flex-1 imm:text-[13px] imm:text-zinc-700">{ label }</span>
			<span className={ cn( 'imm:rounded-full imm:px-2 imm:py-0.5 imm:text-[11px] imm:font-semibold imm:tabular-nums', tone ) } title={ ratio >= 4.5 ? 'AA' : ratio >= 3 ? __( 'Solo texto grande' ) : __( 'Contraste insuficiente' ) }>
				{ ratio.toFixed( 1 ) }:1 { ratio >= 4.5 ? 'AA' : ratio >= 3 ? 'AA+' : '✕' }
			</span>
		</div>
	);
}
