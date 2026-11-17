import * as SwitchPrimitive from '@radix-ui/react-switch';
import { forwardRef, type ComponentPropsWithoutRef, type ElementRef } from 'react';
import { cn } from '@/lib/utils';

export const Switch = forwardRef<ElementRef<typeof SwitchPrimitive.Root>, ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>>( ( { className, ...props }, ref ) => (
	<SwitchPrimitive.Root
		ref={ ref }
		className={ cn(
			'imm:peer imm:inline-flex imm:h-5 imm:w-9 imm:shrink-0 imm:cursor-pointer imm:items-center imm:rounded-full imm:border-2 imm:border-transparent imm:transition-colors imm:disabled:cursor-not-allowed imm:disabled:opacity-50 imm:data-[state=checked]:bg-zinc-900 imm:data-[state=unchecked]:bg-zinc-200',
			className
		) }
		{ ...props }
	>
		<SwitchPrimitive.Thumb className="imm:pointer-events-none imm:block imm:size-4 imm:rounded-full imm:bg-white imm:shadow imm:transition-transform imm:data-[state=checked]:translate-x-4 imm:data-[state=unchecked]:translate-x-0" />
	</SwitchPrimitive.Root>
) );
Switch.displayName = 'Switch';
