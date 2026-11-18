// Pruebas e2e móviles del frontend. Uso: IMM_URL=http://localhost:8890 npm run test:e2e
// Requiere un WordPress con el plugin activo y los datos de tests/e2e/seed-demo.php.
// Comprueba: apertura con y sin JS, drill-down, gestos de teclado, buscador, barra inferior,
// CLS = 0, nodos DOM añadidos, accesibilidad (axe-core) y errores de consola.
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';

const require = createRequire( import.meta.url );
const { chromium, devices } = require( 'playwright' );
const BASE = ( process.env.IMM_URL || 'http://localhost:8890' ).replace( /\/$/, '' );
const axe = readFileSync( new URL( '../../node_modules/axe-core/axe.min.js', import.meta.url ), 'utf8' );

let failures = 0;
const check = ( ok, label, extra = '' ) => {
	console.log( `${ ok ? '✔' : '✘' } ${ label }${ extra ? ' — ' + extra : '' }` );
	if ( ! ok ) failures++;
};

const browser = await chromium.launch();

async function mobile( opts = {} ) {
	const ctx = await browser.newContext( { ...devices[ 'Pixel 7' ], deviceScaleFactor: 1, ...opts } );
	const page = await ctx.newPage();
	const errors = [];
	page.on( 'console', ( m ) => m.type() === 'error' && errors.push( m.text() ) );
	page.on( 'pageerror', ( e ) => errors.push( String( e ) ) );
	return { ctx, page, errors };
}

const isOpen = ( page, id ) => page.evaluate( ( i ) => {
	const el = document.getElementById( i );
	return !! el && ( el.open || el.matches( ':popover-open' ) );
}, id );

