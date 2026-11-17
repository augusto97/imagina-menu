import { ImageOff, Search, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { IconView } from './IconView';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { __ } from '@/lib/i18n';
import { useIcons } from '@/lib/icons';
import { cn } from '@/lib/utils';

// Atajos en español: el buscador también entiende estas palabras.
const SYNONYMS: Record<string, string> = {
	casa: 'house home',
	inicio: 'house home',
	carrito: 'cart shopping',
	compras: 'shopping bag cart',
	bolsa: 'bag',
	usuario: 'user',
	cuenta: 'user circle',
	buscar: 'search',
	menu: 'menu',
	categorias: 'grid layout',
	ofertas: 'flame percent tag',
	descuento: 'percent tag badge',
	regalo: 'gift',
	corazon: 'heart',
	favoritos: 'heart star',
	telefono: 'phone',
	celular: 'smartphone',
	correo: 'mail',
	envio: 'truck package',
	pedido: 'package',
	ayuda: 'help circle',
	ubicacion: 'map pin',
	tienda: 'store',
	ropa: 'shirt',
	zapatos: 'footprints',
	hogar: 'sofa lamp house',
	cocina: 'chef cooking utensils',
	deporte: 'dumbbell bike',
	belleza: 'sparkles',
	juguetes: 'toy puzzle',
	tecnologia: 'laptop cpu monitor',
	comida: 'utensils pizza',
	salud: 'heart pulse pill',
	calendario: 'calendar',
	estrella: 'star',
	noticias: 'newspaper',
	blog: 'newspaper pen',
};

export function IconPicker( { value, onChange, allowEmpty = true, brands = true }: { value: string; onChange: ( value: string ) => void; allowEmpty?: boolean; brands?: boolean } ) {
	const [ open, setOpen ] = useState( false );
	const [ query, setQuery ] = useState( '' );
	const lib = useIcons();

	const results = useMemo( () => {
		if ( ! lib ) {
			return [];
		}
		const q = query.trim().toLowerCase().normalize( 'NFD' ).replace( /[̀-ͯ]/g, '' );
		const terms = q ? ( q + ' ' + ( SYNONYMS[ q ] ?? '' ) ).split( /\s+/ ).filter( Boolean ) : [];
		const all = [ ...( brands ? Object.keys( lib.brands ).map( ( b ) => 'si-' + b ) : [] ), ...Object.keys( lib.lucide ) ];
		const match = terms.length
			? all.filter( ( name ) => {
					const hay = name + ' ' + ( lib.tags[ name ] ?? '' );
					return terms.some( ( t ) => hay.includes( t ) );
			  } )
			: all;
		return match.slice( 0, 240 );
	}, [ lib, query, brands ] );

	return (
		<Popover open={ open } onOpenChange={ setOpen }>
			<PopoverTrigger asChild>
				<button
					type="button"
					className="imm:flex imm:h-9 imm:w-full imm:items-center imm:gap-2 imm:rounded-md imm:border imm:border-zinc-200 imm:bg-white imm:px-3 imm:text-left imm:text-sm imm:shadow-xs imm:hover:bg-zinc-50"
				>
					{ value ? <IconView name={ value } className="imm:size-4 imm:text-zinc-800" /> : <ImageOff className="imm:size-4 imm:text-zinc-300" aria-hidden /> }
					<span className={ cn( 'imm:flex-1 imm:truncate', ! value && 'imm:text-zinc-400' ) }>{ value || __( 'Sin icono' ) }</span>
				</button>
			</PopoverTrigger>
			<PopoverContent className="imm:w-80">
				<div className="imm:relative">
					<Search className="imm:pointer-events-none imm:absolute imm:top-2.5 imm:left-2.5 imm:size-4 imm:text-zinc-400" aria-hidden />
					<Input autoFocus value={ query } onChange={ ( e ) => setQuery( e.target.value ) } placeholder={ __( 'Buscar icono (carrito, casa, heart…)' ) } className="imm:pl-8" />
				</div>
				<div className="imm:mt-2 imm:grid imm:max-h-64 imm:grid-cols-8 imm:gap-0.5 imm:overflow-y-auto">
					{ ! lib && <p className="imm:col-span-8 imm:py-6 imm:text-center imm:text-xs imm:text-zinc-500">{ __( 'Cargando iconos…' ) }</p> }
					{ results.map( ( name ) => (
						<button
							key={ name }
							type="button"
							title={ name }
							onClick={ () => {
								onChange( name );
								setOpen( false );
							} }
							className={ cn( 'imm:flex imm:aspect-square imm:items-center imm:justify-center imm:rounded-md imm:text-zinc-700 imm:hover:bg-zinc-100', value === name && 'imm:bg-zinc-900 imm:text-white imm:hover:bg-zinc-800' ) }
						>
							<IconView name={ name } className="imm:size-[18px]" />
						</button>
					) ) }
					{ lib && ! results.length && <p className="imm:col-span-8 imm:py-6 imm:text-center imm:text-xs imm:text-zinc-500">{ __( 'Sin resultados.' ) }</p> }
				</div>
				{ allowEmpty && value && (
					<Button
						variant="ghost"
						size="sm"
						className="imm:mt-2 imm:w-full"
						onClick={ () => {
							onChange( '' );
							setOpen( false );
						} }
					>
						<X aria-hidden />
						{ __( 'Quitar icono' ) }
					</Button>
				) }
			</PopoverContent>
		</Popover>
	);
}
