import { cva, type VariantProps } from 'class-variance-authority';
import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

const badgeVariants = cva( 'imm:inline-flex imm:items-center imm:gap-1 imm:rounded-full imm:border imm:px-2 imm:py-0.5 imm:text-[11px] imm:font-medium imm:leading-4', {
	variants: {
		tone: {
			neutral: 'imm:border-zinc-200 imm:bg-zinc-50 imm:text-zinc-700',
			green: 'imm:border-emerald-200 imm:bg-emerald-50 imm:text-emerald-700',
			amber: 'imm:border-amber-200 imm:bg-amber-50 imm:text-amber-800',
			red: 'imm:border-red-200 imm:bg-red-50 imm:text-red-700',
			blue: 'imm:border-sky-200 imm:bg-sky-50 imm:text-sky-700',
		},
	},
	defaultVariants: { tone: 'neutral' },
} );

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge( { className, tone, ...props }: BadgeProps ) {
	return <span className={ cn( badgeVariants( { tone } ), className ) } { ...props } />;
}
