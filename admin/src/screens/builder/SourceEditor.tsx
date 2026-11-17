import { Loader2, Wand2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { api } from '@/lib/api';
import { __ } from '@/lib/i18n';
import { makeItem, useStore } from '@/lib/store';
import type { ItemSource, MenuItem, SourcePreviewItem } from '@/lib/types';
import { Field } from './ItemEditor';

/** Configuración de una fuente dinámica y su vista previa en vivo. */
export function SourceEditor( { item, onChange, onConvert }: { item: MenuItem; onChange: ( source: ItemSource ) => void; onConvert: ( items: MenuItem[] ) => void } ) {
	const env = useStore( ( s ) => s.env );
	const source = item.source;
	const [ preview, setPreview ] = useState<SourcePreviewItem[] | null>( null );
	const [ loading, setLoading ] = useState( false );
	const set = <K extends keyof ItemSource>( key: K, value: ItemSource[ K ] ) => onChange( { ...source, [ key ]: value } );

	useEffect( () => {
		setLoading( true );
		const timer = window.setTimeout( () => {
			api<{ items: SourcePreviewItem[] }>( 'source-preview', 'POST', { source } )
				.then( ( r ) => setPreview( r.items ) )
				.catch( () => setPreview( [] ) )
				.finally( () => setLoading( false ) );
		}, 400 );
		return () => window.clearTimeout( timer );
	}, [ source ] );

	const convert = () => {
		const toItems = ( list: SourcePreviewItem[] ): MenuItem[] => list.map( ( p ) => makeItem( { label: p.label, url: p.url, image: { id: 0, url: p.image }, children: toItems( p.children ) } ) );
		onConvert( toItems( preview ?? [] ) );
	};

	return (
		<div className="imm:flex imm:flex-col imm:gap-4">
			<Field label={ __( 'Origen' ) }>
				<Select value={ source.kind } onChange={ ( e ) => set( 'kind', e.target.value as ItemSource[ 'kind' ] ) }>
					<option value="woo_categories" disabled={ ! env?.woo }>
						{ __( 'Categorías de WooCommerce' ) }
					</option>
					<option value="wp_menu">{ __( 'Menú de WordPress' ) }</option>
					<option value="taxonomy">{ __( 'Taxonomía (categorías, etiquetas…)' ) }</option>
				</Select>
			</Field>
			{ source.kind === 'wp_menu' && (
				<Field label={ __( 'Menú' ) } hint={ __( 'Cuando cambies este menú en Apariencia → Menús, Imagina Menu se actualiza solo.' ) }>
					<Select value={ source.menu_id } onChange={ ( e ) => set( 'menu_id', Number( e.target.value ) ) }>
						<option value={ 0 }>{ __( 'Elige un menú…' ) }</option>
						{ env?.wp_menus.map( ( m ) => (
							<option key={ m.id } value={ m.id }>
								{ m.name } ({ m.count })
							</option>
						) ) }
					</Select>
				</Field>
			) }
			{ source.kind === 'taxonomy' && (
				<Field label={ __( 'Taxonomía' ) } hint={ __( 'Nombre interno: category, post_tag, product_brand…' ) }>
					<Input value={ source.taxonomy } onChange={ ( e ) => set( 'taxonomy', e.target.value ) } />
				</Field>
			) }
			<div className="imm:grid imm:grid-cols-2 imm:gap-3">
				<Field label={ __( 'Niveles' ) }>
					<Select value={ source.depth } onChange={ ( e ) => set( 'depth', Number( e.target.value ) ) }>
						{ [ 1, 2, 3, 4 ].map( ( n ) => (
							<option key={ n } value={ n }>
								{ n }
							</option>
						) ) }
					</Select>
				</Field>
				{ source.kind !== 'wp_menu' && (
					<Field label={ __( 'Máximo por nivel' ) }>
						<Input type="number" min={ 1 } max={ 300 } value={ source.limit } onChange={ ( e ) => set( 'limit', Number( e.target.value ) ) } />
					</Field>
				) }
			</div>
			{ source.kind !== 'wp_menu' && (
				<>
					<Field label={ __( 'Orden' ) }>
						<Select value={ source.orderby } onChange={ ( e ) => set( 'orderby', e.target.value as ItemSource[ 'orderby' ] ) }>
							<option value="menu_order">{ __( 'El orden de WooCommerce / alfabético' ) }</option>
							<option value="name">{ __( 'Alfabético' ) }</option>
							<option value="count">{ __( 'Más productos primero' ) }</option>
						</Select>
					</Field>
					<Field label={ __( 'ID de la categoría padre' ) } hint={ __( '0 = desde la raíz. Úsalo para mostrar solo una rama.' ) }>
						<Input type="number" min={ 0 } value={ source.parent } onChange={ ( e ) => set( 'parent', Number( e.target.value ) ) } />
					</Field>
					<label className="imm:flex imm:items-center imm:justify-between imm:text-[13px] imm:text-zinc-700">
						{ __( 'Ocultar vacías' ) }
						<Switch checked={ source.hide_empty } onCheckedChange={ ( v ) => set( 'hide_empty', v ) } />
					</label>
					<label className="imm:flex imm:items-center imm:justify-between imm:text-[13px] imm:text-zinc-700">
						{ __( 'Con imágenes de categoría' ) }
						<Switch checked={ source.with_images } onCheckedChange={ ( v ) => set( 'with_images', v ) } />
					</label>
				</>
			) }
			<div className="imm:rounded-lg imm:border imm:border-zinc-200 imm:bg-zinc-50">
				<div className="imm:flex imm:items-center imm:justify-between imm:border-b imm:border-zinc-200 imm:px-3 imm:py-2 imm:text-xs imm:font-medium imm:text-zinc-600">
					{ __( 'Así se verá' ) }
					{ loading && <Loader2 className="imm:size-3.5 imm:animate-spin" aria-hidden /> }
				</div>
				<div className="imm:max-h-64 imm:overflow-y-auto imm:p-2">
					{ preview && preview.length ? <PreviewList items={ preview } depth={ 0 } /> : ! loading && <p className="imm:p-2 imm:text-xs imm:text-zinc-500">{ __( 'La fuente no devuelve ítems.' ) }</p> }
				</div>
			</div>
			<Button variant="outline" size="sm" disabled={ ! preview?.length } onClick={ convert }>
				<Wand2 aria-hidden />
				{ __( 'Convertir en ítems editables' ) }
			</Button>
			<p className="imm:-mt-2 imm:text-xs imm:text-zinc-500">{ __( 'Para añadir iconos o insignias a cada categoría. Ojo: los ítems convertidos ya no se actualizan solos.' ) }</p>
		</div>
	);
}

function PreviewList( { items, depth }: { items: SourcePreviewItem[]; depth: number } ) {
	return (
		<ul className="imm:flex imm:flex-col">
			{ items.map( ( p, i ) => (
				<li key={ p.label + i }>
					<div className="imm:flex imm:items-center imm:gap-2 imm:py-1 imm:text-[13px] imm:text-zinc-700" style={ { paddingLeft: depth * 14 } }>
						{ p.image ? <img src={ p.image } alt="" className="imm:size-5 imm:rounded imm:object-cover" /> : <span className="imm:size-1 imm:rounded-full imm:bg-zinc-400" /> }
						<span className="imm:truncate">{ p.label }</span>
						{ p.children.length > 0 && <span className="imm:text-[11px] imm:text-zinc-400">{ p.children.length }</span> }
					</div>
					{ p.children.length > 0 && <PreviewList items={ p.children } depth={ depth + 1 } /> }
				</li>
			) ) }
		</ul>
	);
}
