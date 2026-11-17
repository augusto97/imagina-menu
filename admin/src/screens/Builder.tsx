import { Database, FileSearch, Heading, Link, ListPlus, Minus, MousePointerClick, Plus, ShoppingBag } from 'lucide-react';
import { useState } from 'react';
import { Empty, PageHeader } from '@/components/common';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { __ } from '@/lib/i18n';
import { useRouter } from '@/lib/router';
import { makeItem, newId, useActiveMenu, useStore } from '@/lib/store';
import type { MenuItem, SearchResult } from '@/lib/types';
import { ItemEditor } from './builder/ItemEditor';
import { ObjectSearch } from './builder/ObjectSearch';
import { Tree, type TreeActions } from './builder/Tree';
import { cloneWithIds, countItems, findItem, indent, insertAfter, moveItem, outdent, removeItem, shift, updateItem } from './builder/tree';

export function Builder() {
	const menus = useStore( ( s ) => s.menus );
	const profiles = useStore( ( s ) => s.profiles );
	const env = useStore( ( s ) => s.env );
	const selected = useStore( ( s ) => s.selectedItemId );
	const menu = useActiveMenu();
	const go = useRouter( ( s ) => s.go );
	const [ adding, setAdding ] = useState( false );
	const [ searching, setSearching ] = useState( false );

	if ( ! menu ) {
		return (
			<>
				<PageHeader title={ __( 'Constructor' ) } />
				<Empty icon={ <ListPlus /> } title={ __( 'No hay menús todavía' ) }>
					<Button className="imm:mt-3" onClick={ () => go( 'menus' ) }>
						{ __( 'Crear un menú' ) }
					</Button>
				</Empty>
			</>
		);
	}

	const update = ( fn: ( items: MenuItem[] ) => MenuItem[] ) => useStore.getState().updateMenu( menu.id, ( m ) => ( { ...m, items: fn( m.items ) } ) );
	const select = ( id: string ) => useStore.getState().selectItem( id );
	const add = ( item: MenuItem ) => {
		update( ( items ) => insertAfter( items, selected, item ) );
		select( item.id );
		setAdding( false );
	};
	const selectedItem = selected ? findItem( menu.items, selected ) : undefined;
	const usedBy = profiles.filter( ( p ) => p.drawer.menu_id === menu.id );

	const actions: TreeActions = {
		onMove: ( a, o, p ) => update( ( items ) => moveItem( items, a, o, p ) ),
		onIndent: ( id ) => update( ( items ) => indent( items, id ) ),
		onOutdent: ( id ) => update( ( items ) => outdent( items, id ) ),
		onShift: ( id, d ) => update( ( items ) => shift( items, id, d ) ),
		onDuplicate: ( id ) => {
			const original = findItem( menu.items, id );
			if ( original ) {
				const copy = cloneWithIds( original, () => newId() );
				update( ( items ) => insertAfter( items, id, copy ) );
				select( copy.id );
			}
		},
		onRemove: ( id ) => {
			update( ( items ) => removeItem( items, id ) );
			if ( selected === id ) {
				select( '' );
			}
		},
		onSelect: select,
	};

	const addOptions = [
		{ icon: Link, label: __( 'Enlace personalizado' ), hint: __( 'Una URL cualquiera' ), run: () => add( makeItem( { label: __( 'Enlace nuevo' ) } ) ) },
		{
			icon: FileSearch,
			label: __( 'Página, producto o categoría' ),
			hint: __( 'Se actualiza si cambia su enlace' ),
			run: () => {
				setAdding( false );
				setSearching( true );
			},
		},
		{ icon: Heading, label: __( 'Encabezado de sección' ), hint: __( 'Título con ítems debajo' ), run: () => add( makeItem( { type: 'heading', label: __( 'Sección' ) } ) ) },
		{ icon: Minus, label: __( 'Divisor' ), hint: __( 'Línea separadora' ), run: () => add( makeItem( { type: 'divider' } ) ) },
		...( env?.woo
			? [
					{
						icon: ShoppingBag,
						label: __( 'Categorías de WooCommerce' ),
						hint: __( 'Dinámico, con imágenes' ),
						run: () => add( makeItem( { type: 'source', source: { ...makeItem().source, kind: 'woo_categories', depth: 3, with_images: true } } ) ),
					},
			  ]
			: [] ),
		{
			icon: Database,
			label: __( 'Menú de WordPress' ),
			hint: __( 'Sincronizado con Apariencia → Menús' ),
			run: () => add( makeItem( { type: 'source', source: { ...makeItem().source, kind: 'wp_menu', menu_id: env?.wp_menus[ 0 ]?.id ?? 0, depth: 3 } } ) ),
		},
	];

	return (
		<>
			<PageHeader
				title={ __( 'Constructor' ) }
				description={ __( 'Arrastra para ordenar; arrastra a la derecha para convertir un ítem en submenú. Los cambios se guardan como borrador y se ven al instante en la vista previa.' ) }
			/>
			<div className="imm:mb-4 imm:flex imm:flex-wrap imm:items-center imm:gap-2">
				<Select value={ menu.id } onChange={ ( e ) => useStore.getState().setActiveMenu( Number( e.target.value ) ) } className="imm:w-60" aria-label={ __( 'Menú' ) }>
					{ menus.map( ( m ) => (
						<option key={ m.id } value={ m.id }>
							{ m.title }
						</option>
					) ) }
				</Select>
				<span className="imm:text-xs imm:text-zinc-500">
					{ countItems( menu.items ) } { __( 'ítems' ) }
				</span>
				{ usedBy.length ? (
					usedBy.map( ( p ) => (
						<Badge key={ p.id } tone="green">
							{ __( 'Usado por' ) } { p.title }
						</Badge>
					) )
				) : (
					<Badge tone="amber">{ __( 'Ningún perfil lo usa' ) }</Badge>
				) }
				<span className="imm:flex-1" />
				<Popover open={ adding } onOpenChange={ setAdding }>
					<PopoverTrigger asChild>
						<Button>
							<Plus aria-hidden />
							{ __( 'Añadir' ) }
						</Button>
					</PopoverTrigger>
					<PopoverContent align="end" className="imm:w-72 imm:p-1.5">
						{ addOptions.map( ( o ) => (
							<button key={ o.label } type="button" onClick={ o.run } className="imm:flex imm:w-full imm:items-center imm:gap-3 imm:rounded-md imm:px-2.5 imm:py-2 imm:text-left imm:hover:bg-zinc-100">
								<span className="imm:flex imm:size-8 imm:items-center imm:justify-center imm:rounded-md imm:bg-zinc-100 imm:text-zinc-700">
									<o.icon className="imm:size-4" aria-hidden />
								</span>
								<span>
									<span className="imm:block imm:text-[13px] imm:font-medium imm:text-zinc-900">{ o.label }</span>
									<span className="imm:block imm:text-[11px] imm:text-zinc-500">{ o.hint }</span>
								</span>
							</button>
						) ) }
					</PopoverContent>
				</Popover>
			</div>

			<div className="imm:grid imm:gap-5 imm:@[620px]:grid-cols-[minmax(0,1fr)_300px]">
				<div>
					{ menu.items.length ? (
						<Tree items={ menu.items } selected={ selected } actions={ actions } />
					) : (
						<Empty icon={ <ListPlus /> } title={ __( 'El menú está vacío' ) }>
							{ __( 'Usa «Añadir» para crear el primer ítem, o agrega las categorías de WooCommerce de un clic.' ) }
						</Empty>
					) }
				</div>
				<aside className="imm:self-start imm:rounded-xl imm:border imm:border-zinc-200 imm:bg-white imm:p-4 imm:shadow-xs imm:@[620px]:sticky imm:@[620px]:top-[92px] imm:@[620px]:max-h-[calc(100vh-120px)] imm:@[620px]:overflow-y-auto">
					{ selectedItem ? (
						<ItemEditor
							key={ selectedItem.id }
							item={ selectedItem }
							onChange={ ( next ) => update( ( items ) => updateItem( items, next.id, () => next ) ) }
							onReplace={ ( generated ) => {
								update( ( items ) => {
									let out = items;
									let ref = selectedItem.id;
									for ( const g of generated ) {
										out = insertAfter( out, ref, g );
										ref = g.id;
									}
									return removeItem( out, selectedItem.id );
								} );
								select( generated[ 0 ]?.id ?? '' );
							} }
						/>
					) : (
						<div className="imm:flex imm:flex-col imm:items-center imm:gap-2 imm:py-10 imm:text-center imm:text-zinc-500">
							<MousePointerClick className="imm:size-6 imm:text-zinc-300" aria-hidden />
							<p className="imm:text-[13px]">{ __( 'Selecciona un ítem para editarlo.' ) }</p>
						</div>
					) }
				</aside>
			</div>

			<ObjectSearch
				open={ searching }
				onOpenChange={ setSearching }
				onPick={ ( r: SearchResult ) =>
					add(
						makeItem( {
							label: r.label,
							url: r.url,
							object: { kind: r.kind, id: r.id, type: r.type },
							image: r.image ? { id: r.image_id ?? 0, url: r.image } : { id: 0, url: '' },
						} )
					)
				}
			/>
		</>
	);
}
