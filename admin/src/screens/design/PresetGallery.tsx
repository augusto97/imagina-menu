import { Check, RotateCcw, Sparkles } from 'lucide-react';
import { useState, type CSSProperties } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/dialog';
import { __ } from '@/lib/i18n';
import { useStore } from '@/lib/store';
import { designDiff, presetStyle, withPresetDesign } from '@/lib/style';
import type { DesignStyle, Preset, Profile, Tokens } from '@/lib/types';
import { cn } from '@/lib/utils';

/**
 * Galería de estilos prediseñados (capturas reales del menú) con el estado del diseño actual:
 * «Basado en X · personalizado» y restablecer.
 */
export function PresetGallery( { profile }: { profile: Profile } ) {
	const presets = useStore( ( s ) => s.presets );
	const updateProfile = useStore( ( s ) => s.updateProfile );
	const [ pending, setPending ] = useState< string | null >( null );

	const current = presets[ profile.design.preset ];
	const diff = designDiff( profile, current );
	const personalized = diff.tokens.length + diff.style.length > 0;

	const apply = ( key: string ) => {
		const preset = presets[ key ];
		if ( ! preset ) {
			return;
		}
		updateProfile( ( p ) => {
			const next = withPresetDesign( p, key, preset );
			return {
				...next,
				drawer: { ...next.drawer, ...( preset.structure.drawer ?? {} ) },
				bottom_bar: { ...next.bottom_bar, ...( preset.structure.bottom_bar ?? {} ) },
			};
		} );
	};

	const choose = ( key: string ) => {
		if ( key === profile.design.preset && ! personalized ) {
			return;
		}
		// Sin cambios propios, cambiar de estilo no pierde nada (y se puede deshacer): se aplica directo.
		if ( personalized ) {
			setPending( key );
		} else {
			apply( key );
		}
	};

	const reset = () => {
		if ( current ) {
			updateProfile( ( p ) => withPresetDesign( p, profile.design.preset, current ) );
		}
	};

	return (
		<div className="imm:flex imm:flex-col imm:gap-3">
			<div className="imm:flex imm:flex-wrap imm:items-center imm:justify-between imm:gap-3 imm:rounded-xl imm:border imm:border-zinc-200 imm:bg-white imm:px-4 imm:py-3 imm:shadow-xs">
				<div className="imm:flex imm:min-w-0 imm:items-center imm:gap-3">
					<span className="imm:flex imm:size-8 imm:flex-none imm:items-center imm:justify-center imm:rounded-lg imm:bg-zinc-900 imm:text-white">
						<Sparkles className="imm:size-4" aria-hidden />
					</span>
					<div className="imm:min-w-0">
						<p className="imm:flex imm:flex-wrap imm:items-center imm:gap-1.5 imm:text-[13px] imm:text-zinc-900">
							{ __( 'Basado en' ) } <strong className="imm:font-semibold">«{ current?.label ?? profile.design.preset }»</strong>
							{ personalized ? <Badge tone="amber">{ __( 'personalizado' ) }</Badge> : <Badge tone="green">{ __( 'sin cambios' ) }</Badge> }
						</p>
						<p className="imm:mt-0.5 imm:text-xs imm:text-zinc-500">
							{ personalized
								? summary( diff )
								: __( 'Ajusta cualquier opción de abajo: el estilo base queda como referencia para volver a él.' ) }
						</p>
					</div>
				</div>
				{ personalized && current && (
					<Button variant="outline" size="sm" onClick={ reset }>
						<RotateCcw aria-hidden />
						{ __( 'Restablecer estilo' ) }
					</Button>
				) }
			</div>

			<div className="imm:grid imm:gap-3" style={ { gridTemplateColumns: 'repeat(auto-fill, minmax(168px, 1fr))' } }>
				{ Object.entries( presets ).map( ( [ key, preset ] ) => (
					<PresetCard key={ key } preset={ preset } active={ key === profile.design.preset } onChoose={ () => choose( key ) } />
				) ) }
			</div>

			<ConfirmDialog
				open={ pending !== null }
				onOpenChange={ ( open ) => ! open && setPending( null ) }
				title={ __( '¿Aplicar «%s»?' ).replace( '%s', pending ? presets[ pending ]?.label ?? pending : '' ) }
				description={
					<>
						<p>{ __( 'Tus ajustes de diseño actuales se reemplazarán por los del estilo:' ) }</p>
						<ul className="imm:mt-2 imm:list-disc imm:space-y-1 imm:pl-5">
							<li>{ __( 'Los colores (incluido el acento y la barra inferior).' ) }</li>
							<li>{ __( 'El estilo del panel: forma, cabecera, ítems, iconos, tipografía y movimiento.' ) }</li>
							<li>{ __( 'La estructura sugerida: lado del panel, tipo de submenús, botón de cerrar y forma de la barra inferior.' ) }</li>
						</ul>
						<p className="imm:mt-2">{ __( 'Tus menús, textos, enlaces, imagen de cabecera y CSS personalizado no cambian. Puedes deshacerlo con Ctrl+Z.' ) }</p>
					</>
				}
				confirmLabel={ __( 'Aplicar estilo' ) }
				onConfirm={ () => {
					if ( pending ) {
						apply( pending );
					}
					setPending( null );
				} }
			/>
		</div>
	);
}

