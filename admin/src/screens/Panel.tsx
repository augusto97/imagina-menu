import { AlertTriangle, ArrowRight, CheckCircle2, Circle, ExternalLink, Gauge, KeyRound, Puzzle } from 'lucide-react';
import type { ReactNode } from 'react';
import { PageHeader, StatusDot } from '@/components/common';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Notice } from '@/components/ui/feedback';
import { config } from '@/lib/config';
import { __ } from '@/lib/i18n';
import { type Route, useRouter } from '@/lib/router';
import { useActiveProfile, useStore } from '@/lib/store';
import { cn, formatBytes, formatDate } from '@/lib/utils';
import { countItems } from './builder/tree';

/** Presupuesto (docs/03): CSS crítico inline ≤ 1,7 KB gzip (≈ 5,5 KB sin comprimir con los tokens); CSS completo ≤ ~20 KB sin comprimir (≈ 6 KB gzip). */
const BUDGET = { critical: 5632, css: 20480 };

export function Panel() {
	const compile = useStore( ( s ) => s.compile );
	const env = useStore( ( s ) => s.env );
	const drafts = useStore( ( s ) => s.serverDrafts );
	const pending = useStore( ( s ) => Object.keys( s.pending ).length );
	const menus = useStore( ( s ) => s.menus );
	const profile = useActiveProfile();
	const go = useRouter( ( s ) => s.go );
	const menu = menus.find( ( m ) => m.id === profile?.drawer.menu_id );
	const sizes = compile.sizes;

	const steps: { done: boolean; label: string; route: Route }[] = [
		{ done: !! menu && menu.items.length > 0, label: __( 'Arma el menú con tus categorías y páginas' ), route: 'constructor' },
		{ done: profile?.trigger.mode !== 'floating' || !! profile?.hide_theme_selector, label: __( 'Decide cómo se abre (botón del tema o flotante)' ), route: 'panel-lateral' },
		{ done: !! profile?.bottom_bar.enabled, label: __( 'Activa la barra inferior tipo app' ), route: 'barra' },
		{ done: profile?.design.preset !== 'marketplace' || profile?.design.tokens.accent !== '#f97316', label: __( 'Ajusta el diseño a tu marca' ), route: 'diseno' },
		{ done: drafts === 0 && pending === 0 && !! compile.ok, label: __( 'Publica los cambios' ), route: 'panel' },
	];

	return (
		<>
			<PageHeader
				title={ __( 'Panel' ) }
				description={ __( 'Navegación móvil tipo app, rápida y amigable con el SEO.' ) }
				actions={
					<Button variant="outline" asChild>
						<a href={ config.homeUrl } target="_blank" rel="noopener">
							<ExternalLink aria-hidden />
							{ __( 'Ver el sitio' ) }
						</a>
					</Button>
				}
			/>
			<div className="imm:flex imm:flex-col imm:gap-5">
				{ compile.error && <Notice level="error">{ compile.error }</Notice> }
				{ ! env?.writable && <Notice level="warning">{ __( 'wp-content no es escribible: el menú no puede guardar su configuración compilada.' ) }</Notice> }
				{ compile.warnings?.map( ( w ) => (
					<Notice key={ w } level="warning">
						{ w }
					</Notice>
				) ) }

				<div className="imm:grid imm:gap-4 imm:md:grid-cols-2">
					<Card title={ __( 'Estado' ) } icon={ <StatusDot tone={ compile.error ? 'red' : drafts || pending ? 'amber' : 'green' } /> }>
						<dl className="imm:flex imm:flex-col imm:gap-2 imm:text-[13px]">
							<Line label={ __( 'Última publicación' ) }>{ compile.time ? formatDate( compile.time, config.locale ) : '—' }</Line>
							<Line label={ __( 'Perfil en el sitio' ) }>{ profile?.title ?? '—' }</Line>
							<Line label={ __( 'Ítems del menú' ) }>{ sizes?.items ?? ( menu ? countItems( menu.items ) : 0 ) }</Line>
							<Line label={ __( 'Cambios sin publicar' ) }>{ drafts || pending ? <Badge tone="amber">{ __( 'Sí' ) }</Badge> : <Badge tone="green">{ __( 'No' ) }</Badge> }</Line>
						</dl>
					</Card>
					<Card title={ __( 'Peso en cada página' ) } icon={ <Gauge className="imm:size-4 imm:text-zinc-500" aria-hidden /> }>
						<div className="imm:flex imm:flex-col imm:gap-3">
							<Meter label={ __( 'CSS crítico (inline)' ) } value={ sizes?.critical ?? 0 } max={ BUDGET.critical } />
							<Meter label={ __( 'CSS del panel (archivo, no bloquea)' ) } value={ sizes?.css ?? 0 } max={ BUDGET.css } />
							<p className="imm:text-xs imm:text-zinc-500">
								{ __( 'HTML del menú:' ) } { formatBytes( sizes?.html ?? 0, config.locale ) } · { __( 'JS: ~4 KB diferido, 0 jQuery, 0 consultas en el frontend.' ) }
							</p>
						</div>
					</Card>
				</div>

				<Card title={ __( 'Primeros pasos' ) }>
					<ul className="imm:flex imm:flex-col imm:divide-y imm:divide-zinc-100">
						{ steps.map( ( s ) => (
							<li key={ s.label }>
								<button type="button" onClick={ () => go( s.route ) } className="imm:group imm:flex imm:w-full imm:items-center imm:gap-3 imm:py-2.5 imm:text-left">
									{ s.done ? <CheckCircle2 className="imm:size-4 imm:text-emerald-600" aria-hidden /> : <Circle className="imm:size-4 imm:text-zinc-300" aria-hidden /> }
									<span className={ cn( 'imm:flex-1 imm:text-[13px]', s.done ? 'imm:text-zinc-500 imm:line-through' : 'imm:font-medium imm:text-zinc-800' ) }>{ s.label }</span>
									<ArrowRight className="imm:size-4 imm:text-zinc-300 imm:transition-transform imm:group-hover:translate-x-0.5 imm:group-hover:text-zinc-600" aria-hidden />
								</button>
							</li>
						) ) }
					</ul>
				</Card>

				<div className="imm:grid imm:gap-4 imm:md:grid-cols-2">
					<Card title={ __( 'Integraciones' ) } icon={ <Puzzle className="imm:size-4 imm:text-zinc-500" aria-hidden /> }>
						<dl className="imm:flex imm:flex-col imm:gap-2 imm:text-[13px]">
							<Line label="WooCommerce">{ env?.woo ? <Badge tone="green">{ __( 'Detectado' ) }</Badge> : <Badge>{ __( 'No' ) }</Badge> }</Line>
							<Line label="Imagina Turbo">{ env?.imagina_turbo ? <Badge tone="green">{ __( 'Activo' ) }</Badge> : <Badge>{ __( 'No' ) }</Badge> }</Line>
							<Line label="Imagina Search">{ env?.imagina_search ? <Badge tone="green">{ __( 'Activo' ) }{ typeof env.imagina_search === 'string' ? ` · v${ env.imagina_search }` : '' }</Badge> : <Badge>{ __( 'No' ) }</Badge> }</Line>
							<Line label={ __( 'Tema' ) }>{ env?.theme.name }</Line>
							{ compile.purged && compile.purged.length > 0 && <Line label={ __( 'Caché purgada al publicar' ) }>{ compile.purged.join( ', ' ) }</Line> }
						</dl>
					</Card>
					<Card title={ __( 'Licencia' ) } icon={ <KeyRound className="imm:size-4 imm:text-zinc-500" aria-hidden /> }>
						<License />
					</Card>
				</div>

				{ env && env.optimizers.length > 0 && (
					<Card title={ __( 'Plugins de optimización detectados' ) } icon={ <AlertTriangle className="imm:size-4 imm:text-amber-500" aria-hidden /> }>
						<ul className="imm:flex imm:flex-col imm:gap-3">
							{ env.optimizers.map( ( o ) => (
								<li key={ o.name } className="imm:text-[13px]">
									<span className="imm:font-semibold imm:text-zinc-900">{ o.name }: </span>
									<span className="imm:text-zinc-600">{ o.advice }</span>
								</li>
							) ) }
						</ul>
					</Card>
				) }
			</div>
		</>
	);
}

