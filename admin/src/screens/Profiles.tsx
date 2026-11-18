import { closestCenter, DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ArrowRight, ChevronDown, Filter, GripVertical, Loader2, Plus, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { DateRange, PageHeader, Segmented } from '@/components/common';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/dialog';
import { Notice } from '@/components/ui/feedback';
import { Input, Select } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { api } from '@/lib/api';
import { __ } from '@/lib/i18n';
import { useRouter } from '@/lib/router';
import { useStore } from '@/lib/store';
import type { Env, Profile, ProfileRules, RuleCondition, RuleType } from '@/lib/types';
import { cn } from '@/lib/utils';
import { ObjectSearch } from './builder/ObjectSearch';

/** Tipos de condición: etiqueta, qué pide y cómo se lee en el resumen. */
const TYPES: { value: RuleType; label: string; needs: 'none' | 'ids' | 'post_type' | 'term' | 'woo' | 'text' | 'role' | 'language' | 'date'; hint: string }[] = [
	{ value: 'front_page', label: __( 'Portada' ), needs: 'none', hint: __( 'La página de inicio del sitio.' ) },
	{ value: 'blog', label: __( 'Blog' ), needs: 'none', hint: __( 'Página de entradas y archivos del blog.' ) },
	{ value: 'page', label: __( 'Páginas concretas' ), needs: 'ids', hint: __( 'Páginas, entradas o productos que elijas.' ) },
	{ value: 'post_type', label: __( 'Tipo de contenido' ), needs: 'post_type', hint: __( 'Cada elemento y el archivo de ese tipo.' ) },
	{ value: 'term', label: __( 'Categoría o etiqueta' ), needs: 'term', hint: __( 'El archivo del término y el contenido que lo tiene.' ) },
	{ value: 'woo', label: 'WooCommerce', needs: 'woo', hint: __( 'Páginas de la tienda.' ) },
	{ value: 'url', label: __( 'La URL contiene' ), needs: 'text', hint: __( 'Texto dentro de la ruta, por ejemplo /blog/.' ) },
	{ value: 'logged_in', label: __( 'Usuario conectado' ), needs: 'none', hint: __( 'Visitantes con sesión iniciada.' ) },
	{ value: 'logged_out', label: __( 'Visitante sin sesión' ), needs: 'none', hint: __( 'Visitantes anónimos.' ) },
	{ value: 'role', label: __( 'Rol del usuario' ), needs: 'role', hint: __( 'Por ejemplo cliente o mayorista.' ) },
	{ value: 'language', label: __( 'Idioma' ), needs: 'language', hint: __( 'Con WPML, Polylang o TranslatePress.' ) },
	{ value: 'date', label: __( 'Fechas (campaña)' ), needs: 'date', hint: __( 'Entre dos fechas, en la hora del sitio: Hot Sale, CyberLunes, Black Friday…' ) },
];

const WOO = [
	{ value: 'any', label: __( 'Cualquier página de la tienda' ) },
	{ value: 'shop', label: __( 'Tienda' ) },
	{ value: 'product', label: __( 'Producto' ) },
	{ value: 'cart', label: __( 'Carrito' ) },
	{ value: 'checkout', label: __( 'Pago (checkout)' ) },
	{ value: 'account', label: __( 'Mi cuenta' ) },
];

/** Etiquetas de los objetos elegidos en esta sesión (el servidor solo guarda los ids). */
const labelCache = new Map<string, string>();

function typeInfo( type: RuleType ) {
	return TYPES.find( ( t ) => t.value === type ) ?? ( TYPES[ 0 ] as ( typeof TYPES )[ number ] );
}

function defaultCondition( type: RuleType, env: Env | null ): RuleCondition {
	const value =
		type === 'date' ? today() + 'T00:00|' : type === 'woo' ? 'any' : type === 'post_type' ? env?.post_types?.[ 0 ]?.slug ?? 'post' : type === 'term' ? env?.taxonomies?.[ 0 ]?.slug ?? 'category' : type === 'role' ? env?.roles?.[ 0 ]?.slug ?? '' : type === 'language' ? env?.languages?.[ 0 ]?.code ?? '' : '';
	return { type, not: false, value, ids: [] };
}

/** Hoy en la hora del navegador («2026-11-27»), para la primera fecha de una campaña. */
function today(): string {
	const d = new Date();
	return `${ d.getFullYear() }-${ String( d.getMonth() + 1 ).padStart( 2, '0' ) }-${ String( d.getDate() ).padStart( 2, '0' ) }`;
}

/** «27/11/2026 00:00» para mostrar una fecha guardada. */
export function formatWhen( value: string ): string {
	const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}:\d{2})$/.exec( value );
	return m ? `${ m[ 3 ] }/${ m[ 2 ] }/${ m[ 1 ] } ${ m[ 4 ] }` : '';
}

