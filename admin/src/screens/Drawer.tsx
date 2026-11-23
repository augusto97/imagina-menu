import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { IconPicker } from '@/components/IconPicker';
import { IconView } from '@/components/IconView';
import { MediaField } from '@/components/MediaField';
import { CopyCode, DateRange, MockPage, PageHeader, Range, Row, Section, Segmented, ToggleRow } from '@/components/common';
import { Button } from '@/components/ui/button';
import { Notice } from '@/components/ui/feedback';
import { Input, Select } from '@/components/ui/input';
import { __ } from '@/lib/i18n';
import { setProfile, useActiveProfile, useStore } from '@/lib/store';
import type { Profile } from '@/lib/types';
import { cn } from '@/lib/utils';

const MODE_HINTS: Record<Profile[ 'drawer' ][ 'submenu_mode' ], string> = {
	slide: __( 'Cada submenú entra deslizándose desde el lado, con flecha para volver (estilo Amazon).' ),
	accordion: __( 'Los submenús se despliegan debajo de su ítem.' ),
	two_pane: __( 'Categorías a la izquierda y subcategorías con imagen a la derecha (estilo apps de compras). Ideal con WooCommerce y ancho del 100 %.' ),
	tabs: __( 'Pestañas horizontales arriba con las categorías principales y, debajo, sus subcategorías como tarjetas con imagen (estilo tiendas de moda). Ideal para pocos departamentos grandes.' ),
	grid: __( 'El primer nivel como rejilla de tarjetas con icono o imagen; los submenús se deslizan. Ideal para servicios, restaurantes o pocas categorías.' ),
};

const NETWORKS = [ 'facebook', 'instagram', 'tiktok', 'youtube', 'x', 'pinterest', 'telegram', 'whatsapp' ];

