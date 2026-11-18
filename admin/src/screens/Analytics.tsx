import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { BarChart3, Loader2, MousePointerClick, PanelBottom, PanelLeftOpen, Search } from 'lucide-react';
import { Empty, PageHeader, Segmented } from '@/components/common';
import { Button } from '@/components/ui/button';
import { Notice, Skeleton } from '@/components/ui/feedback';
import { Select } from '@/components/ui/input';
import { api, ApiError } from '@/lib/api';
import { config } from '@/lib/config';
import { __ } from '@/lib/i18n';
import { useRouter } from '@/lib/router';
import { useStore } from '@/lib/store';
import type { Stats, StatsDay } from '@/lib/types';
import { cn } from '@/lib/utils';

type Metric = 'open' | 'click' | 'search' | 'bbar';

const METRICS: { key: Metric; label: string; icon: typeof BarChart3; color: string; hint: string }[] = [
	{ key: 'open', label: __( 'Aperturas del panel' ), icon: PanelLeftOpen, color: 'imm:bg-zinc-300', hint: __( 'Veces que se abrió el menú.' ) },
	{ key: 'click', label: __( 'Clics en ítems' ), icon: MousePointerClick, color: 'imm:bg-zinc-900', hint: __( 'Toques en enlaces del panel.' ) },
	{ key: 'search', label: __( 'Búsquedas' ), icon: Search, color: 'imm:bg-orange-500', hint: __( 'Búsquedas enviadas desde el buscador.' ) },
	{ key: 'bbar', label: __( 'Barra inferior' ), icon: PanelBottom, color: 'imm:bg-sky-500', hint: __( 'Toques en la barra inferior.' ) },
];

