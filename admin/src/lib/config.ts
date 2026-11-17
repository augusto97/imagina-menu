export interface AdminConfig {
	restUrl: string;
	nonce: string;
	version: string;
	adminUrl: string;
	locale: string;
	userId: number;
	pluginUrl: string;
	iconsUrl: string;
	tagsUrl: string;
	homeUrl: string;
}

interface WpMediaFrame {
	on: ( event: string, callback: () => void ) => void;
	open: () => void;
	state: () => { get: ( key: string ) => { first: () => { toJSON: () => { id: number; url: string; sizes?: Record<string, { url: string }> } } } };
}

declare global {
	interface Window {
		immAdmin?: Partial<AdminConfig>;
		wp?: {
			i18n?: { __: ( text: string, domain: string ) => string };
			media?: ( options: Record<string, unknown> ) => WpMediaFrame;
		};
	}
}

const fallback: AdminConfig = {
	restUrl: '/wp-json/imagina-menu/v1/',
	nonce: '',
	version: '0.0.0',
	adminUrl: '/wp-admin/',
	locale: 'es',
	userId: 0,
	pluginUrl: '',
	iconsUrl: '',
	tagsUrl: '',
	homeUrl: '/',
};

export const config: AdminConfig = { ...fallback, ...( window.immAdmin ?? {} ) };
