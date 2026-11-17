import { Copy, ListTree, Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Empty, PageHeader, Segmented } from '@/components/common';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/dialog';
import { Notice } from '@/components/ui/feedback';
import { Input, Select } from '@/components/ui/input';
import { api } from '@/lib/api';
import { __ } from '@/lib/i18n';
import { useRouter } from '@/lib/router';
import { setProfile, useActiveProfile, useStore } from '@/lib/store';
import type { Menu } from '@/lib/types';
import { countItems } from './builder/tree';

type From = 'empty' | 'woo' | 'wp_menu';

export function Menus() {
	const menus = useStore( ( s ) => s.menus );
	const profiles = useStore( ( s ) => s.profiles );
	const env = useStore( ( s ) => s.env );
	const profile = useActiveProfile();
	const go = useRouter( ( s ) => s.go );
	const [ title, setTitle ] = useState( '' );
	const [ from, setFrom ] = useState<From>( env?.woo ? 'woo' : 'empty' );
	const [ wpMenu, setWpMenu ] = useState( env?.wp_menus[ 0 ]?.id ?? 0 );
	const [ busy, setBusy ] = useState( '' );
	const [ error, setError ] = useState( '' );
	const [ remove, setRemove ] = useState<Menu | null>( null );

	const run = async ( key: string, fn: () => Promise<void> ) => {
		setBusy( key );
		setError( '' );
		try {
			await fn();
		} catch ( e ) {
			setError( e instanceof Error ? e.message : String( e ) );
		} finally {
			setBusy( '' );
		}
	};

	const create = () =>
		run( 'create', async () => {
			const { menu } = await api<{ menu: Menu }>( 'menus', 'POST', { title, from, wp_menu_id: wpMenu } );
			useStore.getState().addMenu( menu );
			setTitle( '' );
			go( 'constructor' );
		} );

	return (
		<>
			<PageHeader title={ __( 'Menús' ) } description={ __( 'Un menú es el árbol de enlaces del panel. Puedes tener varios y elegir cuál usa cada perfil.' ) } />
			{ error && <Notice level="error" className="imm:mb-4">{ error }</Notice> }

			<div className="imm:mb-6 imm:rounded-xl imm:border imm:border-zinc-200 imm:bg-white imm:p-5 imm:shadow-xs">
				<h2 className="imm:mb-3 imm:text-sm imm:font-semibold">{ __( 'Crear un menú' ) }</h2>
				<div className="imm:flex imm:flex-col imm:gap-3">
					<Segmented
						value={ from }
						onChange={ setFrom }
						options={ [
							{ value: 'empty', label: __( 'Vacío' ) },
							...( env?.woo ? [ { value: 'woo' as From, label: __( 'Categorías de WooCommerce' ) } ] : [] ),
							...( env?.wp_menus.length ? [ { value: 'wp_menu' as From, label: __( 'Copiar un menú de WordPress' ) } ] : [] ),
						] }
					/>
					<div className="imm:flex imm:flex-wrap imm:gap-2">
						<Input value={ title } onChange={ ( e ) => setTitle( e.target.value ) } placeholder={ __( 'Nombre (ej.: Menú tienda)' ) } className="imm:w-64" />
						{ from === 'wp_menu' && (
							<Select value={ wpMenu } onChange={ ( e ) => setWpMenu( Number( e.target.value ) ) } className="imm:w-56">
								{ env?.wp_menus.map( ( m ) => (
									<option key={ m.id } value={ m.id }>
										{ m.name } ({ m.count })
									</option>
								) ) }
							</Select>
						) }
						<Button onClick={ create } disabled={ busy === 'create' }>
							{ busy === 'create' ? <Loader2 className="imm:animate-spin" aria-hidden /> : <Plus aria-hidden /> }
							{ __( 'Crear' ) }
						</Button>
					</div>
					{ from === 'wp_menu' && <p className="imm:text-xs imm:text-zinc-500">{ __( 'Se copian los ítems para que puedas añadir iconos, imágenes e insignias. Para mantenerlo sincronizado, usa en su lugar la fuente «Menú de WordPress» del constructor.' ) }</p> }
				</div>
			</div>

			{ ! menus.length && <Empty icon={ <ListTree /> } title={ __( 'Aún no hay menús' ) } /> }
			<ul className="imm:grid imm:gap-3 imm:sm:grid-cols-2">
				{ menus.map( ( menu ) => {
					const used = profiles.filter( ( p ) => p.drawer.menu_id === menu.id );
					return (
						<li key={ menu.id } className="imm:flex imm:flex-col imm:gap-3 imm:rounded-xl imm:border imm:border-zinc-200 imm:bg-white imm:p-4 imm:shadow-xs">
							<div className="imm:flex imm:items-start imm:justify-between imm:gap-2">
								<div className="imm:min-w-0">
									<p className="imm:truncate imm:text-sm imm:font-semibold imm:text-zinc-900">{ menu.title }</p>
									<p className="imm:text-xs imm:text-zinc-500">
										{ countItems( menu.items ) } { __( 'ítems en total' ) }
									</p>
								</div>
								<span className="imm:flex imm:size-8 imm:items-center imm:justify-center imm:rounded-lg imm:bg-zinc-100 imm:text-zinc-600">
									<ListTree className="imm:size-4" aria-hidden />
								</span>
							</div>
							<div className="imm:flex imm:flex-wrap imm:gap-1">
								{ used.length ? used.map( ( p ) => <Badge key={ p.id } tone="green">{ p.title }</Badge> ) : <Badge>{ __( 'Sin usar' ) }</Badge> }
							</div>
							<div className="imm:mt-auto imm:flex imm:flex-wrap imm:gap-1.5">
								<Button
									size="sm"
									onClick={ () => {
										useStore.getState().setActiveMenu( menu.id );
										go( 'constructor' );
									} }
								>
									<Pencil aria-hidden />
									{ __( 'Editar' ) }
								</Button>
								{ profile && profile.drawer.menu_id !== menu.id && (
									<Button size="sm" variant="outline" onClick={ () => setProfile( [ 'drawer', 'menu_id' ], menu.id ) }>
										{ __( 'Usar en' ) } «{ profile.title }»
									</Button>
								) }
								<span className="imm:flex-1" />
								<Button
									size="icon"
									variant="ghost"
									title={ __( 'Duplicar' ) }
									disabled={ busy === 'dup' + menu.id }
									onClick={ () =>
										run( 'dup' + menu.id, async () => {
											const { menu: copy } = await api<{ menu: Menu }>( `menus/${ menu.id }/duplicate`, 'POST' );
											useStore.getState().addMenu( copy );
										} )
									}
								>
									<Copy aria-hidden />
								</Button>
								<Button size="icon" variant="ghost" title={ __( 'Eliminar' ) } className="imm:hover:bg-red-50 imm:hover:text-red-600" onClick={ () => setRemove( menu ) }>
									<Trash2 aria-hidden />
								</Button>
							</div>
						</li>
					);
				} ) }
			</ul>
			<ConfirmDialog
				open={ !! remove }
				onOpenChange={ ( o ) => ! o && setRemove( null ) }
				title={ __( '¿Eliminar el menú?' ) }
				description={ remove ? `«${ remove.title }» ${ __( 'se elimina de inmediato.' ) }` : '' }
				confirmLabel={ __( 'Eliminar' ) }
				destructive
				pending={ busy === 'delete' }
				onConfirm={ () =>
					run( 'delete', async () => {
						if ( remove ) {
							try {
								await api( `menus/${ remove.id }`, 'DELETE' );
								useStore.getState().removeMenu( remove.id );
							} finally {
								setRemove( null );
							}
						}
					} )
				}
			/>
		</>
	);
}
