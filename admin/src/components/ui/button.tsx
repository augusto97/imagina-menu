import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
	'imm:inline-flex imm:items-center imm:justify-center imm:gap-2 imm:whitespace-nowrap imm:rounded-md imm:text-sm imm:font-medium imm:transition-colors imm:disabled:pointer-events-none imm:disabled:opacity-50 imm:[&_svg]:size-4 imm:[&_svg]:shrink-0',
	{
		variants: {
			variant: {
				default: 'imm:bg-zinc-900 imm:text-white imm:shadow-sm imm:hover:bg-zinc-800',
				destructive: 'imm:bg-red-600 imm:text-white imm:shadow-sm imm:hover:bg-red-700',
				outline: 'imm:border imm:border-zinc-200 imm:bg-white imm:text-zinc-900 imm:shadow-sm imm:hover:bg-zinc-50',
				ghost: 'imm:text-zinc-700 imm:hover:bg-zinc-100 imm:hover:text-zinc-900',
			},
			size: {
				default: 'imm:h-9 imm:px-4',
				sm: 'imm:h-8 imm:px-3 imm:text-xs',
				icon: 'imm:size-8',
			},
		},
		defaultVariants: { variant: 'default', size: 'default' },
	}
);

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
	asChild?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>( ( { className, variant, size, asChild = false, type, ...props }, ref ) => {
	const Comp = asChild ? Slot : 'button';
	return <Comp ref={ ref } type={ asChild ? undefined : type ?? 'button' } className={ cn( buttonVariants( { variant, size } ), className ) } { ...props } />;
} );
Button.displayName = 'Button';
