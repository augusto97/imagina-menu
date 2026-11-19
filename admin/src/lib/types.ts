// Espejo del modelo PHP (src/Model/Defaults.php, Normalizer.php). El servidor siempre normaliza:
// estos tipos solo ayudan a la edición.

export type Level = 'error' | 'warning' | 'info';

export interface Settings {
	breakpoint: number;
	mobile_only: boolean;
	load_js: 'eager' | 'interaction';
	cart_cookie: boolean;
	name_cookie: boolean;
	delete_on_uninstall: boolean;
	/** Niveles desde el 3.º dentro de <template> (catálogos enormes). auto = híbrido si hay > 150 ítems. */
	html_depth: 'auto' | 'full' | 'hybrid';
	/** Precarga el destino al tocar un enlace (se ignora con Imagina Turbo). */
	prefetch: boolean;
	analytics: AnalyticsSettings;
	exclude: ExcludeSettings;
}

/** Dónde no se carga nada del menú (se decide en el servidor por URL, o en el navegador para los iframes). */
export interface ExcludeSettings {
	ids: number[];
	/** Una ruta por línea: la ruta contiene el texto; * es comodín; «/» sola es la portada. */
	urls: string;
	blank: boolean;
	iframes: boolean;
}

export interface AnalyticsSettings {
	enabled: boolean;
	server: boolean;
	ga4: boolean;
	sample: number;
	retention: number;
}

export type RuleType = 'front_page' | 'blog' | 'page' | 'post_type' | 'term' | 'woo' | 'url' | 'logged_in' | 'logged_out' | 'role' | 'language' | 'date';

/** Campaña: fechas en la hora del sitio, formato de <input type="datetime-local"> («2026-11-27T00:00»). */
export interface Window {
	from: string;
	to: string;
}

export interface RuleCondition {
	type: RuleType;
	not: boolean;
	value: string;
	ids: number[];
}

export interface ProfileRules {
	match: 'all' | 'any';
	conditions: RuleCondition[];
}

export type SubmenuMode = 'slide' | 'accordion' | 'two_pane' | 'tabs' | 'grid';

export type ItemType = 'link' | 'heading' | 'divider' | 'source';
export type BadgeStyle = 'new' | 'sale' | 'hot' | 'info';
export type SourceKind = 'wp_menu' | 'woo_categories' | 'taxonomy';

export interface ItemSource {
	kind: SourceKind;
	menu_id: number;
	taxonomy: string;
	parent: number;
	depth: number;
	hide_empty: boolean;
	limit: number;
	orderby: 'menu_order' | 'name' | 'count';
	with_images: boolean;
	/** Términos que no se muestran (con sus hijos). */
	exclude: number[];
}

export interface MenuItem {
	id: string;
	type: ItemType;
	label: string;
	url: string;
	object: { kind: '' | 'post' | 'term'; id: number; type: string };
	icon: string;
	image: { id: number; url: string };
	badge: { text: string; style: BadgeStyle };
	description: string;
	/** El ítem solo aparece entre estas fechas. */
	schedule: Window;
	highlight: boolean;
	view_all: boolean;
	target: '_self' | '_blank';
	rel: string;
	visibility: 'any' | 'logged_in' | 'logged_out';
	css_class: string;
	source: ItemSource;
	children: MenuItem[];
}

export interface Menu {
	schema_version: number;
	id: number;
	title: string;
	items: MenuItem[];
}

export type BottomAction = 'link' | 'drawer' | 'search' | 'cart' | 'account' | 'wishlist' | 'whatsapp' | 'phone' | 'top';

export interface BottomItem {
	id: string;
	action: BottomAction;
	label: string;
	icon: string;
	url: string;
	badge: 'none' | 'cart' | 'wishlist' | 'custom';
	badge_text: string;
	prominent: boolean;
}

export type Tokens = Record<string, string | number>;

