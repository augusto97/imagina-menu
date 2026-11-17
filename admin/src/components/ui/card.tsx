import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export function Card( { className, ...props }: HTMLAttributes<HTMLDivElement> ) {
	return <div className={ cn( 'imm:rounded-lg imm:border imm:border-zinc-200 imm:bg-white imm:shadow-xs', className ) } { ...props } />;
}

export function CardHeader( { className, ...props }: HTMLAttributes<HTMLDivElement> ) {
	return <div className={ cn( 'imm:flex imm:flex-col imm:gap-1 imm:p-5 imm:pb-3', className ) } { ...props } />;
}

export function CardTitle( { className, ...props }: HTMLAttributes<HTMLHeadingElement> ) {
	return <h3 className={ cn( 'imm:text-sm imm:font-semibold imm:tracking-tight imm:text-zinc-900', className ) } { ...props } />;
}

export function CardDescription( { className, ...props }: HTMLAttributes<HTMLParagraphElement> ) {
	return <p className={ cn( 'imm:text-[13px] imm:text-zinc-500', className ) } { ...props } />;
}

export function CardContent( { className, ...props }: HTMLAttributes<HTMLDivElement> ) {
	return <div className={ cn( 'imm:p-5 imm:pt-0', className ) } { ...props } />;
}
