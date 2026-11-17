import { forwardRef, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

const field = 'imm:w-full imm:rounded-md imm:border imm:border-zinc-200 imm:bg-white imm:px-3 imm:text-sm imm:shadow-xs imm:placeholder:text-zinc-400 imm:focus:border-zinc-400 imm:focus:outline-none imm:disabled:opacity-50';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>( ( { className, ...props }, ref ) => (
	<input ref={ ref } className={ cn( field, 'imm:h-9', className ) } { ...props } />
) );
Input.displayName = 'Input';

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>( ( { className, ...props }, ref ) => (
	<select ref={ ref } className={ cn( field, 'imm:h-9 imm:pr-8', className ) } { ...props } />
) );
Select.displayName = 'Select';

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>( ( { className, ...props }, ref ) => (
	<textarea ref={ ref } className={ cn( field, 'imm:min-h-24 imm:py-2 imm:font-mono imm:text-xs', className ) } { ...props } />
) );
Textarea.displayName = 'Textarea';