export function DrawerScreen() {
	const profile = useActiveProfile();
	const menus = useStore( ( s ) => s.menus );
	const env = useStore( ( s ) => s.env );
	if ( ! profile ) {
		return null;
	}
	const d = profile.drawer;
	const t = profile.trigger;
	const set = ( path: ( string | number )[], value: unknown ) => setProfile( path, value );

	return (
		<>
			<PageHeader title={ __( 'Panel lateral' ) } description={ __( 'El panel que se abre con el botón de menú: cómo se abre, qué muestra arriba y abajo, y cómo navegan los submenús.' ) } />
			<div className="imm:flex imm:flex-col imm:gap-5">
				<Section title={ __( 'Panel' ) }>
					<ToggleRow label={ __( 'Activar el panel' ) } checked={ d.enabled } onChange={ ( v ) => set( [ 'drawer', 'enabled' ], v ) } />
					<Row label={ __( 'Menú' ) } hint={ __( 'Qué árbol de enlaces muestra.' ) }>
						<Select value={ d.menu_id } onChange={ ( e ) => set( [ 'drawer', 'menu_id' ], Number( e.target.value ) ) } className="imm:w-56">
							{ menus.map( ( m ) => (
								<option key={ m.id } value={ m.id }>
									{ m.title }
								</option>
							) ) }
						</Select>
					</Row>
					<Row label={ __( 'Submenús' ) } hint={ MODE_HINTS[ d.submenu_mode ] }>
						<Segmented value={ d.submenu_mode } onChange={ ( v ) => set( [ 'drawer', 'submenu_mode' ], v ) } options={ [
								{ value: 'slide', label: __( 'Deslizante' ) },
								{ value: 'accordion', label: __( 'Acordeón' ) },
								{ value: 'two_pane', label: __( 'Dos columnas' ) },
								{ value: 'tabs', label: __( 'Pestañas' ) },
								{ value: 'grid', label: __( 'Rejilla' ) },
							] } />
					</Row>
					<Row label={ __( 'Lado' ) }>
						<Segmented value={ d.side } onChange={ ( v ) => set( [ 'drawer', 'side' ], v ) } options={ [ { value: 'left', label: __( 'Izquierda' ) }, { value: 'right', label: __( 'Derecha' ) }, { value: 'bottom', label: __( 'Abajo' ) } ] } />
					</Row>
					<Row label={ __( 'Ancho' ) } hint={ __( 'Porcentaje de la pantalla. Dejar ver un poco del sitio ayuda a entender que es un panel.' ) }>
						<Range value={ d.width } min={ 50 } max={ 100 } unit="%" onChange={ ( v ) => set( [ 'drawer', 'width' ], v ) } />
					</Row>
					<Row label={ __( 'Ancho máximo' ) } hint={ __( 'En tablets y escritorio.' ) }>
						<Range value={ d.max_width } min={ 240 } max={ 1200 } step={ 10 } unit="px" onChange={ ( v ) => set( [ 'drawer', 'max_width' ], v ) } />
					</Row>
					<Row label={ __( 'Botón cerrar' ) }>
						<Segmented value={ d.close_position } onChange={ ( v ) => set( [ 'drawer', 'close_position' ], v ) } options={ [ { value: 'outside', label: __( 'Fuera del panel' ) }, { value: 'inside', label: __( 'Dentro' ) }, { value: 'none', label: __( 'Ninguno' ) } ] } />
					</Row>
				</Section>

				<LanguagesSection profile={ profile } />

				<Section title={ __( 'Cómo se abre' ) } description={ __( 'El botón abre el panel incluso antes de que cargue el JavaScript.' ) }>
					<div className="imm:grid imm:gap-2 imm:p-4 imm:sm:grid-cols-3">
						{ (
							[
								{ value: 'floating', title: __( 'Botón flotante' ), text: __( 'Un botón redondo fijo en una esquina.' ) },
								{ value: 'theme_selector', title: __( 'Botón del tema' ), text: __( 'Usa la hamburguesa que ya tiene tu tema.' ) },
								{ value: 'manual', title: __( 'Bloque o shortcode' ), text: __( 'Lo colocas tú en la cabecera.' ) },
							] as const
						 ).map( ( o ) => (
							<button
								key={ o.value }
								type="button"
								onClick={ () => set( [ 'trigger', 'mode' ], o.value ) }
								className={ cn( 'imm:rounded-lg imm:border imm:p-3 imm:text-left imm:transition-colors', t.mode === o.value ? 'imm:border-zinc-900 imm:bg-zinc-50 imm:ring-1 imm:ring-zinc-900' : 'imm:border-zinc-200 imm:hover:border-zinc-300' ) }
							>
								<span className="imm:block imm:text-[13px] imm:font-semibold">{ o.title }</span>
								<span className="imm:mt-0.5 imm:block imm:text-xs imm:text-zinc-500">{ o.text }</span>
							</button>
						) ) }
					</div>
					{ t.mode === 'floating' && (
						<>
							<FabDesign profile={ profile } />
							<Row label={ __( 'Posición' ) }>
								<Select value={ t.position } onChange={ ( e ) => set( [ 'trigger', 'position' ], e.target.value ) } className="imm:w-48">
									<option value="bottom-left">{ __( 'Abajo a la izquierda' ) }</option>
									<option value="bottom-right">{ __( 'Abajo a la derecha' ) }</option>
									<option value="top-left">{ __( 'Arriba a la izquierda' ) }</option>
									<option value="top-right">{ __( 'Arriba a la derecha' ) }</option>
								</Select>
							</Row>
							<Row label={ __( 'Etiqueta' ) } hint={ __( 'Opcional: «Menú», «Categorías».' ) }>
								<Input value={ t.label } onChange={ ( e ) => set( [ 'trigger', 'label' ], e.target.value ) } className="imm:w-48" />
							</Row>
							<Row label={ __( 'Tamaño' ) }>
								<Range value={ t.size } min={ 36 } max={ 80 } unit="px" onChange={ ( v ) => set( [ 'trigger', 'size' ], v ) } />
							</Row>
							<Row label={ __( 'Distancia al borde' ) }>
								<Range value={ t.offset } min={ 0 } max={ 80 } unit="px" onChange={ ( v ) => set( [ 'trigger', 'offset' ], v ) } />
							</Row>
							<ToggleRow label={ __( 'Ocultar al bajar' ) } hint={ __( 'Reaparece al subir.' ) } checked={ t.hide_on_scroll } onChange={ ( v ) => set( [ 'trigger', 'hide_on_scroll' ], v ) } />
						</>
					) }
					{ t.mode === 'theme_selector' && (
						<Row label={ __( 'Selector del botón del tema' ) } hint={ __( 'Al tocarlo se abre este panel en lugar del menú del tema. Si el JS no ha cargado, el tema abre su propio menú (respaldo seguro).' ) } stacked>
							<Input value={ t.selector } disabled={ env?.can_edit_css === false } onChange={ ( e ) => set( [ 'trigger', 'selector' ], e.target.value ) } placeholder=".menu-toggle" className="imm:font-mono imm:text-xs" />
							{ env?.can_edit_css !== false && <Suggestions values={ env?.theme.selectors ?? [] } theme={ env?.theme.name ?? '' } onPick={ ( v ) => set( [ 'trigger', 'selector' ], v ) } /> }
							{ env?.can_edit_css === false && <p className="imm:text-[12px] imm:text-amber-700">{ __( 'Solo un administrador puede cambiar esto: afecta a todo el sitio, igual que el «CSS adicional» de WordPress.' ) }</p> }
						</Row>
					) }
					{ t.mode === 'manual' && (
						<div className="imm:flex imm:flex-col imm:gap-2 imm:px-5 imm:py-4">
							<p className="imm:text-[13px] imm:text-zinc-600">{ __( 'Agrega el bloque «Botón de Imagina Menu» en la cabecera del tema, o este shortcode:' ) }</p>
							<CopyCode code="[imagina_menu_toggle]" />
							<CopyCode code={ '[imagina_menu_toggle label="Menú"]' } />
						</div>
					) }
					<Row label={ __( 'Icono del botón' ) }>
						<div className="imm:flex imm:gap-1">
							{ ( [ 'menu', 'align-left', 'layout-grid', 'grip' ] as const ).map( ( icon ) => (
								<button
									key={ icon }
									type="button"
									aria-label={ icon }
									onClick={ () => set( [ 'trigger', 'icon' ], icon ) }
									className={ cn( 'imm:flex imm:size-9 imm:items-center imm:justify-center imm:rounded-md imm:border', t.icon === icon ? 'imm:border-zinc-900 imm:bg-zinc-900 imm:text-white' : 'imm:border-zinc-200 imm:hover:bg-zinc-50' ) }
								>
									<IconView name={ icon } />
								</button>
							) ) }
						</div>
					</Row>
					<Row label={ __( 'Ocultar el menú móvil del tema' ) } hint={ __( 'Selector CSS de lo que quieres esconder en celulares (por ejemplo, la hamburguesa del tema si usas el botón flotante).' ) } stacked>
						<Input value={ profile.hide_theme_selector } disabled={ env?.can_edit_css === false } onChange={ ( e ) => set( [ 'hide_theme_selector' ], e.target.value ) } placeholder=".menu-toggle" className="imm:font-mono imm:text-xs" />
						{ env?.can_edit_css !== false && <Suggestions values={ env?.theme.selectors ?? [] } theme={ env?.theme.name ?? '' } onPick={ ( v ) => set( [ 'hide_theme_selector' ], v ) } /> }
						{ env?.can_edit_css === false && <p className="imm:text-[12px] imm:text-amber-700">{ __( 'Solo un administrador puede cambiar esto: afecta a todo el sitio, igual que el «CSS adicional» de WordPress.' ) }</p> }
					</Row>
				</Section>

				<Section title={ __( 'Cabecera del panel' ) }>
					<ToggleRow label={ __( 'Logo del sitio' ) } hint={ env?.has_logo ? undefined : __( 'Tu tema no tiene logo configurado (Apariencia → Personalizar → Identidad).' ) } checked={ d.show_logo } onChange={ ( v ) => set( [ 'drawer', 'show_logo' ], v ) } />
					<Row label={ __( 'Título' ) } hint={ __( 'Si no hay logo.' ) }>
						<Input value={ d.title } onChange={ ( e ) => set( [ 'drawer', 'title' ], e.target.value ) } className="imm:w-56" />
					</Row>
					<ToggleRow label={ __( 'Bloque de cuenta' ) } hint={ __( '«Hola, inicia sesión» o «Hola, {nombre}». Empuja al registro, como Amazon y Mercado Libre.' ) } checked={ d.account } onChange={ ( v ) => set( [ 'drawer', 'account' ], v ) } />
					<ToggleRow label={ __( 'Buscador' ) } hint={ __( 'Abre el buscador a pantalla completa.' ) } checked={ d.search } onChange={ ( v ) => set( [ 'drawer', 'search' ], v ) } />
				</Section>

				<Section title={ __( 'Navegación' ) }>
					<Row label={ __( 'Texto de «volver»' ) } hint={ __( 'En el primer nivel de submenú.' ) }>
						<Input value={ d.back_label } onChange={ ( e ) => set( [ 'drawer', 'back_label' ], e.target.value ) } className="imm:w-56" />
					</Row>
					<Row label={ __( 'Texto de «Ver todo»' ) } hint={ __( 'Se completa con el nombre de la categoría: «Ver todo Celulares». Con %s eliges dónde va: «Todo en %s».' ) }>
						<Input value={ d.view_all_label } onChange={ ( e ) => set( [ 'drawer', 'view_all_label' ], e.target.value ) } className="imm:w-56" />
					</Row>
					<Row label={ __( 'Posición de «Ver todo»' ) } hint={ __( 'La categoría que abre un submenú no se puede tocar como enlace: «Ver todo» lleva a su página. Se puede quitar por ítem en el constructor.' ) }>
						<Segmented
							value={ d.view_all_position }
							onChange={ ( v ) => set( [ 'drawer', 'view_all_position' ], v ) }
							options={ [
								{ value: 'bottom', label: __( 'Al final' ) },
								{ value: 'top', label: __( 'Al inicio' ) },
							] }
						/>
					</Row>
					<ToggleRow label={ __( 'Título grande del nivel' ) } checked={ d.show_level_title } onChange={ ( v ) => set( [ 'drawer', 'show_level_title' ], v ) } />
					<ToggleRow label={ __( 'Abrir en la página actual' ) } hint={ __( 'Al abrir, el panel muestra el submenú donde está la página visitada.' ) } checked={ d.open_active } onChange={ ( v ) => set( [ 'drawer', 'open_active' ], v ) } />
					<ToggleRow label={ __( 'Recordar el último nivel' ) } hint={ __( 'Durante la sesión del navegador.' ) } checked={ d.remember_level } onChange={ ( v ) => set( [ 'drawer', 'remember_level' ], v ) } />
					<ToggleRow label={ __( 'Cerrar deslizando' ) } hint={ __( 'Y deslizar a la derecha para volver un nivel.' ) } checked={ d.swipe_close } onChange={ ( v ) => set( [ 'drawer', 'swipe_close' ], v ) } />
				</Section>

				<Banners profile={ profile } />

				<Section title={ __( 'Pie del panel' ) } description={ __( 'Accesos de servicio y contacto: reducen la fricción y convierten.' ) }>
					<ToggleRow label={ __( 'Botón de WhatsApp' ) } checked={ d.whatsapp.enabled } onChange={ ( v ) => set( [ 'drawer', 'whatsapp', 'enabled' ], v ) } />
					{ d.whatsapp.enabled && (
						<div className="imm:grid imm:gap-3 imm:px-5 imm:py-4 imm:sm:grid-cols-2">
							<LabeledInput label={ __( 'Número con código de país' ) } value={ d.whatsapp.number } placeholder="573001234567" onChange={ ( v ) => set( [ 'drawer', 'whatsapp', 'number' ], v ) } />
							<LabeledInput label={ __( 'Texto del botón' ) } value={ d.whatsapp.label } onChange={ ( v ) => set( [ 'drawer', 'whatsapp', 'label' ], v ) } />
							<LabeledInput className="imm:sm:col-span-2" label={ __( 'Mensaje inicial' ) } value={ d.whatsapp.message } placeholder={ __( 'Hola, me interesa {titulo}' ) } onChange={ ( v ) => set( [ 'drawer', 'whatsapp', 'message' ], v ) } />
							<p className="imm:-mt-1 imm:text-xs imm:text-zinc-500 imm:sm:col-span-2">
								{ __( 'Usa {titulo} y {url} para incluir el producto, la categoría o la página que el cliente está viendo: «Hola, me interesa {titulo} {url}».' ) }
							</p>
							<WhatsAppHours profile={ profile } />
						</div>
					) }
					<ToggleRow label={ __( 'Botón destacado (CTA)' ) } hint={ __( '«Vende con nosotros», «Agenda tu cita»…' ) } checked={ d.cta.enabled } onChange={ ( v ) => set( [ 'drawer', 'cta', 'enabled' ], v ) } />
					{ d.cta.enabled && (
						<div className="imm:grid imm:gap-3 imm:px-5 imm:py-4 imm:sm:grid-cols-2">
							<LabeledInput label={ __( 'Texto' ) } value={ d.cta.label } onChange={ ( v ) => set( [ 'drawer', 'cta', 'label' ], v ) } />
							<LabeledInput label={ __( 'Enlace' ) } value={ d.cta.url } placeholder="/contacto/" onChange={ ( v ) => set( [ 'drawer', 'cta', 'url' ], v ) } />
						</div>
					) }
					<FooterLinks profile={ profile } />
					<Social profile={ profile } />
				</Section>
			</div>
		</>
	);
}

