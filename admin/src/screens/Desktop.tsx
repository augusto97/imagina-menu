import { CopyCode, PageHeader, Range, Row, Section, ToggleRow } from '@/components/common';
import { Notice } from '@/components/ui/feedback';
import { Input } from '@/components/ui/input';
import { __ } from '@/lib/i18n';
import { useRouter } from '@/lib/router';
import { setProfile, useActiveProfile, useStore } from '@/lib/store';
import type { Profile } from '@/lib/types';
import { cn } from '@/lib/utils';

type Layout = Profile[ 'desktop' ][ 'layout' ];

/**
 * Escritorio: el mismo menú en computadores. Amazon y Walmart abren el mismo panel del celular con un
 * botón «☰ Todo» en la cabecera; Falabella y Mercado Libre muestran la lista de categorías y, al pasar
 * el mouse, sus subcategorías en una columna ancha a la derecha.
 */
export function DesktopScreen() {
	const profile = useActiveProfile();
	const env = useStore( ( s ) => s.env );
	const settings = useStore( ( s ) => s.settings );
	const go = useRouter( ( s ) => s.go );
	if ( ! profile ) {
		return null;
	}
	const k = profile.desktop;
	const set = ( path: string[], value: unknown ) => setProfile( [ 'desktop', ...path ], value );
	const mode = profile.drawer.submenu_mode;
	const columns = mode === 'two_pane' || mode === 'tabs';
	const cascadeOk = mode === 'slide' || mode === 'grid';
	const bp = settings?.breakpoint ?? 1024;

	return (
		<>
			<PageHeader
				title={ __( 'Escritorio' ) }
				description={ __( 'El mismo menú también en computadores, con un botón como el «☰ Todo» de Amazon o el «Menú» de Falabella.' ) }
			/>
			<div className="imm:flex imm:flex-col imm:gap-5">
				<Section title={ __( 'Menú en escritorio' ) }>
					<ToggleRow
						label={ __( 'Usar el menú también en escritorio' ) }
						hint={ `${ __( 'Escritorio = pantallas de más de' ) } ${ bp } px (${ __( 'se cambia en Ajustes' ) }). ${ __( 'Sin activar, el panel se abre en escritorio solo con el bloque o el shortcode, con el ancho del celular.' ) }` }
						checked={ k.enabled }
						onChange={ ( v ) => set( [ 'enabled' ], v ) }
					/>
				</Section>

				{ k.enabled && (
					<>
						<Section title={ __( 'Estilo' ) } description={ __( 'Cómo se ve el panel en pantallas grandes. En el celular no cambia nada.' ) }>
							<div className="imm:grid imm:gap-3 imm:px-5 imm:py-4 imm:sm:grid-cols-2">
								<LayoutCard
									value="panel"
									current={ k.layout }
									title={ __( 'Panel' ) }
									brands="Amazon, Walmart"
									text={ __( 'El mismo panel del celular, con su ancho de escritorio. Los submenús se deslizan con la flecha de regreso.' ) }
									onPick={ ( v ) => set( [ 'layout' ], v ) }
								/>
								<LayoutCard
									value="cascade"
									current={ k.layout }
									title={ __( 'Cascada' ) }
									brands="Falabella, Mercado Libre"
									text={ __( 'Las categorías quedan a la izquierda y, al pasar el mouse, sus subcategorías se abren en una columna ancha a la derecha, agrupadas.' ) }
									onPick={ ( v ) => set( [ 'layout' ], v ) }
									disabled={ ! cascadeOk }
								/>
							</div>
							{ columns && (
								<div className="imm:px-5 imm:pb-4">
									<Notice level="info">{ __( 'Tu panel usa «dos columnas»: en escritorio ya se ve como Falabella o Temu (categorías a la izquierda y subcategorías con fotos a la derecha). Dale un ancho de 640 px o más.' ) }</Notice>
								</div>
							) }
							{ ! cascadeOk && ! columns && (
								<div className="imm:px-5 imm:pb-4">
									<Notice level="info">{ __( 'La cascada necesita el modo de submenús «deslizante» o «rejilla» (Panel lateral → Submenús).' ) }</Notice>
								</div>
							) }
							<Row label={ __( 'Ancho del panel' ) } hint={ columns ? __( 'Con dos columnas: 640 px o más.' ) : __( 'Amazon usa unos 365 px.' ) }>
								<Range value={ k.width } min={ 280 } max={ 640 } step={ 10 } unit="px" onChange={ ( v ) => set( [ 'width' ], v ) } />
							</Row>
							{ k.layout === 'cascade' && cascadeOk && (
								<Row label={ __( 'Ancho de la columna de subcategorías' ) } hint={ __( 'Con 600 px o más las subcategorías se reparten en varias columnas.' ) }>
									<Range value={ k.flyout } min={ 320 } max={ 1000 } step={ 20 } unit="px" onChange={ ( v ) => set( [ 'flyout' ], v ) } />
								</Row>
							) }
							{ ( ( k.layout === 'cascade' && cascadeOk ) || columns ) && (
								<ToggleRow label={ __( 'Abrir al pasar el mouse' ) } hint={ __( 'Como Falabella. Con clic o con el teclado (flecha derecha) también se abre.' ) } checked={ k.hover } onChange={ ( v ) => set( [ 'hover' ], v ) } />
							) }
						</Section>

						<Section title={ __( 'Botón para abrirlo' ) } description={ __( 'En escritorio el botón va en la cabecera de tu sitio, junto al logo o al menú, como en Amazon.' ) }>
							<div className="imm:flex imm:flex-col imm:gap-2 imm:px-5 imm:py-4">
								<p className="imm:text-[13px] imm:text-zinc-600">
									{ __( 'Opción 1 (recomendada): el bloque «Botón de Imagina Menu» en la plantilla de la cabecera (en «Mostrar en» elige «Solo escritorio»), o este shortcode en Elementor, Greenshift o tu constructor de cabeceras:' ) }
								</p>
								<CopyCode code={ '[imagina_menu_toggle label="Todo" only="desktop"]' } />
								<CopyCode code={ '[imagina_menu_toggle label="Categorías" style="solid" only="desktop"]' } />
								<p className="imm:text-xs imm:text-zinc-500">{ __( 'style: vacío (toma el color de tu cabecera), "solid" (relleno) u "outline" (con borde). only: "desktop" o "mobile".' ) }</p>
							</div>
							<Row
								label={ __( 'Opción 2: un elemento de tu tema' ) }
								hint={ __( 'Por ejemplo el ítem «Categorías» de tu menú principal: en Apariencia → Menús dale la clase CSS imm-open y escribe aquí .imm-open > a. Al hacer clic se abre este panel.' ) }
								stacked
							>
								<Input value={ k.selector } disabled={ env?.can_edit_css === false } onChange={ ( e ) => set( [ 'selector' ], e.target.value ) } placeholder=".imm-open > a" className="imm:font-mono imm:text-xs" />
								{ env?.can_edit_css === false && <p className="imm:text-[12px] imm:text-amber-700">{ __( 'Solo un administrador puede cambiar esto: afecta a todo el sitio, igual que el «CSS adicional» de WordPress.' ) }</p> }
							</Row>
							<ToggleRow label={ __( 'Opción 3: botón flotante también en escritorio' ) } hint={ __( 'El mismo del celular (Panel lateral → Botón). Útil si no puedes editar la cabecera.' ) } checked={ k.floating } onChange={ ( v ) => set( [ 'floating' ], v ) } />
						</Section>

						<Section title={ __( 'Barra inferior' ) }>
							<ToggleRow label={ __( 'Mostrarla también en escritorio' ) } hint={ __( 'Las apps no la usan en pantallas grandes; normalmente se deja apagada.' ) } checked={ k.bottom_bar } onChange={ ( v ) => set( [ 'bottom_bar' ], v ) } />
						</Section>

						<p className="imm:text-xs imm:text-zinc-500">
							{ __( 'Mira el resultado en la vista previa con «Escritorio».' ) }{ ' ' }
							<button type="button" className="imm:underline" onClick={ () => go( 'ajustes' ) }>
								{ __( 'Cambiar el ancho de corte' ) }
							</button>
						</p>
					</>
				) }
			</div>
		</>
	);
}

