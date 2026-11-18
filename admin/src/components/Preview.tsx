import { ExternalLink, Menu as MenuIcon, RotateCw, Search, Smartphone } from 'lucide-react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { QrButton } from './QrDialog';
import { Button } from './ui/button';
import { Segmented } from './common';
import { api } from '@/lib/api';
import { __ } from '@/lib/i18n';
import { type Route, useRouter } from '@/lib/router';
import { useStore } from '@/lib/store';
import { cn } from '@/lib/utils';

const DEVICES = {
	iphone: { width: 390, height: 844, label: 'iPhone' },
	android: { width: 412, height: 915, label: 'Android' },
} as const;

type Device = keyof typeof DEVICES;
type Open = 'none' | 'drawer' | 'search';

function modeFor( route: Route ): Open {
	if ( route === 'buscador' ) {
		return 'search';
	}
	return route === 'constructor' || route === 'panel-lateral' || route === 'diseno' ? 'drawer' : 'none';
}

// El token de vista previa dura 1 h; se renueva a los 45 min.
let cached: { url: string; at: number; path: string } | null = null;

async function previewUrl( path: string ): Promise<string> {
	if ( cached && cached.path === path && Date.now() - cached.at < 45 * 60_000 ) {
		return cached.url;
	}
	const { url } = await api<{ url: string }>( 'preview', 'POST', { path } );
	cached = { url, at: Date.now(), path };
	return url;
}

/**
 * Vista previa en vivo: el sitio real (con el borrador) dentro de un marco de celular. El iframe es
 * del mismo origen, así que se pueden abrir el panel o el buscador tocando sus botones desde aquí.
 */
