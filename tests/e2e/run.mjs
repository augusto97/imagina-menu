// Pruebas e2e móviles del frontend. Uso: IMM_URL=http://localhost:8890 npm run test:e2e
// Requiere un WordPress con el plugin activo y los datos de tests/e2e/seed-demo.php.
// Comprueba: apertura con y sin JS, drill-down, gestos de teclado, buscador, barra inferior,
// CLS = 0, nodos DOM añadidos, accesibilidad (axe-core) y errores de consola.
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';

const require = createRequire( import.meta.url );
const { chromium, devices } = require( 'playwright' );
const BASE = process.env.IMM_URL || 'http://localhost:8890';
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

	const opener = ( await page.$( '.imm-fab' ) ) ? '.imm-fab' : '.imm-bbar [data-imm-open]';
	await page.click( opener );
	await page.waitForTimeout( 450 );
	check( await page.evaluate( () => document.getElementById( 'imm-drawer' ).open ), 'El panel abre como diálogo modal' );
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
		check( ( await page.evaluate( () => document.activeElement?.className ) ) === 'imm-s-input', 'El campo de búsqueda recibe el foco' );
		await page.keyboard.press( 'Escape' );
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
	await ctx.addCookies( [ { name: 'imm_cc', value: '3', domain: host, path: '/' } ] );
	const requests = [];
	page.on( 'request', ( r ) => r.url().includes( '/wp-json/' ) || r.url().includes( 'wc-ajax' ) ? requests.push( r.url() ) : null );
	await page.goto( BASE + '/', { waitUntil: 'networkidle' } );
	if ( await page.$( '[data-imm-count="cart"]' ) ) {
		const badge = await page.locator( '[data-imm-count="cart"]' ).first().evaluate( ( el ) => [ el.textContent, el.hidden ] );
		check( badge[ 0 ] === '3' && ! badge[ 1 ], 'Insignia del carrito desde la cookie', badge.join( ' ' ) );
		check( requests.length === 0, 'Sin peticiones AJAX/REST para el carrito', requests.join( ' ' ) );
	}
}

// ── Sin JavaScript ──────────────────────────────────────────────────────────────────────────────
{
	const { page } = await mobile( { javaScriptEnabled: false } );
	await page.goto( BASE + '/' );
	const opener = ( await page.$( '.imm-fab' ) ) ? '.imm-fab' : '.imm-bbar [data-imm-open]';
	if ( await page.$( opener ) ) {
		await page.click( opener );
		await page.waitForTimeout( 400 );
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