/** Resumen legible de una condición: «es Portada», «no es WooCommerce: Carrito». */
function describe( c: RuleCondition, env: Env | null ): string {
	const info = typeInfo( c.type );
	const find = ( list: { slug: string; label: string }[] | undefined ) => list?.find( ( x ) => x.slug === c.value )?.label ?? c.value;
	let detail = '';
	switch ( info.needs ) {
		case 'ids':
			detail = c.ids.map( ( id ) => labelCache.get( 'post:' + id ) ?? '#' + id ).join( ', ' ) || '—';
			break;
		case 'post_type':
			detail = find( env?.post_types );
			break;
		case 'term':
			detail = find( env?.taxonomies ) + ( c.ids.length ? ': ' + c.ids.map( ( id ) => labelCache.get( 'term:' + id ) ?? '#' + id ).join( ', ' ) : '' );
			break;
		case 'woo':
			detail = WOO.find( ( w ) => w.value === c.value )?.label ?? c.value;
			break;
		case 'text':
			detail = c.value ? `«${ c.value }»` : '—';
			break;
		case 'role':
			detail = find( env?.roles );
			break;
		case 'language':
			detail = env?.languages?.find( ( l ) => l.code === c.value )?.name ?? c.value;
			break;
		case 'date': {
			const [ from = '', to = '' ] = c.value.split( '|' );
			detail = [ from && __( 'desde' ) + ' ' + formatWhen( from ), to && __( 'hasta' ) + ' ' + formatWhen( to ) ].filter( Boolean ).join( ' ' ) || '—';
			break;
		}
	}
	return ( c.not ? __( 'no es' ) + ' ' : '' ) + info.label + ( detail ? ': ' + detail : '' );
}

