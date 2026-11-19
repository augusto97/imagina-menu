import { Download, Loader2, Plus, Upload, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { PageHeader, Range, Row, Section, Segmented, ToggleRow } from '@/components/common';
import { Button } from '@/components/ui/button';
import { Notice } from '@/components/ui/feedback';
import { Input, Textarea } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { api } from '@/lib/api';
import { __ } from '@/lib/i18n';
import { useStore } from '@/lib/store';
import type { State } from '@/lib/types';
import { downloadFile } from '@/lib/utils';
import { ObjectSearch } from './builder/ObjectSearch';

export function SettingsScreen() {
	const settings = useStore( ( s ) => s.settings );
	const env = useStore( ( s ) => s.env );
	const client = useQueryClient();
	const file = useRef<HTMLInputElement>( null );
	const [ withSettings, setWithSettings ] = useState( false );
	const [ busy, setBusy ] = useState( '' );
	const [ message, setMessage ] = useState< { level: 'success' | 'error'; text: string } | null >( null );
	const [ picking, setPicking ] = useState( false );
	const [ picked, setPicked ] = useState< Record<number, string> >( {} );
	if ( ! settings ) {
		return null;
	}
	const set = <K extends keyof typeof settings>( key: K, value: ( typeof settings )[ K ] ) => useStore.getState().updateSettings( ( s ) => ( { ...s, [ key ]: value } ) );
	const setAnalytics = <K extends keyof typeof settings.analytics>( key: K, value: ( typeof settings.analytics )[ K ] ) =>
		useStore.getState().updateSettings( ( s ) => ( { ...s, analytics: { ...s.analytics, [ key ]: value } } ) );
	const a = settings.analytics;
	const ex = settings.exclude;
	const setExclude = <K extends keyof typeof ex>( key: K, value: ( typeof ex )[ K ] ) =>
		useStore.getState().updateSettings( ( s ) => ( { ...s, exclude: { ...s.exclude, [ key ]: value } } ) );
	const pageLabel = ( id: number ) => picked[ id ] ?? env?.rule_labels?.[ 'post:' + id ] ?? '#' + id;
	const depthHint = {
		auto: __( 'Automático: si el menú tiene más de 150 ítems, los niveles desde el tercero van en <template> (no cuentan como DOM hasta que se abren). Con menos, todo va en el HTML.' ),
		full: __( 'Todos los niveles en el HTML: todos los enlaces visibles para Google. Recomendado hasta ~150 ítems.' ),
		hybrid: __( 'Niveles 1 y 2 en el HTML (Google los ve); del tercero hacia abajo en <template>, que se activa al abrir. Para catálogos de cientos de categorías: menos nodos DOM, mejor rendimiento. Las categorías profundas se siguen alcanzando desde sus páginas padre.' ),
	}[ settings.html_depth ];

	const exportAll = async () => {
		setBusy( 'export' );
		try {
			const data = await api<unknown>( 'export' );
			downloadFile( `imagina-menu-${ new Date().toISOString().slice( 0, 10 ) }.json`, JSON.stringify( data, null, 2 ), 'application/json' );
		} finally {
			setBusy( '' );
		}
	};

	const importFile = async ( f: File ) => {
		setBusy( 'import' );
		setMessage( null );
		try {
			const data = JSON.parse( await f.text() ) as Record<string, unknown>;
			const state = await api<State>( 'import', 'POST', { ...data, import_settings: withSettings } );
			client.setQueryData( [ 'state' ], state );
			useStore.getState().hydrate( state );
			setMessage( { level: 'success', text: __( 'Importado. Los perfiles importados quedan desactivados: actívalos y publica cuando estén listos.' ) } );
		} catch ( e ) {
			setMessage( { level: 'error', text: e instanceof SyntaxError ? __( 'El archivo no es un JSON válido.' ) : e instanceof Error ? e.message : String( e ) } );
		} finally {
			setBusy( '' );
			if ( file.current ) {
				file.current.value = '';
			}
		}
	};

	return (
		<>
			<PageHeader title={ __( 'Ajustes' ) } description={ __( 'Opciones globales del sitio. Se aplican al publicar.' ) } />
			<div className="imm:flex imm:flex-col imm:gap-5">
				<Section title={ __( 'Dispositivos' ) }>
					<ToggleRow label={ __( 'Solo en celulares y tablets' ) } hint={ __( 'En pantallas más anchas no se muestran el botón flotante ni la barra inferior. Se decide con CSS, sin detectar el dispositivo en el servidor (compatible con la caché).' ) } checked={ settings.mobile_only } onChange={ ( v ) => set( 'mobile_only', v ) } />
					<Row label={ __( 'Ancho máximo de «móvil»' ) } hint={ __( '1024 px incluye tablets en vertical.' ) }>
						<div className="imm:flex imm:items-center imm:gap-2">
							<Input type="number" min={ 320 } max={ 4000 } value={ settings.breakpoint } onChange={ ( e ) => set( 'breakpoint', Number( e.target.value ) ) } className="imm:w-24" />
							<span className="imm:text-xs imm:text-zinc-500">px</span>
						</div>
					</Row>
				</Section>

				<Section
					title={ __( 'Dónde no se muestra' ) }
					description={ __( 'En estas páginas no se carga nada del menú: ni botones, ni barras, ni CSS, ni JS. Para mostrarlo solo donde tú elijas, dale condiciones al perfil general en Perfiles.' ) }
				>
					<ToggleRow
						label={ __( 'Plantillas en blanco' ) }
						hint={ __( 'Páginas con la plantilla de lienzo o en blanco (Elementor Canvas, «Blank Page» de Divi o de tu tema): las landings sin cabecera del tema. Los editores visuales (Elementor, Divi, Bricks…) nunca muestran el menú.' ) }
						checked={ ex.blank }
						onChange={ ( v ) => setExclude( 'blank', v ) }
					/>
					<ToggleRow
						label={ __( 'Dentro de un iframe de otro sitio' ) }
						hint={ __( 'Si otra web muestra una de tus páginas en un iframe, ahí no aparecen el menú ni las barras (y la cabecera del tema vuelve a verse). Lo decide el navegador: la caché de página no cambia. En tu sitio y en la vista previa se ve normal.' ) }
						checked={ ex.iframes }
						onChange={ ( v ) => setExclude( 'iframes', v ) }
					/>
					<Row label={ __( 'Páginas' ) } hint={ __( 'Páginas, entradas o productos concretos.' ) } stacked>
						<div className="imm:flex imm:flex-wrap imm:items-center imm:gap-1.5">
							{ ex.ids.map( ( id ) => (
								<span key={ id } className="imm:inline-flex imm:items-center imm:gap-1 imm:rounded-full imm:border imm:border-zinc-200 imm:bg-white imm:py-0.5 imm:pr-1 imm:pl-2.5 imm:text-xs imm:text-zinc-700">
									{ pageLabel( id ) }
									<button
										type="button"
										aria-label={ __( 'Quitar' ) + ' ' + pageLabel( id ) }
										onClick={ () => setExclude( 'ids', ex.ids.filter( ( x ) => x !== id ) ) }
										className="imm:rounded-full imm:p-0.5 imm:text-zinc-400 imm:hover:bg-zinc-100 imm:hover:text-zinc-700"
									>
										<X className="imm:size-3" aria-hidden />
									</button>
								</span>
							) ) }
							<Button size="sm" variant="outline" className="imm:h-7" onClick={ () => setPicking( true ) }>
								<Plus aria-hidden />
								{ __( 'Elegir páginas' ) }
							</Button>
							<ObjectSearch
								open={ picking }
								onOpenChange={ setPicking }
								kind="post"
								title={ __( 'Excluir una página' ) }
								placeholder={ __( 'Buscar páginas, entradas o productos…' ) }
								onPick={ ( r ) => {
									setPicked( ( p ) => ( { ...p, [ r.id ]: r.label } ) );
									if ( ! ex.ids.includes( r.id ) ) {
										setExclude( 'ids', [ ...ex.ids, r.id ] );
									}
								} }
							/>
						</div>
					</Row>
					<Row
						label={ __( 'Direcciones (URL)' ) }
						htmlFor="imm-exclude-urls"
						hint={ __( 'Una por línea, solo la ruta. Basta una parte: /landing/ excluye esa página y todo lo que tiene debajo. * es comodín (/promo-*/gracias). «/» sola es la portada.' ) }
						stacked
					>
						<Textarea
							id="imm-exclude-urls"
							rows={ 3 }
							value={ ex.urls }
							onChange={ ( e ) => setExclude( 'urls', e.target.value ) }
							placeholder={ '/landing/\n/gracias-*' }
							spellCheck={ false }
							className="imm:font-mono imm:text-xs"
						/>
					</Row>
				</Section>

				<Section title={ __( 'Rendimiento' ) }>
					<Row label={ __( 'Carga del JavaScript' ) } hint={ settings.load_js === 'interaction' ? __( 'No se descarga nada hasta el primer toque, tecla o scroll: 0 KB de JS en la carga. El panel abre igual (sin JS) y las animaciones se activan enseguida.' ) : __( 'Módulo diferido de ~4 KB: no bloquea el render.' ) }>
						<Segmented value={ settings.load_js } onChange={ ( v ) => set( 'load_js', v ) } options={ [ { value: 'eager', label: __( 'Diferida' ) }, { value: 'interaction', label: __( 'Al interactuar' ) } ] } />
					</Row>
					<Row label={ __( 'Profundidad en el HTML' ) } hint={ depthHint }>
						<Segmented value={ settings.html_depth } onChange={ ( v ) => set( 'html_depth', v ) } options={ [ { value: 'auto', label: __( 'Automática' ) }, { value: 'full', label: __( 'Completa' ) }, { value: 'hybrid', label: __( 'Híbrida' ) } ] } />
					</Row>
					{ env?.imagina_turbo || env?.core_speculation ? (
						<Row label={ __( 'Precarga al tocar' ) } hint={ env?.imagina_turbo ? __( 'Imagina Turbo ya gestiona la navegación instantánea (Speculation Rules): el menú no añade la suya para no duplicar.' ) : __( 'Tu WordPress (6.8 o superior) ya precarga los enlaces al tocarlos en todo el sitio, menú incluido: no hace falta duplicarlo.' ) }>
							<Switch checked={ false } disabled aria-label={ __( 'Precarga al tocar' ) } />
						</Row>
					) : (
						<ToggleRow label={ __( 'Precarga al tocar' ) } hint={ __( 'Al empezar a tocar un enlace del menú, el navegador precarga la página (gana 100–300 ms). No descarga nada que el visitante no vaya a abrir.' ) } checked={ settings.prefetch } onChange={ ( v ) => set( 'prefetch', v ) } />
					) }
				</Section>

				<Section title={ __( 'Analítica' ) } description={ __( 'Contadores sin cookies ni datos personales. Los resultados están en Analítica.' ) }>
					<ToggleRow label={ __( 'Medir el uso del menú' ) } hint={ __( 'Aperturas, clics por ítem, búsquedas y barra inferior. El JS de medición (~1 KB) solo se descarga en el primer toque.' ) } checked={ a.enabled } onChange={ ( v ) => setAnalytics( 'enabled', v ) } />
					{ a.enabled && (
						<>
							<ToggleRow label={ __( 'Guardar en este sitio' ) } hint={ __( 'Totales por día en una tabla propia, con envío por sendBeacon y escritura en lote (no consulta la base de datos en cada clic).' ) } checked={ a.server } onChange={ ( v ) => setAnalytics( 'server', v ) } />
							<ToggleRow label={ __( 'Enviar a Google Analytics 4' ) } hint={ __( 'Eventos a dataLayer (GA4 o Tag Manager) si existe en la página.' ) } checked={ a.ga4 } onChange={ ( v ) => setAnalytics( 'ga4', v ) } />
							<Row label={ __( 'Muestreo' ) } hint={ __( 'Porcentaje de visitas que se miden. Bájalo en sitios con mucho tráfico.' ) }>
								<Range value={ a.sample } min={ 1 } max={ 100 } unit="%" onChange={ ( v ) => setAnalytics( 'sample', v ) } />
							</Row>
							<Row label={ __( 'Conservar los datos' ) } hint={ __( 'Los días más antiguos se borran solos.' ) }>
								<Range value={ a.retention } min={ 30 } max={ 730 } step={ 10 } unit={ ' ' + __( 'días' ) } onChange={ ( v ) => setAnalytics( 'retention', v ) } />
							</Row>
						</>
					) }
				</Section>

				<Section title={ __( 'Datos dinámicos' ) } description={ __( 'Cookies propias, pequeñas y legibles por JS: el HTML sigue siendo cacheable para todos.' ) }>
					<ToggleRow label={ __( 'Contador del carrito' ) } hint={ __( 'Muestra el número de productos sin hacer peticiones al servidor.' ) } checked={ settings.cart_cookie } onChange={ ( v ) => set( 'cart_cookie', v ) } />
					<ToggleRow label={ __( 'Nombre del usuario en páginas en caché' ) } hint={ __( 'Guarda el primer nombre en una cookie al iniciar sesión. Apagado por privacidad: los usuarios conectados normalmente ven su nombre igual.' ) } checked={ settings.name_cookie } onChange={ ( v ) => set( 'name_cookie', v ) } />
				</Section>

				<Section title={ __( 'Exportar e importar' ) } description={ __( 'Menús, perfiles y diseño en un archivo JSON. Útil para copiar la configuración a otro sitio.' ) }>
					<div className="imm:flex imm:flex-col imm:gap-3 imm:px-5 imm:py-4">
						<div className="imm:flex imm:flex-wrap imm:items-center imm:gap-2">
							<Button variant="outline" onClick={ exportAll } disabled={ busy === 'export' }>
								{ busy === 'export' ? <Loader2 className="imm:animate-spin" aria-hidden /> : <Download aria-hidden /> }
								{ __( 'Exportar' ) }
							</Button>
							<Button variant="outline" onClick={ () => file.current?.click() } disabled={ busy === 'import' }>
								{ busy === 'import' ? <Loader2 className="imm:animate-spin" aria-hidden /> : <Upload aria-hidden /> }
								{ __( 'Importar…' ) }
							</Button>
							<label className="imm:ml-2 imm:flex imm:items-center imm:gap-2 imm:text-[13px] imm:text-zinc-700">
								<Switch checked={ withSettings } onCheckedChange={ setWithSettings } />
								{ __( 'Importar también los ajustes globales' ) }
							</label>
							<input ref={ file } type="file" accept="application/json,.json" hidden onChange={ ( e ) => e.target.files?.[ 0 ] && void importFile( e.target.files[ 0 ] ) } />
						</div>
						{ message && <Notice level={ message.level }>{ message.text }</Notice> }
					</div>
				</Section>

				<Section title={ __( 'Avanzado' ) }>
					<ToggleRow label={ __( 'Borrar los datos al desinstalar' ) } hint={ __( 'Menús, perfiles, ajustes y archivos compilados. Si está apagado, desinstalar conserva todo.' ) } checked={ settings.delete_on_uninstall } onChange={ ( v ) => set( 'delete_on_uninstall', v ) } />
					<Row label={ __( 'Ver el sitio sin el menú' ) } hint={ __( 'Para comparar: añade ?imm_off=1 a cualquier URL (solo administradores). Para apagarlo del todo, define IMM_DISABLE en wp-config.php.' ) }>
						<code className="imm:rounded imm:bg-zinc-100 imm:px-2 imm:py-1 imm:font-mono imm:text-xs">?imm_off=1</code>
					</Row>
				</Section>
			</div>
		</>
	);
}
