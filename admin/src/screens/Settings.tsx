import { Download, Loader2, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { PageHeader, Row, Section, Segmented, ToggleRow } from '@/components/common';
import { Button } from '@/components/ui/button';
import { Notice } from '@/components/ui/feedback';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { api } from '@/lib/api';
import { __ } from '@/lib/i18n';
import { useStore } from '@/lib/store';
import type { State } from '@/lib/types';
import { downloadFile } from '@/lib/utils';

export function SettingsScreen() {
	const settings = useStore( ( s ) => s.settings );
	const client = useQueryClient();
	const file = useRef<HTMLInputElement>( null );
	const [ withSettings, setWithSettings ] = useState( false );
	const [ busy, setBusy ] = useState( '' );
	const [ message, setMessage ] = useState< { level: 'success' | 'error'; text: string } | null >( null );
	if ( ! settings ) {
		return null;
	}
	const set = <K extends keyof typeof settings>( key: K, value: ( typeof settings )[ K ] ) => useStore.getState().updateSettings( ( s ) => ( { ...s, [ key ]: value } ) );

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

				<Section title={ __( 'Rendimiento' ) }>
					<Row label={ __( 'Carga del JavaScript' ) } hint={ settings.load_js === 'interaction' ? __( 'No se descarga nada hasta el primer toque, tecla o scroll: 0 KB de JS en la carga. El panel abre igual (sin JS) y las animaciones se activan enseguida.' ) : __( 'Módulo diferido de ~4 KB: no bloquea el render.' ) }>
						<Segmented value={ settings.load_js } onChange={ ( v ) => set( 'load_js', v ) } options={ [ { value: 'eager', label: __( 'Diferida' ) }, { value: 'interaction', label: __( 'Al interactuar' ) } ] } />
					</Row>
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
