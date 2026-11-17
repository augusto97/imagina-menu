import { Check, RotateCcw } from 'lucide-react';
import { ColorField } from '@/components/ColorField';
import { PageHeader, Range, Row, Section, Segmented } from '@/components/common';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/input';
import { contrast } from '@/lib/color';
import { __ } from '@/lib/i18n';
import { setProfile, useActiveProfile, useStore } from '@/lib/store';
import type { Preset, Profile, Tokens } from '@/lib/types';
import { cn } from '@/lib/utils';

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
		keys: [
			[ 'head_bg', __( 'Fondo' ) ],
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
	const presets = useStore( ( s ) => s.presets );
	if ( ! profile ) {
		return null;
	}
	const d = profile.design;
	const tokens = d.tokens;
	const setToken = ( key: string, value: string | number ) => setProfile( [ 'design', 'tokens', key ], value );

	const applyPreset = ( key: string, preset: Preset ) => {
		useStore.getState().updateProfile( ( p ) => ( {
			...p,
			design: { ...p.design, preset: key, tokens: { ...preset.tokens } },
			drawer: { ...p.drawer, ...( preset.structure.drawer ?? {} ) },
			bottom_bar: { ...p.bottom_bar, ...( preset.structure.bottom_bar ?? {} ) },
		} ) );
	};

	return (
		<>
			<PageHeader title={ __( 'Diseño' ) } description={ __( 'Elige un punto de partida y ajusta los colores de tu marca. Hereda la tipografía de tu tema: no se cargan fuentes extra.' ) } />
			<div className="imm:flex imm:flex-col imm:gap-5">
				<div className="imm:grid imm:grid-cols-2 imm:gap-3 imm:md:grid-cols-3">
					{ Object.entries( presets ).map( ( [ key, preset ] ) => (
						<button
							key={ key }
							type="button"
							onClick={ () => applyPreset( key, preset ) }
							className={ cn( 'imm:group imm:flex imm:flex-col imm:overflow-hidden imm:rounded-xl imm:border imm:bg-white imm:text-left imm:transition-all imm:hover:shadow-md', d.preset === key ? 'imm:border-zinc-900 imm:ring-1 imm:ring-zinc-900' : 'imm:border-zinc-200' ) }
						>
							<PresetMock tokens={ preset.tokens } />
							<span className="imm:flex imm:items-start imm:justify-between imm:gap-2 imm:p-3">
								<span>
									<span className="imm:block imm:text-[13px] imm:font-semibold">{ preset.label }</span>
									<span className="imm:mt-0.5 imm:block imm:text-[11px] imm:leading-snug imm:text-zinc-500">{ preset.hint }</span>
								</span>
								{ d.preset === key && <Check className="imm:size-4 imm:shrink-0 imm:text-zinc-900" aria-hidden /> }
							</span>
						</button>
					) ) }
				</div>

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
										<ColorField label={ label } value={ String( tokens[ key ] ?? '#000000' ) } onChange={ ( v ) => setToken( key, v ) } />
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

				<Section title={ __( 'Forma y movimiento' ) }>
					<Row label={ __( 'Redondeo' ) }>
						<Range value={ Number( tokens.radius ) } min={ 0 } max={ 32 } unit="px" onChange={ ( v ) => setToken( 'radius', v ) } />
					</Row>
					<Row label={ __( 'Alto de cada ítem' ) } hint={ __( '48 px o más: fácil de tocar con el pulgar.' ) }>
						<Range value={ Number( tokens.item_height ) } min={ 40 } max={ 80 } unit="px" onChange={ ( v ) => setToken( 'item_height', v ) } />
					</Row>
					<Row label={ __( 'Tamaño del texto' ) }>
						<Range value={ Number( tokens.font_size ) } min={ 12 } max={ 24 } unit="px" onChange={ ( v ) => setToken( 'font_size', v ) } />
					</Row>
					<Row label={ __( 'Duración de las animaciones' ) } hint={ __( 'Entre 200 y 300 ms se siente natural. Con «reducir movimiento» del sistema se usa un fundido.' ) }>
						<Range value={ Number( tokens.duration ) } min={ 0 } max={ 800 } step={ 10 } unit="ms" onChange={ ( v ) => setToken( 'duration', v ) } />
					</Row>
					<Row label={ __( 'Oscurecer el fondo' ) }>
						<Range value={ Number( tokens.overlay ) } min={ 0 } max={ 95 } unit="%" onChange={ ( v ) => setToken( 'overlay', v ) } />
					</Row>
				</Section>

				{ d.color_mode !== 'light' && <DarkTokens profile={ profile } /> }

				<Section title={ __( 'CSS personalizado' ) } description={ __( 'Se añade al final del CSS del menú. Las clases empiezan por .imm-' ) }>
					<div className="imm:p-5">
						<Textarea rows={ 8 } value={ d.custom_css } onChange={ ( e ) => setProfile( [ 'design', 'custom_css' ], e.target.value ) } placeholder={ '.imm-drawer .imm-a {\n  font-weight: 600;\n}' } spellCheck={ false } />
					</div>
				</Section>

				<div>
					<Button
						variant="outline"
						size="sm"
						onClick={ () => {
							const preset = presets[ d.preset ];
							if ( preset ) {
								setProfile( [ 'design', 'tokens' ], { ...preset.tokens } );
							}
						} }
					>
						<RotateCcw aria-hidden />
						{ __( 'Restablecer los colores del preset' ) }
					</Button>
				</div>
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

function ContrastRow( { label, fg, bg }: { label: string; fg: string; bg: string } ) {
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

/** Miniatura de un celular con el panel y la barra inferior en los colores del preset. */
function PresetMock( { tokens: t }: { tokens: Tokens } ) {
	const c = ( k: string ) => String( t[ k ] );
	const r = Math.min( Number( t.radius ), 14 );
	return (
		<span className="imm:relative imm:block imm:h-36 imm:overflow-hidden imm:bg-zinc-100">
			<span className="imm:absolute imm:inset-x-6 imm:top-3 imm:bottom-0 imm:overflow-hidden imm:rounded-t-2xl imm:border imm:border-b-0 imm:border-zinc-300 imm:bg-white imm:shadow-sm">
				<span className="imm:absolute imm:inset-0 imm:bg-zinc-900/30" />
				<span className="imm:absolute imm:inset-y-0 imm:left-0 imm:w-[72%] imm:shadow-xl" style={ { background: c( 'bg' ) } }>
					<span className="imm:block imm:px-2 imm:py-2" style={ { background: c( 'head_bg' ) } }>
						<span className="imm:block imm:h-1.5 imm:w-10 imm:rounded-full imm:opacity-80" style={ { background: c( 'head_fg' ) } } />
						<span className="imm:mt-1 imm:block imm:h-1 imm:w-14 imm:rounded-full imm:opacity-50" style={ { background: c( 'head_fg' ) } } />
					</span>
					{ [ 0, 1, 2, 3 ].map( ( i ) => (
						<span key={ i } className="imm:flex imm:items-center imm:gap-1.5 imm:border-b imm:px-2 imm:py-[5px]" style={ { borderColor: c( 'border' ) } }>
							<span className="imm:size-2 imm:rounded-sm" style={ { background: i === 0 ? c( 'accent' ) : c( 'muted' ), borderRadius: r / 4 } } />
							<span className="imm:h-1 imm:flex-1 imm:rounded-full" style={ { background: i === 0 ? c( 'accent' ) : c( 'fg' ), opacity: i === 0 ? 1 : 0.6 } } />
							{ i === 1 && <span className="imm:h-2 imm:w-3 imm:rounded-full" style={ { background: c( 'badge_bg' ) } } /> }
						</span>
					) ) }
				</span>
				<span className="imm:absolute imm:inset-x-0 imm:bottom-0 imm:flex imm:justify-around imm:border-t imm:px-1 imm:py-1.5" style={ { background: c( 'bbar_bg' ), borderColor: c( 'border' ) } }>
					{ [ 0, 1, 2, 3 ].map( ( i ) => (
						<span key={ i } className="imm:h-2 imm:w-4 imm:rounded-full" style={ { background: i === 0 ? c( 'bbar_active_bg' ) : 'transparent' } }>
							<span className="imm:mx-auto imm:block imm:size-2 imm:rounded-sm" style={ { background: i === 0 ? c( 'bbar_active' ) : c( 'bbar_fg' ), opacity: i === 0 ? 1 : 0.6 } } />
						</span>
					) ) }
				</span>
			</span>
		</span>
	);
}
