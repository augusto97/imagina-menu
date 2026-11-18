import { closestCenter, DndContext, PointerSensor, KeyboardSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { arrayMove, horizontalListSortingStrategy, SortableContext, sortableKeyboardCoordinates, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Plus, Sparkles, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { ColorField } from '@/components/ColorField';
import { IconPicker } from '@/components/IconPicker';
import { IconView } from '@/components/IconView';
import { PageHeader, Row, Section, Segmented, ToggleRow } from '@/components/common';
import { Button } from '@/components/ui/button';
import { Notice } from '@/components/ui/feedback';
import { Input, Select } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { __ } from '@/lib/i18n';
import { makeBottomItem, setProfile, useActiveProfile, useStore } from '@/lib/store';
import type { BottomAction, BottomItem, Profile } from '@/lib/types';
import { cn } from '@/lib/utils';
import { ContrastRow } from './Design';

const ACTIONS: { value: BottomAction; label: string; hint: string; icon: string }[] = [
	{ value: 'link', label: __( 'Enlace' ), hint: __( 'Va a una página.' ), icon: 'house' },
	{ value: 'drawer', label: __( 'Abrir el panel' ), hint: __( 'Abre el menú lateral (ideal para «Categorías»).' ), icon: 'layout-grid' },
	{ value: 'search', label: __( 'Buscar' ), hint: __( 'Abre el buscador a pantalla completa.' ), icon: 'search' },
	{ value: 'cart', label: __( 'Carrito' ), hint: __( 'Página del carrito con contador.' ), icon: 'shopping-cart' },
	{ value: 'account', label: __( 'Cuenta' ), hint: __( 'Mi cuenta o inicio de sesión.' ), icon: 'user' },
	{ value: 'wishlist', label: __( 'Favoritos' ), hint: __( 'Lista de favoritos de YITH o TI Wishlist, con contador.' ), icon: 'heart' },
	{ value: 'whatsapp', label: 'WhatsApp', hint: __( 'Abre un chat con tu número.' ), icon: 'si-whatsapp' },
	{ value: 'phone', label: __( 'Llamar' ), hint: __( 'Marca un teléfono.' ), icon: 'phone' },
	{ value: 'top', label: __( 'Volver arriba' ), hint: __( 'Sube al inicio de la página.' ), icon: 'arrow-up' },
];

const HIDE_ON = [
	{ value: 'checkout', label: __( 'Pago (checkout)' ) },
	{ value: 'cart', label: __( 'Carrito' ) },
	{ value: 'product', label: __( 'Página de producto' ) },
	{ value: 'account', label: __( 'Mi cuenta' ) },
];

export function BottomBarScreen() {
	const profile = useActiveProfile();
	const env = useStore( ( s ) => s.env );
	const [ selected, setSelected ] = useState( 0 );
	const sensors = useSensors( useSensor( PointerSensor, { activationConstraint: { distance: 4 } } ), useSensor( KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates } ) );
	if ( ! profile ) {
		return null;
	}
	const b = profile.bottom_bar;
	const items = b.items;
	const setItems = ( next: BottomItem[] ) => setProfile( [ 'bottom_bar', 'items' ], next );
	const current = items[ Math.min( selected, items.length - 1 ) ];
	const currentIndex = current ? items.indexOf( current ) : -1;

	const onDragEnd = ( e: DragEndEvent ) => {
		if ( e.over && e.active.id !== e.over.id ) {
			const from = items.findIndex( ( i ) => i.id === e.active.id );
			const to = items.findIndex( ( i ) => i.id === e.over!.id );
			setItems( arrayMove( items, from, to ) );
			setSelected( to );
		}
	};

	const suggested = () => {
		const list: Partial<BottomItem>[] = env?.woo
			? [
					{ action: 'link', label: __( 'Inicio' ), icon: 'house', url: '/' },
					{ action: 'drawer', label: __( 'Categorías' ), icon: 'layout-grid' },
					{ action: 'search', label: __( 'Buscar' ), icon: 'search' },
					{ action: 'cart', label: __( 'Carrito' ), icon: 'shopping-cart', badge: 'cart' },
					{ action: 'account', label: __( 'Cuenta' ), icon: 'user' },
			  ]
			: [
					{ action: 'link', label: __( 'Inicio' ), icon: 'house', url: '/' },
					{ action: 'drawer', label: __( 'Menú' ), icon: 'layout-grid' },
					{ action: 'search', label: __( 'Buscar' ), icon: 'search' },
					{ action: 'whatsapp', label: 'WhatsApp', icon: 'si-whatsapp' },
			  ];
		setItems( list.map( ( i ) => makeBottomItem( i ) ) );
		setSelected( 0 );
	};

	return (
		<>
			<PageHeader
				title={ __( 'Barra inferior' ) }
				description={ __( 'La navegación tipo app: siempre a mano del pulgar. Recomendado: 4 o 5 accesos con etiqueta.' ) }
				actions={
					<label className="imm:flex imm:items-center imm:gap-2 imm:rounded-lg imm:border imm:border-zinc-200 imm:bg-white imm:px-3 imm:py-2 imm:text-[13px] imm:font-medium">
						{ __( 'Activar' ) }
						<Switch checked={ b.enabled } onCheckedChange={ ( v ) => setProfile( [ 'bottom_bar', 'enabled' ], v ) } />
					</label>
				}
			/>
			<div className={ cn( 'imm:flex imm:flex-col imm:gap-5', ! b.enabled && 'imm:opacity-60' ) }>
				<div className="imm:rounded-xl imm:border imm:border-zinc-200 imm:bg-gradient-to-b imm:from-zinc-100 imm:to-zinc-50 imm:p-6">
					<p className="imm:mb-3 imm:text-center imm:text-xs imm:text-zinc-500">{ __( 'Arrastra para ordenar · toca para editar' ) }</p>
					<BarMock profile={ profile } selected={ currentIndex } onSelect={ setSelected } sensors={ sensors } onDragEnd={ onDragEnd } />
					<div className="imm:mt-4 imm:flex imm:justify-center imm:gap-2">
						<Button size="sm" variant="outline" disabled={ items.length >= 6 } onClick={ () => {
							setItems( [ ...items, makeBottomItem( { action: 'link', label: __( 'Nuevo' ), icon: 'star' } ) ] );
							setSelected( items.length );
						} }>
							<Plus aria-hidden />
							{ __( 'Añadir acceso' ) }
						</Button>
						<Button size="sm" variant="ghost" onClick={ suggested }>
							<Sparkles aria-hidden />
							{ __( 'Usar la barra sugerida' ) }
						</Button>
					</div>
					{ items.length > 5 && <Notice level="warning" className="imm:mt-3">{ __( 'Más de 5 accesos se ven apretados en celulares pequeños.' ) }</Notice> }
				</div>

				{ current && (
					<Section title={ `${ __( 'Acceso' ) }: ${ current.label || '—' }` }>
						<Row label={ __( 'Acción' ) } hint={ ACTIONS.find( ( a ) => a.value === current.action )?.hint }>
							<Select
								value={ current.action }
								className="imm:w-52"
								onChange={ ( e ) => {
									const action = e.target.value as BottomAction;
									const def = ACTIONS.find( ( a ) => a.value === action );
									setItems( items.map( ( i, j ) => ( j === currentIndex ? { ...i, action, icon: i.icon === ACTIONS.find( ( a ) => a.value === i.action )?.icon ? def?.icon ?? i.icon : i.icon, badge: action === 'cart' || action === 'wishlist' ? action : i.badge === 'cart' || i.badge === 'wishlist' ? 'none' : i.badge } : i ) ) );
								} }
							>
								{ ACTIONS.map( ( a ) => (
									<option key={ a.value } value={ a.value } disabled={ ( a.value === 'cart' && ! env?.woo ) || ( a.value === 'wishlist' && ! env?.wishlist ) }>
										{ a.label }
									</option>
								) ) }
							</Select>
						</Row>
						<Row label={ __( 'Etiqueta' ) }>
							<Input value={ current.label } maxLength={ 24 } onChange={ ( e ) => setItems( items.map( ( i, j ) => ( j === currentIndex ? { ...i, label: e.target.value } : i ) ) ) } className="imm:w-52" />
						</Row>
						<Row label={ __( 'Icono' ) }>
							<div className="imm:w-52">
								<IconPicker value={ current.icon } allowEmpty={ false } onChange={ ( v ) => setItems( items.map( ( i, j ) => ( j === currentIndex ? { ...i, icon: v } : i ) ) ) } />
							</div>
						</Row>
						{ ( current.action === 'link' || current.action === 'whatsapp' || current.action === 'phone' ) && (
							<Row label={ current.action === 'link' ? __( 'Enlace' ) : __( 'Número' ) } hint={ current.action === 'link' ? undefined : __( 'Con código de país, solo números.' ) }>
								<Input value={ current.url } placeholder={ current.action === 'link' ? '/ofertas/' : '573001234567' } className="imm:w-52 imm:font-mono imm:text-xs" onChange={ ( e ) => setItems( items.map( ( i, j ) => ( j === currentIndex ? { ...i, url: e.target.value } : i ) ) ) } />
							</Row>
						) }
						<Row label={ __( 'Insignia' ) }>
							<div className="imm:flex imm:items-center imm:gap-2">
								<Select value={ current.badge } className="imm:w-40" onChange={ ( e ) => setItems( items.map( ( i, j ) => ( j === currentIndex ? { ...i, badge: e.target.value as BottomItem[ 'badge' ] } : i ) ) ) }>
									<option value="none">{ __( 'Ninguna' ) }</option>
									<option value="cart">{ __( 'Contador del carrito' ) }</option>
									{ env?.wishlist && <option value="wishlist">{ __( 'Contador de favoritos' ) }</option> }
									<option value="custom">{ __( 'Texto fijo' ) }</option>
								</Select>
								{ current.badge === 'custom' && <Input value={ current.badge_text } maxLength={ 6 } placeholder="2x1" className="imm:w-20" onChange={ ( e ) => setItems( items.map( ( i, j ) => ( j === currentIndex ? { ...i, badge_text: e.target.value } : i ) ) ) } /> }
							</div>
						</Row>
						<ToggleRow label={ __( 'Botón central destacado' ) } hint={ __( 'Círculo elevado con el color de acento.' ) } checked={ current.prominent } onChange={ ( v ) => setItems( items.map( ( i, j ) => ( j === currentIndex ? { ...i, prominent: v } : { ...i, prominent: v ? false : i.prominent } ) ) ) } />
						<div className="imm:px-5 imm:py-3">
							<Button size="sm" variant="ghost" className="imm:text-red-600 imm:hover:bg-red-50" onClick={ () => {
								setItems( items.filter( ( _, j ) => j !== currentIndex ) );
								setSelected( Math.max( 0, currentIndex - 1 ) );
							} }>
								<Trash2 aria-hidden />
								{ __( 'Quitar este acceso' ) }
							</Button>
						</div>
					</Section>
				) }

				<Section title={ __( 'Estilo y comportamiento' ) }>
					<Row label={ __( 'Forma' ) }>
						<Segmented value={ b.shape } onChange={ ( v ) => setProfile( [ 'bottom_bar', 'shape' ], v ) } options={ [ { value: 'bar', label: __( 'Barra completa' ) }, { value: 'floating', label: __( 'Isla flotante' ) } ] } />
					</Row>
					<Row label={ __( 'Etiquetas' ) }>
						<Segmented value={ b.style } onChange={ ( v ) => setProfile( [ 'bottom_bar', 'style' ], v ) } options={ [ { value: 'labels', label: __( 'Siempre' ) }, { value: 'active_label', label: __( 'Solo el activo' ) }, { value: 'icons', label: __( 'Solo iconos' ) } ] } />
					</Row>
					<Row label={ __( 'Indicador del activo' ) }>
						<Segmented value={ b.indicator } onChange={ ( v ) => setProfile( [ 'bottom_bar', 'indicator' ], v ) } options={ [ { value: 'pill', label: __( 'Píldora' ) }, { value: 'line', label: __( 'Línea' ) }, { value: 'dot', label: __( 'Punto' ) }, { value: 'color', label: __( 'Color' ) } ] } />
					</Row>
					<ToggleRow label={ __( 'Ocultar al bajar' ) } hint={ __( 'Deja más pantalla para el contenido; reaparece al subir.' ) } checked={ b.hide_on_scroll } onChange={ ( v ) => setProfile( [ 'bottom_bar', 'hide_on_scroll' ], v ) } />
					<ToggleRow label={ __( 'Fondo translúcido' ) } hint={ __( 'Desenfoque detrás de la barra. Cuesta un poco más en celulares de gama baja.' ) } checked={ b.blur } onChange={ ( v ) => setProfile( [ 'bottom_bar', 'blur' ], v ) } />
					<Row label={ __( 'Ocultar en' ) } hint={ __( 'En el pago la barra distrae y tapa el botón de comprar.' ) } stacked>
						<div className="imm:flex imm:flex-wrap imm:gap-2">
							{ HIDE_ON.map( ( h ) => {
								const on = b.hide_on.includes( h.value );
								return (
									<button
										key={ h.value }
										type="button"
										aria-pressed={ on }
										onClick={ () => setProfile( [ 'bottom_bar', 'hide_on' ], on ? b.hide_on.filter( ( v ) => v !== h.value ) : [ ...b.hide_on, h.value ] ) }
										className={ cn( 'imm:rounded-full imm:border imm:px-3 imm:py-1 imm:text-xs imm:font-medium', on ? 'imm:border-zinc-900 imm:bg-zinc-900 imm:text-white' : 'imm:border-zinc-200 imm:bg-white imm:text-zinc-700 imm:hover:bg-zinc-50' ) }
									>
										{ h.label }
									</button>
								);
							} ) }
						</div>
					</Row>
				</Section>

				<Section title={ __( 'Contador' ) } description={ __( 'El número del carrito y de favoritos (y las insignias de texto fijo) en esta barra.' ) }>
					<ToggleRow
						label={ __( 'Colores propios' ) }
						hint={ b.badge_custom ? __( 'Los mismos en modo claro y oscuro.' ) : __( 'Apagado: los colores de las insignias (Diseño → Acento e insignias), los mismos del panel.' ) }
						checked={ b.badge_custom }
						onChange={ ( v ) => {
							if ( v ) {
								// Parte de los colores actuales: nada cambia hasta que se edite.
								setProfile( [ 'bottom_bar', 'badge_bg' ], String( profile.design.tokens.badge_bg ?? b.badge_bg ) );
								setProfile( [ 'bottom_bar', 'badge_fg' ], String( profile.design.tokens.badge_fg ?? b.badge_fg ) );
							}
							setProfile( [ 'bottom_bar', 'badge_custom' ], v );
						} }
					/>
					{ b.badge_custom && (
						<div className="imm:flex imm:flex-col imm:gap-3 imm:px-5 imm:py-4">
							<div className="imm:grid imm:gap-3 imm:sm:grid-cols-2">
								<ColorField label={ __( 'Fondo' ) } value={ b.badge_bg } onChange={ ( v ) => setProfile( [ 'bottom_bar', 'badge_bg' ], v ) } />
								<ColorField label={ __( 'Número' ) } value={ b.badge_fg } onChange={ ( v ) => setProfile( [ 'bottom_bar', 'badge_fg' ], v ) } />
							</div>
							<ContrastRow label={ __( 'Número sobre el fondo (WCAG AA pide 4,5:1)' ) } fg={ b.badge_fg } bg={ b.badge_bg } />
						</div>
					) }
				</Section>
			</div>
		</>
	);
}

function BarMock( { profile, selected, onSelect, sensors, onDragEnd }: { profile: Profile; selected: number; onSelect: ( i: number ) => void; sensors: ReturnType<typeof useSensors>; onDragEnd: ( e: DragEndEvent ) => void } ) {
	const b = profile.bottom_bar;
	const t = profile.design.tokens;
	const floating = b.shape === 'floating';
	return (
		<div className="imm:mx-auto imm:max-w-[420px]">
			<DndContext sensors={ sensors } collisionDetection={ closestCenter } onDragEnd={ onDragEnd }>
				<SortableContext items={ b.items.map( ( i ) => i.id ) } strategy={ horizontalListSortingStrategy }>
					<ul
						className={ cn( 'imm:flex imm:items-stretch imm:justify-around imm:px-1.5 imm:py-1.5', floating ? 'imm:rounded-2xl imm:shadow-lg' : 'imm:rounded-t-xl imm:border-t imm:shadow-[0_-1px_8px_rgba(0,0,0,.06)]' ) }
						style={ { background: String( t.bbar_bg ), color: String( t.bbar_fg ), borderColor: String( t.border ) } }
					>
						{ b.items.map( ( item, i ) => (
							<MockItem key={ item.id } item={ item } index={ i } active={ i === 0 } selected={ i === selected } onSelect={ onSelect } profile={ profile } />
						) ) }
						{ ! b.items.length && <li className="imm:py-4 imm:text-xs">{ __( 'Sin accesos' ) }</li> }
					</ul>
				</SortableContext>
			</DndContext>
		</div>
	);
}

function MockItem( { item, index, active, selected, onSelect, profile }: { item: BottomItem; index: number; active: boolean; selected: boolean; onSelect: ( i: number ) => void; profile: Profile } ) {
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable( { id: item.id } );
	const t = profile.design.tokens;
	const b = profile.bottom_bar;
	const showLabel = b.style === 'labels' || ( b.style === 'active_label' && active );
	return (
		<li ref={ setNodeRef } style={ { transform: CSS.Translate.toString( transform ), transition } } className={ cn( 'imm:flex-1', isDragging && 'imm:z-10 imm:opacity-70' ) }>
			<button
				type="button"
				{ ...attributes }
				{ ...listeners }
				onClick={ () => onSelect( index ) }
				className={ cn( 'imm:relative imm:flex imm:w-full imm:cursor-grab imm:flex-col imm:items-center imm:gap-0.5 imm:rounded-lg imm:px-1 imm:py-1.5 imm:outline-offset-2', selected && 'imm:outline-2 imm:outline-dashed imm:outline-zinc-400' ) }
				style={ { color: active ? String( t.bbar_active ) : undefined } }
			>
				{ item.prominent ? (
					<span className="imm:-mt-5 imm:flex imm:size-12 imm:items-center imm:justify-center imm:rounded-full imm:shadow-md" style={ { background: String( t.accent ), color: String( t.accent_fg ) } }>
						<IconView name={ item.icon } className="imm:size-5" />
					</span>
				) : (
					<span
						className={ cn( 'imm:relative imm:flex imm:h-7 imm:items-center imm:justify-center imm:rounded-full', active && b.indicator === 'pill' ? 'imm:w-14' : 'imm:w-8' ) }
						style={ { background: active && b.indicator === 'pill' ? String( t.bbar_active_bg ) : undefined } }
					>
						<IconView name={ item.icon } className="imm:size-5" />
						{ item.badge !== 'none' && (
							<span className="imm:absolute imm:-top-1 imm:right-0 imm:min-w-4 imm:rounded-full imm:px-1 imm:text-center imm:text-[10px] imm:leading-4 imm:font-bold" style={ { background: b.badge_custom ? b.badge_bg : String( t.badge_bg ), color: b.badge_custom ? b.badge_fg : String( t.badge_fg ) } }>
								{ item.badge === 'cart' || item.badge === 'wishlist' ? '2' : item.badge_text || '•' }
							</span>
						) }
					</span>
				) }
				{ showLabel && <span className="imm:max-w-full imm:truncate imm:text-[11px] imm:font-medium">{ item.label }</span> }
				{ active && b.indicator === 'line' && <span className="imm:absolute imm:top-0 imm:h-0.5 imm:w-6 imm:rounded-full" style={ { background: String( t.bbar_active ) } } /> }
				{ active && b.indicator === 'dot' && <span className="imm:size-1 imm:rounded-full" style={ { background: String( t.bbar_active ) } } /> }
			</button>
		</li>
	);
}