export function ProfilesScreen() {
	const profiles = useStore( ( s ) => s.profiles );
	const env = useStore( ( s ) => s.env );
	// Nombres que manda el servidor para los ids guardados en las reglas.
	for ( const [ key, label ] of Object.entries( env?.rule_labels ?? {} ) ) {
		if ( ! labelCache.has( key ) ) labelCache.set( key, label );
	}
	const [ title, setTitle ] = useState( '' );
	const [ creating, setCreating ] = useState( false );
	const [ remove, setRemove ] = useState< Profile | null >( null );
	const sensors = useSensors( useSensor( PointerSensor, { activationConstraint: { distance: 4 } } ), useSensor( KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates } ) );

	const conditional = profiles.filter( ( p ) => p.enabled && p.rules.conditions.length );
	const general = profiles.find( ( p ) => p.enabled && ! p.rules.conditions.length );

	const create = async () => {
		setCreating( true );
		try {
			const { profile } = await api<{ profile: Profile }>( 'profiles', 'POST', { title } );
			useStore.getState().addProfile( profile );
			setTitle( '' );
		} finally {
			setCreating( false );
		}
	};

	const onDragEnd = ( e: DragEndEvent ) => {
		if ( ! e.over || e.active.id === e.over.id ) {
			return;
		}
		const ids = profiles.map( ( p ) => p.id );
		const next = arrayMove( ids, ids.indexOf( Number( e.active.id ) ), ids.indexOf( Number( e.over.id ) ) );
		void useStore.getState().reorderProfiles( next );
	};

	return (
		<>
			<PageHeader
				title={ __( 'Perfiles' ) }
				description={ __( 'Un perfil es un menú completo con su diseño: panel, barra inferior y buscador. Con reglas puedes mostrar uno distinto en la tienda, en el blog o para clientes conectados.' ) }
			/>
			<div className="imm:flex imm:flex-col imm:gap-5">
				<div className="imm:rounded-xl imm:border imm:border-zinc-200 imm:bg-white imm:p-5 imm:shadow-xs">
					<h2 className="imm:text-sm imm:font-semibold imm:text-zinc-900">{ __( 'Cómo se elige el perfil en cada página' ) }</h2>
					<ol className="imm:mt-3 imm:grid imm:gap-3 imm:sm:grid-cols-3">
						{ [
							[ '1', __( 'Perfiles con reglas' ), __( 'Se revisan de arriba abajo. Gana el primero cuyas reglas se cumplen.' ) ],
							[ '2', __( 'Perfil general' ), __( 'Si ninguna regla coincide, se usa el primer perfil activo sin reglas.' ) ],
							[ '3', __( 'Sin perfil' ), __( 'Si no hay perfil general, esa página queda con el menú del tema.' ) ],
						].map( ( [ n, t, d ] ) => (
							<li key={ n } className="imm:flex imm:gap-3">
								<span className="imm:flex imm:size-6 imm:shrink-0 imm:items-center imm:justify-center imm:rounded-full imm:bg-zinc-900 imm:text-xs imm:font-semibold imm:text-white">{ n }</span>
								<div>
									<p className="imm:text-[13px] imm:font-medium imm:text-zinc-900">{ t }</p>
									<p className="imm:text-xs imm:leading-relaxed imm:text-zinc-500">{ d }</p>
								</div>
							</li>
						) ) }
					</ol>
					<p className="imm:mt-3 imm:text-xs imm:text-zinc-500">{ __( 'Por eso el orden solo importa entre perfiles con reglas: un perfil general puede estar en cualquier posición.' ) }</p>
				</div>

				{ ! general && <Notice level="warning">{ __( 'No hay ningún perfil general activo: las páginas que no cumplan ninguna regla no mostrarán el menú.' ) }</Notice> }
				{ profiles.filter( ( p ) => p.enabled && ! p.rules.conditions.length ).length > 1 && (
					<Notice level="info">{ __( 'Hay más de un perfil general activo: solo se usa el primero de la lista. Agrégale reglas a los demás o apágalos.' ) }</Notice>
				) }

				<DndContext sensors={ sensors } collisionDetection={ closestCenter } onDragEnd={ onDragEnd }>
					<SortableContext items={ profiles.map( ( p ) => p.id ) } strategy={ verticalListSortingStrategy }>
						<ul className="imm:flex imm:flex-col imm:gap-3">
							{ profiles.map( ( p ) => (
								<ProfileCard
									key={ p.id }
									profile={ p }
									env={ env }
									isGeneral={ p.id === general?.id }
									order={ conditional.findIndex( ( c ) => c.id === p.id ) }
									canDelete={ profiles.length > 1 }
									onDelete={ () => setRemove( p ) }
								/>
							) ) }
						</ul>
					</SortableContext>
				</DndContext>

				<div className="imm:flex imm:gap-2 imm:rounded-xl imm:border imm:border-dashed imm:border-zinc-300 imm:bg-white imm:p-3">
					<Input value={ title } onChange={ ( e ) => setTitle( e.target.value ) } placeholder={ __( 'Nombre del perfil nuevo (por ejemplo «Tienda» o «Blog»)' ) } onKeyDown={ ( e ) => e.key === 'Enter' && title && void create() } />
					<Button onClick={ create } disabled={ ! title || creating }>
						{ creating ? <Loader2 className="imm:animate-spin" aria-hidden /> : <Plus aria-hidden /> }
						{ __( 'Crear perfil' ) }
					</Button>
				</div>
			</div>

			<ConfirmDialog
				open={ !! remove }
				onOpenChange={ ( o ) => ! o && setRemove( null ) }
				title={ __( '¿Eliminar el perfil?' ) }
				description={ remove ? `«${ remove.title }» ${ __( 'se elimina de inmediato (no se puede deshacer).' ) }` : '' }
				confirmLabel={ __( 'Eliminar' ) }
				destructive
				onConfirm={ async () => {
					if ( remove ) {
						await api( `profiles/${ remove.id }`, 'DELETE' );
						useStore.getState().removeProfile( remove.id );
					}
					setRemove( null );
				} }
			/>
		</>
	);
}

