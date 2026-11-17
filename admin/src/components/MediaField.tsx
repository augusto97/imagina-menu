import { ImagePlus, X } from 'lucide-react';
import { Button } from './ui/button';
import { __ } from '@/lib/i18n';

/** Imagen desde la biblioteca de medios de WordPress (wp.media). Guarda {id, url} (tamaño thumbnail). */
export function MediaField( { value, onChange }: { value: { id: number; url: string }; onChange: ( value: { id: number; url: string } ) => void } ) {
	const open = () => {
		const media = window.wp?.media;
		if ( ! media ) {
			return;
		}
		const frame = media( { title: __( 'Elegir imagen' ), button: { text: __( 'Usar imagen' ) }, library: { type: 'image' }, multiple: false } );
		frame.on( 'select', () => {
			const attachment = frame.state().get( 'selection' ).first().toJSON();
			onChange( { id: attachment.id, url: attachment.sizes?.thumbnail?.url ?? attachment.url } );
		} );
		frame.open();
	};
	return (
		<div className="imm:flex imm:items-center imm:gap-3">
			{ value.url ? (
				<img src={ value.url } alt="" className="imm:size-12 imm:rounded-lg imm:border imm:border-zinc-200 imm:object-cover" />
			) : (
				<div className="imm:flex imm:size-12 imm:items-center imm:justify-center imm:rounded-lg imm:border imm:border-dashed imm:border-zinc-300 imm:text-zinc-400">
					<ImagePlus className="imm:size-5" aria-hidden />
				</div>
			) }
			<div className="imm:flex imm:gap-1.5">
				<Button size="sm" variant="outline" onClick={ open } disabled={ ! window.wp?.media }>
					{ value.url ? __( 'Cambiar' ) : __( 'Elegir imagen' ) }
				</Button>
				{ value.url && (
					<Button size="sm" variant="ghost" onClick={ () => onChange( { id: 0, url: '' } ) } aria-label={ __( 'Quitar imagen' ) }>
						<X aria-hidden />
					</Button>
				) }
			</div>
		</div>
	);
}
