import * as DialogPrimitive from '@radix-ui/react-dialog';
import { FileText, Loader2, Search, Tag } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { __ } from '@/lib/i18n';
import type { SearchResult } from '@/lib/types';

/** Buscador de páginas, entradas, productos y categorías para enlazar desde un ítem. */
export function ObjectSearch( {
	open,
	onOpenChange,
	onPick,
	title,
	kind,
	type,
	placeholder,
}: {
	open: boolean;
	onOpenChange: ( open: boolean ) => void;
	onPick: ( result: SearchResult ) => void;
	title?: string;
	/** Solo entradas/páginas ('post') o solo términos ('term'). */
	kind?: 'post' | 'term';
	/** Tipo de contenido o taxonomía concreta. */
	type?: string;
	placeholder?: string;
} ) {
	const [ q, setQ ] = useState( '' );
	const [ results, setResults ] = useState<SearchResult[]>( [] );
	const [ loading, setLoading ] = useState( false );

	useEffect( () => {
		if ( ! open ) {
			return;
		}
		setLoading( true );
		const timer = window.setTimeout( () => {
			api<{ results: SearchResult[] }>( 'search', 'GET', undefined, { q, kind, type } )
				// El filtro también se aplica aquí por si el servidor no lo soporta.
				.then( ( r ) => setResults( r.results.filter( ( x ) => ( ! kind || x.kind === kind ) && ( ! type || x.type === type ) ) ) )
				.catch( () => setResults( [] ) )
				.finally( () => setLoading( false ) );
		}, 250 );
		return () => window.clearTimeout( timer );
	}, [ q, open, kind, type ] );

	return (
		<DialogPrimitive.Root open={ open } onOpenChange={ onOpenChange }>
			<DialogPrimitive.Portal>
				<DialogPrimitive.Overlay className="imm-root imm:fixed imm:inset-0 imm:z-[100000] imm:bg-zinc-950/40" />
				<DialogPrimitive.Content className="imm-root imm:fixed imm:top-[12vh] imm:left-1/2 imm:z-[100001] imm:w-[min(92vw,560px)] imm:-translate-x-1/2 imm:overflow-hidden imm:rounded-xl imm:border imm:border-zinc-200 imm:bg-white imm:shadow-2xl">
					<DialogPrimitive.Title className="imm:sr-only">{ title ?? __( 'Enlazar contenido' ) }</DialogPrimitive.Title>
					<DialogPrimitive.Description className="imm:sr-only">{ __( 'Busca una página, producto, entrada o categoría.' ) }</DialogPrimitive.Description>
					<div className="imm:relative imm:border-b imm:border-zinc-100">
						<Search className="imm:pointer-events-none imm:absolute imm:top-3.5 imm:left-4 imm:size-4 imm:text-zinc-400" aria-hidden />
						<Input autoFocus value={ q } onChange={ ( e ) => setQ( e.target.value ) } placeholder={ placeholder ?? __( 'Buscar páginas, productos, categorías…' ) } className="imm:h-12 imm:rounded-none imm:border-0 imm:pl-11 imm:text-[15px] imm:shadow-none" />
						{ loading && <Loader2 className="imm:absolute imm:top-3.5 imm:right-4 imm:size-4 imm:animate-spin imm:text-zinc-400" aria-hidden /> }
					</div>
					<ul className="imm:max-h-[50vh] imm:overflow-y-auto imm:p-1.5">
						{ results.map( ( r ) => (
							<li key={ r.kind + r.id }>
								<button
									type="button"
									onClick={ () => {
										onPick( r );
										onOpenChange( false );
									} }
									className="imm:flex imm:w-full imm:items-center imm:gap-3 imm:rounded-lg imm:px-3 imm:py-2 imm:text-left imm:hover:bg-zinc-100"
								>
									{ r.image ? (
										<img src={ r.image } alt="" className="imm:size-8 imm:rounded-md imm:object-cover" />
									) : (
										<span className="imm:flex imm:size-8 imm:items-center imm:justify-center imm:rounded-md imm:bg-zinc-100 imm:text-zinc-500">
											{ r.kind === 'term' ? <Tag className="imm:size-4" aria-hidden /> : <FileText className="imm:size-4" aria-hidden /> }
										</span>
									) }
									<span className="imm:min-w-0 imm:flex-1">
										<span className="imm:block imm:truncate imm:text-[13px] imm:font-medium imm:text-zinc-900">{ r.label || __( '(sin título)' ) }</span>
										<span className="imm:block imm:truncate imm:text-xs imm:text-zinc-500">{ r.subtitle } · { r.url.replace( /^https?:\/\/[^/]+/, '' ) }</span>
									</span>
								</button>
							</li>
						) ) }
						{ ! loading && ! results.length && <li className="imm:px-3 imm:py-8 imm:text-center imm:text-[13px] imm:text-zinc-500">{ __( 'Sin resultados.' ) }</li> }
					</ul>
				</DialogPrimitive.Content>
			</DialogPrimitive.Portal>
		</DialogPrimitive.Root>
	);
}