// ── Con JavaScript ──────────────────────────────────────────────────────────────────────────────
{
	const { page, errors } = await mobile();
	await page.addInitScript( () => {
		window.__cls = 0;
		new PerformanceObserver( ( l ) => {
			for ( const e of l.getEntries() ) if ( ! e.hadRecentInput ) window.__cls += e.value;
		} ).observe( { type: 'layout-shift', buffered: true } );
	} );
	await page.goto( BASE + '/', { waitUntil: 'networkidle' } );

	const nodes = await page.evaluate( () => {
		const parts = [ '#imm-drawer', '#imm-search', '.imm-bbar', '.imm-fab', '.imm-sprite' ];
		return parts.reduce( ( n, s ) => n + [ ...document.querySelectorAll( s ) ].reduce( ( a, el ) => a + 1 + el.querySelectorAll( '*' ).length, 0 ), 0 );
	} );
	check( nodes <= 600, 'Nodos DOM añadidos por el menú', String( nodes ) );

	// El botón flotante solo de escritorio (desktop.floating) no se ve en el celular.
	if ( await page.$( '.imm-appbar' ) ) {
		// Barra superior: al inicio del <body>, fija arriba y con su alto ya reservado (sin saltos).
		const ab = await page.evaluate( () => {
			const a = document.querySelector( '.imm-appbar' );
			return { top: a.getBoundingClientRect().top, h: a.offsetHeight, pad: parseFloat( getComputedStyle( document.body ).paddingTop ), early: [ ...document.body.children ].indexOf( a ) < 3 };
		} );
		check( ab.top === 0 && ab.pad >= ab.h && ab.early, 'Barra superior al inicio, con su alto reservado', JSON.stringify( ab ) );
	}

	const opener = ( await page.$( '.imm-fab:not(.imm-only-desktop)' ) ) ? '.imm-fab:not(.imm-only-desktop)' : ( await page.$( '.imm-bbar [data-imm-open]' ) ) ? '.imm-bbar [data-imm-open]' : '.imm-appbar [data-imm-open]';
	await page.click( opener );
	await page.waitForTimeout( 450 );
	check( await page.evaluate( () => document.getElementById( 'imm-drawer' ).open ), 'El panel abre como diálogo modal' );
	if ( await page.$( '#imm-drawer .imm-banners img' ) ) {
		await page.waitForTimeout( 400 );
		check( await page.evaluate( () => { const i = document.querySelector( '#imm-drawer .imm-banners img' ); return i.complete && i.naturalWidth > 0; } ), 'Banners: la imagen se carga al abrir el panel' );
	}
	check( await page.evaluate( () => document.documentElement.classList.contains( 'imm-lock' ) ), 'Scroll del body bloqueado' );

	if ( await page.$( '#imm-drawer .imm-tp' ) ) {
		const tab = page.locator( '#imm-drawer label.imm-tp-tab' ).nth( 1 );
		await tab.click();
		await page.waitForTimeout( 300 );
		check( await tab.evaluate( ( el ) => el.classList.contains( 'imm-on' ) ), 'Dos columnas: pestaña activa' );
		const visible = await page.evaluate( () => [ ...document.querySelectorAll( '.imm-tp-pane' ) ].filter( ( e ) => getComputedStyle( e ).display !== 'none' ).length );
		check( visible === 1, 'Dos columnas: un solo panel visible' );
		const pending = await page.evaluate( () => document.querySelector( '.imm-tp-r:checked + .imm-tp-pane' ).querySelectorAll( 'img[data-src]' ).length );
		check( pending === 0, 'Dos columnas: imágenes cargadas al seleccionar' );
	} else {
		const firstParent = page.locator( '#imm-drawer .imm-root > .imm-has > details > summary' ).first();
		const parentLabel = ( await firstParent.innerText() ).trim();
		await firstParent.click();
		await page.waitForTimeout( 450 );
		const depth = await page.evaluate( () => document.getElementById( 'imm-drawer' ).dataset.depth );
		check( depth === '1', 'Drill-down al submenú', 'profundidad ' + depth );
		const title = await page.locator( '.imm-level-t' ).innerText();
		check( title.trim() === parentLabel, 'Título del nivel', title );
		check( await page.locator( '.imm-vp > .imm-level[data-pos="cur"] > .imm-all' ).count() === 1, 'Enlace «Ver todo» en el submenú' );

		await page.keyboard.press( 'ArrowLeft' );
		await page.waitForTimeout( 400 );
		check( ( await page.evaluate( () => document.getElementById( 'imm-drawer' ).dataset.depth ) ) === '0', 'Flecha izquierda vuelve un nivel' );
	}

	await page.addScriptTag( { content: axe } );
	const a11y = await page.evaluate( async () => {
		const r = await window.axe.run( '#imm-drawer', { runOnly: [ 'wcag2a', 'wcag2aa', 'wcag22aa' ] } );
		return r.violations.map( ( v ) => `${ v.id } (${ v.nodes.length })` );
	} );
	check( a11y.length === 0, 'Accesibilidad del panel (axe)', a11y.join( ', ' ) );

	await page.keyboard.press( 'Escape' );
	await page.waitForTimeout( 400 );
	check( ! ( await isOpen( page, 'imm-drawer' ) ), 'Esc cierra el panel' );
	check( ! ( await page.evaluate( () => document.documentElement.classList.contains( 'imm-lock' ) ) ), 'Scroll del body liberado' );

	if ( await page.$( '[data-imm-search]' ) ) {
		await page.click( ( await page.$( '.imm-bbar [data-imm-search]' ) ) ? '.imm-bbar [data-imm-search]' : '[data-imm-search]' );
		await page.waitForTimeout( 300 );
		check( await isOpen( page, 'imm-search' ), 'El buscador abre' );
		// Con Imagina Search activo el campo es el de su widget.
		check( [ 'imm-s-input', 'wss-search-input' ].includes( await page.evaluate( () => document.activeElement?.className ) ), 'El campo de búsqueda recibe el foco' );
		if ( await page.$( '#imm-search .wss-search-wrapper' ) ) {
			// Imagina Search: resultados dentro del diálogo, debajo de la cabecera del menú.
			await page.keyboard.type( process.env.IMM_SEARCH || 'pro', { delay: 50 } );
			await page.waitForTimeout( 1500 );
			const r = await page.evaluate( () => {
				const d = document.querySelector( '#imm-search .wss-results-dropdown' );
				const head = document.querySelector( '#imm-search .imm-s-form' ).getBoundingClientRect();
				return { visible: !! d?.classList.contains( 'wss-visible' ), below: ( d?.getBoundingClientRect().top || 0 ) >= head.bottom - 1, back: getComputedStyle( document.querySelector( '#imm-search .wss-mobile-back-btn' ) ).display };
			} );
			check( r.visible && r.below, 'Imagina Search: resultados bajo la cabecera del menú', JSON.stringify( r ) );
			check( r.back === 'none', 'Imagina Search: una sola flecha de regreso (la del menú)' );
			await page.click( '#imm-search .imm-s-back' );
			await page.waitForTimeout( 400 );
			check( ! ( await page.evaluate( () => document.body.classList.contains( 'wss-body-locked' ) ) ), 'Imagina Search: al cerrar se libera el scroll' );
		} else {
			await page.keyboard.press( 'Escape' );
		}
	}

	if ( await page.$( '.imm-bbar' ) ) {
		const pad = await page.evaluate( () => parseFloat( getComputedStyle( document.body ).paddingBottom ) );
		check( pad >= 50, 'Espacio reservado para la barra inferior', pad + 'px' );
		check( ( await page.locator( '.imm-bbar [aria-current="page"]' ).count() ) === 1, 'Ítem activo marcado en la barra (servidor)' );
	}

	await page.evaluate( () => window.scrollTo( 0, 0 ) );
	const cls = await page.evaluate( () => window.__cls );
	check( cls === 0, 'CLS aportado', String( cls ) );
	check( errors.length === 0, 'Sin errores de consola', errors.join( ' | ' ) );
}