function LabeledInput( { label, value, onChange, placeholder, className }: { label: string; value: string; onChange: ( v: string ) => void; placeholder?: string; className?: string } ) {
	return (
		<label className={ cn( 'imm:flex imm:flex-col imm:gap-1.5', className ) }>
			<span className="imm:text-xs imm:font-medium imm:text-zinc-700">{ label }</span>
			<Input value={ value } placeholder={ placeholder } onChange={ ( e ) => onChange( e.target.value ) } />
		</label>
	);
}

export function Suggestions( { values, theme, onPick }: { values: string[]; theme: string; onPick: ( v: string ) => void } ) {
	if ( ! values.length ) {
		return null;
	}
	return (
		<div className="imm:mt-2 imm:flex imm:flex-wrap imm:items-center imm:gap-1.5">
			<span className="imm:text-[11px] imm:text-zinc-500">
				{ __( 'Sugeridos para' ) } { theme }:
			</span>
			{ values.map( ( v ) => (
				<button key={ v } type="button" onClick={ () => onPick( v ) } className="imm:rounded-md imm:border imm:border-zinc-200 imm:bg-zinc-50 imm:px-1.5 imm:py-0.5 imm:font-mono imm:text-[11px] imm:text-zinc-700 imm:hover:bg-zinc-100">
					{ v }
				</button>
			) ) }
		</div>
	);
}


