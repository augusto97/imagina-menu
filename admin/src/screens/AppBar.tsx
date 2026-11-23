import { ArrowDown, ArrowUp, Plus, Search, Trash2 } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { ColorField } from '@/components/ColorField';
import { IconPicker } from '@/components/IconPicker';
import { IconView } from '@/components/IconView';
import { MediaField } from '@/components/MediaField';
import { PageHeader, Range, Row, Section, Segmented, ToggleRow } from '@/components/common';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Notice } from '@/components/ui/feedback';
import { __ } from '@/lib/i18n';
import { newId, setProfile, useActiveProfile, useStore } from '@/lib/store';
import type { AppBarAction, AppBarActionType, Env, Profile } from '@/lib/types';
import { cn } from '@/lib/utils';
import { ObjectSearch } from './builder/ObjectSearch';
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
						</Section>
						<Actions profile={ profile } env={ env } />
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
	const hasButton = a.actions.some( ( x ) => x.style === 'button' && x.label.trim() !== '' );
	const hasCounter = a.actions.some( ( x ) => x.action === 'cart' || x.action === 'wishlist' );
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
				// El botón con texto parte de la barra invertida, como se ve sin colores propios.
				cta_bg: s( 'head_fg', c.cta_bg ),
				cta_fg: s( 'head_bg', c.cta_fg ),
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
					{ hasButton && (
						<Group title={ __( 'Botón con texto' ) }>
							<ColorField label={ __( 'Fondo' ) } value={ c.cta_bg } onChange={ ( v ) => set( 'cta_bg', v ) } />
							<ColorField label={ __( 'Texto' ) } value={ c.cta_fg } onChange={ ( v ) => set( 'cta_fg', v ) } />
						</Group>
					) }
					<div className="imm:flex imm:flex-col imm:gap-2 imm:rounded-lg imm:border imm:border-zinc-200 imm:p-3">
						<p className="imm:text-xs imm:font-medium imm:text-zinc-700">{ __( 'Contraste (WCAG AA pide 4,5:1)' ) }</p>
						<ContrastRow label={ __( 'Iconos sobre el fondo' ) } fg={ c.fg } bg={ c.bg } />
						{ '' !== c.bg2 && <ContrastRow label={ __( 'Iconos sobre el segundo color' ) } fg={ c.fg } bg={ c.bg2 } /> }
						{ a.search && <ContrastRow label={ __( 'Texto del buscador' ) } fg={ c.search_fg } bg={ c.search_bg } /> }
						{ hasCounter && <ContrastRow label={ __( 'Contador' ) } fg={ c.badge_fg } bg={ c.badge_bg } /> }
						{ hasButton && <ContrastRow label={ __( 'Texto del botón' ) } fg={ c.cta_fg } bg={ c.cta_bg } /> }
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


/** Acciones de los botones de la derecha, con su icono y nombre por defecto. */
const ACTIONS: { value: AppBarActionType; label: string; icon: string; hint: string }[] = [
	{ value: 'link', label: __( 'Enlace' ), icon: 'arrow-up-right', hint: __( 'Va a una página: contacto, cotizar, agendar, reservar…' ) },
	{ value: 'whatsapp', label: 'WhatsApp', icon: 'si-whatsapp', hint: __( 'Abre un chat con tu número.' ) },
	{ value: 'phone', label: __( 'Llamar' ), icon: 'phone', hint: __( 'Marca un teléfono.' ) },
	{ value: 'search', label: __( 'Buscar' ), icon: 'search', hint: __( 'Abre el buscador a pantalla completa (útil si apagas el campo de búsqueda).' ) },
	{ value: 'account', label: __( 'Mi cuenta' ), icon: 'user-round', hint: __( 'Mi cuenta de WooCommerce o el inicio de sesión.' ) },
	{ value: 'cart', label: __( 'Carrito' ), icon: 'shopping-cart', hint: __( 'Con contador (sale de una cookie: sin peticiones al servidor).' ) },
	{ value: 'wishlist', label: __( 'Favoritos' ), icon: 'heart', hint: __( 'Lista de YITH o TI Wishlist, con contador.' ) },
];

const make = ( patch: Partial<AppBarAction> ): AppBarAction => ( { id: newId( 'ab_' ), action: 'link', style: 'icon', icon: 'arrow-up-right', label: '', url: '', ...patch } );

