/**
 * Envío de eventos de analítica (módulo bajo demanda).
 * - Servidor: navigator.sendBeacon a /hit (sin cookies, sin datos personales).
 * - GA4: gtag('event', …) si existe; si no, dataLayer.push para Google Tag Manager.
 */
import type { Cfg } from './core';

const NAMES: Record<string, string> = { click: 'imm_menu_click', bbar: 'imm_bbar_click', open: 'imm_menu_open', search: 'imm_search' };

export function send( cfg: Cfg, e: string, id: string, label: string ): void {
	const a = cfg.a;
	if ( ! a ) return;
	if ( a.s ) {
		try {
			navigator.sendBeacon( a.u, JSON.stringify( { p: cfg.p, e, i: id } ) );
		} catch {}
	}
	if ( a.g ) {
		const w = window as unknown as { gtag?: ( ...args: unknown[] ) => void; dataLayer?: unknown[] };
		const params = { imm_id: id, imm_label: label };
		if ( typeof w.gtag === 'function' ) w.gtag( 'event', NAMES[ e ], params );
		else ( w.dataLayer = w.dataLayer || [] ).push( { event: NAMES[ e ], ...params } );
	}
}