function FooterLinks( { profile }: { profile: Profile } ) {
	const links = profile.drawer.footer_links;
	const update = ( next: typeof links ) => setProfile( [ 'drawer', 'footer_links' ], next );
	return (
		<div className="imm:flex imm:flex-col imm:gap-2 imm:px-5 imm:py-4">
			<div className="imm:flex imm:items-center imm:justify-between">
				<div>
					<p className="imm:text-[13px] imm:font-medium imm:text-zinc-800">{ __( 'Enlaces de servicio' ) }</p>
					<p className="imm:text-xs imm:text-zinc-500">{ __( 'Mis pedidos, Ayuda, Devoluciones…' ) }</p>
				</div>
				<Button size="sm" variant="outline" disabled={ links.length >= 12 } onClick={ () => update( [ ...links, { label: '', url: '', icon: 'circle-help' } ] ) }>
					<Plus aria-hidden />
					{ __( 'Añadir' ) }
				</Button>
			</div>
			{ links.map( ( link, i ) => (
				<div key={ i } className="imm:grid imm:grid-cols-[120px_1fr_1fr_auto] imm:items-center imm:gap-2">
					<IconPicker value={ link.icon } onChange={ ( v ) => update( links.map( ( l, j ) => ( j === i ? { ...l, icon: v } : l ) ) ) } />
					<Input value={ link.label } placeholder={ __( 'Texto' ) } onChange={ ( e ) => update( links.map( ( l, j ) => ( j === i ? { ...l, label: e.target.value } : l ) ) ) } />
					<Input value={ link.url } placeholder="/mi-cuenta/orders/" className="imm:font-mono imm:text-xs" onChange={ ( e ) => update( links.map( ( l, j ) => ( j === i ? { ...l, url: e.target.value } : l ) ) ) } />
					<div className="imm:flex">
						<Button size="icon" variant="ghost" aria-label={ __( 'Subir' ) } disabled={ i === 0 } onClick={ () => update( swap( links, i, i - 1 ) ) }>
							<ArrowUp aria-hidden />
						</Button>
						<Button size="icon" variant="ghost" aria-label={ __( 'Bajar' ) } disabled={ i === links.length - 1 } onClick={ () => update( swap( links, i, i + 1 ) ) }>
							<ArrowDown aria-hidden />
						</Button>
						<Button size="icon" variant="ghost" aria-label={ __( 'Quitar' ) } onClick={ () => update( links.filter( ( _, j ) => j !== i ) ) }>
							<Trash2 aria-hidden />
						</Button>
					</div>
				</div>
			) ) }
			{ links.some( ( l ) => ! l.label || ! l.url ) && <Notice level="info">{ __( 'Los enlaces sin texto o sin URL no se muestran.' ) }</Notice> }
		</div>
	);
}