/**
 * Botones de la derecha de la barra superior: hasta 3, cada uno un icono o un botón con texto.
 * Para sitios que no son tiendas (sin carrito ni cuenta): WhatsApp, llamar o un «Cotizar».
 */
function Actions( { profile, env }: { profile: Profile; env: Env | null } ) {
	const list = profile.app_bar.actions;
	const [ open, setOpen ] = useState( list[ 0 ]?.id ?? '' );
	const save = ( next: AppBarAction[] ) => setProfile( [ 'app_bar', 'actions' ], next );
	const patch = ( i: number, p: Partial<AppBarAction> ) => save( list.map( ( x, j ) => ( j === i ? { ...x, ...p } : x ) ) );
	const move = ( i: number, d: number ) => {
		const next = [ ...list ];
		[ next[ i ], next[ i + d ] ] = [ next[ i + d ]!, next[ i ]! ];
		save( next );
	};
	const preset = ( items: Partial<AppBarAction>[] ) => {
		const next = items.map( make );
		save( next );
		setOpen( next[ 0 ]?.id ?? '' );
	};
	const presets: { label: string; items: Partial<AppBarAction>[]; show?: boolean }[] = [
		{ label: __( 'Tienda: cuenta y carrito' ), items: [ { action: 'account', icon: 'user-round' }, { action: 'cart', icon: 'shopping-cart' } ], show: !! env?.woo },
		{ label: __( 'Contacto: WhatsApp y llamar' ), items: [ { action: 'whatsapp', icon: 'si-whatsapp' }, { action: 'phone', icon: 'phone' } ] },
		{ label: __( 'Botón «Cotizar»' ), items: [ { action: 'link', style: 'button', icon: '', label: __( 'Cotizar' ), url: '/contacto/' } ] },
		{ label: __( 'Ninguno' ), items: [] },
	];

	return (
		<Section
			title={ __( 'Botones de la derecha' ) }
			description={ __( 'Hasta 3: iconos (cuenta, carrito, WhatsApp, llamar…) o un botón con texto como «Cotizar» o «Agendar cita». Un botón sin destino no se muestra (por ejemplo, el carrito sin WooCommerce o WhatsApp sin número).' ) }
		>
			<div className="imm:flex imm:flex-wrap imm:items-center imm:gap-1.5 imm:px-5 imm:py-3">
				<span className="imm:mr-1 imm:text-xs imm:text-zinc-500">{ __( 'Empezar con:' ) }</span>
				{ presets.filter( ( p ) => p.show !== false ).map( ( p ) => (
					<button key={ p.label } type="button" onClick={ () => preset( p.items ) } className="imm:rounded-full imm:border imm:border-zinc-200 imm:bg-white imm:px-3 imm:py-1 imm:text-xs imm:font-medium imm:text-zinc-700 imm:hover:bg-zinc-50">
						{ p.label }
					</button>
				) ) }
			</div>
			{ list.map( ( item, i ) => (
				<ActionRow
					key={ item.id }
					item={ item }
					env={ env }
					open={ open === item.id }
					onToggle={ () => setOpen( open === item.id ? '' : item.id ) }
					onChange={ ( p ) => patch( i, p ) }
					onUp={ i > 0 ? () => move( i, -1 ) : undefined }
					onDown={ i < list.length - 1 ? () => move( i, 1 ) : undefined }
					onRemove={ () => save( list.filter( ( _, j ) => j !== i ) ) }
				/>
			) ) }
			{ ! list.length && <p className="imm:px-5 imm:py-3 imm:text-[13px] imm:text-zinc-500">{ __( 'Sin botones: a la derecha solo queda espacio libre.' ) }</p> }
			<div className="imm:flex imm:flex-col imm:gap-2 imm:px-5 imm:py-3">
				<div>
					<Button
						size="sm"
						variant="outline"
						disabled={ list.length >= 3 }
						onClick={ () => {
							const item = make( { action: 'whatsapp', icon: 'si-whatsapp' } );
							save( [ ...list, item ] );
							setOpen( item.id );
						} }
					>
						<Plus aria-hidden />
						{ __( 'Añadir botón' ) }
					</Button>
				</div>
				{ list.filter( ( x ) => x.style === 'button' ).length > 0 && list.length > 2 && (
					<Notice level="warning">{ __( 'Un botón con texto y dos iconos se ven apretados en celulares pequeños: usa un texto corto o quita un icono.' ) }</Notice>
				) }
			</div>
		</Section>
	);
}

