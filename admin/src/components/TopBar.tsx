import { Check, ChevronDown, CloudUpload, Loader2, Plus, RotateCcw, Smartphone, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { ConfirmDialog } from './ui/dialog';
import { Input } from './ui/input';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { api } from '@/lib/api';
import { __ } from '@/lib/i18n';
import { useActiveProfile, useStore } from '@/lib/store';
import type { CompileState, Profile, State } from '@/lib/types';
import { cn } from '@/lib/utils';

export function TopBar() {
	const client = useQueryClient();
	const profiles = useStore( ( s ) => s.profiles );
	const active = useActiveProfile();
	const pending = useStore( ( s ) => Object.keys( s.pending ).length );
	const saving = useStore( ( s ) => s.saving );
	const saveError = useStore( ( s ) => s.saveError );
	const drafts = useStore( ( s ) => s.serverDrafts );
	const [ busy, setBusy ] = useState< '' | 'publish' | 'discard' >( '' );
	const [ message, setMessage ] = useState< { tone: 'green' | 'red'; text: string } | null >( null );
	const [ confirmDiscard, setConfirmDiscard ] = useState( false );
	const unpublished = drafts > 0 || pending > 0;

	const publish = async () => {
		setBusy( 'publish' );
		setMessage( null );
		try {
			await useStore.getState().flush();
			const { compile } = await api<{ compile: CompileState }>( 'publish', 'POST' );
			const state = await api<State>( 'state' );
			client.setQueryData( [ 'state' ], state );
			useStore.getState().hydrate( state );
			const purged = compile.purged?.length ? ' · ' + __( 'Caché purgada:' ) + ' ' + compile.purged.join( ', ' ) : '';
			setMessage( { tone: 'green', text: __( 'Publicado.' ) + purged } );
			window.setTimeout( () => setMessage( null ), 6000 );
		} catch ( e ) {
			setMessage( { tone: 'red', text: e instanceof Error ? e.message : String( e ) } );
		} finally {
			setBusy( '' );
		}
	};

	const discard = async () => {
		setBusy( 'discard' );
		try {
			useStore.setState( { pending: {} } );
			const state = await api<State>( 'discard', 'POST' );
			client.setQueryData( [ 'state' ], state );
			useStore.getState().hydrate( state );
		} finally {
			setBusy( '' );
			setConfirmDiscard( false );
		}
	};

	return (
		<div className="imm:sticky imm:top-8 imm:z-20 imm:flex imm:flex-wrap imm:items-center imm:gap-3 imm:border-b imm:border-zinc-200 imm:bg-white/90 imm:px-5 imm:py-2.5 imm:backdrop-blur">
			<ProfileSwitcher profiles={ profiles } active={ active } />
			<span className="imm:flex-1" />
			{ message && <span className={ cn( 'imm:text-xs', message.tone === 'green' ? 'imm:text-emerald-700' : 'imm:text-red-700' ) }>{ message.text }</span> }
			{ saveError && <span className="imm:text-xs imm:text-red-700">{ __( 'No se pudo guardar:' ) } { saveError }</span> }
			<SaveState saving={ saving } pending={ pending > 0 } unpublished={ unpublished } />
			<Button
				size="sm"
				variant="outline"
				className="imm:min-[1400px]:hidden"
				onClick={ async () => {
					// Sin espacio para la columna de vista previa: se abre en una pestaña (la ventana se abre antes del await para que no la bloqueen).
					const win = window.open( 'about:blank', '_blank' );
					await useStore.getState().flush();
					const { url } = await api<{ url: string }>( 'preview', 'POST', { path: '/' } );
					if ( win ) {
						win.location.href = url;
					}
				} }
			>
				<Smartphone aria-hidden />
				{ __( 'Vista previa' ) }
			</Button>
			<Button size="sm" variant="ghost" disabled={ ! unpublished || !! busy } onClick={ () => setConfirmDiscard( true ) }>
				<RotateCcw aria-hidden />
				{ __( 'Descartar' ) }
			</Button>
			<Button size="sm" disabled={ !! busy || ( ! unpublished && ! useStore.getState().compile.error ) } onClick={ publish }>
				{ busy === 'publish' ? <Loader2 className="imm:animate-spin" aria-hidden /> : <CloudUpload aria-hidden /> }
				{ __( 'Publicar' ) }
			</Button>
			<ConfirmDialog
				open={ confirmDiscard }
				onOpenChange={ setConfirmDiscard }
				title={ __( '¿Descartar los cambios sin publicar?' ) }
				description={ __( 'Se borran los borradores de todos los menús y perfiles y se vuelve a lo publicado. Los ajustes globales ya guardados no se revierten.' ) }
				confirmLabel={ __( 'Descartar cambios' ) }
				destructive
				pending={ busy === 'discard' }
				onConfirm={ discard }
			/>
		</div>
	);
}

function SaveState( { saving, pending, unpublished }: { saving: boolean; pending: boolean; unpublished: boolean } ) {
	if ( saving || pending ) {
		return (
			<span className="imm:flex imm:items-center imm:gap-1.5 imm:text-xs imm:text-zinc-500">
				<Loader2 className="imm:size-3.5 imm:animate-spin" aria-hidden />
				{ __( 'Guardando borrador…' ) }
			</span>
		);
	}
	if ( unpublished ) {
		return <Badge tone="amber">{ __( 'Cambios sin publicar' ) }</Badge>;
	}
	return (
		<span className="imm:flex imm:items-center imm:gap-1 imm:text-xs imm:text-zinc-500">
			<Check className="imm:size-3.5 imm:text-emerald-600" aria-hidden />
			{ __( 'Todo publicado' ) }
		</span>
	);
}

function ProfileSwitcher( { profiles, active }: { profiles: Profile[]; active?: Profile } ) {
	const [ open, setOpen ] = useState( false );
	const [ title, setTitle ] = useState( '' );
	const [ busy, setBusy ] = useState( false );
	const [ remove, setRemove ] = useState< Profile | null >( null );
	const first = profiles.find( ( p ) => p.enabled );

	const create = async () => {
		setBusy( true );
		try {
			const { profile } = await api<{ profile: Profile }>( 'profiles', 'POST', { title } );
			useStore.getState().addProfile( profile );
			setTitle( '' );
			setOpen( false );
		} finally {
			setBusy( false );
		}
	};

	return (
		<>
			<Popover open={ open } onOpenChange={ setOpen }>
				<PopoverTrigger asChild>
					<button type="button" className="imm:flex imm:items-center imm:gap-2 imm:rounded-md imm:px-2 imm:py-1.5 imm:text-left imm:hover:bg-zinc-100">
						<span className="imm:text-[11px] imm:font-medium imm:tracking-wide imm:text-zinc-400 imm:uppercase">{ __( 'Perfil' ) }</span>
						<span className="imm:text-[13px] imm:font-semibold imm:text-zinc-900">{ active?.title ?? '—' }</span>
						{ active && first?.id === active.id && <Badge tone="green">{ __( 'En el sitio' ) }</Badge> }
						<ChevronDown className="imm:size-3.5 imm:text-zinc-500" aria-hidden />
					</button>
				</PopoverTrigger>
				<PopoverContent className="imm:w-72 imm:p-1.5">
					<ul className="imm:flex imm:flex-col imm:gap-0.5">
						{ profiles.map( ( p ) => (
							<li key={ p.id } className="imm:group imm:flex imm:items-center">
								<button
									type="button"
									onClick={ () => {
										useStore.getState().setActiveProfile( p.id );
										setOpen( false );
									} }
									className={ cn( 'imm:flex imm:flex-1 imm:items-center imm:gap-2 imm:rounded-md imm:px-2.5 imm:py-2 imm:text-left imm:text-[13px] imm:hover:bg-zinc-100', p.id === active?.id && 'imm:bg-zinc-100 imm:font-medium' ) }
								>
									<span className={ cn( 'imm:size-1.5 imm:rounded-full', p.enabled ? 'imm:bg-emerald-500' : 'imm:bg-zinc-300' ) } aria-hidden />
									<span className="imm:flex-1 imm:truncate">{ p.title }</span>
									{ first?.id === p.id && <span className="imm:text-[11px] imm:text-zinc-500">{ __( 'activo' ) }</span> }
								</button>
								{ profiles.length > 1 && (
									<button type="button" aria-label={ __( 'Eliminar perfil' ) } onClick={ () => setRemove( p ) } className="imm:rounded-md imm:p-1.5 imm:text-zinc-400 imm:opacity-0 imm:group-hover:opacity-100 imm:hover:bg-red-50 imm:hover:text-red-600">
										<Trash2 className="imm:size-3.5" aria-hidden />
									</button>
								) }
							</li>
						) ) }
					</ul>
					<div className="imm:mt-1.5 imm:flex imm:gap-1.5 imm:border-t imm:border-zinc-100 imm:p-1.5 imm:pt-2">
						<Input value={ title } onChange={ ( e ) => setTitle( e.target.value ) } placeholder={ __( 'Nombre del perfil nuevo' ) } className="imm:h-8 imm:text-xs" onKeyDown={ ( e ) => e.key === 'Enter' && title && void create() } />
						<Button size="sm" variant="outline" disabled={ ! title || busy } onClick={ create }>
							<Plus aria-hidden />
						</Button>
					</div>
					<p className="imm:px-2.5 imm:pb-1.5 imm:text-[11px] imm:leading-snug imm:text-zinc-500">{ __( 'En el sitio se muestra el primer perfil activo. Las reglas por página llegan en una próxima versión.' ) }</p>
				</PopoverContent>
			</Popover>
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