function Social( { profile }: { profile: Profile } ) {
	const rows = profile.drawer.social;
	const update = ( next: typeof rows ) => setProfile( [ 'drawer', 'social' ], next );
	return (
		<div className="imm:flex imm:flex-col imm:gap-2 imm:px-5 imm:py-4">
			<div className="imm:flex imm:items-center imm:justify-between">
				<p className="imm:text-[13px] imm:font-medium imm:text-zinc-800">{ __( 'Redes sociales' ) }</p>
				<Button size="sm" variant="outline" disabled={ rows.length >= 10 } onClick={ () => update( [ ...rows, { network: NETWORKS.find( ( n ) => ! rows.some( ( r ) => r.network === n ) ) ?? 'facebook', url: '' } ] ) }>
					<Plus aria-hidden />
					{ __( 'Añadir' ) }
				</Button>
			</div>
			{ rows.map( ( row, i ) => (
				<div key={ i } className="imm:grid imm:grid-cols-[36px_150px_1fr_auto] imm:items-center imm:gap-2">
					<span className="imm:flex imm:size-9 imm:items-center imm:justify-center imm:rounded-md imm:bg-zinc-100">
						<IconView name={ 'si-' + row.network } />
					</span>
					<Select value={ row.network } onChange={ ( e ) => update( rows.map( ( r, j ) => ( j === i ? { ...r, network: e.target.value } : r ) ) ) }>
						{ NETWORKS.map( ( n ) => (
							<option key={ n } value={ n }>
								{ n === 'x' ? 'X (Twitter)' : n.charAt( 0 ).toUpperCase() + n.slice( 1 ) }
							</option>
						) ) }
					</Select>
					<Input value={ row.url } placeholder="https://instagram.com/tu-marca" className="imm:font-mono imm:text-xs" onChange={ ( e ) => update( rows.map( ( r, j ) => ( j === i ? { ...r, url: e.target.value } : r ) ) ) } />
					<Button size="icon" variant="ghost" aria-label={ __( 'Quitar' ) } onClick={ () => update( rows.filter( ( _, j ) => j !== i ) ) }>
						<Trash2 aria-hidden />
					</Button>
				</div>
			) ) }
		</div>
	);
}

function swap<T>( list: T[], a: number, b: number ): T[] {
	const copy = [ ...list ];
	[ copy[ a ], copy[ b ] ] = [ copy[ b ] as T, copy[ a ] as T ];
	return copy;
}

/** Menú por idioma y selector de idioma (WPML, Polylang o TranslatePress). */
function LanguagesSection( { profile }: { profile: Profile } ) {
	const env = useStore( ( s ) => s.env );
	const menus = useStore( ( s ) => s.menus );
	const languages = env?.languages ?? [];
	const d = profile.drawer;
	const plugin = { wpml: 'WPML', polylang: 'Polylang', translatepress: 'TranslatePress', '': '' }[ env?.multilingual ?? '' ];

	if ( ! languages.length ) {
		return (
			<Section title={ __( 'Idiomas' ) } description={ __( 'Menú por idioma y selector de idioma.' ) }>
				<div className="imm:px-5 imm:py-4">
					<Notice level="info">{ __( 'Estas opciones aparecen cuando el sitio usa WPML, Polylang o TranslatePress. Los textos del menú se pueden traducir desde la traducción de cadenas de ese plugin.' ) }</Notice>
				</div>
			</Section>
		);
	}

	return (
		<Section title={ __( 'Idiomas' ) } description={ `${ __( 'Detectado:' ) } ${ plugin }. ${ __( 'Cada idioma se compila aparte: los enlaces a páginas y categorías apuntan a su traducción y los textos se traducen desde la traducción de cadenas.' ) }` }>
			{ languages.map( ( l ) => (
				<Row key={ l.code } label={ <>{ l.name } <span className="imm:font-mono imm:text-xs imm:text-zinc-400">{ l.code }</span></> } hint={ l.default ? __( 'Idioma principal: usa el menú elegido arriba.' ) : __( 'Usar otro menú en este idioma (opcional).' ) }>
					{ l.default ? (
						<span className="imm:text-[13px] imm:text-zinc-500">{ menus.find( ( m ) => m.id === d.menu_id )?.title ?? '—' }</span>
					) : (
						<Select
							value={ d.menu_by_lang[ l.code ] ?? 0 }
							onChange={ ( e ) => {
								const value = Number( e.target.value );
								const next = { ...d.menu_by_lang };
								if ( value ) {
									next[ l.code ] = value;
								} else {
									delete next[ l.code ];
								}
								setProfile( [ 'drawer', 'menu_by_lang' ], next );
							} }
							className="imm:w-56"
							aria-label={ `${ __( 'Menú para' ) } ${ l.name }` }
						>
							<option value={ 0 }>{ __( 'El mismo menú (traducido)' ) }</option>
							{ menus.map( ( m ) => (
								<option key={ m.id } value={ m.id }>
									{ m.title }
								</option>
							) ) }
						</Select>
					) }
				</Row>
			) ) }
			<ToggleRow label={ __( 'Selector de idioma en el pie del panel' ) } hint={ __( 'Enlaces a la traducción de la página actual.' ) } checked={ d.language_switcher } onChange={ ( v ) => setProfile( [ 'drawer', 'language_switcher' ], v ) } />
		</Section>
	);
}

