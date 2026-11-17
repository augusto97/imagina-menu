import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';
import type { ReactNode } from 'react';
import type { Level } from '@/lib/types';
import { cn } from '@/lib/utils';

const tones: Record<Level | 'success', string> = {
	error: 'imm:border-red-200 imm:bg-red-50 imm:text-red-800',
	warning: 'imm:border-amber-200 imm:bg-amber-50 imm:text-amber-900',
	info: 'imm:border-zinc-200 imm:bg-zinc-50 imm:text-zinc-700',
	success: 'imm:border-emerald-200 imm:bg-emerald-50 imm:text-emerald-800',
};

const icons = { error: XCircle, warning: AlertTriangle, info: Info, success: CheckCircle2 };

export function Notice( { level, children, className }: { level: Level | 'success'; children: ReactNode; className?: string } ) {
	const Icon = icons[ level ];
	return (
		<div role={ level === 'error' ? 'alert' : 'status' } className={ cn( 'imm:flex imm:items-start imm:gap-2.5 imm:rounded-md imm:border imm:px-3 imm:py-2.5 imm:text-[13px]', tones[ level ], className ) }>
			<Icon className="imm:mt-0.5 imm:size-4 imm:shrink-0" aria-hidden />
			<div className="imm:min-w-0 imm:flex-1">{ children }</div>
		</div>
	);
}

export function Skeleton( { className }: { className?: string } ) {
	return <div className={ cn( 'imm:animate-pulse imm:rounded-md imm:bg-zinc-100', className ) } />;
}
