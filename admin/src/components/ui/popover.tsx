import * as PopoverPrimitive from '@radix-ui/react-popover';
import { forwardRef, type ComponentPropsWithoutRef, type ElementRef } from 'react';
import { cn } from '@/lib/utils';

export const Popover = PopoverPrimitive.Root;
export const PopoverTrigger = PopoverPrimitive.Trigger;

export const PopoverContent = forwardRef<ElementRef<typeof PopoverPrimitive.Content>, ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>>(
	( { className, align = 'start', sideOffset = 6, ...props }, ref ) => (
		<PopoverPrimitive.Portal>
			<PopoverPrimitive.Content
				ref={ ref }
				align={ align }
				sideOffset={ sideOffset }
				className={ cn( 'imm-root imm:z-[100002] imm:rounded-lg imm:border imm:border-zinc-200 imm:bg-white imm:p-3 imm:shadow-lg imm:outline-none', className ) }
				{ ...props }
			/>
		</PopoverPrimitive.Portal>
	)
);
PopoverContent.displayName = 'PopoverContent';