const DAYS = [ __( 'Do' ), __( 'Lu' ), __( 'Ma' ), __( 'Mi' ), __( 'Ju' ), __( 'Vi' ), __( 'Sá' ) ];

/** Horario de atención: fuera de horario el botón cambia de texto (el enlace sigue funcionando). */
function WhatsAppHours( { profile }: { profile: Profile } ) {
	const h = profile.drawer.whatsapp.hours;
	const set = ( key: keyof typeof h, value: unknown ) => setProfile( [ 'drawer', 'whatsapp', 'hours', key ], value );
	const time = 'imm:h-8 imm:rounded-md imm:border imm:border-zinc-200 imm:bg-white imm:px-2 imm:text-[13px]';
	return (
		<div className="imm:flex imm:flex-col imm:gap-3 imm:rounded-lg imm:border imm:border-zinc-200 imm:p-3 imm:sm:col-span-2">
			<label className="imm:flex imm:items-center imm:gap-2 imm:text-[13px] imm:font-medium imm:text-zinc-800">
				<input type="checkbox" checked={ h.enabled } onChange={ ( e ) => set( 'enabled', e.target.checked ) } />
				{ __( 'Horario de atención' ) }
			</label>
			{ h.enabled && (
				<>
					<div className="imm:flex imm:flex-wrap imm:items-center imm:gap-1" role="group" aria-label={ __( 'Días de atención' ) }>
						{ DAYS.map( ( label, day ) => (
							<button
								key={ day }
								type="button"
								aria-pressed={ h.days.includes( day ) }
								onClick={ () => set( 'days', h.days.includes( day ) ? h.days.filter( ( x ) => x !== day ) : [ ...h.days, day ].sort() ) }
								className={ cn( 'imm:h-8 imm:w-9 imm:rounded-md imm:border imm:text-xs imm:font-medium', h.days.includes( day ) ? 'imm:border-zinc-900 imm:bg-zinc-900 imm:text-white' : 'imm:border-zinc-200 imm:text-zinc-600 imm:hover:bg-zinc-50' ) }
							>
								{ label }
							</button>
						) ) }
					</div>
					<div className="imm:flex imm:flex-wrap imm:items-center imm:gap-2 imm:text-[13px] imm:text-zinc-600">
						{ __( 'De' ) }
						<input type="time" value={ h.from } onChange={ ( e ) => set( 'from', e.target.value ) } className={ time } aria-label={ __( 'Desde' ) } />
						{ __( 'a' ) }
						<input type="time" value={ h.to } onChange={ ( e ) => set( 'to', e.target.value ) } className={ time } aria-label={ __( 'Hasta' ) } />
						<span className="imm:text-xs imm:text-zinc-500">{ __( '(hora del sitio)' ) }</span>
					</div>
					<LabeledInput label={ __( 'Texto fuera de horario' ) } value={ h.off_label } onChange={ ( v ) => set( 'off_label', v ) } />
				</>
			) }
		</div>
	);
}

/** Banners de promoción dentro del panel (carrusel sin JavaScript, con campaña opcional). */
function Banners( { profile }: { profile: Profile } ) {
	const list = profile.drawer.banners;
	const update = ( next: typeof list ) => setProfile( [ 'drawer', 'banners' ], next );
	const patch = ( i: number, value: Partial<( typeof list )[ number ]> ) => update( list.map( ( b, j ) => ( j === i ? { ...b, ...value } : b ) ) );
	return (
		<Section title={ __( 'Banners de promoción' ) } description={ __( 'Imágenes con enlace dentro del panel, como Temu o AliExpress. Con varias, se deslizan. Cada una puede tener fechas de campaña.' ) }>
			<Row label={ __( 'Posición' ) }>
				<Segmented
					value={ profile.drawer.banners_position }
					onChange={ ( v ) => setProfile( [ 'drawer', 'banners_position' ], v ) }
					options={ [
						{ value: 'top', label: __( 'Arriba' ) },
						{ value: 'bottom', label: __( 'Antes del pie' ) },
					] }
				/>
			</Row>
			<div className="imm:flex imm:flex-col imm:gap-3 imm:px-5 imm:py-4">
				{ list.map( ( b, i ) => (
					<div key={ i } className="imm:flex imm:flex-col imm:gap-3 imm:rounded-lg imm:border imm:border-zinc-200 imm:p-3">
						<div className="imm:flex imm:items-start imm:gap-3">
							<MediaField value={ b.image } wide size="medium" onChange={ ( v ) => patch( i, { image: v } ) } />
							<div className="imm:flex imm:flex-1 imm:flex-col imm:gap-2">
								<LabeledInput label={ __( 'Enlace' ) } value={ b.url } placeholder="/ofertas/" onChange={ ( v ) => patch( i, { url: v } ) } />
								<LabeledInput label={ __( 'Texto alternativo' ) } value={ b.alt } placeholder={ __( 'Hasta 50 % en tecnología' ) } onChange={ ( v ) => patch( i, { alt: v } ) } />
							</div>
							<Button size="icon" variant="ghost" aria-label={ __( 'Quitar banner' ) } onClick={ () => update( list.filter( ( _, j ) => j !== i ) ) }>
								<Trash2 aria-hidden />
							</Button>
						</div>
						<DateRange from={ b.from } to={ b.to } onChange={ ( w ) => patch( i, w ) } />
					</div>
				) ) }
				<div className="imm:flex imm:items-center imm:gap-3">
					<Button variant="outline" size="sm" disabled={ list.length >= 6 } onClick={ () => update( [ ...list, { image: { id: 0, url: '' }, url: '', alt: '', from: '', to: '' } ] ) }>
						<Plus aria-hidden />
						{ __( 'Añadir banner' ) }
					</Button>
					<span className="imm:text-xs imm:text-zinc-500">{ __( 'Proporción 2:1 (por ejemplo 800 × 400). Se descargan solo al abrir el panel.' ) }</span>
				</div>
			</div>
		</Section>
	);
}


