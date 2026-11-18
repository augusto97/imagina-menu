import { ChevronDown, Link2, Link2Off, Unlink } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { IconPicker } from '@/components/IconPicker';
import { MediaField } from '@/components/MediaField';
import { DateRange, Segmented } from '@/components/common';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { __ } from '@/lib/i18n';
import type { BadgeStyle, MenuItem } from '@/lib/types';
import { cn } from '@/lib/utils';
import { ObjectSearch } from './ObjectSearch';
import { SourceEditor } from './SourceEditor';
import { itemTitle } from './Tree';

export function Field( { label, hint, children, className }: { label: string; hint?: ReactNode; children: ReactNode; className?: string } ) {
	return (
		<div className={ cn( 'imm:flex imm:flex-col imm:gap-1.5', className ) }>
			<span className="imm:text-xs imm:font-medium imm:text-zinc-700">{ label }</span>
			{ children }
			{ hint && <span className="imm:text-[11px] imm:leading-snug imm:text-zinc-500">{ hint }</span> }
		</div>
	);
}

function Toggle( { label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: ( v: boolean ) => void } ) {
	return (
		<label className="imm:flex imm:cursor-pointer imm:items-start imm:justify-between imm:gap-3">
			<span>
				<span className="imm:block imm:text-[13px] imm:text-zinc-800">{ label }</span>
				{ hint && <span className="imm:block imm:text-[11px] imm:text-zinc-500">{ hint }</span> }
			</span>
			<Switch checked={ checked } onCheckedChange={ onChange } />
		</label>
	);
}

const BADGES: { value: BadgeStyle; label: string; className: string }[] = [
	{ value: 'sale', label: __( 'Oferta' ), className: 'imm:bg-rose-500' },
	{ value: 'new', label: __( 'Nuevo' ), className: 'imm:bg-emerald-500' },
	{ value: 'hot', label: __( 'Hot' ), className: 'imm:bg-orange-500' },
	{ value: 'info', label: __( 'Info' ), className: 'imm:bg-sky-500' },
];

