import {
	closestCenter,
	DndContext,
	DragOverlay,
	KeyboardSensor,
	MeasuringStrategy,
	PointerSensor,
	useSensor,
	useSensors,
	type DragEndEvent,
	type DragMoveEvent,
	type DragOverEvent,
	type DragStartEvent,
} from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ArrowDown, ArrowUp, ChevronRight, Copy, Database, GripVertical, IndentDecrease, IndentIncrease, Minus, Trash2, Type } from 'lucide-react';
import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { IconView } from '@/components/IconView';
import { __ } from '@/lib/i18n';
import type { MenuItem } from '@/lib/types';
import { cn } from '@/lib/utils';
import { flatten, INDENT, project, withoutDescendants, type FlatItem } from './tree';

export interface TreeActions {
	onMove: ( activeId: string, overId: string, projection: { depth: number; parentId: string | null } ) => void;
	onIndent: ( id: string ) => void;
	onOutdent: ( id: string ) => void;
	onShift: ( id: string, delta: -1 | 1 ) => void;
	onDuplicate: ( id: string ) => void;
	onRemove: ( id: string ) => void;
	onSelect: ( id: string ) => void;
}

const SOURCE_LABEL: Record<string, string> = {
	woo_categories: __( 'Categorías de WooCommerce' ),
	wp_menu: __( 'Menú de WordPress' ),
	taxonomy: __( 'Taxonomía' ),
};

export function itemTitle( item: MenuItem ): string {
	if ( item.type === 'divider' ) {
		return __( 'Divisor' );
	}
	if ( item.type === 'source' ) {
		return SOURCE_LABEL[ item.source.kind ] ?? __( 'Fuente dinámica' );
	}
	return item.label || __( '(sin etiqueta)' );
}

export function Tree( { items, selected, actions }: { items: MenuItem[]; selected: string; actions: TreeActions } ) {
	const [ collapsed, setCollapsed ] = useState<Set<string>>( new Set() );
	const [ activeId, setActiveId ] = useState<string | null>( null );
	const [ overId, setOverId ] = useState<string | null>( null );
	const [ offsetX, setOffsetX ] = useState( 0 );

	const flat = useMemo( () => {
		const all = flatten( items, null, 0, collapsed );
		return activeId ? withoutDescendants( all, activeId ) : all;
	}, [ items, collapsed, activeId ] );

	const projection = activeId && overId ? project( flat, activeId, overId, offsetX ) : null;
	const sensors = useSensors( useSensor( PointerSensor, { activationConstraint: { distance: 4 } } ), useSensor( KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates } ) );
	const active = activeId ? flat.find( ( f ) => f.id === activeId ) : null;

	const reset = () => {
		setActiveId( null );
		setOverId( null );
		setOffsetX( 0 );
	};

	return (
		<DndContext
			sensors={ sensors }
			collisionDetection={ closestCenter }
			measuring={ { droppable: { strategy: MeasuringStrategy.Always } } }
			onDragStart={ ( e: DragStartEvent ) => {
				setActiveId( String( e.active.id ) );
				setOverId( String( e.active.id ) );
			} }
			onDragMove={ ( e: DragMoveEvent ) => setOffsetX( e.delta.x ) }
			onDragOver={ ( e: DragOverEvent ) => setOverId( e.over ? String( e.over.id ) : null ) }
			onDragEnd={ ( e: DragEndEvent ) => {
				if ( projection && e.over ) {
					actions.onMove( String( e.active.id ), String( e.over.id ), projection );
				}
				reset();
			} }
			onDragCancel={ reset }
		>
			<SortableContext items={ flat.map( ( f ) => f.id ) } strategy={ verticalListSortingStrategy }>
				<ul className="imm:flex imm:flex-col imm:gap-1" role="tree" aria-label={ __( 'Ítems del menú' ) }>
					{ flat.map( ( f ) => (
						<Row
							key={ f.id }
							entry={ f }
							depth={ f.id === activeId && projection ? projection.depth : f.depth }
							selected={ selected === f.id }
							collapsed={ collapsed.has( f.id ) }
							onToggle={ () =>
								setCollapsed( ( prev ) => {
									const next = new Set( prev );
									if ( next.has( f.id ) ) {
										next.delete( f.id );
									} else {
										next.add( f.id );
									}
									return next;
								} )
							}
							actions={ actions }
						/>
					) ) }
				</ul>
			</SortableContext>
			{ createPortal(
				<DragOverlay dropAnimation={ null }>
					{ active ? (
						<div className="imm-root">
							<RowBody entry={ active } overlay />
						</div>
					) : null }
				</DragOverlay>,
				document.body
			) }
		</DndContext>
	);
}