export function Preview() {
	const nonce = useStore( ( s ) => s.previewNonce );
	const saving = useStore( ( s ) => s.saving );
	const pending = useStore( ( s ) => Object.keys( s.pending ).length > 0 );
	const route = useRouter( ( s ) => s.route );
	const [ device, setDevice ] = useState<Device>( 'iphone' );
	const [ open, setOpen ] = useState<Open>( modeFor( route ) );
	const [ path, setPath ] = useState( '/' );
	const [ src, setSrc ] = useState( '' );
	const [ error, setError ] = useState( '' );
	const [ loading, setLoading ] = useState( true );
	const frame = useRef<HTMLIFrameElement>( null );
	const box = useRef<HTMLDivElement>( null );
	const [ scale, setScale ] = useState( 0.8 );
	const openRef = useRef( open );
	openRef.current = open;

	useEffect( () => {
		let alive = true;
		previewUrl( path ).then(
			( url ) => {
				if ( alive ) {
					setError( '' );
					setLoading( true );
					setSrc( url + ( url.includes( '?' ) ? '&' : '?' ) + '_r=' + nonce );
				}
			},
			( e: Error ) => alive && setError( e.message )
		);
		return () => {
			alive = false;
		};
	}, [ nonce, path ] );

	const dims = DEVICES[ device ];
	useLayoutEffect( () => {
		const el = box.current;
		if ( ! el ) {
			return;
		}
		const update = () => {
			const w = el.clientWidth - 8;
			const h = window.innerHeight - 210;
			setScale( Math.min( 1, w / ( dims.width + 24 ), h / ( dims.height + 24 ) ) );
		};
		update();
		const observer = new ResizeObserver( update );
		observer.observe( el );
		window.addEventListener( 'resize', update );
		return () => {
			observer.disconnect();
			window.removeEventListener( 'resize', update );
		};
	}, [ dims.width, dims.height ] );

	const apply = ( target: Open ) => {
		const doc = frame.current?.contentDocument;
		if ( ! doc ) {
			return;
		}
		const isOpen = ( id: string ) => {
			const el = doc.getElementById( id ) as ( HTMLElement & { open?: boolean } ) | null;
			return !! el && ( el.matches( ':popover-open' ) || el.hasAttribute( 'open' ) );
		};
		const click = ( selector: string ) => ( doc.querySelector( selector ) as HTMLElement | null )?.click();
		const close = ( id: string ) => {
			const el = doc.getElementById( id ) as ( HTMLDialogElement & { hidePopover?: () => void } ) | null;
			if ( ! el ) {
				return;
			}
			if ( el.matches( ':popover-open' ) ) {
				el.hidePopover?.();
			} else if ( el.open ) {
				el.close();
			}
		};
		if ( target === 'drawer' && ! isOpen( 'imm-drawer' ) ) {
			close( 'imm-search' );
			click( '[popovertarget="imm-drawer"]:not([popovertargetaction="hide"])' );
		} else if ( target === 'search' && ! isOpen( 'imm-search' ) ) {
			close( 'imm-drawer' );
			click( '[popovertarget="imm-search"]' );
		} else if ( target === 'none' ) {
			close( 'imm-drawer' );
			close( 'imm-search' );
		}
	};

	// Cada pantalla muestra lo que edita: el panel, el buscador o la página con la barra inferior.
	useEffect( () => {
		const mode = modeFor( route );
		setOpen( mode );
		apply( mode );
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [ route ] );

	const onLoad = () => {
		setLoading( false );
		const doc = frame.current?.contentDocument;
		if ( doc ) {
			// Los enlaces dentro de la vista previa conservan el token (navegar por el sitio sigue mostrando el borrador).
			doc.addEventListener( 'click', ( event ) => {
				const link = ( event.target as HTMLElement ).closest?.( 'a[href]' ) as HTMLAnchorElement | null;
				if ( link && link.origin === window.location.origin && ! link.href.includes( 'imm_preview' ) && cached ) {
					event.preventDefault();
					const token = new URL( cached.url ).searchParams.get( 'imm_preview' ) ?? '';
					const next = new URL( link.href );
					next.searchParams.set( 'imm_preview', token );
					link.ownerDocument.location.href = next.toString();
				}
			} );
		}
		// Dar tiempo al JS del menú (módulo diferido) antes de abrir.
		window.setTimeout( () => apply( openRef.current ), 350 );
	};

	return (
		<div className="imm:flex imm:h-full imm:flex-col imm:gap-3">
			<div className="imm:flex imm:flex-wrap imm:items-center imm:justify-between imm:gap-2">
				<div className="imm:flex imm:items-center imm:gap-2 imm:text-[13px] imm:font-medium imm:text-zinc-700">
					<Smartphone className="imm:size-4" aria-hidden />
					{ __( 'Vista previa' ) }
					{ ( saving || pending || loading ) && <span className="imm:size-1.5 imm:animate-pulse imm:rounded-full imm:bg-amber-500" title={ __( 'Actualizando…' ) } /> }
				</div>
				<div className="imm:flex imm:items-center imm:gap-1">
					<Segmented size="sm" value={ device } onChange={ setDevice } options={ ( Object.keys( DEVICES ) as Device[] ).map( ( d ) => ( { value: d, label: DEVICES[ d ].label } ) ) } />
					<Button size="icon" variant="ghost" title={ __( 'Recargar' ) } onClick={ () => useStore.getState().reloadPreview() }>
						<RotateCw aria-hidden />
					</Button>
					<QrButton path={ path } />
					<Button size="icon" variant="ghost" title={ __( 'Abrir en una pestaña nueva' ) } disabled={ ! src } onClick={ () => window.open( src, '_blank', 'noopener' ) }>
						<ExternalLink aria-hidden />
					</Button>
				</div>
			</div>
			<div className="imm:flex imm:items-center imm:gap-2">
				<Segmented
					size="sm"
					value={ open }
					onChange={ ( v ) => {
						setOpen( v );
						apply( v );
					} }
					options={ [
						{ value: 'none', label: __( 'Página' ) },
						{ value: 'drawer', label: <><MenuIcon aria-hidden />{ __( 'Panel' ) }</> },
						{ value: 'search', label: <><Search aria-hidden />{ __( 'Buscar' ) }</> },
					] }
				/>
				<input
					aria-label={ __( 'Ruta de la página' ) }
					defaultValue={ path }
					onKeyDown={ ( e ) => {
						if ( e.key === 'Enter' ) {
							setPath( ( e.target as HTMLInputElement ).value || '/' );
						}
					} }
					onBlur={ ( e ) => setPath( e.target.value || '/' ) }
					className="imm:h-7 imm:min-w-0 imm:flex-1 imm:rounded-md imm:border imm:border-zinc-200 imm:bg-white imm:px-2 imm:font-mono imm:text-xs imm:focus:border-zinc-400 imm:focus:outline-none"
				/>
			</div>
			<div ref={ box } className="imm:flex imm:flex-1 imm:justify-center">
				<div style={ { width: ( dims.width + 24 ) * scale, height: ( dims.height + 24 ) * scale } } className="imm:relative imm:shrink-0">
					<div
						style={ { width: dims.width + 24, height: dims.height + 24, transform: `scale(${ scale })`, transformOrigin: 'top left' } }
						className={ cn( 'imm:absolute imm:top-0 imm:left-0 imm:overflow-hidden imm:bg-zinc-900 imm:p-3 imm:shadow-2xl imm:ring-1 imm:ring-zinc-800', device === 'iphone' ? 'imm:rounded-[52px]' : 'imm:rounded-[36px]' ) }
					>
						<div className={ cn( 'imm:relative imm:flex imm:size-full imm:flex-col imm:overflow-hidden imm:bg-white', device === 'iphone' ? 'imm:rounded-[42px]' : 'imm:rounded-[26px]' ) }>
							<StatusBar device={ device } />
							{ error ? (
								<p className="imm:p-6 imm:text-sm imm:text-red-700">{ error }</p>
							) : (
								src && <iframe ref={ frame } title={ __( 'Vista previa del menú' ) } src={ src } onLoad={ onLoad } className="imm:w-full imm:flex-1 imm:border-0 imm:bg-white" />
							) }
							{ device === 'iphone' && <span aria-hidden className="imm:mx-auto imm:mt-1 imm:mb-2 imm:h-1 imm:w-32 imm:shrink-0 imm:rounded-full imm:bg-zinc-900" /> }
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

/** Barra de estado falsa: el sitio empieza debajo, como en un celular real (sin que la isla tape el contenido). */
function StatusBar( { device }: { device: Device } ) {
	return (
		<div className={ cn( 'imm:relative imm:flex imm:shrink-0 imm:items-center imm:justify-between imm:bg-white imm:px-7 imm:text-[13px] imm:font-semibold imm:text-zinc-900', device === 'iphone' ? 'imm:h-11' : 'imm:h-7 imm:px-5 imm:text-xs' ) }>
			<span>9:41</span>
			{ device === 'iphone' && <span aria-hidden className="imm:absolute imm:top-2 imm:left-1/2 imm:h-6 imm:w-24 imm:-translate-x-1/2 imm:rounded-full imm:bg-zinc-900" /> }
			<span className="imm:flex imm:items-center imm:gap-1">
				<svg viewBox="0 0 18 12" className="imm:h-2.5 imm:w-4" aria-hidden>
					<rect x="0" y="8" width="3" height="4" rx="1" fill="currentColor" />
					<rect x="5" y="5" width="3" height="7" rx="1" fill="currentColor" />
					<rect x="10" y="2" width="3" height="10" rx="1" fill="currentColor" />
					<rect x="15" y="0" width="3" height="12" rx="1" fill="currentColor" />
				</svg>
				<svg viewBox="0 0 26 12" className="imm:h-3 imm:w-6" aria-hidden>
					<rect x="0.5" y="0.5" width="22" height="11" rx="3" fill="none" stroke="currentColor" opacity=".4" />
					<rect x="2" y="2" width="17" height="8" rx="2" fill="currentColor" />
					<rect x="23.5" y="4" width="2" height="4" rx="1" fill="currentColor" opacity=".4" />
				</svg>
			</span>
		</div>
	);
}