function License() {
	const license = useStore( ( s ) => s.env?.license );
	if ( ! license ) {
		return null;
	}
	if ( ! license.protected ) {
		return <p className="imm:text-[13px] imm:text-zinc-600">{ __( 'Copia de desarrollo: sin protección de licencia (Imagina Updater la añade al publicar la versión premium).' ) }</p>;
	}
	return (
		<dl className="imm:flex imm:flex-col imm:gap-2 imm:text-[13px]">
			<Line label={ __( 'Estado' ) }>{ license.licensed ? <Badge tone="green">{ __( 'Activa' ) }</Badge> : <Badge tone="red">{ __( 'Sin activar' ) }</Badge> }</Line>
			{ license.masked_key && <Line label={ __( 'Clave' ) }>{ license.masked_key }</Line> }
			{ license.license_page && (
				<a className="imm:text-[13px] imm:font-medium imm:text-zinc-900 imm:underline" href={ license.license_page }>
					{ __( 'Gestionar licencia' ) }
				</a>
			) }
		</dl>
	);
}

function Card( { title, icon, children }: { title: string; icon?: ReactNode; children: ReactNode } ) {
	return (
		<section className="imm:rounded-xl imm:border imm:border-zinc-200 imm:bg-white imm:p-5 imm:shadow-xs">
			<h2 className="imm:mb-3 imm:flex imm:items-center imm:gap-2 imm:text-sm imm:font-semibold">
				{ icon }
				{ title }
			</h2>
			{ children }
		</section>
	);
}

function Line( { label, children }: { label: string; children: ReactNode } ) {
	return (
		<div className="imm:flex imm:items-center imm:justify-between imm:gap-3">
			<dt className="imm:text-zinc-500">{ label }</dt>
			<dd className="imm:m-0 imm:text-right imm:font-medium imm:text-zinc-900">{ children }</dd>
		</div>
	);
}

function Meter( { label, value, max }: { label: string; value: number; max: number } ) {
	const ratio = ( value / max ) * 100;
	const pct = Math.min( 100, ratio );
	const tone = ratio > 100 ? 'imm:bg-red-500' : ratio > 80 ? 'imm:bg-amber-500' : 'imm:bg-emerald-500';
	return (
		<div>
			<div className="imm:mb-1 imm:flex imm:justify-between imm:text-xs">
				<span className="imm:text-zinc-600">{ label }</span>
				<span className={ cn( 'imm:font-mono imm:tabular-nums', ratio > 100 ? 'imm:text-red-700' : 'imm:text-zinc-900' ) }>
					{ formatBytes( value, config.locale ) } / { formatBytes( max, config.locale ) }
				</span>
			</div>
			<div className="imm:h-1.5 imm:overflow-hidden imm:rounded-full imm:bg-zinc-100">
				<div className={ cn( 'imm:h-full imm:rounded-full', tone ) } style={ { width: `${ Math.max( 2, pct ) }%` } } />
			</div>
		</div>
	);
}
