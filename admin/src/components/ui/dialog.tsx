import * as DialogPrimitive from '@radix-ui/react-dialog';
import type { ReactNode } from 'react';
import { __ } from '@/lib/i18n';
import { Button } from './button';

interface ConfirmDialogProps {
	open: boolean;
	onOpenChange: ( open: boolean ) => void;
	title: string;
	description: ReactNode;
	confirmLabel: string;
	destructive?: boolean;
	pending?: boolean;
	onConfirm: () => void;
}

/**
 * Confirmación obligatoria para acciones sensibles (docs/04: todo botón destructivo pide confirmación).
 */
export function ConfirmDialog( { open, onOpenChange, title, description, confirmLabel, destructive = false, pending = false, onConfirm }: ConfirmDialogProps ) {
	return (
		<DialogPrimitive.Root open={ open } onOpenChange={ onOpenChange }>
			<DialogPrimitive.Portal>
				<DialogPrimitive.Overlay className="imm-root imm:fixed imm:inset-0 imm:z-[100000] imm:bg-zinc-950/40" />
				<DialogPrimitive.Content className="imm-root imm:fixed imm:top-1/2 imm:left-1/2 imm:z-[100001] imm:w-[min(92vw,440px)] imm:-translate-x-1/2 imm:-translate-y-1/2 imm:rounded-lg imm:border imm:border-zinc-200 imm:bg-white imm:p-6 imm:shadow-lg">
					<DialogPrimitive.Title className="imm:text-base imm:font-semibold">{ title }</DialogPrimitive.Title>
					<DialogPrimitive.Description asChild>
						<div className="imm:mt-2 imm:text-sm imm:text-zinc-600">{ description }</div>
					</DialogPrimitive.Description>
					<div className="imm:mt-6 imm:flex imm:justify-end imm:gap-2">
						<Button variant="outline" onClick={ () => onOpenChange( false ) } disabled={ pending }>
							{ __( 'Cancelar' ) }
						</Button>
						<Button variant={ destructive ? 'destructive' : 'default' } onClick={ onConfirm } disabled={ pending }>
							{ pending ? __( 'Aplicando…' ) : confirmLabel }
						</Button>
					</div>
				</DialogPrimitive.Content>
			</DialogPrimitive.Portal>
		</DialogPrimitive.Root>
	);
}