// ── Contador del carrito (cookie imm_cc, sin peticiones) ────────────────────────────────────────
{
	const { ctx, page } = await mobile();
	const host = new URL( BASE ).hostname;
	await ctx.addCookies( [ { name: 'imm_cc', value: '3', domain: host, path: '/' }, { name: 'imm_wl', value: '2', domain: host, path: '/' } ] );
	const requests = [];
	page.on( 'request', ( r ) => r.url().includes( '/wp-json/' ) || r.url().includes( 'wc-ajax' ) ? requests.push( r.url() ) : null );
	await page.goto( BASE + '/', { waitUntil: 'networkidle' } );
	if ( await page.$( '[data-imm-count="cart"]' ) ) {
		const badge = await page.locator( '[data-imm-count="cart"]' ).first().evaluate( ( el ) => [ el.textContent, el.hidden ] );
		check( badge[ 0 ] === '3' && ! badge[ 1 ], 'Insignia del carrito desde la cookie', badge.join( ' ' ) );
		check( requests.length === 0, 'Sin peticiones AJAX/REST para el carrito', requests.join( ' ' ) );
		if ( await page.$( '[data-imm-count="wishlist"]' ) ) {
			const wl = await page.locator( '[data-imm-count="wishlist"]' ).first().evaluate( ( el ) => [ el.textContent, el.hidden ] );
			check( wl[ 0 ] === '2' && ! wl[ 1 ], 'Insignia de favoritos desde la cookie', wl.join( ' ' ) );
		}
	}
}

