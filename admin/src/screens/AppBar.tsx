import type { ReactNode } from 'react';
import { ColorField } from '@/components/ColorField';
import { MediaField } from '@/components/MediaField';
import { PageHeader, Range, Row, Section, Segmented, ToggleRow } from '@/components/common';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Notice } from '@/components/ui/feedback';
import { __ } from '@/lib/i18n';
import { setProfile, useActiveProfile, useStore } from '@/lib/store';
import type { Profile } from '@/lib/types';
import { ContrastRow } from './Design';
import { Suggestions } from './Drawer';

/**
 * Barra superior móvil (app bar): hamburguesa, logo, cuenta, carrito y el buscador siempre a la vista,
 * como Amazon y Mercado Libre. Reemplaza la cabecera móvil del tema (que se oculta con un selector).
 */
export function AppBarScreen() {
	const profile = useActiveProfile();
	const env = useStore( ( s ) => s.env );
	if ( ! profile ) {
		return null;
	}
	const a = profile.app_bar;
	const set = ( key: keyof typeof a, value: unknown ) => setProfile( [ 'app_bar', key ], value );

	return (
		<>
			<PageHeader
				title={ __( 'Barra superior' ) }
				description={ __( 'Cabecera tipo app para celulares: menú, logo, cuenta, carrito y el buscador siempre a la vista, como Amazon y Mercado Libre. Es lo que más búsquedas (y ventas) genera.' ) }
			/>
			<div className="imm:flex imm:flex-col imm:gap-5">
				<Section title={ __( 'Barra superior móvil' ) }>
					<ToggleRow label={ __( 'Activar' ) } hint={ __( 'Se ve en el primer pintado, con su alto reservado (no mueve la página). Solo en celulares y tablets.' ) } checked={ a.enabled } onChange={ ( v ) => set( 'enabled', v ) } />
				</Section>
				{ a.enabled && (
					<>
						<Section title={ __( 'Contenido' ) }>
							<ToggleRow label={ __( 'Buscador siempre visible' ) } hint={ __( 'Un campo debajo de la barra que abre el buscador a pantalla completa (con Imagina Search, si está activo).' ) } checked={ a.search } onChange={ ( v ) => set( 'search', v ) } />
							<ToggleRow label={ __( 'Cuenta' ) } checked={ a.account } onChange={ ( v ) => set( 'account', v ) } />
							{ env?.woo && <ToggleRow label={ __( 'Carrito con contador' ) } hint={ __( 'El contador sale de una cookie: sin peticiones al servidor.' ) } checked={ a.cart } onChange={ ( v ) => set( 'cart', v ) } /> }
						</Section>
						<Section title={ __( 'Logo' ) } description={ __( 'Su tamaño es fijo: aunque el tema o un plugin de imágenes intente agrandarlo, no se sale de la barra.' ) }>
							<ToggleRow
								label={ __( 'Mostrar logo' ) }
								hint={ ! a.logo ? __( 'Apagado: se muestra el nombre del sitio.' ) : env?.has_logo || a.logo_image.url ? undefined : __( 'Tu tema no tiene logo configurado: elige una imagen abajo o se muestra el nombre del sitio.' ) }
								checked={ a.logo }
								onChange={ ( v ) => set( 'logo', v ) }
							/>
							{ a.logo && (
								<>
									<Row label={ __( 'Imagen' ) } hint={ __( 'Opcional: otra versión del logo solo para la barra (por ejemplo, horizontal o en blanco para un fondo oscuro). Vacío: el logo del sitio.' ) }>
										<MediaField value={ a.logo_image } size="medium" wide onChange={ ( v ) => set( 'logo_image', v ) } />
									</Row>
									<Row label={ __( 'Alto' ) } hint={ __( 'La fila mide 52 px.' ) }>
										<Range value={ a.logo_height } min={ 16 } max={ 44 } unit="px" onChange={ ( v ) => set( 'logo_height', v ) } />
									</Row>
									<Row label={ __( 'Ancho máximo' ) } hint={ __( 'Los logos muy anchos se reducen hasta caber.' ) }>
										<Range value={ a.logo_width } min={ 60 } max={ 240 } step={ 5 } unit="px" onChange={ ( v ) => set( 'logo_width', v ) } />
									</Row>
									<Row label={ __( 'Posición' ) }>
										<Segmented
											value={ a.logo_align }
											onChange={ ( v ) => set( 'logo_align', v ) }
											options={ [
												{ value: 'left', label: __( 'Junto al menú' ) },
												{ value: 'center', label: __( 'Centrado' ) },
											] }
										/>
									</Row>
								</>
							) }
						</Section>
						<Colors profile={ profile } />
						<Section title={ __( 'Al bajar por la página' ) }>
							<Row label={ __( 'Ocultar' ) }>
								<Segmented
									value={ a.hide_on_scroll }
									onChange={ ( v ) => set( 'hide_on_scroll', v ) }
									options={ [
										{ value: 'top', label: __( 'Solo la fila de arriba' ) },
										{ value: 'all', label: __( 'Toda la barra' ) },
										{ value: 'none', label: __( 'Nada' ) },
									] }
								/>
							</Row>
						</Section>
						<Section title={ __( 'Cabecera del tema' ) } description={ __( 'Para no tener dos cabeceras, la del tema se oculta en celulares y esta barra la reemplaza. En escritorio la del tema sigue igual.' ) }>
							<Row label={ __( 'Selector de la cabecera del tema' ) } hint={ __( 'Se oculta solo en celulares y solo mientras esta barra esté activa. Si la apagas, vuelve la del tema.' ) } stacked>
								<Input value={ a.hide_header } disabled={ env?.can_edit_css === false } onChange={ ( e ) => set( 'hide_header', e.target.value ) } placeholder=".site-header" className="imm:font-mono imm:text-xs" />
								{ env?.can_edit_css !== false && <Suggestions values={ env?.theme.header ?? [] } theme={ env?.theme.name ?? '' } onPick={ ( v ) => set( 'hide_header', v ) } /> }
								{ env?.can_edit_css === false && <p className="imm:text-[12px] imm:text-amber-700">{ __( 'Solo un administrador puede cambiar esto: afecta a todo el sitio, igual que el «CSS adicional» de WordPress.' ) }</p> }
							</Row>
							<div className="imm:px-5 imm:pb-4">
								<Notice level="info">
									{ __( 'SEO: la cabecera del tema sigue en el HTML (solo se oculta con CSS), así que Google ve sus enlaces igual que antes, y el menú del panel también son enlaces reales. Asegúrate de que el título principal (H1) de cada página esté en el contenido y no solo en la cabecera.' ) }
								</Notice>
							</div>
						</Section>
					</>
				) }
			</div>
		</>
	);
}

