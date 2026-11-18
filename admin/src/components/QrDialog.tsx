import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Check, Copy, Loader2, QrCode, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { encode } from 'uqr';
import { Button } from './ui/button';
import { Notice } from './ui/feedback';
import { api } from '@/lib/api';
import { __ } from '@/lib/i18n';
import { useStore } from '@/lib/store';

/**
 * Código QR de la vista previa firmada (válida 1 h) para abrir el borrador en el celular.
 * El QR se genera aquí mismo: la URL con el token nunca se envía a un servicio externo.
 */
export function QrButton( { path = '/' }: { path?: string } ) {
	const [ open, setOpen ] = useState( false );
	return (
		<>
			<Button size="icon" variant="ghost" title={ __( 'Ver en mi celular' ) } aria-label={ __( 'Ver en mi celular' ) } onClick={ () => setOpen( true ) }>
				<QrCode aria-hidden />
			</Button>
			<QrDialog open={ open } onOpenChange={ setOpen } path={ path } />
		</>
	);
}

export function QrDialog( { open, onOpenChange, path }: { open: boolean; onOpenChange: ( open: boolean ) => void; path: string } ) {
	const [ url, setUrl ] = useState( '' );
	const [ error, setError ] = useState( '' );
	const [ copied, setCopied ] = useState( false );

	useEffect( () => {
		if ( ! open ) {
			return;
		}
		let alive = true;
		setUrl( '' );
		setError( '' );
		// Se guarda lo pendiente para que el celular vea lo mismo que el admin.
		useStore
			.getState()
			.flush()
			.then( () => api<{ url: string }>( 'preview', 'POST', { path } ) )
			.then(
				( r ) => alive && setUrl( r.url ),
				( e: Error ) => alive && setError( e.message )
			);
		return () => {
			alive = false;
		};
	}, [ open, path ] );

	const local = /^https?:\/\/(localhost|127\.|\[::1\]|[^/]+\.(local|test))/i.test( url );

	return (
		<DialogPrimitive.Root open={ open } onOpenChange={ onOpenChange }>
			<DialogPrimitive.Portal>
				<DialogPrimitive.Overlay className="imm-root imm:fixed imm:inset-0 imm:z-[100000] imm:bg-zinc-950/40" />
				<DialogPrimitive.Content className="imm-root imm:fixed imm:top-1/2 imm:left-1/2 imm:z-[100001] imm:w-[min(92vw,380px)] imm:-translate-x-1/2 imm:-translate-y-1/2 imm:rounded-xl imm:border imm:border-zinc-200 imm:bg-white imm:p-6 imm:shadow-2xl">
					<div className="imm:flex imm:items-start imm:justify-between imm:gap-4">
						<div>
							<DialogPrimitive.Title className="imm:text-base imm:font-semibold">{ __( 'Ver en mi celular' ) }</DialogPrimitive.Title>
							<DialogPrimitive.Description className="imm:mt-1 imm:text-[13px] imm:text-zinc-500">
								{ __( 'Escanea con la cámara: abre el sitio con el borrador sin publicar. El enlace caduca en 1 hora.' ) }
							</DialogPrimitive.Description>
						</div>
						<DialogPrimitive.Close asChild>
							<Button size="icon" variant="ghost" aria-label={ __( 'Cerrar' ) }>
								<X aria-hidden />
							</Button>
						</DialogPrimitive.Close>
					</div>
					<div className="imm:mt-5 imm:flex imm:aspect-square imm:items-center imm:justify-center imm:rounded-lg imm:border imm:border-zinc-100 imm:bg-white imm:p-3">
						{ url ? <QrSvg value={ url } /> : error ? null : <Loader2 className="imm:size-6 imm:animate-spin imm:text-zinc-400" aria-label={ __( 'Generando…' ) } /> }
					</div>
					{ error && <Notice level="error" className="imm:mt-3">{ error }</Notice> }
					{ local && <Notice level="warning" className="imm:mt-3">{ __( 'Esta dirección es local: tu celular solo podrá abrirla si está en la misma red y puede resolverla.' ) }</Notice> }
					<div className="imm:mt-4 imm:flex imm:gap-2">
						<Button
							variant="outline"
							className="imm:flex-1"
							disabled={ ! url }
							onClick={ async () => {
								await navigator.clipboard.writeText( url );
								setCopied( true );
								window.setTimeout( () => setCopied( false ), 2000 );
							} }
						>
							{ copied ? <Check aria-hidden /> : <Copy aria-hidden /> }
							{ copied ? __( 'Copiado' ) : __( 'Copiar enlace' ) }
						</Button>
					</div>
				</DialogPrimitive.Content>
			</DialogPrimitive.Portal>
		</DialogPrimitive.Root>
	);
}

/** Dibuja el QR como un solo <path> (un rectángulo por módulo oscuro). */
function QrSvg( { value }: { value: string } ) {
	const { size, d } = useMemo( () => {
		const qr = encode( value, { ecc: 'M', border: 1 } );
		let path = '';
		qr.data.forEach( ( row, y ) =>
			row.forEach( ( dark, x ) => {
				if ( dark ) {
					path += `M${ x } ${ y }h1v1h-1z`;
				}
			} )
		);
		return { size: qr.data.length, d: path };
	}, [ value ] );
	return (
		<svg viewBox={ `0 0 ${ size } ${ size }` } className="imm:size-full" shapeRendering="crispEdges" role="img" aria-label={ __( 'Código QR de la vista previa' ) }>
			<rect width={ size } height={ size } fill="#fff" />
			<path d={ d } fill="#18181b" />
		</svg>
	);
}
