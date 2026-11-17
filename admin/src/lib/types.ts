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
}

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

export type BottomAction = 'link' | 'drawer' | 'search' | 'cart' | 'account' | 'whatsapp' | 'phone' | 'top';

export interface BottomItem {
	id: string;
	action: BottomAction;
	label: string;
	icon: string;
	url: string;
	badge: 'none' | 'cart' | 'custom';
	badge_text: string;
	prominent: boolean;
}

export type Tokens = Record<string, string | number>;

export interface Profile {
	schema_version: number;
	id: number;
	title: string;
	enabled: boolean;
	is_default: boolean;
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
		submenu_mode: 'slide' | 'accordion' | 'two_pane';
		close_position: 'outside' | 'inside' | 'none';
		show_logo: boolean;
		title: string;
		account: boolean;
		search: boolean;
		back_label: string;
		view_all_label: string;
		show_level_title: boolean;
		open_active: boolean;
		remember_level: boolean;
		swipe_close: boolean;
		whatsapp: { enabled: boolean; number: string; message: string; label: string };
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
	};
	search: {
		placeholder: string;
		post_type: 'auto' | 'any' | 'product' | 'post';
		popular: string[];
		recent: boolean;
	};
	design: {
		preset: string;
		color_mode: 'light' | 'dark' | 'auto';
		tokens: Tokens;
		dark_tokens: Tokens;
		custom_css: string;
	};
}

export interface Preset {
	label: string;
	hint: string;
	tokens: Tokens;
	structure: { drawer?: Partial<Profile[ 'drawer' ]>; bottom_bar?: Partial<Profile[ 'bottom_bar' ]> };
}

export interface CompileState {
	ok?: boolean;
	time?: number;
	hash?: string;
	sizes?: { critical: number; css: number; html: number; items: number };
	warnings?: string[];
	error?: string;
	purged?: string[];
}

export interface Env {
	woo: boolean;
	wp_menus: { id: number; name: string; count: number }[];
	theme: { name: string; template: string; selectors: string[] };
	optimizers: { name: string; advice: string }[];
	imagina_turbo: boolean;
	imagina_search: boolean;
	writable: boolean;
	has_logo: boolean;
	license: { protected: boolean; licensed: boolean | null; client_active: boolean; license_page: string; masked_key: string };
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
	children: SourcePreviewItem[];
}
