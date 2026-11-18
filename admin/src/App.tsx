import { Loader2 } from 'lucide-react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Layout } from './components/Layout';
import { Notice } from './components/ui/feedback';
import { __ } from './lib/i18n';
import { useAutosave, useBootstrap } from './lib/queries';
import { useRouter } from './lib/router';
import { useStore } from './lib/store';
import { AnalyticsScreen } from './screens/Analytics';
import { BottomBarScreen } from './screens/BottomBar';
import { Builder } from './screens/Builder';
import { Design } from './screens/Design';
import { DrawerScreen } from './screens/Drawer';
import { Menus } from './screens/Menus';
import { Panel } from './screens/Panel';
import { ProfilesScreen } from './screens/Profiles';
import { SearchScreen } from './screens/Search';
import { SettingsScreen } from './screens/Settings';

export function App() {
	const query = useBootstrap();
	useAutosave();
	const loaded = useStore( ( s ) => s.loaded );
	const route = useRouter( ( s ) => s.route );

	if ( query.error && ! loaded ) {
		return (
			<div className="imm:p-8">
				<Notice level="error">{ query.error.message }</Notice>
			</div>
		);
	}
	if ( ! loaded ) {
		return (
			<div className="imm:flex imm:h-[60vh] imm:items-center imm:justify-center imm:gap-2 imm:text-sm imm:text-zinc-500">
				<Loader2 className="imm:size-4 imm:animate-spin" aria-hidden />
				{ __( 'Cargando…' ) }
			</div>
		);
	}

	return (
		<Layout>
			<ErrorBoundary key={ route }>
				{ route === 'panel' && <Panel /> }
				{ route === 'menus' && <Menus /> }
				{ route === 'constructor' && <Builder /> }
				{ route === 'perfiles' && <ProfilesScreen /> }
				{ route === 'panel-lateral' && <DrawerScreen /> }
				{ route === 'barra' && <BottomBarScreen /> }
				{ route === 'buscador' && <SearchScreen /> }
				{ route === 'diseno' && <Design /> }
				{ route === 'analitica' && <AnalyticsScreen /> }
				{ route === 'ajustes' && <SettingsScreen /> }
			</ErrorBoundary>
		</Layout>
	);
}
