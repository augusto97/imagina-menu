import { create } from 'zustand';

export type Route = 'panel' | 'menus' | 'constructor' | 'perfiles' | 'panel-lateral' | 'barra' | 'buscador' | 'diseno' | 'analitica' | 'ajustes';

const ROUTES: Route[] = [ 'panel', 'menus', 'constructor', 'perfiles', 'panel-lateral', 'barra', 'buscador', 'diseno', 'analitica', 'ajustes' ];

function fromHash(): { route: Route; param: string } {
	const [ value = '', param = '' ] = window.location.hash.replace( /^#\/?/, '' ).split( '/' );
	return { route: ROUTES.includes( value as Route ) ? ( value as Route ) : 'panel', param };
}

interface RouterState {
	route: Route;
	param: string;
	go: ( route: Route, param?: string ) => void;
}

// Navegación por hash: el admin es una sola página de WordPress (admin.php?page=imagina-menu).
export const useRouter = create<RouterState>( ( set ) => ( {
	...fromHash(),
	go: ( route, param = '' ) => {
		const hash = '#/' + route + ( param ? '/' + param : '' );
		if ( window.location.hash !== hash ) {
			window.location.hash = hash.slice( 1 );
		}
		set( { route, param } );
	},
} ) );

window.addEventListener( 'hashchange', () => useRouter.setState( fromHash() ) );
