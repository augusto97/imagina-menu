import { HexColorPicker } from 'react-colorful';
import { useEffect, useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { isHex } from '@/lib/color';

export function ColorField( { value, onChange, label }: { value: string; onChange: ( value: string ) => void; label: string } ) {
	const [ text, setText ] = useState( value );
	useEffect( () => setText( value ), [ value ] );
	return (
		<div className="imm:flex imm:items-center imm:gap-2">
			<Popover>
				<PopoverTrigger asChild>
					<button
						type="button"
						aria-label={ label }
						className="imm:size-8 imm:shrink-0 imm:rounded-md imm:border imm:border-zinc-200 imm:shadow-xs imm:ring-1 imm:ring-black/5 imm:ring-inset"
						style={ { background: value } }
					/>
				</PopoverTrigger>
				<PopoverContent className="imm:w-auto imm:p-2">
					<HexColorPicker color={ value } onChange={ onChange } />
				</PopoverContent>
			</Popover>
			<input
				value={ text }
				aria-label={ label }
				spellCheck={ false }
				onChange={ ( e ) => {
					const next = e.target.value.trim();
					setText( next );
					if ( isHex( next ) ) {
						onChange( next.toLowerCase() );
					}
				} }
				onBlur={ () => setText( value ) }
				className="imm:h-8 imm:w-24 imm:rounded-md imm:border imm:border-zinc-200 imm:bg-white imm:px-2 imm:font-mono imm:text-xs imm:uppercase imm:shadow-xs imm:focus:border-zinc-400 imm:focus:outline-none"
			/>
		</div>
	);
}