function LayoutCard( { value, current, title, brands, text, onPick, disabled = false }: { value: Layout; current: Layout; title: string; brands: string; text: string; onPick: ( v: Layout ) => void; disabled?: boolean } ) {
	const on = value === current;
	return (
		<button
			type="button"
			disabled={ disabled }
			aria-pressed={ on }
			onClick={ () => onPick( value ) }
			className={ cn(
				'imm:flex imm:flex-col imm:gap-3 imm:rounded-lg imm:border imm:p-3 imm:text-left imm:transition',
				on ? 'imm:border-zinc-900 imm:ring-1 imm:ring-zinc-900' : 'imm:border-zinc-200 imm:hover:border-zinc-300',
				disabled && 'imm:cursor-not-allowed imm:opacity-50'
			) }
		>
			<Sketch kind={ value } />
			<span>
				<span className="imm:block imm:text-[13px] imm:font-semibold imm:text-zinc-900">
					{ title } <span className="imm:font-normal imm:text-zinc-500">· { brands }</span>
				</span>
				<span className="imm:mt-1 imm:block imm:text-xs imm:leading-relaxed imm:text-zinc-600">{ text }</span>
			</span>
		</button>
	);
}

/** Boceto de una pantalla de escritorio con el panel abierto. */
function Sketch( { kind }: { kind: Layout } ) {
	const rows = [ 0, 1, 2, 3, 4, 5 ];
	return (
		<svg viewBox="0 0 240 120" className="imm:w-full imm:rounded-md imm:bg-zinc-100" aria-hidden>
			<rect x="0" y="0" width="240" height="14" fill="#18181b" />
			<rect x="8" y="4" width="22" height="6" rx="2" fill="#fafafa" />
			<rect x="0" y="14" width="240" height="106" fill="#d4d4d8" opacity=".6" />
			<rect x="0" y="0" width="70" height="120" fill="#fff" />
			<rect x="8" y="8" width="40" height="8" rx="2" fill="#18181b" />
			{ rows.map( ( i ) => (
				<g key={ i }>
					<rect x="8" y={ 26 + i * 14 } width={ 44 - ( i % 3 ) * 6 } height="5" rx="2" fill={ kind === 'cascade' && i === 1 ? '#f97316' : '#a1a1aa' } />
					<rect x="60" y={ 26 + i * 14 } width="4" height="5" rx="1" fill="#d4d4d8" />
				</g>
			) ) }
			{ kind === 'cascade' && (
				<g>
					<rect x="70" y="0" width="120" height="120" fill="#fff" />
					<rect x="70" y="0" width="1" height="120" fill="#e4e4e7" />
					<rect x="80" y="10" width="50" height="7" rx="2" fill="#18181b" />
					{ [ 0, 1 ].map( ( c ) =>
						[ 0, 1, 2, 3, 4 ].map( ( i ) => (
							<rect key={ `${ c }-${ i }` } x={ 80 + c * 55 } y={ 28 + i * 16 } width={ i === 0 ? 34 : 42 - ( i % 2 ) * 10 } height="5" rx="2" fill={ i === 0 ? '#3f3f46' : '#a1a1aa' } />
						) )
					) }
				</g>
			) }
		</svg>
	);
}