function Row( { entry, depth, selected, collapsed, onToggle, actions }: { entry: FlatItem; depth: number; selected: boolean; collapsed: boolean; onToggle: () => void; actions: TreeActions } ) {
	const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable( { id: entry.id } );
	return (
		<li
			ref={ setNodeRef }
			role="treeitem"
			aria-selected={ selected }
			aria-level={ depth + 1 }
			style={ { transform: CSS.Translate.toString( transform ), transition, paddingLeft: depth * INDENT } }
			className={ cn( 'imm:relative', isDragging && 'imm:opacity-40' ) }
		>
			<RowBody
				entry={ entry }
				selected={ selected }
				collapsed={ collapsed }
				onToggle={ onToggle }
				actions={ actions }
				handle={
					<button
						type="button"
						ref={ setActivatorNodeRef }
						{ ...attributes }
						{ ...listeners }
						aria-label={ __( 'Arrastrar para mover' ) }
						className="imm:flex imm:h-8 imm:w-5 imm:shrink-0 imm:cursor-grab imm:items-center imm:justify-center imm:rounded imm:text-zinc-400 imm:hover:text-zinc-700 imm:active:cursor-grabbing"
					>
						<GripVertical className="imm:size-4" aria-hidden />
					</button>
				}
			/>
		</li>
	);
}