function summary( diff: { tokens: string[]; style: string[] } ): string {
	const parts: string[] = [];
	if ( diff.tokens.length ) {
		parts.push( diff.tokens.length === 1 ? __( '1 color' ) : __( '%d colores' ).replace( '%d', String( diff.tokens.length ) ) );
	}
	if ( diff.style.length ) {
		parts.push( diff.style.length === 1 ? __( '1 opción de estilo' ) : __( '%d opciones de estilo' ).replace( '%d', String( diff.style.length ) ) );
	}
	return __( 'Cambiaste %s respecto al estilo base.' ).replace( '%s', parts.join( __( ' y ' ) ) );
}

function PresetCard( { preset, active, onChoose }: { preset: Preset; active: boolean; onChoose: () => void } ) {
	const [ broken, setBroken ] = useState( false );
	const t = preset.tokens;
	return (
		<button
			type="button"
			onClick={ onChoose }
			aria-pressed={ active }
			className={ cn(
				'imm:group imm:flex imm:flex-col imm:overflow-hidden imm:rounded-xl imm:border imm:bg-white imm:text-left imm:transition-all imm:hover:-translate-y-0.5 imm:hover:shadow-lg',
				active ? 'imm:border-zinc-900 imm:ring-2 imm:ring-zinc-900' : 'imm:border-zinc-200'
			) }
		>
			<span className="imm:relative imm:block imm:aspect-[5/8] imm:overflow-hidden imm:bg-zinc-100">
				{ preset.thumb && ! broken ? (
					<img
						src={ preset.thumb }
						alt=""
						loading="lazy"
						decoding="async"
						onError={ () => setBroken( true ) }
						className="imm:size-full imm:object-cover imm:object-top imm:transition-transform imm:duration-500 imm:group-hover:scale-[1.03]"
					/>
				) : (
					<PresetMock tokens={ t } style={ presetStyle( preset ) } />
				) }
				{ active && (
					<span className="imm:absolute imm:top-2 imm:right-2 imm:inline-flex imm:items-center imm:gap-1 imm:rounded-full imm:bg-zinc-900 imm:px-2 imm:py-0.5 imm:text-[11px] imm:font-medium imm:text-white imm:shadow">
						<Check className="imm:size-3" aria-hidden />
						{ __( 'En uso' ) }
					</span>
				) }
				{ ! active && (
					<span className="imm:absolute imm:inset-x-2 imm:bottom-2 imm:translate-y-1 imm:rounded-lg imm:bg-zinc-900/90 imm:py-1.5 imm:text-center imm:text-[12px] imm:font-medium imm:text-white imm:opacity-0 imm:shadow imm:transition-all imm:group-hover:translate-y-0 imm:group-hover:opacity-100 imm:group-focus-visible:translate-y-0 imm:group-focus-visible:opacity-100">
						{ __( 'Aplicar estilo' ) }
					</span>
				) }
			</span>
			<span className="imm:flex imm:flex-col imm:gap-1 imm:border-t imm:border-zinc-100 imm:p-3">
				<span className="imm:flex imm:items-center imm:justify-between imm:gap-2">
					<span className="imm:truncate imm:text-[13px] imm:font-semibold imm:text-zinc-900">{ preset.label }</span>
					<span className="imm:flex imm:flex-none imm:-space-x-1" aria-hidden>
						{ [ 'accent', 'head_bg', 'bg' ].map( ( k ) => (
							<span key={ k } className="imm:size-3.5 imm:rounded-full imm:border-2 imm:border-white imm:ring-1 imm:ring-zinc-200" style={ { background: String( t[ k ] ?? '#ccc' ) } } />
						) ) }
					</span>
				</span>
				<span className="imm:line-clamp-2 imm:text-[11.5px] imm:leading-snug imm:text-zinc-500">{ preset.hint }</span>
			</span>
		</button>
	);
}