function ActionRow( {
	item,
	env,
	open,
	onToggle,
	onChange,
	onUp,
	onDown,
	onRemove,
}: {
	item: AppBarAction;
	env: Env | null;
	open: boolean;
	onToggle: () => void;
	onChange: ( patch: Partial<AppBarAction> ) => void;
	onUp?: () => void;
	onDown?: () => void;
	onRemove: () => void;
} ) {
	const [ searching, setSearching ] = useState( false );
	const info = ACTIONS.find( ( x ) => x.value === item.action ) ?? ACTIONS[ 0 ]!;
	const button = item.style === 'button';
	const name = item.label.trim() || info.label;
	const needsNumber = item.action === 'whatsapp' || item.action === 'phone';
	const unavailable = ( item.action === 'cart' && ! env?.woo ) || ( item.action === 'wishlist' && ! env?.wishlist );
	const missing = ( item.action === 'link' && ! item.url.trim() ) || ( needsNumber && ! item.url.trim() );
	const small = 'imm:size-7 imm:p-0';

	return (
		<div className="imm:px-5 imm:py-3">
			<div className="imm:flex imm:items-center imm:gap-3">
				<button type="button" onClick={ onToggle } aria-expanded={ open } className="imm:flex imm:min-w-0 imm:flex-1 imm:items-center imm:gap-3 imm:text-left">
					{ button ? (
						<span className="imm:inline-flex imm:h-7 imm:max-w-40 imm:shrink-0 imm:items-center imm:gap-1.5 imm:rounded-full imm:bg-zinc-900 imm:px-3 imm:text-xs imm:font-semibold imm:text-white">
							{ item.icon && <IconView name={ item.icon } className="imm:size-3.5" /> }
							<span className="imm:truncate">{ item.label || __( 'Texto' ) }</span>
						</span>
					) : (
						<span className="imm:flex imm:size-8 imm:shrink-0 imm:items-center imm:justify-center imm:rounded-full imm:bg-zinc-100 imm:text-zinc-800">
							<IconView name={ item.icon || info.icon } className="imm:size-4" />
						</span>
					) }
					<span className="imm:min-w-0">
						<span className="imm:block imm:truncate imm:text-[13px] imm:font-medium imm:text-zinc-800">{ info.label + ( item.label.trim() && item.label.trim() !== info.label ? ' · ' + item.label.trim() : '' ) }</span>
						<span className={ cn( 'imm:block imm:truncate imm:text-xs', unavailable || missing ? 'imm:text-amber-700' : 'imm:text-zinc-500' ) }>
							{ unavailable
								? item.action === 'cart' ? __( 'Sin WooCommerce: no se muestra.' ) : __( 'Sin plugin de favoritos: no se muestra.' )
								: missing
								? needsNumber ? __( 'Falta el número: no se muestra.' ) : __( 'Falta el enlace: no se muestra.' )
								: button ? __( 'Botón con texto' ) : __( 'Icono' ) }
						</span>
					</span>
				</button>
				<div className="imm:flex imm:shrink-0 imm:items-center imm:gap-0.5">
					<Button size="icon" variant="ghost" className={ small } disabled={ ! onUp } onClick={ onUp } aria-label={ __( 'Subir' ) + ' ' + name }>
						<ArrowUp aria-hidden />
					</Button>
					<Button size="icon" variant="ghost" className={ small } disabled={ ! onDown } onClick={ onDown } aria-label={ __( 'Bajar' ) + ' ' + name }>
						<ArrowDown aria-hidden />
					</Button>
					<Button size="icon" variant="ghost" className={ cn( small, 'imm:text-red-600 imm:hover:bg-red-50' ) } onClick={ onRemove } aria-label={ __( 'Quitar' ) + ' ' + name }>
						<Trash2 aria-hidden />
					</Button>
				</div>
			</div>
			{ open && (
				<div className="imm:mt-3 imm:grid imm:gap-3 imm:rounded-lg imm:border imm:border-zinc-200 imm:bg-zinc-50/60 imm:p-3 imm:sm:grid-cols-2">
					<label className="imm:flex imm:flex-col imm:gap-1.5">
						<span className="imm:text-xs imm:font-medium imm:text-zinc-700">{ __( 'Acción' ) }</span>
						<Select
							value={ item.action }
							onChange={ ( e ) => {
								const action = e.target.value as AppBarActionType;
								const next = ACTIONS.find( ( x ) => x.value === action );
								// El icono sigue a la acción mientras no se haya elegido otro a mano.
								const auto = ! item.icon || item.icon === info.icon;
								// El número se conserva entre WhatsApp y llamar; lo demás no tiene destino que conservar.
								const keepUrl = needsNumber && ( action === 'whatsapp' || action === 'phone' );
								onChange( { action, icon: auto && ! ( button && ! item.icon ) ? next?.icon ?? item.icon : item.icon, url: keepUrl ? item.url : '' } );
							} }
						>
							{ ACTIONS.map( ( x ) => (
								<option key={ x.value } value={ x.value } disabled={ ( x.value === 'cart' && ! env?.woo ) || ( x.value === 'wishlist' && ! env?.wishlist ) }>
									{ x.label }
								</option>
							) ) }
						</Select>
						<span className="imm:text-[11px] imm:leading-snug imm:text-zinc-500">{ info.hint }</span>
					</label>
					<div className="imm:flex imm:flex-col imm:gap-1.5">
						<span className="imm:text-xs imm:font-medium imm:text-zinc-700">{ __( 'Aspecto' ) }</span>
						<Segmented
							size="sm"
							value={ item.style }
							onChange={ ( style ) => onChange( { style, label: style === 'button' && ! item.label.trim() ? info.label : item.label } ) }
							options={ [
								{ value: 'icon', label: __( 'Icono' ) },
								{ value: 'button', label: __( 'Botón con texto' ) },
							] }
						/>
					</div>
					<label className="imm:flex imm:flex-col imm:gap-1.5">
						<span className="imm:text-xs imm:font-medium imm:text-zinc-700">{ button ? __( 'Texto del botón' ) : __( 'Nombre' ) }</span>
						<Input value={ item.label } maxLength={ 24 } placeholder={ info.label } onChange={ ( e ) => onChange( { label: e.target.value } ) } />
						<span className="imm:text-[11px] imm:leading-snug imm:text-zinc-500">
							{ button ? __( 'Corto: 1 o 2 palabras (Cotizar, Agendar cita, Reservar).' ) : __( 'No se ve: lo leen los lectores de pantalla. Vacío: el nombre de la acción.' ) }
						</span>
					</label>
					<div className="imm:flex imm:flex-col imm:gap-1.5">
						<span className="imm:text-xs imm:font-medium imm:text-zinc-700">{ __( 'Icono' ) }</span>
						<IconPicker value={ item.icon } allowEmpty={ button } onChange={ ( icon ) => onChange( { icon } ) } />
						{ button && <span className="imm:text-[11px] imm:leading-snug imm:text-zinc-500">{ __( 'Opcional en el botón con texto.' ) }</span> }
					</div>
					{ item.action === 'link' && (
						<label className="imm:flex imm:flex-col imm:gap-1.5 imm:sm:col-span-2">
							<span className="imm:text-xs imm:font-medium imm:text-zinc-700">{ __( 'Enlace' ) }</span>
							<div className="imm:flex imm:gap-2">
								<Input value={ item.url } placeholder="/contacto/" className="imm:font-mono imm:text-xs" onChange={ ( e ) => onChange( { url: e.target.value } ) } />
								<Button type="button" variant="outline" onClick={ () => setSearching( true ) }>
									<Search aria-hidden />
									{ __( 'Buscar página' ) }
								</Button>
							</div>
							<ObjectSearch open={ searching } onOpenChange={ setSearching } onPick={ ( r ) => onChange( { url: r.url, label: item.label || ( button ? r.label.slice( 0, 24 ) : '' ) } ) } />
						</label>
					) }
					{ needsNumber && (
						<label className="imm:flex imm:flex-col imm:gap-1.5 imm:sm:col-span-2">
							<span className="imm:text-xs imm:font-medium imm:text-zinc-700">{ __( 'Número' ) }</span>
							<Input value={ item.url } placeholder="573001234567" inputMode="tel" className="imm:font-mono imm:text-xs" onChange={ ( e ) => onChange( { url: e.target.value } ) } />
							<span className="imm:text-[11px] imm:leading-snug imm:text-zinc-500">{ __( 'Con código de país, solo números.' ) }</span>
						</label>
					) }
				</div>
			) }
		</div>
	);
}
