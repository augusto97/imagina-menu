import { PageHeader, Row, Section, Segmented, ToggleRow } from '@/components/common';
import { Notice } from '@/components/ui/feedback';
import { __ } from '@/lib/i18n';
import { useRouter } from '@/lib/router';
import { setProfile, useActiveProfile, useStore } from '@/lib/store';

/**
 * Barra superior móvil (app bar): hamburguesa, logo, cuenta, carrito y el buscador siempre a la vista,
 * como Amazon y Mercado Libre. Reemplaza la cabecera móvil del tema (que se oculta con un selector).
 */
export function AppBarScreen() {
	const profile = useActiveProfile();
	const env = useStore( ( s ) => s.env );
	const go = useRouter( ( s ) => s.go );
	if ( ! profile ) {
		return null;
	}
	const a = profile.app_bar;
	const set = ( key: keyof typeof a, value: unknown ) => setProfile( [ 'app_bar', key ], value );

	return (
		<>
			<PageHeader
				title={ __( 'Barra superior' ) }
				description={ __( 'Cabecera tipo app para celulares: menú, logo, cuenta, carrito y el buscador siempre a la vista, como Amazon y Mercado Libre. Es lo que más búsquedas (y ventas) genera.' ) }
			/>
			<div className="imm:flex imm:flex-col imm:gap-5">
				<Section title={ __( 'Barra superior móvil' ) }>
					<ToggleRow label={ __( 'Activar' ) } hint={ __( 'Se ve en el primer pintado, con su alto reservado (no mueve la página). Solo en celulares y tablets.' ) } checked={ a.enabled } onChange={ ( v ) => set( 'enabled', v ) } />
				</Section>
				{ a.enabled && (
					<>
						<Section title={ __( 'Contenido' ) }>
							<ToggleRow label={ __( 'Buscador siempre visible' ) } hint={ __( 'Un campo debajo de la barra que abre el buscador a pantalla completa (con Imagina Search, si está activo).' ) } checked={ a.search } onChange={ ( v ) => set( 'search', v ) } />
							<ToggleRow label={ __( 'Logo del sitio' ) } hint={ env?.has_logo ? undefined : __( 'Tu tema no tiene logo configurado: se muestra el nombre del sitio.' ) } checked={ a.logo } onChange={ ( v ) => set( 'logo', v ) } />
							<ToggleRow label={ __( 'Cuenta' ) } checked={ a.account } onChange={ ( v ) => set( 'account', v ) } />
							{ env?.woo && <ToggleRow label={ __( 'Carrito con contador' ) } hint={ __( 'El contador sale de una cookie: sin peticiones al servidor.' ) } checked={ a.cart } onChange={ ( v ) => set( 'cart', v ) } /> }
						</Section>
						<Section title={ __( 'Al bajar por la página' ) }>
							<Row label={ __( 'Ocultar' ) }>
								<Segmented
									value={ a.hide_on_scroll }
									onChange={ ( v ) => set( 'hide_on_scroll', v ) }
									options={ [
										{ value: 'top', label: __( 'Solo la fila de arriba' ) },
										{ value: 'all', label: __( 'Toda la barra' ) },
										{ value: 'none', label: __( 'Nada' ) },
									] }
								/>
							</Row>
						</Section>
						<Notice level="info">
							{ __( 'Oculta la cabecera móvil de tu tema para no tener dos: Panel lateral → Botón → «Ocultar el menú móvil del tema» (por ejemplo .site-header). Los colores son los de la cabecera del panel (Diseño).' ) }{ ' ' }
							<button type="button" className="imm:underline" onClick={ () => go( 'panel-lateral' ) }>
								{ __( 'Ir a Panel lateral' ) }
							</button>
						</Notice>
					</>
				) }
			</div>
		</>
	);
}