type FabLook = { shape: Profile[ 'trigger' ][ 'shape' ]; style: Profile[ 'trigger' ][ 'style' ]; size: number; label: boolean };

/** Plantillas del botón flotante: forma, estilo, tamaño y si lleva texto. */
const FAB_TEMPLATES: { id: string; name: string; hint: string; d: FabLook }[] = [
	{ id: 'classic', name: __( 'Clásico' ), hint: __( 'Redondo, con los colores del botón.' ), d: { shape: 'circle', style: 'solid', size: 52, label: false } },
	{ id: 'label', name: __( 'Con texto' ), hint: __( 'Píldora con «Menú».' ), d: { shape: 'circle', style: 'solid', size: 52, label: true } },
	{ id: 'square', name: __( 'Cuadrado suave' ), hint: __( 'Esquinas redondeadas, 56 px.' ), d: { shape: 'rounded', style: 'solid', size: 56, label: false } },
	{ id: 'extended', name: __( 'Extendido' ), hint: __( 'Cuadrado suave con texto.' ), d: { shape: 'rounded', style: 'solid', size: 56, label: true } },
	{ id: 'small', name: __( 'Pequeño' ), hint: __( 'Discreto, 44 px.' ), d: { shape: 'circle', style: 'solid', size: 44, label: false } },
	{ id: 'light', name: __( 'Claro' ), hint: __( 'Blanco con borde fino.' ), d: { shape: 'circle', style: 'light', size: 52, label: false } },
	{ id: 'light-label', name: __( 'Claro con texto' ), hint: __( 'Píldora blanca con «Menú».' ), d: { shape: 'circle', style: 'light', size: 52, label: true } },
	{ id: 'glass', name: __( 'Vidrio' ), hint: __( 'Translúcido con desenfoque.' ), d: { shape: 'circle', style: 'glass', size: 52, label: false } },
];

/**
 * Diseño del botón flotante: galería de plantillas (con la posición, el icono y los colores
 * actuales), forma, estilo y colores de un clic.
 */