function ProfileCard( { profile, env, isGeneral, order, canDelete, onDelete }: { profile: Profile; env: Env | null; isGeneral: boolean; order: number; canDelete: boolean; onDelete: () => void } ) {
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable( { id: profile.id } );
	const activeId = useStore( ( s ) => s.activeProfileId );
	const go = useRouter( ( s ) => s.go );
	const [ open, setOpen ] = useState( profile.rules.conditions.length > 0 );
	const update = ( fn: ( p: Profile ) => Profile ) => useStore.getState().updateProfileById( profile.id, fn );
	const setRules = ( rules: ProfileRules ) => update( ( p ) => ( { ...p, rules } ) );
	const rules = profile.rules;
	const hasRules = rules.conditions.length > 0;

	return (
		<li
			ref={ setNodeRef }
			style={ { transform: CSS.Transform.toString( transform ), transition } }
			className={ cn( 'imm:rounded-xl imm:border imm:bg-white imm:shadow-xs', isDragging ? 'imm:z-10 imm:border-zinc-400 imm:shadow-lg' : 'imm:border-zinc-200', ! profile.enabled && 'imm:opacity-70' ) }
		>
			<div className="imm:flex imm:items-center imm:gap-3 imm:px-3 imm:py-3">
				<button type="button" className="imm:cursor-grab imm:rounded imm:p-1 imm:text-zinc-400 imm:hover:bg-zinc-100 imm:hover:text-zinc-700" aria-label={ __( 'Arrastrar para ordenar' ) } { ...attributes } { ...listeners }>
					<GripVertical className="imm:size-4" aria-hidden />
				</button>
				<Switch checked={ profile.enabled } onCheckedChange={ ( v ) => update( ( p ) => ( { ...p, enabled: v } ) ) } aria-label={ __( 'Activar el perfil' ) } />
				<input
					value={ profile.title }
					onChange={ ( e ) => update( ( p ) => ( { ...p, title: e.target.value } ) ) }
					aria-label={ __( 'Nombre del perfil' ) }
					className="imm:min-w-0 imm:flex-1 imm:rounded-md imm:border imm:border-transparent imm:bg-transparent imm:px-2 imm:py-1 imm:text-sm imm:font-semibold imm:text-zinc-900 imm:hover:border-zinc-200 imm:focus:border-zinc-400 imm:focus:outline-none"
				/>
				<div className="imm:hidden imm:items-center imm:gap-1.5 imm:sm:flex">
					{ ! profile.enabled && <Badge>{ __( 'Apagado' ) }</Badge> }
					{ profile.enabled && hasRules && <Badge tone="blue">{ __( 'Con reglas' ) } · { order + 1 }.º</Badge> }
					{ profile.enabled && ! hasRules && ( isGeneral ? <Badge tone="green">{ __( 'General' ) }</Badge> : <Badge tone="amber">{ __( 'Sin uso' ) }</Badge> ) }
					{ activeId === profile.id && <Badge>{ __( 'Editando' ) }</Badge> }
				</div>
				<Button
					size="sm"
					variant="ghost"
					onClick={ () => {
						useStore.getState().setActiveProfile( profile.id );
						go( 'panel-lateral' );
					} }
				>
					{ __( 'Editar diseño' ) }
					<ArrowRight aria-hidden />
				</Button>
				{ canDelete && (
					<Button size="icon" variant="ghost" onClick={ onDelete } aria-label={ __( 'Eliminar perfil' ) } className="imm:text-zinc-400 imm:hover:bg-red-50 imm:hover:text-red-600">
						<Trash2 aria-hidden />
					</Button>
				) }
			</div>

			<div className="imm:border-t imm:border-zinc-100 imm:px-4 imm:py-3">
				<button type="button" onClick={ () => setOpen( ! open ) } aria-expanded={ open } className="imm:flex imm:w-full imm:items-center imm:gap-2 imm:text-left imm:text-[13px] imm:text-zinc-600">
					<Filter className="imm:size-3.5 imm:text-zinc-400" aria-hidden />
					<span className="imm:min-w-0 imm:flex-1 imm:truncate">
						{ hasRules
							? __( 'Se muestra cuando' ) + ' ' + rules.conditions.map( ( c ) => describe( c, env ) ).join( rules.match === 'all' ? ' ' + __( 'y' ) + ' ' : ' ' + __( 'o' ) + ' ' )
							: __( 'Sin reglas: se muestra en todo el sitio (si es el primer perfil general).' ) }
					</span>
					<span className="imm:shrink-0 imm:font-medium imm:text-zinc-900">{ open ? __( 'Cerrar' ) : hasRules ? __( 'Editar reglas' ) : __( 'Añadir reglas' ) }</span>
					<ChevronDown className={ cn( 'imm:size-3.5 imm:transition-transform', open && 'imm:rotate-180' ) } aria-hidden />
				</button>
				{ open && <RuleBuilder rules={ rules } env={ env } onChange={ setRules } /> }
			</div>
		</li>
	);
}