export function AnalyticsScreen() {
	const settings = useStore( ( s ) => s.settings );
	const profiles = useStore( ( s ) => s.profiles );
	const go = useRouter( ( s ) => s.go );
	const [ days, setDays ] = useState< '7' | '30' | '90' >( '30' );
	const [ profile, setProfile ] = useState( 0 );
	const enabled = !! settings?.analytics.enabled;

	const query = useQuery( {
		queryKey: [ 'stats', days, profile ],
		queryFn: () => api<Stats>( 'stats', 'GET', undefined, { days, profile: profile || undefined } ),
		enabled,
		retry: false,
	} );

	if ( ! settings ) {
		return null;
	}

	const enable = async () => {
		useStore.getState().updateSettings( ( s ) => ( { ...s, analytics: { ...s.analytics, enabled: true } } ) );
		await useStore.getState().flush();
	};

	const header = (
		<PageHeader
			title={ __( 'Analítica' ) }
			description={ __( 'Qué tocan tus visitantes en el menú: para quitar lo que nadie usa y destacar lo que convierte. Sin cookies ni datos personales: solo contadores diarios.' ) }
			actions={
				enabled ? (
					<>
						<Select value={ profile } onChange={ ( e ) => setProfile( Number( e.target.value ) ) } className="imm:h-8 imm:w-44 imm:text-xs" aria-label={ __( 'Perfil' ) }>
							<option value={ 0 }>{ __( 'Todos los perfiles' ) }</option>
							{ profiles.map( ( p ) => (
								<option key={ p.id } value={ p.id }>
									{ p.title }
								</option>
							) ) }
						</Select>
						<Segmented size="sm" value={ days } onChange={ setDays } options={ [ { value: '7', label: __( '7 días' ) }, { value: '30', label: __( '30 días' ) }, { value: '90', label: __( '90 días' ) } ] } />
					</>
				) : undefined
			}
		/>
	);

	if ( ! enabled ) {
		return (
			<>
				{ header }
				<Empty icon={ <BarChart3 aria-hidden /> } title={ __( 'La analítica está apagada' ) }>
					<p>{ __( 'Al activarla, el menú cuenta aperturas, clics por ítem, búsquedas y uso de la barra inferior. Los datos se envían con sendBeacon (no frenan la navegación) y se guardan como totales por día. También puede enviar eventos a Google Analytics 4.' ) }</p>
					<div className="imm:mt-4 imm:flex imm:justify-center imm:gap-2">
						<Button onClick={ enable }>{ __( 'Activar analítica' ) }</Button>
						<Button variant="outline" onClick={ () => go( 'ajustes' ) }>
							{ __( 'Ver opciones' ) }
						</Button>
					</div>
					<p className="imm:mt-3 imm:text-xs">{ __( 'Se aplica al publicar.' ) }</p>
				</Empty>
			</>
		);
	}

	const missing = query.error instanceof ApiError && query.error.status === 404;
	const data = query.data;

	return (
		<>
			{ header }
			<div className="imm:flex imm:flex-col imm:gap-5">
				{ query.isLoading && (
					<div className="imm:grid imm:gap-3 imm:sm:grid-cols-4">
						{ METRICS.map( ( m ) => (
							<Skeleton key={ m.key } className="imm:h-24" />
						) ) }
					</div>
				) }
				{ query.error && <Notice level={ missing ? 'info' : 'error' }>{ missing ? __( 'Las estadísticas aparecerán cuando el servidor tenga datos (publica tras activar la analítica).' ) : query.error.message }</Notice> }
				{ data && (
					<>
						<div className="imm:grid imm:gap-3 imm:sm:grid-cols-2 imm:lg:grid-cols-4">
							{ METRICS.map( ( m ) => (
								<div key={ m.key } className="imm:rounded-xl imm:border imm:border-zinc-200 imm:bg-white imm:p-4 imm:shadow-xs" title={ m.hint }>
									<div className="imm:flex imm:items-center imm:gap-2 imm:text-xs imm:text-zinc-500">
										<m.icon className="imm:size-3.5" aria-hidden />
										{ m.label }
									</div>
									<div className="imm:mt-2 imm:text-2xl imm:font-semibold imm:tracking-tight imm:tabular-nums">{ fmt( data.totals[ m.key ] ?? 0 ) }</div>
								</div>
							) ) }
						</div>

						<div className="imm:rounded-xl imm:border imm:border-zinc-200 imm:bg-white imm:p-5 imm:shadow-xs">
							<div className="imm:mb-4 imm:flex imm:flex-wrap imm:items-center imm:justify-between imm:gap-3">
								<h2 className="imm:text-sm imm:font-semibold">{ __( 'Por día' ) }</h2>
								<div className="imm:flex imm:flex-wrap imm:gap-3">
									{ METRICS.map( ( m ) => (
										<span key={ m.key } className="imm:flex imm:items-center imm:gap-1.5 imm:text-xs imm:text-zinc-600">
											<span className={ cn( 'imm:size-2 imm:rounded-sm', m.color ) } aria-hidden />
											{ m.label }
										</span>
									) ) }
								</div>
							</div>
							<DayChart days={ data.days } />
						</div>

						<div className="imm:grid imm:gap-5 imm:lg:grid-cols-[3fr_2fr]">
							<div className="imm:rounded-xl imm:border imm:border-zinc-200 imm:bg-white imm:shadow-xs">
								<h2 className="imm:border-b imm:border-zinc-100 imm:px-5 imm:py-3.5 imm:text-sm imm:font-semibold">{ __( 'Ítems más tocados' ) }</h2>
								{ data.top.length ? (
									<ol className="imm:divide-y imm:divide-zinc-100">
										{ data.top.map( ( row, i ) => {
											const max = data.top[ 0 ]?.count || 1;
											// El ranking mezcla ítems del panel y de la barra inferior: el porcentaje es sobre el total del ranking.
											const sum = data.top.reduce( ( acc, r ) => acc + r.count, 0 ) || 1;
											const share = Math.round( ( row.count / sum ) * 100 );
											return (
												<li key={ row.id } className="imm:flex imm:items-center imm:gap-3 imm:px-5 imm:py-2.5">
													<span className="imm:w-5 imm:text-right imm:text-xs imm:text-zinc-400 imm:tabular-nums">{ i + 1 }</span>
													<div className="imm:min-w-0 imm:flex-1">
														<div className="imm:flex imm:items-baseline imm:justify-between imm:gap-3">
															<span className="imm:truncate imm:text-[13px] imm:font-medium">{ row.label || row.id }</span>
															<span className="imm:shrink-0 imm:text-xs imm:text-zinc-500 imm:tabular-nums">
																{ fmt( row.count ) } · { share }%
															</span>
														</div>
														<div className="imm:mt-1.5 imm:h-1.5 imm:overflow-hidden imm:rounded-full imm:bg-zinc-100">
															<div className="imm:h-full imm:rounded-full imm:bg-zinc-900" style={ { width: `${ Math.max( 2, ( row.count / max ) * 100 ) }%` } } />
														</div>
													</div>
												</li>
											);
										} ) }
									</ol>
								) : (
									<p className="imm:px-5 imm:py-8 imm:text-center imm:text-[13px] imm:text-zinc-500">{ __( 'Todavía no hay clics registrados en este periodo.' ) }</p>
								) }
							</div>
							<div className="imm:rounded-xl imm:border imm:border-zinc-200 imm:bg-white imm:shadow-xs">
								<div className="imm:border-b imm:border-zinc-100 imm:px-5 imm:py-3.5">
									<h2 className="imm:text-sm imm:font-semibold">{ __( 'Ítems sin clics' ) }</h2>
									<p className="imm:mt-0.5 imm:text-xs imm:text-zinc-500">{ __( 'Candidatos a quitar o mover: menos opciones, decisiones más rápidas.' ) }</p>
								</div>
								{ data.unused.length ? (
									<ul className="imm:flex imm:max-h-80 imm:flex-wrap imm:gap-1.5 imm:overflow-y-auto imm:p-4">
										{ data.unused.map( ( row ) => (
											<li key={ row.id } className="imm:rounded-full imm:border imm:border-zinc-200 imm:bg-zinc-50 imm:px-2.5 imm:py-1 imm:text-xs imm:text-zinc-700">
												{ row.label || row.id }
											</li>
										) ) }
									</ul>
								) : (
									<p className="imm:px-5 imm:py-8 imm:text-center imm:text-[13px] imm:text-zinc-500">{ __( 'Todos los ítems recibieron clics.' ) }</p>
								) }
							</div>
						</div>
					</>
				) }
				{ query.isFetching && ! query.isLoading && <Loader2 className="imm:size-4 imm:animate-spin imm:text-zinc-400" aria-label={ __( 'Actualizando…' ) } /> }

				<div className="imm:rounded-xl imm:border imm:border-zinc-200 imm:bg-white imm:p-5 imm:text-[13px] imm:shadow-xs">
					<h2 className="imm:text-sm imm:font-semibold">Google Analytics 4</h2>
					<p className="imm:mt-1 imm:text-zinc-500">
						{ settings.analytics.ga4
							? __( 'Si tu sitio tiene GA4 o Google Tag Manager, el menú envía estos eventos a dataLayer:' )
							: __( 'El envío a GA4 está apagado (actívalo en Ajustes). Eventos disponibles:' ) }
					</p>
					<ul className="imm:mt-3 imm:grid imm:gap-2 imm:sm:grid-cols-2">
						{ [
							[ 'imm_menu_open', __( 'Se abrió el panel.' ) ],
							[ 'imm_menu_click', __( 'Clic en un ítem (imm_id, imm_label).' ) ],
							[ 'imm_search', __( 'Búsqueda enviada.' ) ],
							[ 'imm_bbar_click', __( 'Toque en la barra inferior.' ) ],
						].map( ( [ name, text ] ) => (
							<li key={ name } className="imm:flex imm:flex-col imm:rounded-lg imm:bg-zinc-50 imm:px-3 imm:py-2">
								<code className="imm:font-mono imm:text-xs imm:font-medium imm:text-zinc-900">{ name }</code>
								<span className="imm:text-xs imm:text-zinc-500">{ text }</span>
							</li>
						) ) }
					</ul>
					{ ! settings.analytics.server && <p className="imm:mt-3 imm:text-xs imm:text-zinc-500">{ __( 'La analítica del servidor está apagada: no se guarda nada en tu base de datos y los gráficos de arriba no se llenan; solo se envían los eventos a GA4.' ) }</p> }
				</div>
			</div>
		</>
	);
}

