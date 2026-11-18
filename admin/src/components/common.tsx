import type { ReactNode } from 'react';
import { Switch } from './ui/switch';
import { cn } from '@/lib/utils';

export function PageHeader( { title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode } ) {
	return (
		<div className="imm:mb-6 imm:flex imm:flex-wrap imm:items-end imm:justify-between imm:gap-4">
			<div className="imm:min-w-0">
				<h1 className="imm:text-xl imm:font-semibold imm:tracking-tight imm:text-zinc-900">{ title }</h1>
				{ description && <p className="imm:mt-1 imm:max-w-2xl imm:text-sm imm:text-zinc-500">{ description }</p> }
			</div>
			{ actions && <div className="imm:flex imm:flex-wrap imm:gap-2">{ actions }</div> }
		</div>
	);
}

/** Sección de ajustes: título a la izquierda (en pantallas anchas) y controles a la derecha. */
export function Section( { title, description, children, className }: { title: string; description?: ReactNode; children: ReactNode; className?: string } ) {
	return (
		<section className={ cn( 'imm:rounded-xl imm:border imm:border-zinc-200 imm:bg-white imm:shadow-xs', className ) }>
			<header className="imm:border-b imm:border-zinc-100 imm:px-5 imm:py-3.5">
				<h2 className="imm:text-sm imm:font-semibold imm:text-zinc-900">{ title }</h2>
				{ description && <p className="imm:mt-0.5 imm:text-[13px] imm:text-zinc-500">{ description }</p> }
			</header>
			<div className="imm:divide-y imm:divide-zinc-100">{ children }</div>
		</section>
	);
}

/** Fila de un ajuste: etiqueta + ayuda a la izquierda, control a la derecha. */
export function Row( { label, hint, children, stacked = false, htmlFor }: { label: ReactNode; hint?: ReactNode; children: ReactNode; stacked?: boolean; htmlFor?: string } ) {
	return (
		<div className={ cn( 'imm:flex imm:gap-4 imm:px-5 imm:py-3.5', stacked ? 'imm:flex-col imm:gap-2' : 'imm:items-center imm:justify-between' ) }>
			<div className="imm:min-w-0">
				<label htmlFor={ htmlFor } className="imm:block imm:text-[13px] imm:font-medium imm:text-zinc-800">
					{ label }
				</label>
				{ hint && <p className="imm:mt-0.5 imm:text-xs imm:leading-relaxed imm:text-zinc-500">{ hint }</p> }
			</div>
			<div className={ cn( stacked ? 'imm:w-full' : 'imm:shrink-0' ) }>{ children }</div>
		</div>
	);
}

export function ToggleRow( { label, hint, checked, onChange }: { label: ReactNode; hint?: ReactNode; checked: boolean; onChange: ( value: boolean ) => void } ) {
	return (
		<Row label={ label } hint={ hint }>
			<Switch checked={ checked } onCheckedChange={ onChange } aria-label={ typeof label === 'string' ? label : undefined } />
		</Row>
	);
}

/** Control segmentado (pocas opciones visibles a la vez). */
export function Segmented<T extends string>( { value, options, onChange, size = 'md' }: { value: T; options: { value: T; label: ReactNode; title?: string }[]; onChange: ( value: T ) => void; size?: 'sm' | 'md' } ) {
	return (
		<div role="radiogroup" className="imm:inline-flex imm:self-start imm:flex-wrap imm:gap-0.5 imm:rounded-lg imm:bg-zinc-100 imm:p-0.5">
			{ options.map( ( option ) => (
				<button
					key={ option.value }
					type="button"
					role="radio"
					aria-checked={ value === option.value }
					title={ option.title }
					onClick={ () => onChange( option.value ) }
					className={ cn(
						'imm:inline-flex imm:items-center imm:gap-1.5 imm:rounded-md imm:font-medium imm:text-zinc-600 imm:transition-colors imm:hover:text-zinc-900 imm:[&_svg]:size-3.5',
						size === 'sm' ? 'imm:px-2 imm:py-1 imm:text-xs' : 'imm:px-3 imm:py-1.5 imm:text-[13px]',
						value === option.value && 'imm:bg-white imm:text-zinc-900 imm:shadow-sm'
					) }
				>
					{ option.label }
				</button>
			) ) }
		</div>
	);
}

export function Range( { value, min, max, step = 1, unit = '', onChange, id }: { value: number; min: number; max: number; step?: number; unit?: string; onChange: ( value: number ) => void; id?: string } ) {
	return (
		<div className="imm:flex imm:w-56 imm:items-center imm:gap-3">
			<input
				id={ id }
				type="range"
				min={ min }
				max={ max }
				step={ step }
				value={ value }
				onChange={ ( e ) => onChange( Number( e.target.value ) ) }
				className="imm:h-1.5 imm:flex-1 imm:cursor-pointer imm:accent-zinc-900"
			/>
			<span className="imm:min-w-14 imm:text-right imm:font-mono imm:text-xs imm:whitespace-nowrap imm:tabular-nums imm:text-zinc-600">
				{ value }
				{ unit }
			</span>
		</div>
	);
}

export function KeyValue( { label, children }: { label: string; children: ReactNode } ) {
	return (
		<div className="imm:flex imm:items-baseline imm:justify-between imm:gap-4 imm:border-b imm:border-zinc-100 imm:py-2 imm:last:border-b-0">
			<dt className="imm:text-[13px] imm:text-zinc-500">{ label }</dt>
			<dd className="imm:m-0 imm:text-right imm:text-[13px] imm:font-medium imm:text-zinc-900">{ children }</dd>
		</div>
	);
}

export function StatusDot( { tone }: { tone: 'green' | 'amber' | 'red' | 'zinc' } ) {
	const map = { green: 'imm:bg-emerald-500', amber: 'imm:bg-amber-500', red: 'imm:bg-red-500', zinc: 'imm:bg-zinc-300' };
	return <span aria-hidden className={ cn( 'imm:inline-block imm:size-2 imm:rounded-full', map[ tone ] ) } />;
}

export function Empty( { icon, title, children }: { icon?: ReactNode; title: string; children?: ReactNode } ) {
	return (
		<div className="imm:flex imm:flex-col imm:items-center imm:justify-center imm:gap-2 imm:rounded-xl imm:border imm:border-dashed imm:border-zinc-300 imm:bg-white imm:px-6 imm:py-12 imm:text-center">
			{ icon && <div className="imm:text-zinc-400 imm:[&_svg]:size-6">{ icon }</div> }
			<p className="imm:text-sm imm:font-medium imm:text-zinc-800">{ title }</p>
			{ children && <div className="imm:max-w-sm imm:text-[13px] imm:text-zinc-500">{ children }</div> }
		</div>
	);
}