function RuleBuilder( { rules, env, onChange }: { rules: ProfileRules; env: Env | null; onChange: ( rules: ProfileRules ) => void } ) {
	const setCondition = ( index: number, patch: Partial<RuleCondition> ) => onChange( { ...rules, conditions: rules.conditions.map( ( c, i ) => ( i === index ? { ...c, ...patch } : c ) ) } );
	const types = TYPES.filter( ( t ) => ( t.value !== 'woo' || env?.woo ) && ( t.value !== 'language' || env?.languages?.length ) );

	return (
		<div className="imm:mt-3 imm:flex imm:flex-col imm:gap-3">
			{ rules.conditions.length > 1 && (
				<div className="imm:flex imm:items-center imm:gap-2 imm:text-[13px] imm:text-zinc-600">
					{ __( 'Mostrar este perfil cuando se cumplan' ) }
					<Segmented size="sm" value={ rules.match } onChange={ ( v ) => onChange( { ...rules, match: v } ) } options={ [ { value: 'all', label: __( 'todas' ) }, { value: 'any', label: __( 'cualquiera' ) } ] } />
					{ __( 'las condiciones' ) }
				</div>
			) }
			<ul className="imm:flex imm:flex-col imm:gap-2">
				{ rules.conditions.map( ( c, i ) => (
					<li key={ i } className="imm:flex imm:flex-wrap imm:items-start imm:gap-2 imm:rounded-lg imm:border imm:border-zinc-200 imm:bg-zinc-50 imm:p-2.5">
						{ i > 0 && <span className="imm:mt-2 imm:w-full imm:text-[11px] imm:font-medium imm:tracking-wide imm:text-zinc-400 imm:uppercase imm:sm:w-auto">{ rules.match === 'all' ? __( 'y' ) : __( 'o' ) }</span> }
						<Segmented size="sm" value={ c.not ? 'not' : 'is' } onChange={ ( v ) => setCondition( i, { not: v === 'not' } ) } options={ [ { value: 'is', label: __( 'es' ) }, { value: 'not', label: __( 'no es' ) } ] } />
						<Select value={ c.type } onChange={ ( e ) => setCondition( i, defaultCondition( e.target.value as RuleType, env ) ) } className="imm:h-8 imm:w-48 imm:text-[13px]" aria-label={ __( 'Tipo de condición' ) }>
							{ types.map( ( t ) => (
								<option key={ t.value } value={ t.value }>
									{ t.label }
								</option>
							) ) }
						</Select>
						<div className="imm:min-w-48 imm:flex-1">
							<ConditionValue condition={ c } env={ env } onChange={ ( patch ) => setCondition( i, patch ) } />
						</div>
						<Button size="icon" variant="ghost" aria-label={ __( 'Quitar condición' ) } onClick={ () => onChange( { ...rules, conditions: rules.conditions.filter( ( _, j ) => j !== i ) } ) }>
							<X aria-hidden />
						</Button>
					</li>
				) ) }
			</ul>
			<div>
				<Button size="sm" variant="outline" onClick={ () => onChange( { ...rules, conditions: [ ...rules.conditions, defaultCondition( env?.woo ? 'woo' : 'front_page', env ) ] } ) }>
					<Plus aria-hidden />
					{ __( 'Añadir condición' ) }
				</Button>
			</div>
		</div>
	);
}

