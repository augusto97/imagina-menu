import { Plus, X } from 'lucide-react';
import { useState } from 'react';
import { PageHeader, Row, Section, Segmented, ToggleRow } from '@/components/common';
import { Button } from '@/components/ui/button';
import { Notice } from '@/components/ui/feedback';
import { Input } from '@/components/ui/input';
import { __ } from '@/lib/i18n';
import { setProfile, useActiveProfile, useStore } from '@/lib/store';

export function SearchScreen() {
	const profile = useActiveProfile();
	const env = useStore( ( s ) => s.env );
	const [ term, setTerm ] = useState( '' );
	if ( ! profile ) {
		return null;
	}
	const s = profile.search;
	const addTerm = () => {
		const value = term.trim();
		if ( value && ! s.popular.includes( value ) && s.popular.length < 10 ) {
			setProfile( [ 'search', 'popular' ], [ ...s.popular, value ] );
		}
		setTerm( '' );
	};

	return (
		<>
			<PageHeader title={ __( 'Buscador' ) } description={ __( 'Pantalla completa, con el teclado listo al instante. Se abre desde el panel o desde la barra inferior.' ) } />
			{ env?.imagina_search && <Notice level="info" className="imm:mb-4">{ __( 'Imagina Search está activo. Por ahora este buscador envía a la búsqueda estándar del sitio; la integración directa llega en una próxima versión.' ) }</Notice> }
			<div className="imm:flex imm:flex-col imm:gap-5">
				<Section title={ __( 'Campo de búsqueda' ) }>
					<Row label={ __( 'Texto de ejemplo' ) }>
						<Input value={ s.placeholder } onChange={ ( e ) => setProfile( [ 'search', 'placeholder' ], e.target.value ) } className="imm:w-64" />
					</Row>
					<Row label={ __( 'Buscar en' ) } hint={ __( 'Automático: productos si hay WooCommerce; si no, todo el sitio.' ) }>
						<Segmented
							value={ s.post_type }
							onChange={ ( v ) => setProfile( [ 'search', 'post_type' ], v ) }
							options={ [
								{ value: 'auto', label: __( 'Automático' ) },
								{ value: 'product', label: __( 'Productos' ) },
								{ value: 'post', label: __( 'Entradas' ) },
								{ value: 'any', label: __( 'Todo' ) },
							] }
						/>
					</Row>
					<ToggleRow label={ __( 'Búsquedas recientes' ) } hint={ __( 'Se guardan en el navegador del visitante (sin cookies ni servidor).' ) } checked={ s.recent } onChange={ ( v ) => setProfile( [ 'search', 'recent' ], v ) } />
				</Section>
				<Section title={ __( 'Búsquedas populares' ) } description={ __( 'Atajos que se muestran antes de escribir. Inspiran y llevan a tus productos estrella.' ) }>
					<div className="imm:flex imm:flex-col imm:gap-3 imm:px-5 imm:py-4">
						<div className="imm:flex imm:gap-2">
							<Input value={ term } maxLength={ 40 } onChange={ ( e ) => setTerm( e.target.value ) } onKeyDown={ ( e ) => e.key === 'Enter' && addTerm() } placeholder={ __( 'Ej.: audífonos inalámbricos' ) } className="imm:w-72" />
							<Button variant="outline" onClick={ addTerm } disabled={ ! term.trim() || s.popular.length >= 10 }>
								<Plus aria-hidden />
								{ __( 'Añadir' ) }
							</Button>
						</div>
						<div className="imm:flex imm:flex-wrap imm:gap-2">
							{ s.popular.map( ( p ) => (
								<span key={ p } className="imm:inline-flex imm:items-center imm:gap-1 imm:rounded-full imm:border imm:border-zinc-200 imm:bg-zinc-50 imm:py-1 imm:pr-1 imm:pl-3 imm:text-[13px]">
									{ p }
									<button type="button" aria-label={ __( 'Quitar' ) } onClick={ () => setProfile( [ 'search', 'popular' ], s.popular.filter( ( x ) => x !== p ) ) } className="imm:rounded-full imm:p-0.5 imm:text-zinc-400 imm:hover:bg-zinc-200 imm:hover:text-zinc-700">
										<X className="imm:size-3.5" aria-hidden />
									</button>
								</span>
							) ) }
							{ ! s.popular.length && <span className="imm:text-[13px] imm:text-zinc-500">{ __( 'Sin búsquedas populares.' ) }</span> }
						</div>
					</div>
				</Section>
			</div>
		</>
	);
}
