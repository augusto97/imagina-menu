import { arrayMove } from '@dnd-kit/sortable';
import type { MenuItem } from '@/lib/types';

/** Ítems que pueden tener hijos (las fuentes y divisores no). */
export function canHaveChildren( item: MenuItem ): boolean {
	return item.type === 'link' || item.type === 'heading';
}

export interface FlatItem {
	id: string;
	parentId: string | null;
	depth: number;
	index: number;
	item: MenuItem;
}

export function flatten( items: MenuItem[], parentId: string | null = null, depth = 0, collapsed: Set<string> = new Set() ): FlatItem[] {
	const out: FlatItem[] = [];
	items.forEach( ( item, index ) => {
		out.push( { id: item.id, parentId, depth, index, item } );
		if ( item.children.length && ! collapsed.has( item.id ) ) {
			out.push( ...flatten( item.children, item.id, depth + 1, collapsed ) );
		}
	} );
	return out;
}

/** Reconstruye el árbol desde la lista plana. Los ítems de `keep` conservan sus hijos originales. */
export function build( flat: FlatItem[], keep: Set<string> = new Set() ): MenuItem[] {
	const root: MenuItem[] = [];
	const nodes = new Map<string, MenuItem>();
	for ( const { item } of flat ) {
		nodes.set( item.id, { ...item, children: [] } );
	}
	for ( const entry of flat ) {
		const node = nodes.get( entry.id )!;
		if ( keep.has( entry.id ) ) {
			node.children = entry.item.children;
		}
		const parent = entry.parentId ? nodes.get( entry.parentId ) : null;
		( parent ? parent.children : root ).push( node );
	}
	return root;
}

function descendants( flat: FlatItem[], id: string ): Set<string> {
	const out = new Set<string>();
	let changed = true;
	out.add( id );
	while ( changed ) {
		changed = false;
		for ( const f of flat ) {
			if ( f.parentId && out.has( f.parentId ) && ! out.has( f.id ) ) {
				out.add( f.id );
				changed = true;
			}
		}
	}
	out.delete( id );
	return out;
}

/** Quita de la lista los descendientes del ítem arrastrado (se mueven con él). */
export function withoutDescendants( flat: FlatItem[], id: string ): FlatItem[] {
	const hidden = descendants( flat, id );
	return flat.filter( ( f ) => ! hidden.has( f.id ) );
}

export const INDENT = 24;
export const MAX_DEPTH = 5;

/**
 * Dónde caería el ítem: posición (overId) y profundidad según cuánto se arrastró en horizontal.
 */
export function project( flat: FlatItem[], activeId: string, overId: string, offsetX: number ): { depth: number; parentId: string | null } | null {
	const overIndex = flat.findIndex( ( f ) => f.id === overId );
	const activeIndex = flat.findIndex( ( f ) => f.id === activeId );
	const active = flat[ activeIndex ];
	if ( ! active || overIndex < 0 ) {
		return null;
	}
	const moved = arrayMove( flat, activeIndex, overIndex );
	const previous = moved[ overIndex - 1 ];
	const next = moved[ overIndex + 1 ];
	const dragDepth = Math.round( offsetX / INDENT );
	const projected = active.depth + dragDepth;
	const maxDepth = previous ? ( canHaveChildren( previous.item ) ? previous.depth + 1 : previous.depth ) : 0;
	const minDepth = next ? next.depth : 0;
	const depth = Math.max( minDepth, Math.min( projected, maxDepth, MAX_DEPTH ) );

	let parentId: string | null = null;
	if ( depth > 0 && previous ) {
		if ( depth === previous.depth ) {
			parentId = previous.parentId;
		} else if ( depth > previous.depth ) {
			parentId = previous.id;
		} else {
			parentId = moved.slice( 0, overIndex ).reverse().find( ( f ) => f.depth === depth )?.parentId ?? null;
		}
	}
	return { depth, parentId };
}