function RowBody( {
	entry,
	selected = false,
	collapsed = false,
	onToggle,
	actions,
	handle,
	overlay = false,
}: {
	entry: FlatItem;
	selected?: boolean;
	collapsed?: boolean;
	onToggle?: () => void;
	actions?: TreeActions;
	handle?: React.ReactNode;
	overlay?: boolean;
} ) {
	const { item } = entry;
	const hasChildren = item.children.length > 0;
	const heading = item.type === 'heading';
	const source = item.type === 'source';
	const divider = item.type === 'divider';

	return (
		<div
			onClick={ () => actions?.onSelect( item.id ) }
			className={ cn(
				'imm:group imm:relative imm:flex imm:min-h-11 imm:cursor-pointer imm:items-center imm:gap-1.5 imm:rounded-lg imm:border imm:bg-white imm:pr-1.5 imm:pl-1 imm:transition-colors',
				selected ? 'imm:border-zinc-900 imm:ring-1 imm:ring-zinc-900' : 'imm:border-zinc-200 imm:hover:border-zinc-300',
				heading && ! selected && 'imm:bg-zinc-50',
				source && ! selected && 'imm:border-dashed imm:border-violet-300 imm:bg-violet-50/50',
				overlay && 'imm:shadow-xl imm:ring-1 imm:ring-zinc-900'
			) }
		>
			{ handle ?? <span className="imm:w-5" /> }
			<button
				type="button"
				onClick={ ( e ) => {
					e.stopPropagation();
					onToggle?.();
				} }
				aria-label={ collapsed ? __( 'Expandir' ) : __( 'Contraer' ) }
				aria-expanded={ hasChildren ? ! collapsed : undefined }
				className={ cn( 'imm:flex imm:size-5 imm:shrink-0 imm:items-center imm:justify-center imm:rounded imm:text-zinc-400 imm:hover:bg-zinc-100', ! hasChildren && 'imm:invisible' ) }
			>
				<ChevronRight className={ cn( 'imm:size-3.5 imm:transition-transform', ! collapsed && 'imm:rotate-90' ) } aria-hidden />
			</button>
			<span className={ cn( 'imm:flex imm:size-7 imm:shrink-0 imm:items-center imm:justify-center imm:overflow-hidden imm:rounded-md', source ? 'imm:bg-violet-100 imm:text-violet-700' : 'imm:bg-zinc-100 imm:text-zinc-600' ) }>
				{ source ? (
					<Database className="imm:size-3.5" aria-hidden />
				) : divider ? (
					<Minus className="imm:size-3.5" aria-hidden />
				) : heading ? (
					<Type className="imm:size-3.5" aria-hidden />
				) : item.image.url ? (
					<img src={ item.image.url } alt="" className="imm:size-full imm:object-cover" />
				) : item.icon ? (
					<IconView name={ item.icon } className="imm:size-3.5" />
				) : (
					<span className="imm:size-1.5 imm:rounded-full imm:bg-zinc-400" />
				) }
			</span>
			<span className="imm:min-w-0 imm:flex-1 imm:py-1.5">
				<span className={ cn( 'imm:block imm:truncate imm:text-[13px]', heading ? 'imm:text-[11px] imm:font-semibold imm:tracking-wide imm:text-zinc-500 imm:uppercase' : 'imm:font-medium imm:text-zinc-900', divider && 'imm:text-zinc-400' ) }>
					{ itemTitle( item ) }
				</span>
				{ ! heading && ! divider && (
					<span className="imm:block imm:truncate imm:text-[11px] imm:text-zinc-400">
						{ source
							? item.source.kind === 'wp_menu'
								? __( 'Se sincroniza con el menú elegido' )
								: `${ __( 'Profundidad' ) } ${ item.source.depth } · ${ item.source.with_images ? __( 'con imágenes' ) : __( 'sin imágenes' ) }`
							: item.object.kind
							? `${ item.object.type } #${ item.object.id }`
							: item.url.replace( /^https?:\/\/[^/]+/, '' ) || __( 'Sin enlace' ) }
					</span>
				) }
			</span>
			{ item.badge.text && <span className="imm:rounded-full imm:bg-rose-500 imm:px-1.5 imm:py-0.5 imm:text-[10px] imm:font-semibold imm:text-white">{ item.badge.text }</span> }
			{ item.highlight && <span className="imm:size-1.5 imm:rounded-full imm:bg-orange-500" title={ __( 'Destacado' ) } /> }
			{ item.visibility !== 'any' && <span className="imm:rounded imm:bg-sky-50 imm:px-1.5 imm:py-0.5 imm:text-[10px] imm:font-medium imm:text-sky-700">{ item.visibility === 'logged_in' ? __( 'Conectados' ) : __( 'Visitantes' ) }</span> }
			{ hasChildren && <span className="imm:text-[11px] imm:text-zinc-400 imm:tabular-nums">{ item.children.length }</span> }
			{ actions && (
				<span className="imm:absolute imm:top-1/2 imm:right-1.5 imm:hidden imm:-translate-y-1/2 imm:items-center imm:rounded-md imm:border imm:border-zinc-200 imm:bg-white imm:p-0.5 imm:shadow-sm imm:group-hover:flex imm:group-focus-within:flex" onClick={ ( e ) => e.stopPropagation() }>
					<IconButton label={ __( 'Subir' ) } onClick={ () => actions.onShift( item.id, -1 ) }>
						<ArrowUp aria-hidden />
					</IconButton>
					<IconButton label={ __( 'Bajar' ) } onClick={ () => actions.onShift( item.id, 1 ) }>
						<ArrowDown aria-hidden />
					</IconButton>
					<IconButton label={ __( 'Quitar sangría' ) } onClick={ () => actions.onOutdent( item.id ) } disabled={ entry.depth === 0 }>
						<IndentDecrease aria-hidden />
					</IconButton>
					<IconButton label={ __( 'Sangrar (convertir en hijo del anterior)' ) } onClick={ () => actions.onIndent( item.id ) }>
						<IndentIncrease aria-hidden />
					</IconButton>
					<IconButton label={ __( 'Duplicar' ) } onClick={ () => actions.onDuplicate( item.id ) }>
						<Copy aria-hidden />
					</IconButton>
					<IconButton label={ __( 'Eliminar' ) } onClick={ () => actions.onRemove( item.id ) } danger>
						<Trash2 aria-hidden />
					</IconButton>
				</span>
			) }
		</div>
	);
}

function IconButton( { label, onClick, children, disabled, danger }: { label: string; onClick: () => void; children: React.ReactNode; disabled?: boolean; danger?: boolean } ) {
	return (
		<button
			type="button"
			title={ label }
			aria-label={ label }
			disabled={ disabled }
			onClick={ onClick }
			className={ cn( 'imm:flex imm:size-7 imm:items-center imm:justify-center imm:rounded-md imm:text-zinc-500 imm:hover:bg-zinc-100 imm:hover:text-zinc-900 imm:disabled:opacity-30 imm:[&_svg]:size-3.5', danger && 'imm:hover:bg-red-50 imm:hover:text-red-600' ) }
		>
			{ children }
		</button>
	);
}