export function ItemEditor( { item, onChange, onReplace }: { item: MenuItem; onChange: ( item: MenuItem ) => void; onReplace: ( items: MenuItem[] ) => void } ) {
	const [ searching, setSearching ] = useState( false );
	const [ advanced, setAdvanced ] = useState( false );
	const set = <K extends keyof MenuItem>( key: K, value: MenuItem[ K ] ) => onChange( { ...item, [ key ]: value } );
	const rel = item.rel.split( ' ' ).filter( Boolean );

	const header = (
		<div className="imm:mb-4 imm:flex imm:items-center imm:justify-between imm:gap-2 imm:border-b imm:border-zinc-100 imm:pb-3">
			<div className="imm:min-w-0">
				<p className="imm:text-[11px] imm:font-medium imm:tracking-wide imm:text-zinc-400 imm:uppercase">
					{ { link: __( 'Enlace' ), heading: __( 'Encabezado de sección' ), divider: __( 'Divisor' ), source: __( 'Fuente dinámica' ) }[ item.type ] }
				</p>
				<p className="imm:truncate imm:text-sm imm:font-semibold imm:text-zinc-900">{ itemTitle( item ) }</p>
			</div>
		</div>
	);

	if ( item.type === 'divider' ) {
		return (
			<div>
				{ header }
				<p className="imm:text-[13px] imm:text-zinc-500">{ __( 'Una línea que separa grupos de ítems. No tiene opciones.' ) }</p>
			</div>
		);
	}

	if ( item.type === 'source' ) {
		return (
			<div>
				{ header }
				<SourceEditor item={ item } onChange={ ( source ) => set( 'source', source ) } onConvert={ onReplace } />
			</div>
		);
	}

	if ( item.type === 'heading' ) {
		return (
			<div className="imm:flex imm:flex-col imm:gap-4">
				{ header }
				<Field label={ __( 'Título de la sección' ) } hint={ __( 'Como «Comprar por categoría» en Amazon. Los ítems hijos se muestran debajo, en el mismo nivel.' ) }>
					<Input value={ item.label } onChange={ ( e ) => set( 'label', e.target.value ) } />
				</Field>
				<Field label={ __( 'Visible para' ) }>
					<Select value={ item.visibility } onChange={ ( e ) => set( 'visibility', e.target.value as MenuItem[ 'visibility' ] ) }>
						<option value="any">{ __( 'Todos' ) }</option>
						<option value="logged_in">{ __( 'Solo usuarios conectados' ) }</option>
						<option value="logged_out">{ __( 'Solo visitantes sin sesión' ) }</option>
					</Select>
				</Field>
			</div>
		);
	}

	return (
		<div className="imm:flex imm:flex-col imm:gap-4">
			{ header }
			<Field label={ __( 'Etiqueta' ) }>
				<Input value={ item.label } onChange={ ( e ) => set( 'label', e.target.value ) } placeholder={ __( 'Ej.: Celulares' ) } />
			</Field>

			<Field label={ __( 'Enlace' ) }>
				{ item.object.kind ? (
					<div className="imm:flex imm:items-center imm:gap-2 imm:rounded-md imm:border imm:border-emerald-200 imm:bg-emerald-50 imm:px-3 imm:py-2">
						<Link2 className="imm:size-4 imm:shrink-0 imm:text-emerald-700" aria-hidden />
						<span className="imm:min-w-0 imm:flex-1">
							<span className="imm:block imm:truncate imm:text-[13px] imm:font-medium imm:text-emerald-900">{ item.url.replace( /^https?:\/\/[^/]+/, '' ) || `${ item.object.type } #${ item.object.id }` }</span>
							<span className="imm:block imm:text-[11px] imm:leading-snug imm:text-emerald-700">{ __( 'Vinculado: se actualiza solo si cambia el enlace' ) }</span>
						</span>
						<Button size="icon" variant="ghost" title={ __( 'Cambiar' ) } onClick={ () => setSearching( true ) }>
							<Link2 aria-hidden />
						</Button>
						<Button size="icon" variant="ghost" title={ __( 'Quitar vínculo (usar URL)' ) } onClick={ () => set( 'object', { kind: '', id: 0, type: '' } ) }>
							<Unlink aria-hidden />
						</Button>
					</div>
				) : (
					<div className="imm:flex imm:gap-1.5">
						<Input value={ item.url } onChange={ ( e ) => set( 'url', e.target.value ) } placeholder="/ofertas/ · https://…" className="imm:font-mono imm:text-xs" />
						<Button variant="outline" size="sm" className="imm:h-9" onClick={ () => setSearching( true ) } title={ __( 'Vincular página, producto o categoría' ) }>
							<Link2 aria-hidden />
							{ __( 'Vincular' ) }
						</Button>
					</div>
				) }
				{ ! item.url && ! item.object.kind && (
					<span className="imm:flex imm:items-center imm:gap-1 imm:text-[11px] imm:text-zinc-500">
						<Link2Off className="imm:size-3" aria-hidden />
						{ item.children.length ? __( 'Sin enlace: al tocarlo solo abre su submenú.' ) : __( 'Sin enlace: se muestra como texto.' ) }
					</span>
				) }
			</Field>

			<div className="imm:grid imm:grid-cols-2 imm:gap-3">
				<Field label={ __( 'Icono' ) }>
					<IconPicker value={ item.icon } onChange={ ( v ) => set( 'icon', v ) } />
				</Field>
				<Field label={ __( 'Visible para' ) }>
					<Select value={ item.visibility } onChange={ ( e ) => set( 'visibility', e.target.value as MenuItem[ 'visibility' ] ) }>
						<option value="any">{ __( 'Todos' ) }</option>
						<option value="logged_in">{ __( 'Conectados' ) }</option>
						<option value="logged_out">{ __( 'Sin sesión' ) }</option>
					</Select>
				</Field>
			</div>

			<Field label={ __( 'Imagen' ) } hint={ __( 'Reemplaza al icono. Se descarga solo cuando el usuario abre ese nivel.' ) }>
				<MediaField value={ item.image } onChange={ ( v ) => set( 'image', v ) } />
			</Field>

			<Field label={ __( 'Insignia' ) } hint={ __( 'Texto corto: «Nuevo», «-30 %», «Hot».' ) }>
				<div className="imm:flex imm:flex-wrap imm:items-center imm:gap-2">
					<Input value={ item.badge.text } maxLength={ 16 } onChange={ ( e ) => set( 'badge', { ...item.badge, text: e.target.value } ) } placeholder="-30 %" className="imm:w-24" />
					<div className="imm:flex imm:gap-1">
						{ BADGES.map( ( b ) => (
							<button
								key={ b.value }
								type="button"
								title={ b.label }
								onClick={ () => set( 'badge', { ...item.badge, style: b.value } ) }
								className={ cn( 'imm:rounded-full imm:px-2 imm:py-0.5 imm:text-[11px] imm:font-semibold imm:text-white imm:transition-opacity', b.className, item.badge.style === b.value ? 'imm:ring-2 imm:ring-zinc-900 imm:ring-offset-1' : 'imm:opacity-50 imm:hover:opacity-100' ) }
							>
								{ b.label }
							</button>
						) ) }
					</div>
				</div>
			</Field>

			<Field label={ __( 'Descripción' ) }>
				<Input value={ item.description } maxLength={ 160 } onChange={ ( e ) => set( 'description', e.target.value ) } placeholder={ __( 'Segunda línea opcional' ) } />
			</Field>

			<Field label={ __( 'Campaña' ) } hint={ __( 'Opcional: el ítem solo aparece entre estas fechas (hora del sitio). Ideal para «Hot Sale» o «Black Friday»: el menú se actualiza solo al empezar y al terminar.' ) }>
				<DateRange from={ item.schedule?.from ?? '' } to={ item.schedule?.to ?? '' } onChange={ ( w ) => set( 'schedule', w ) } />
			</Field>

			<div className="imm:flex imm:flex-col imm:gap-3 imm:rounded-lg imm:border imm:border-zinc-200 imm:p-3">
				<Toggle label={ __( 'Destacado' ) } hint={ __( 'Color de acento, ideal para «Ofertas del día».' ) } checked={ item.highlight } onChange={ ( v ) => set( 'highlight', v ) } />
				{ item.children.length > 0 && <Toggle label={ __( '«Ver todo» en el submenú' ) } hint={ __( 'Enlaza a este ítem desde su submenú (al final o al inicio, según Panel lateral → Navegación).' ) } checked={ item.view_all } onChange={ ( v ) => set( 'view_all', v ) } /> }
				<Toggle label={ __( 'Abrir en una pestaña nueva' ) } checked={ item.target === '_blank' } onChange={ ( v ) => set( 'target', v ? '_blank' : '_self' ) } />
			</div>

			<button type="button" onClick={ () => setAdvanced( ! advanced ) } className="imm:flex imm:items-center imm:gap-1 imm:text-xs imm:font-medium imm:text-zinc-600 imm:hover:text-zinc-900">
				<ChevronDown className={ cn( 'imm:size-3.5 imm:transition-transform', ! advanced && 'imm:-rotate-90' ) } aria-hidden />
				{ __( 'Avanzado' ) }
			</button>
			{ advanced && (
				<div className="imm:flex imm:flex-col imm:gap-3">
					<Field label={ __( 'Atributo rel' ) } hint={ __( 'Para enlaces de afiliados o patrocinados.' ) }>
						<Segmented
							size="sm"
							value={ ( rel.includes( 'sponsored' ) ? 'sponsored' : rel.includes( 'nofollow' ) ? 'nofollow' : '' ) as '' | 'nofollow' | 'sponsored' }
							onChange={ ( v ) => {
								const base = rel.filter( ( r ) => r !== 'nofollow' && r !== 'sponsored' );
								set( 'rel', ( v ? [ ...base, v ] : base ).join( ' ' ) );
							} }
							options={ [
								{ value: '', label: __( 'Normal' ) },
								{ value: 'nofollow', label: 'nofollow' },
								{ value: 'sponsored', label: 'sponsored' },
							] }
						/>
					</Field>
					<Field label={ __( 'Clases CSS' ) }>
						<Input value={ item.css_class } onChange={ ( e ) => set( 'css_class', e.target.value ) } className="imm:font-mono imm:text-xs" />
					</Field>
					<p className="imm:font-mono imm:text-[11px] imm:text-zinc-400">ID: { item.id }</p>
				</div>
			) }

			<ObjectSearch
				open={ searching }
				onOpenChange={ setSearching }
				onPick={ ( r ) =>
					onChange( {
						...item,
						label: item.label || r.label,
						url: r.url,
						object: { kind: r.kind, id: r.id, type: r.type },
						image: ! item.image.url && r.image ? { id: r.image_id ?? 0, url: r.image } : item.image,
					} )
				}
			/>
		</div>
	);
}