type Colors = Profile[ 'app_bar' ][ 'colors' ];

/**
 * Colores propios de la barra superior. Al activarlos se parte de los colores actuales (los de la
 * cabecera del panel), así la barra no cambia hasta que se edite algo.
 */
function Colors( { profile }: { profile: Profile } ) {
	const a = profile.app_bar;
	const c = a.colors;
	const t = profile.design.tokens;
	const set = ( key: keyof Colors, value: string ) => setProfile( [ 'app_bar', 'colors', key ], value );
	const enable = ( on: boolean ) => {
		if ( on ) {
			const s = ( key: string, fallback: string ) => String( t[ key ] ?? fallback );
			setProfile( [ 'app_bar', 'colors' ], {
				bg: s( 'head_bg', c.bg ),
				bg2: '',
				fg: s( 'head_fg', c.fg ),
				search_bg: s( 'bg', c.search_bg ),
				search_fg: s( 'muted', c.search_fg ),
				badge_bg: s( 'badge_bg', c.badge_bg ),
				badge_fg: s( 'badge_fg', c.badge_fg ),
			} );
		}
		setProfile( [ 'app_bar', 'custom_colors' ], on );
	};
	return (
		<Section title={ __( 'Colores' ) } description={ __( 'Por defecto la barra usa los colores de la cabecera del panel (Diseño). Con colores propios puede tener los de la cabecera de tu sitio.' ) }>
			<ToggleRow label={ __( 'Colores propios' ) } hint={ a.custom_colors ? __( 'Los mismos en modo claro y oscuro.' ) : __( 'Apagado: fondo y texto de la cabecera del panel, buscador con el fondo del panel.' ) } checked={ a.custom_colors } onChange={ enable } />
			{ a.custom_colors && (
				<div className="imm:flex imm:flex-col imm:gap-5 imm:px-5 imm:py-4">
					<Group title={ __( 'Barra' ) }>
						<ColorField label={ __( 'Fondo' ) } value={ c.bg } onChange={ ( v ) => set( 'bg', v ) } />
						<div className="imm:flex imm:flex-col imm:gap-2">
							<label className="imm:flex imm:items-center imm:gap-2 imm:text-xs imm:font-medium imm:text-zinc-700">
								<Switch checked={ '' !== c.bg2 } onCheckedChange={ ( on ) => set( 'bg2', on ? c.fg === '#ffffff' ? '#334155' : '#e2e8f0' : '' ) } aria-label={ __( 'Degradado' ) } />
								{ __( 'Degradado' ) }
							</label>
							{ '' !== c.bg2 && <ColorField label={ __( 'Segundo color' ) } value={ c.bg2 } onChange={ ( v ) => set( 'bg2', v ) } /> }
						</div>
						<ColorField label={ __( 'Iconos y texto' ) } value={ c.fg } onChange={ ( v ) => set( 'fg', v ) } />
					</Group>
					<Group title={ __( 'Buscador' ) }>
						<ColorField label={ __( 'Fondo del campo' ) } value={ c.search_bg } onChange={ ( v ) => set( 'search_bg', v ) } />
						<ColorField label={ __( 'Texto e icono' ) } value={ c.search_fg } onChange={ ( v ) => set( 'search_fg', v ) } />
					</Group>
					<Group title={ __( 'Contador del carrito' ) }>
						<ColorField label={ __( 'Fondo' ) } value={ c.badge_bg } onChange={ ( v ) => set( 'badge_bg', v ) } />
						<ColorField label={ __( 'Número' ) } value={ c.badge_fg } onChange={ ( v ) => set( 'badge_fg', v ) } />
					</Group>
					<div className="imm:flex imm:flex-col imm:gap-2 imm:rounded-lg imm:border imm:border-zinc-200 imm:p-3">
						<p className="imm:text-xs imm:font-medium imm:text-zinc-700">{ __( 'Contraste (WCAG AA pide 4,5:1)' ) }</p>
						<ContrastRow label={ __( 'Iconos sobre el fondo' ) } fg={ c.fg } bg={ c.bg } />
						{ '' !== c.bg2 && <ContrastRow label={ __( 'Iconos sobre el segundo color' ) } fg={ c.fg } bg={ c.bg2 } /> }
						{ a.search && <ContrastRow label={ __( 'Texto del buscador' ) } fg={ c.search_fg } bg={ c.search_bg } /> }
						{ a.cart && <ContrastRow label={ __( 'Contador del carrito' ) } fg={ c.badge_fg } bg={ c.badge_bg } /> }
					</div>
				</div>
			) }
		</Section>
	);
}

function Group( { title, children }: { title: string; children: ReactNode } ) {
	return (
		<div className="imm:flex imm:flex-col imm:gap-2">
			<p className="imm:text-[11px] imm:font-semibold imm:tracking-wide imm:text-zinc-500 imm:uppercase">{ title }</p>
			<div className="imm:grid imm:gap-3 imm:sm:grid-cols-2">{ children }</div>
		</div>
	);
}

