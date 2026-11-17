import { LayoutDashboard, ListTree, Menu as MenuIcon, Palette, PanelLeft, PanelBottom, Search, Settings2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { Preview } from './Preview';
import { TopBar } from './TopBar';
import { config } from '@/lib/config';
import { __ } from '@/lib/i18n';
import { type Route, useRouter } from '@/lib/router';
import { cn } from '@/lib/utils';

const items: { route: Route; label: string; icon: typeof MenuIcon; group?: string }[] = [
	{ route: 'panel', label: __( 'Panel' ), icon: LayoutDashboard },
	{ route: 'menus', label: __( 'Menús' ), icon: MenuIcon, group: __( 'Contenido' ) },
	{ route: 'constructor', label: __( 'Constructor' ), icon: ListTree },
	{ route: 'panel-lateral', label: __( 'Panel lateral' ), icon: PanelLeft, group: __( 'Perfil' ) },
	{ route: 'barra', label: __( 'Barra inferior' ), icon: PanelBottom },
	{ route: 'buscador', label: __( 'Buscador' ), icon: Search },
	{ route: 'diseno', label: __( 'Diseño' ), icon: Palette },
	{ route: 'ajustes', label: __( 'Ajustes' ), icon: Settings2, group: __( 'Sitio' ) },
];

const WITH_PREVIEW: Route[] = [ 'panel', 'constructor', 'panel-lateral', 'barra', 'buscador', 'diseno' ];

export function Layout( { children }: { children: ReactNode } ) {
	const { route, go } = useRouter();
	const preview = WITH_PREVIEW.includes( route );

	return (
		<div className="imm:flex imm:min-h-[calc(100vh-32px)] imm:flex-col imm:bg-zinc-50 imm:md:flex-row">
			<aside className="imm:border-b imm:border-zinc-200 imm:bg-white imm:md:sticky imm:md:top-8 imm:md:h-[calc(100vh-32px)] imm:md:w-52 imm:md:shrink-0 imm:md:border-r imm:md:border-b-0">
				<div className="imm:flex imm:items-center imm:gap-2.5 imm:px-4 imm:py-4">
					<span className="imm:flex imm:size-8 imm:items-center imm:justify-center imm:rounded-lg imm:bg-gradient-to-br imm:from-orange-500 imm:to-rose-500 imm:text-white imm:shadow-sm">
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={ 2.2 } strokeLinecap="round" className="imm:size-4" aria-hidden>
							<rect x="6" y="2.5" width="12" height="19" rx="3" />
							<path d="M9.5 7.5h5M9.5 11h5M9.5 14.5h3" />
						</svg>
					</span>
					<div className="imm:leading-tight">
						<div className="imm:text-sm imm:font-semibold imm:tracking-tight">Imagina Menu</div>
						<div className="imm:text-[11px] imm:text-zinc-500">v{ config.version }</div>
					</div>
				</div>
				<nav aria-label={ __( 'Secciones' ) } className="imm:flex imm:gap-1 imm:overflow-x-auto imm:px-2 imm:pb-3 imm:md:flex-col">
					{ items.map( ( { route: target, label, icon: Icon, group } ) => (
						<div key={ target } className="imm:contents">
							{ group && <div className="imm:hidden imm:px-3 imm:pt-4 imm:pb-1 imm:text-[11px] imm:font-medium imm:tracking-wide imm:text-zinc-400 imm:uppercase imm:md:block">{ group }</div> }
							<a
								href={ `#/${ target }` }
								onClick={ ( event ) => {
									event.preventDefault();
									go( target );
								} }
								aria-current={ route === target ? 'page' : undefined }
								className={ cn(
									'imm:flex imm:items-center imm:gap-2.5 imm:rounded-md imm:px-3 imm:py-2 imm:text-[13px] imm:font-medium imm:whitespace-nowrap imm:text-zinc-600 imm:transition-colors imm:hover:bg-zinc-100 imm:hover:text-zinc-900',
									route === target && 'imm:bg-zinc-900 imm:text-white imm:hover:bg-zinc-900 imm:hover:text-white'
								) }
							>
								<Icon className="imm:size-4" aria-hidden />
								{ label }
							</a>
						</div>
					) ) }
				</nav>
			</aside>
			<div className="imm:flex imm:min-w-0 imm:flex-1 imm:flex-col">
				<TopBar />
				<div className="imm:flex imm:flex-1 imm:gap-6 imm:p-5 imm:md:p-7">
					<main className="imm:@container imm:min-w-0 imm:flex-1">
						<div className="imm:mx-auto imm:max-w-4xl">{ children }</div>
					</main>
					{ preview && (
						<aside className="imm:hidden imm:w-[340px] imm:shrink-0 imm:min-[1400px]:block imm:2xl:w-[400px]">
							<div className="imm:sticky imm:top-[92px] imm:h-[calc(100vh-120px)]">
								<Preview />
							</div>
						</aside>
					) }
				</div>
			</div>
		</div>
	);
}