function ConditionValue( { condition: c, env, onChange }: { condition: RuleCondition; env: Env | null; onChange: ( patch: Partial<RuleCondition> ) => void } ) {
	const [ picking, setPicking ] = useState( false );
	const info = typeInfo( c.type );
	const small = 'imm:h-8 imm:text-[13px]';

	const chips = ( prefix: 'post' | 'term' ) => (
		<div className="imm:flex imm:flex-wrap imm:items-center imm:gap-1.5">
			{ c.ids.map( ( id ) => (
				<span key={ id } className="imm:inline-flex imm:items-center imm:gap-1 imm:rounded-full imm:border imm:border-zinc-200 imm:bg-white imm:py-0.5 imm:pr-1 imm:pl-2.5 imm:text-xs imm:text-zinc-700">
					{ labelCache.get( `${ prefix }:${ id }` ) ?? `#${ id }` }
					<button type="button" aria-label={ __( 'Quitar' ) } onClick={ () => onChange( { ids: c.ids.filter( ( x ) => x !== id ) } ) } className="imm:rounded-full imm:p-0.5 imm:text-zinc-400 imm:hover:bg-zinc-100 imm:hover:text-zinc-700">
						<X className="imm:size-3" aria-hidden />
					</button>
				</span>
			) ) }
			<Button size="sm" variant="outline" className="imm:h-7" onClick={ () => setPicking( true ) }>
				<Plus aria-hidden />
				{ prefix === 'post' ? __( 'Elegir contenido' ) : __( 'Elegir términos' ) }
			</Button>
			<ObjectSearch
				open={ picking }
				onOpenChange={ setPicking }
				kind={ prefix }
				type={ prefix === 'term' ? c.value : undefined }
				placeholder={ prefix === 'post' ? __( 'Buscar páginas, entradas o productos…' ) : __( 'Buscar términos…' ) }
				onPick={ ( r ) => {
					labelCache.set( `${ prefix }:${ r.id }`, r.label );
					if ( ! c.ids.includes( r.id ) ) {
						onChange( { ids: [ ...c.ids, r.id ] } );
					}
				} }
			/>
			{ prefix === 'term' && ! c.ids.length && <span className="imm:text-xs imm:text-zinc-500">{ __( 'Sin términos: cualquier archivo de esta taxonomía.' ) }</span> }
		</div>
	);

	switch ( info.needs ) {
		case 'ids':
			return chips( 'post' );
		case 'post_type':
			return (
				<Select value={ c.value } onChange={ ( e ) => onChange( { value: e.target.value } ) } className={ small } aria-label={ __( 'Tipo de contenido' ) }>
					{ ( env?.post_types ?? [ { slug: 'post', label: __( 'Entradas' ) }, { slug: 'page', label: __( 'Páginas' ) } ] ).map( ( t ) => (
						<option key={ t.slug } value={ t.slug }>
							{ t.label }
						</option>
					) ) }
				</Select>
			);
		case 'term':
			return (
				<div className="imm:flex imm:flex-col imm:gap-2">
					<Select value={ c.value } onChange={ ( e ) => onChange( { value: e.target.value, ids: [] } ) } className={ small } aria-label={ __( 'Taxonomía' ) }>
						{ ( env?.taxonomies ?? [ { slug: 'category', label: __( 'Categorías' ) } ] ).map( ( t ) => (
							<option key={ t.slug } value={ t.slug }>
								{ t.label }
							</option>
						) ) }
					</Select>
					{ chips( 'term' ) }
				</div>
			);
		case 'woo':
			return (
				<Select value={ c.value } onChange={ ( e ) => onChange( { value: e.target.value } ) } className={ small } aria-label="WooCommerce">
					{ WOO.map( ( w ) => (
						<option key={ w.value } value={ w.value }>
							{ w.label }
						</option>
					) ) }
				</Select>
			);
		case 'text':
			return <Input value={ c.value } onChange={ ( e ) => onChange( { value: e.target.value } ) } placeholder="/blog/" className={ cn( small, 'imm:font-mono' ) } aria-label={ __( 'Texto de la URL' ) } />;
		case 'role':
			return (
				<Select value={ c.value } onChange={ ( e ) => onChange( { value: e.target.value } ) } className={ small } aria-label={ __( 'Rol' ) }>
					{ ( env?.roles ?? [] ).map( ( r ) => (
						<option key={ r.slug } value={ r.slug }>
							{ r.label }
						</option>
					) ) }
				</Select>
			);
		case 'date': {
			const [ from = '', to = '' ] = c.value.split( '|' );
			return (
				<div className="imm:flex imm:flex-col imm:gap-1.5">
					<DateRange from={ from } to={ to } onChange={ ( w ) => onChange( { value: `${ w.from }|${ w.to }` } ) } />
					<span className="imm:text-xs imm:text-zinc-500">{ __( 'Al empezar y al terminar, el menú se actualiza y se vacía la caché solos.' ) }</span>
				</div>
			);
		}
		case 'language':
			return (
				<Select value={ c.value } onChange={ ( e ) => onChange( { value: e.target.value } ) } className={ small } aria-label={ __( 'Idioma' ) }>
					{ ( env?.languages ?? [] ).map( ( l ) => (
						<option key={ l.code } value={ l.code }>
							{ l.name }
						</option>
					) ) }
				</Select>
			);
		default:
			return <p className="imm:py-1.5 imm:text-xs imm:text-zinc-500">{ info.hint }</p>;
	}
}
