import { iconBody, useIcons } from '@/lib/icons';
import { cn } from '@/lib/utils';

/** Pinta un icono de la librería del plugin (Lucide o marca «si-»). */
export function IconView( { name, className }: { name: string; className?: string } ) {
	const lib = useIcons();
	const icon = iconBody( lib, name );
	if ( ! icon ) {
		return <span aria-hidden className={ cn( 'imm:inline-block imm:size-4 imm:shrink-0', className ) } />;
	}
	return icon.brand ? (
		<svg aria-hidden viewBox="0 0 24 24" fill="currentColor" className={ cn( 'imm:size-4 imm:shrink-0', className ) } dangerouslySetInnerHTML={ { __html: icon.body } } />
	) : (
		<svg
			aria-hidden
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth={ 2 }
			strokeLinecap="round"
			strokeLinejoin="round"
			className={ cn( 'imm:size-4 imm:shrink-0', className ) }
			dangerouslySetInnerHTML={ { __html: icon.body } }
		/>
	);
}