/** Aplica un movimiento de arrastre al árbol. */
export function moveItem( items: MenuItem[], activeId: string, overId: string, projection: { depth: number; parentId: string | null } ): MenuItem[] {
	const flat = flatten( items );
	const activeIndex = flat.findIndex( ( f ) => f.id === activeId );
	const overIndex = flat.findIndex( ( f ) => f.id === overId );
	const active = flat[ activeIndex ];
	if ( ! active || overIndex < 0 ) {
		return items;
	}
	// Al arrastrar, los descendientes del activo viajan dentro de su item.children.
	const hidden = descendants( flat, activeId );
	const visible = flat.filter( ( f ) => ! hidden.has( f.id ) ).map( ( f ) => ( f.id === activeId ? { ...f, depth: projection.depth, parentId: projection.parentId } : f ) );
	const from = visible.findIndex( ( f ) => f.id === activeId );
	const to = visible.findIndex( ( f ) => f.id === overId );
	const sorted = arrayMove( visible, from, to );
	// El activo conserva su subárbol completo.
	return build( sorted, new Set( [ activeId ] ) );
}

export function findItem( items: MenuItem[], id: string ): MenuItem | undefined {
	for ( const item of items ) {
		if ( item.id === id ) {
			return item;
		}
		const found = findItem( item.children, id );
		if ( found ) {
			return found;
		}
	}
	return undefined;
}

export function updateItem( items: MenuItem[], id: string, fn: ( item: MenuItem ) => MenuItem ): MenuItem[] {
	return items.map( ( item ) => ( item.id === id ? fn( item ) : { ...item, children: updateItem( item.children, id, fn ) } ) );
}

export function removeItem( items: MenuItem[], id: string ): MenuItem[] {
	return items.filter( ( item ) => item.id !== id ).map( ( item ) => ( { ...item, children: removeItem( item.children, id ) } ) );
}

/** Inserta después del ítem de referencia (o al final si no hay). */
export function insertAfter( items: MenuItem[], refId: string, item: MenuItem ): MenuItem[] {
	if ( ! refId || ! findItem( items, refId ) ) {
		return [ ...items, item ];
	}
	const walk = ( list: MenuItem[] ): MenuItem[] => {
		const index = list.findIndex( ( i ) => i.id === refId );
		if ( index >= 0 ) {
			const copy = [ ...list ];
			copy.splice( index + 1, 0, item );
			return copy;
		}
		return list.map( ( i ) => ( { ...i, children: walk( i.children ) } ) );
	};
	return walk( items );
}

/** Duplica un ítem (y su subárbol) con ids nuevos. */
export function cloneWithIds( item: MenuItem, makeId: () => string ): MenuItem {
	return { ...item, id: makeId(), children: item.children.map( ( c ) => cloneWithIds( c, makeId ) ) };
}

/** Sangrar: pasa a ser hijo del hermano anterior. */
export function indent( items: MenuItem[], id: string ): MenuItem[] {
	const walk = ( list: MenuItem[] ): MenuItem[] => {
		const index = list.findIndex( ( i ) => i.id === id );
		if ( index > 0 ) {
			const prev = list[ index - 1 ]!;
			if ( ! canHaveChildren( prev ) ) {
				return list;
			}
			const node = list[ index ]!;
			const copy = list.filter( ( _, i ) => i !== index );
			copy[ index - 1 ] = { ...prev, children: [ ...prev.children, node ] };
			return copy;
		}
		if ( index === 0 ) {
			return list;
		}
		return list.map( ( i ) => ( { ...i, children: walk( i.children ) } ) );
	};
	return walk( items );
}

/** Quitar sangría: sube al nivel del padre, justo después de él. */
export function outdent( items: MenuItem[], id: string ): MenuItem[] {
	const walk = ( list: MenuItem[] ): MenuItem[] => {
		for ( let p = 0; p < list.length; p++ ) {
			const parent = list[ p ]!;
			const index = parent.children.findIndex( ( c ) => c.id === id );
			if ( index >= 0 ) {
				const node = parent.children[ index ]!;
				const copy = [ ...list ];
				copy[ p ] = { ...parent, children: parent.children.filter( ( _, i ) => i !== index ) };
				copy.splice( p + 1, 0, node );
				return copy;
			}
		}
		return list.map( ( i ) => ( { ...i, children: walk( i.children ) } ) );
	};
	return walk( items );
}

/** Subir/bajar entre hermanos. */
export function shift( items: MenuItem[], id: string, delta: -1 | 1 ): MenuItem[] {
	const index = items.findIndex( ( i ) => i.id === id );
	if ( index >= 0 ) {
		const target = index + delta;
		return target < 0 || target >= items.length ? items : arrayMove( items, index, target );
	}
	return items.map( ( i ) => ( { ...i, children: shift( i.children, id, delta ) } ) );
}

export function countItems( items: MenuItem[] ): number {
	return items.reduce( ( n, i ) => n + 1 + countItems( i.children ), 0 );
}