// ── Escritorio (si el perfil lo usa) ────────────────────────────────────────────────────────────
{
	const ctx = await browser.newContext( { viewport: { width: 1366, height: 820 } } );
	const page = await ctx.newPage();
	const errors = [];
	page.on( 'pageerror', ( e ) => errors.push( String( e ) ) );
	await page.goto( BASE + '/', { waitUntil: 'networkidle' } );
	const casc = await page.$( '#imm-drawer.imm-casc' );
	const fab = await page.$( 'button.imm-fab' );
	if ( casc && fab && ( await fab.isVisible() ) ) {
		await fab.click();
		await page.waitForTimeout( 500 );
		const summaries = page.locator( '#imm-drawer .imm-root > li > details > summary' );
		await summaries.first().hover();
		await page.waitForTimeout( 400 );
		const st = await page.evaluate( () => {
			const d = document.querySelector( '#imm-drawer' );
			const cur = d.querySelector( '.imm-vp > .imm-level[data-pos="cur"]:not(.imm-root)' );
			const r = cur?.getBoundingClientRect();
			const panel = d.getBoundingClientRect();
			return { open: !! cur, right: !! r && r.left >= panel.right - 1, rootActive: ! d.querySelector( '.imm-root' ).inert, groups: cur ? cur.querySelectorAll( ':scope > li > details[open]' ).length : 0 };
		} );
		check( st.open && st.right, 'Escritorio: la columna de subcategorías se abre a la derecha', JSON.stringify( st ) );
		check( st.rootActive, 'Escritorio: la lista principal sigue activa' );
		await summaries.nth( 1 ).hover();
		await page.waitForTimeout( 400 );
		check( ( await page.evaluate( () => document.querySelector( '#imm-drawer .imm-sub[data-on]' )?.closest( 'li' ) === document.querySelectorAll( '#imm-drawer .imm-root > li.imm-has' )[ 1 ] ) ), 'Escritorio: pasar el mouse cambia de categoría' );
		await page.keyboard.press( 'Escape' );
		check( errors.length === 0, 'Escritorio: sin errores de consola', errors.join( ' | ' ) );
	} else {
		console.log( '· Escritorio en cascada no activo en este perfil; se omite' );
	}
	await ctx.close();
}

// ── Sin JavaScript ──────────────────────────────────────────────────────────────────────────────
{
	const { page } = await mobile( { javaScriptEnabled: false } );
	await page.goto( BASE + '/' );
	const opener = ( await page.$( '.imm-fab:not(.imm-only-desktop)' ) ) ? '.imm-fab:not(.imm-only-desktop)' : '.imm-bbar [data-imm-open]';
	if ( await page.$( opener ) ) {
		await page.click( opener );
		// Espera a que termine la entrada escalonada (si el estilo la usa): con JS desactivado,
		// Playwright no logra comprobar la estabilidad de un elemento que se está animando.
		await page.waitForTimeout( 1200 );
		check( await isOpen( page, 'imm-drawer' ), 'Sin JS: el panel abre (Popover API)' );
		if ( await page.$( '#imm-drawer .imm-tp' ) ) {
			await page.locator( '#imm-drawer label.imm-tp-tab' ).nth( 1 ).click();
			const visible = await page.evaluate( () => [ ...document.querySelectorAll( '.imm-tp-pane' ) ].filter( ( e ) => getComputedStyle( e ).display !== 'none' ).length );
			check( visible === 1, 'Sin JS: dos columnas funciona (radios + CSS)' );
		} else {
			const summary = page.locator( '#imm-drawer .imm-root > .imm-has > details > summary' ).first();
			await summary.click();
			check( await page.evaluate( () => document.querySelector( '#imm-drawer .imm-root > .imm-has > details' ).open ), 'Sin JS: los submenús funcionan como acordeón' );
		}
		const links = await page.locator( '#imm-drawer a[href]' ).count();
		check( links > 5, 'Enlaces reales en el HTML', String( links ) );
	} else {
		console.log( '· Sin JS: el disparador depende del tema; se omite' );
	}
}

await browser.close();
console.log( failures ? `\n${ failures } prueba(s) fallida(s)` : '\nTodo en verde' );
process.exit( failures ? 1 : 0 );