function fmt( n: number ): string {
	return new Intl.NumberFormat( config.locale || 'es' ).format( n );
}

/** Columnas apiladas por día, en CSS (sin librería de gráficos). */
function DayChart( { days }: { days: StatsDay[] } ) {
	if ( ! days.length ) {
		return <p className="imm:py-8 imm:text-center imm:text-[13px] imm:text-zinc-500">{ __( 'Sin datos en este periodo.' ) }</p>;
	}
	const total = ( d: StatsDay ) => METRICS.reduce( ( sum, m ) => sum + ( d[ m.key ] ?? 0 ), 0 );
	const max = Math.max( 1, ...days.map( total ) );
	const label = ( day: string ) => new Intl.DateTimeFormat( config.locale || 'es', { day: 'numeric', month: 'short' } ).format( new Date( day + 'T12:00:00' ) );
	const every = Math.ceil( days.length / 10 );

	return (
		<div>
			<div className="imm:flex imm:h-44 imm:items-end imm:gap-[2px] imm:border-b imm:border-zinc-200" role="img" aria-label={ __( 'Actividad diaria del menú' ) }>
				{ days.map( ( d ) => (
					<div key={ d.day } className="imm:group imm:relative imm:flex imm:h-full imm:min-w-0 imm:flex-1 imm:flex-col imm:justify-end" title={ `${ label( d.day ) }: ` + METRICS.map( ( m ) => `${ m.label } ${ d[ m.key ] ?? 0 }` ).join( ' · ' ) }>
						<div className="imm:flex imm:flex-col-reverse imm:overflow-hidden imm:rounded-t-sm" style={ { height: `${ ( total( d ) / max ) * 100 }%` } }>
							{ METRICS.map( ( m ) => {
								const v = d[ m.key ] ?? 0;
								return v ? <div key={ m.key } className={ m.color } style={ { height: `${ ( v / total( d ) ) * 100 }%` } } /> : null;
							} ) }
						</div>
						<div className="imm:pointer-events-none imm:absolute imm:inset-0 imm:rounded-t-sm imm:group-hover:bg-zinc-900/5" />
					</div>
				) ) }
			</div>
			<div className="imm:mt-1.5 imm:flex imm:gap-[2px]">
				{ days.map( ( d, i ) => (
					<span key={ d.day } className="imm:min-w-0 imm:flex-1 imm:overflow-visible imm:text-center imm:text-[10px] imm:whitespace-nowrap imm:text-zinc-400">
						{ i % every === 0 ? label( d.day ) : '' }
					</span>
				) ) }
			</div>
		</div>
	);
}