/** Estilo visual del panel (design.style). Los valores por defecto vienen del preset elegido. */
export interface DesignStyle {
	panel: 'flat' | 'rounded' | 'floating' | 'glass';
	header: 'solid' | 'gradient' | 'minimal' | 'card' | 'image';
	header_image: { id: number; url: string };
	items: 'list' | 'divided' | 'cards' | 'pills' | 'grouped';
	icons: 'plain' | 'soft' | 'tile' | 'color' | 'none';
	font: 'theme' | 'system' | 'rounded' | 'serif';
	weight: 'regular' | 'medium' | 'semibold';
	headings: 'caps' | 'bold' | 'accent';
	active: 'text' | 'bar' | 'pill';
	chevron: 'chevron' | 'arrow' | 'none';
	badge: 'solid' | 'soft' | 'outline';
	search: 'filled' | 'outline' | 'underline';
	overlay: 'dim' | 'blur';
	shadow: 'none' | 'soft' | 'strong';
	motion: 'smooth' | 'snappy' | 'spring';
	stagger: boolean;
}

export interface Profile {
	schema_version: number;
	id: number;
	title: string;
	enabled: boolean;
	is_default: boolean;
	/** Sin condiciones = perfil general (se aplica en todo el sitio). */
	rules: ProfileRules;
	hide_theme_selector: string;
	trigger: {
		mode: 'floating' | 'theme_selector' | 'manual';
		selector: string;
		icon: 'menu' | 'align-left' | 'layout-grid' | 'grip';
		label: string;
		position: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right';
		offset: number;
		size: number;
		hide_on_scroll: boolean;
	};
	drawer: {
		enabled: boolean;
		menu_id: number;
		side: 'left' | 'right' | 'bottom';
		width: number;
		max_width: number;
		submenu_mode: SubmenuMode;
		/** Menú por idioma (código → id de menú). 0 o ausente = drawer.menu_id. */
		menu_by_lang: Record<string, number>;
		language_switcher: boolean;
		close_position: 'outside' | 'inside' | 'none';
		show_logo: boolean;
		title: string;
		account: boolean;
		search: boolean;
		back_label: string;
		view_all_label: string;
		/** «Ver todo …» al final (recomendado) o al inicio de cada submenú. */
		view_all_position: 'bottom' | 'top';
		show_level_title: boolean;
		open_active: boolean;
		remember_level: boolean;
		swipe_close: boolean;
		whatsapp: {
			enabled: boolean;
			number: string;
			message: string;
			label: string;
			hours: { enabled: boolean; days: number[]; from: string; to: string; off_label: string };
		};
		banners: ( { image: { id: number; url: string }; url: string; alt: string } & Window )[];
		banners_position: 'top' | 'bottom';
		cta: { enabled: boolean; label: string; url: string };
		footer_links: { label: string; url: string; icon: string }[];
		social: { network: string; url: string }[];
	};
	bottom_bar: {
		enabled: boolean;
		items: BottomItem[];
		style: 'labels' | 'icons' | 'active_label';
		indicator: 'pill' | 'line' | 'dot' | 'color';
		shape: 'bar' | 'floating';
		hide_on_scroll: boolean;
		hide_on: string[];
		blur: boolean;
		/** Contadores con colores propios (apagado: los de las insignias en Diseño). */
		badge_custom: boolean;
		badge_bg: string;
		badge_fg: string;
	};
	search: {
		placeholder: string;
		post_type: 'auto' | 'any' | 'product' | 'post';
		popular: string[];
		recent: boolean;
		/** auto: Imagina Search si está activo; native: el buscador propio. */
		provider: 'auto' | 'native';
	};
	app_bar: {
		enabled: boolean;
		logo: boolean;
		/** Otra imagen solo para la barra (url vacía = el logo del sitio). */
		logo_image: { id: number; url: string };
		logo_height: number;
		logo_width: number;
		logo_align: 'left' | 'center';
		/** Selector de la cabecera del tema que se oculta en celulares (requiere edit_css). */
		hide_header: string;
		account: boolean;
		cart: boolean;
		search: boolean;
		hide_on_scroll: 'none' | 'top' | 'all';
		/** Apagado: los colores de la cabecera del panel (Diseño). */
		custom_colors: boolean;
		colors: { bg: string; bg2: string; fg: string; search_bg: string; search_fg: string; badge_bg: string; badge_fg: string };
	};
	desktop: {
		enabled: boolean;
		floating: boolean;
		selector: string;
		width: number;
		layout: 'panel' | 'cascade';
		flyout: number;
		hover: boolean;
		bottom_bar: boolean;
	};
	design: {
		preset: string;
		color_mode: 'light' | 'dark' | 'auto';
		tokens: Tokens;
		dark_tokens: Tokens;
		style: DesignStyle;
		custom_css: string;
	};
}