/** Respaldo si el preset no trae captura: un celular dibujado con sus colores y su estilo. */
export function PresetMock( { tokens: t, style: s }: { tokens: Tokens; style: DesignStyle } ) {
	const c = ( k: string, fallback = '#888' ) => String( t[ k ] ?? fallback );
	const r = Math.min( Number( t.radius ?? 12 ), 14 );
	const head =
		s.header === 'gradient'
			? `linear-gradient(135deg, ${ c( 'head_bg' ) }, ${ c( 'head_bg2', c( 'accent' ) ) })`
			: s.header === 'image'
				? 'linear-gradient(160deg,#0f766e,#0c4a6e)'
				: s.header === 'minimal'
					? 'transparent'
					: c( 'head_bg' );
	const headFg = s.header === 'minimal' ? c( 'fg' ) : s.header === 'image' ? '#fff' : c( 'head_fg' );
	const grouped = s.items === 'grouped' || s.items === 'cards';
	const panelBg = s.panel === 'glass' ? `color-mix(in srgb, ${ c( 'bg' ) } 70%, transparent)` : grouped ? c( 'hover_bg' ) : c( 'bg' );
	const panelShape =
		s.panel === 'floating'
			? { left: 6, top: 6, bottom: 6, width: '72%', borderRadius: 14 }
			: s.panel === 'flat'
				? { left: 0, top: 0, bottom: 0, width: '76%', borderRadius: 0 }
				: { left: 0, top: 0, bottom: 0, width: '76%', borderRadius: '0 16px 16px 0' };
	const icon = ( i: number ) => {
		if ( s.icons === 'none' ) {
			return null;
		}
		const base = { width: 11, height: 11, flex: 'none' as const };
		if ( s.icons === 'tile' ) {
			return <span style={ { ...base, borderRadius: 3, background: c( 'accent' ) } } />;
		}
		if ( s.icons === 'color' ) {
			return <span style={ { ...base, borderRadius: 3, background: [ '#ff9500', '#34c759', '#007aff', '#af52de', '#ff2d55' ][ i % 5 ] } } />;
		}
		if ( s.icons === 'soft' ) {
			return <span style={ { ...base, borderRadius: 99, background: `color-mix(in srgb, ${ c( 'accent' ) } 22%, transparent)` } } />;
		}
		return <span style={ { width: 8, height: 8, flex: 'none', borderRadius: 2, border: `1.5px solid ${ c( 'muted' ) }` } } />;
	};
	return (
		<span className="imm:absolute imm:inset-0 imm:overflow-hidden" style={ { background: 'linear-gradient(160deg,#e4e4e7,#d4d4d8)' } }>
			<span className="imm:absolute imm:inset-0 imm:bg-zinc-900/25" />
			<span
				className="imm:absolute imm:flex imm:flex-col imm:overflow-hidden"
				style={ {
					...panelShape,
					background: panelBg,
					backdropFilter: s.panel === 'glass' ? 'blur(6px)' : undefined,
					boxShadow: s.shadow === 'none' ? 'none' : s.shadow === 'strong' ? '0 10px 30px rgba(0,0,0,.35)' : '0 6px 18px rgba(0,0,0,.18)',
				} }
			>
				<span className="imm:block imm:p-3" style={ { background: s.header === 'card' ? 'transparent' : head, borderBottom: s.header === 'minimal' ? `1px solid ${ c( 'border' ) }` : undefined } }>
					<span className="imm:flex imm:items-center imm:gap-2 imm:rounded-lg" style={ s.header === 'card' ? { background: c( 'head_bg' ), padding: 8 } : undefined }>
						<span className="imm:block imm:size-5 imm:rounded-full" style={ { background: s.header === 'card' ? c( 'head_fg' ) : headFg, opacity: 0.3 } } />
						<span className="imm:flex imm:flex-col imm:gap-1">
							<span className="imm:block imm:h-1 imm:w-10 imm:rounded-full" style={ { background: s.header === 'card' ? c( 'head_fg' ) : headFg, opacity: 0.6 } } />
							<span className="imm:block imm:h-1.5 imm:w-16 imm:rounded-full" style={ { background: s.header === 'card' ? c( 'head_fg' ) : headFg } } />
						</span>
					</span>
				</span>
				<span className="imm:mx-3 imm:mt-2.5 imm:block imm:h-4 imm:rounded-full" style={ { background: s.search === 'filled' ? ( grouped ? c( 'bg' ) : c( 'hover_bg' ) ) : 'transparent', border: s.search === 'outline' ? `1px solid ${ c( 'border' ) }` : undefined, borderBottom: s.search === 'underline' ? `1px solid ${ c( 'fg' ) }` : undefined, borderRadius: s.search === 'underline' ? 0 : 99 } } />
				<span className={ cn( 'imm:mt-2 imm:flex imm:flex-col', grouped ? 'imm:mx-2.5 imm:gap-1.5' : 'imm:gap-0' ) } style={ s.items === 'grouped' ? { background: c( 'bg' ), borderRadius: r, overflow: 'hidden', gap: 0 } : undefined }>
					{ [ 0, 1, 2, 3, 4 ].map( ( i ) => {
						const activeRow = i === 0;
						const rowStyle: CSSProperties = {
							padding: '6px 10px',
							borderBottom: s.items === 'divided' || ( s.items === 'grouped' && i < 4 ) ? `1px solid ${ c( 'border' ) }` : undefined,
							background: s.items === 'cards' ? c( 'bg' ) : activeRow && s.active !== 'text' ? `color-mix(in srgb, ${ c( 'accent' ) } 14%, transparent)` : undefined,
							borderRadius: s.items === 'cards' ? r / 1.5 : s.items === 'pills' || ( activeRow && s.active === 'pill' ) ? 99 : 0,
							margin: s.items === 'pills' ? '0 6px' : undefined,
							boxShadow: activeRow && s.active === 'bar' ? `inset 3px 0 0 ${ c( 'accent' ) }` : s.items === 'cards' ? `0 0 0 1px ${ c( 'border' ) }` : undefined,
						};
						return (
							<span key={ i } className="imm:flex imm:items-center imm:gap-2" style={ rowStyle }>
								{ icon( i ) }
								<span className="imm:block imm:h-1.5 imm:flex-1 imm:rounded-full" style={ { background: activeRow ? c( 'accent' ) : c( 'fg' ), opacity: activeRow ? 1 : 0.55, maxWidth: `${ 70 - i * 6 }%` } } />
								{ i === 1 && <span className="imm:h-2 imm:w-4 imm:rounded-full" style={ { background: c( 'badge_bg' ) } } /> }
							</span>
						);
					} ) }
				</span>
			</span>
			<span className="imm:absolute imm:inset-x-0 imm:bottom-0 imm:flex imm:justify-around imm:border-t imm:px-1 imm:py-2" style={ { background: c( 'bbar_bg' ), borderColor: c( 'border' ) } }>
				{ [ 0, 1, 2, 3 ].map( ( i ) => (
					<span key={ i } className="imm:flex imm:h-3 imm:w-6 imm:items-center imm:justify-center imm:rounded-full" style={ { background: i === 0 ? c( 'bbar_active_bg' ) : 'transparent' } }>
						<span className="imm:block imm:size-2 imm:rounded-sm" style={ { background: i === 0 ? c( 'bbar_active' ) : c( 'bbar_fg' ), opacity: i === 0 ? 1 : 0.6 } } />
					</span>
				) ) }
			</span>
		</span>
	);
}