function FabDesign( { profile }: { profile: Profile } ) {
	const t = profile.trigger;
	const tk = profile.design.tokens;
	const appBar = profile.app_bar.enabled;
	const barOpens = profile.bottom_bar.enabled && profile.bottom_bar.items.some( ( i ) => i.action === 'drawer' );
	const apply = ( d: FabLook ) => {
		setProfile( [ 'trigger', 'shape' ], d.shape );
		setProfile( [ 'trigger', 'style' ], d.style );
		setProfile( [ 'trigger', 'size' ], d.size );
		setProfile( [ 'trigger', 'label' ], d.label ? t.label || __( 'Menú' ) : '' );
	};
	const palettes: { label: string; bg: string; fg: string }[] = [
		{ label: __( 'Oscuro' ), bg: '#111827', fg: '#ffffff' },
		{ label: __( 'Como la cabecera' ), bg: String( tk.head_bg ?? '#0f172a' ), fg: String( tk.head_fg ?? '#ffffff' ) },
		{ label: __( 'Con el acento' ), bg: String( tk.accent ?? '#f97316' ), fg: String( tk.accent_fg ?? '#ffffff' ) },
	];
	return (
		<div className="imm:flex imm:flex-col imm:gap-3 imm:px-5 imm:py-4">
			{ ( appBar || barOpens ) && (
				<Notice level="info">
					{ appBar
						? __( 'Con la barra superior activa, en celulares el botón flotante no se muestra: la barra ya tiene el botón del menú. En escritorio, donde la barra no se ve, sí (si no es «Solo en celulares» o si en Escritorio pides el botón flotante).' )
						: __( 'La barra inferior ya tiene un acceso que abre el panel: el botón flotante no se muestra en celulares.' ) }
				</Notice>
			) }
			<div>
				<p className="imm:text-[13px] imm:font-medium imm:text-zinc-800">{ __( 'Diseño del botón' ) }</p>
				<p className="imm:text-xs imm:text-zinc-500">{ __( 'Se ven con tu posición, tu icono y tus colores.' ) }</p>
			</div>
			<div className="imm:grid imm:grid-cols-[repeat(auto-fill,minmax(150px,1fr))] imm:gap-3">
				{ FAB_TEMPLATES.map( ( tpl ) => {
					const on = t.shape === tpl.d.shape && t.style === tpl.d.style && t.size === tpl.d.size && ( '' !== t.label ) === tpl.d.label;
					return (
						<button
							key={ tpl.id }
							type="button"
							aria-pressed={ on }
							onClick={ () => apply( tpl.d ) }
							className={ cn( 'imm:flex imm:flex-col imm:gap-2 imm:rounded-xl imm:border imm:p-2 imm:text-left imm:transition', on ? 'imm:border-zinc-900 imm:ring-2 imm:ring-zinc-900/10' : 'imm:border-zinc-200 imm:hover:border-zinc-300' ) }
						>
							<FabMock profile={ profile } look={ tpl.d } />
							<span className="imm:px-1">
								<span className="imm:block imm:text-[13px] imm:font-medium imm:text-zinc-800">{ tpl.name }</span>
								<span className="imm:block imm:text-[11px] imm:leading-snug imm:text-zinc-500">{ tpl.hint }</span>
							</span>
						</button>
					);
				} ) }
			</div>
			<div className="imm:flex imm:flex-wrap imm:items-center imm:gap-x-5 imm:gap-y-2">
				<span className="imm:flex imm:items-center imm:gap-2 imm:text-xs imm:text-zinc-600">
					{ __( 'Forma' ) }
					<Segmented size="sm" value={ t.shape } onChange={ ( v ) => setProfile( [ 'trigger', 'shape' ], v ) } options={ [ { value: 'circle', label: __( 'Redonda' ) }, { value: 'rounded', label: __( 'Cuadrado suave' ) } ] } />
				</span>
				<span className="imm:flex imm:items-center imm:gap-2 imm:text-xs imm:text-zinc-600">
					{ __( 'Estilo' ) }
					<Segmented size="sm" value={ t.style } onChange={ ( v ) => setProfile( [ 'trigger', 'style' ], v ) } options={ [ { value: 'solid', label: __( 'Sólido' ) }, { value: 'light', label: __( 'Claro' ) }, { value: 'glass', label: __( 'Vidrio' ) } ] } />
				</span>
			</div>
			<div className="imm:flex imm:flex-wrap imm:items-center imm:gap-1.5">
				<span className="imm:mr-1 imm:text-xs imm:text-zinc-500">{ t.style === 'light' ? __( 'Colores (el estilo claro usa los del panel):' ) : __( 'Colores:' ) }</span>
				{ palettes.map( ( p ) => (
					<button
						key={ p.label }
						type="button"
						onClick={ () => {
							setProfile( [ 'design', 'tokens', 'fab_bg' ], p.bg );
							setProfile( [ 'design', 'tokens', 'fab_fg' ], p.fg );
						} }
						className="imm:inline-flex imm:items-center imm:gap-1.5 imm:rounded-full imm:border imm:border-zinc-200 imm:bg-white imm:py-1 imm:pr-3 imm:pl-1.5 imm:text-xs imm:font-medium imm:text-zinc-700 imm:hover:bg-zinc-50"
					>
						<span aria-hidden className="imm:size-4 imm:rounded-full imm:border imm:border-black/10" style={ { background: p.bg } } />
						{ p.label }
					</button>
				) ) }
			</div>
		</div>
	);
}

/** Miniatura del botón flotante sobre una página neutra, en su posición. */
function FabMock( { profile, look }: { profile: Profile; look: FabLook } ) {
	const t = profile.trigger;
	const tk = profile.design.tokens;
	const c = ( k: string, f: string ) => String( tk[ k ] ?? f );
	const s = Math.round( look.size * 0.62 );
	const [ v, h ] = t.position.split( '-' ) as [ 'top' | 'bottom', 'left' | 'right' ];
	const style = {
		solid: { background: c( 'fab_bg', '#0f172a' ), color: c( 'fab_fg', '#ffffff' ), boxShadow: '0 4px 12px rgba(0,0,0,.25)' },
		light: { background: c( 'bg', '#ffffff' ), color: c( 'fg', '#18181b' ), boxShadow: `0 0 0 1px ${ c( 'border', '#e5e7eb' ) }, 0 4px 12px rgba(0,0,0,.12)` },
		glass: { background: `color-mix(in srgb, ${ c( 'fab_bg', '#0f172a' ) } 70%, transparent)`, color: c( 'fab_fg', '#ffffff' ), backdropFilter: 'blur(6px)', boxShadow: '0 4px 12px rgba(0,0,0,.2)' },
	}[ look.style ];
	return (
		<MockPage>
			<span
				className="imm:absolute imm:flex imm:items-center imm:justify-center imm:gap-1 imm:text-[9px] imm:font-semibold"
				style={ {
					[ v ]: 8,
					[ h ]: 8,
					height: s,
					minWidth: s,
					padding: look.label ? '0 9px 0 8px' : 0,
					borderRadius: look.shape === 'rounded' ? 10 : 999,
					...style,
				} }
			>
				<IconView name={ t.icon } className="imm:size-3.5" />
				{ look.label && <span>{ t.label || __( 'Menú' ) }</span> }
			</span>
		</MockPage>
	);
}