export interface Preset {
	label: string;
	hint: string;
	tokens: Tokens;
	structure: { drawer?: Partial<Profile[ 'drawer' ]>; bottom_bar?: Partial<Profile[ 'bottom_bar' ]> };
	/** Estilo completo del preset (puede faltar en servidores anteriores a la v0.3). */
	style?: Partial<DesignStyle>;
	/** Captura real del preset (retrato ~1:2, webp) o '' si no existe. */
	thumb?: string;
}

export interface CompileState {
	ok?: boolean;
	time?: number;
	hash?: string;
	sizes?: { critical: number; css: number; html: number; items: number };
	warnings?: string[];
	error?: string;
	purged?: string[];
	languages?: string[];
}

export interface Env {
	woo: boolean;
	wp_menus: { id: number; name: string; count: number }[];
	theme: { name: string; template: string; selectors: string[]; header?: string[] };
	optimizers: { name: string; advice: string }[];
	imagina_turbo: boolean;
	/** Plugin de favoritos activo: YITH o TI Wishlist. */
	wishlist?: 'yith' | 'ti' | '';
	/** Versión de Imagina Search (Woo Smart Search) si está activo; '' si no. */
	imagina_search: string | boolean;
	writable: boolean;
	has_logo: boolean;
	license: { protected: boolean; licensed: boolean | null; client_active: boolean; license_page: string; masked_key: string };
	multilingual?: 'wpml' | 'polylang' | 'translatepress' | '';
	languages?: { code: string; name: string; default: boolean }[];
	post_types?: { slug: string; label: string }[];
	taxonomies?: { slug: string; label: string }[];
	roles?: { slug: string; label: string }[];
	core_speculation?: boolean;
	rule_labels?: Record<string, string>;
	can_edit_css?: boolean;
}

export interface StatsDay {
	day: string;
	open: number;
	click: number;
	search: number;
	bbar: number;
}

export interface Stats {
	days: StatsDay[];
	totals: { open: number; click: number; search: number; bbar: number };
	top: { id: string; label: string; count: number }[];
	unused: { id: string; label: string }[];
	enabled: boolean;
	ga4: boolean;
}

export interface State {
	settings: Settings;
	menus: Menu[];
	profiles: Profile[];
	drafts: number;
	presets: Record<string, Preset>;
	defaults: { item: MenuItem; bottom_item: BottomItem; profile: Profile };
	compile: CompileState;
	dirty: boolean;
	env: Env;
}

export interface SearchResult {
	kind: 'post' | 'term';
	id: number;
	type: string;
	label: string;
	url: string;
	subtitle: string;
	image?: string;
	image_id?: number;
}

export interface SourcePreviewItem {
	label: string;
	url: string;
	image: string;
	/** Id del término (categorías y taxonomías; 0 en menús de WordPress). */
	term_id: number;
	/** Oculto a mano en esta fuente (se muestra tachado en la vista previa). */
	hidden: boolean;
	children: SourcePreviewItem[];
}
