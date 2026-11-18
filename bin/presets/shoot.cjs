// Capturas de los presets con el panel abierto. Uso:
//   node bin/presets/shoot.cjs <url-base> <carpeta-salida> [preset…] [--sub] [--scale=2]
// Las miniaturas del admin (assets/presets/*.webp) se generan desde estas capturas.
const { chromium } = require( 'playwright' );
const [ base, out, ...rest ] = process.argv.slice( 2 );
const sub = rest.includes( '--sub' );
const scale = Number( ( rest.find( ( a ) => a.startsWith( '--scale=' ) ) || '--scale=2' ).split( '=' )[ 1 ] );
const only = rest.filter( ( a ) => ! a.startsWith( '--' ) );
const all = [ 'marketplace', 'aurora', 'ios', 'editorial', 'material', 'midnight', 'pop', 'app', 'minimal', 'corporate', 'fresh', 'dark' ];
( async () => {
	const browser = await chromium.launch();
	for ( const key of only.length ? only : all ) {
		const page = await ( await browser.newContext( { viewport: { width: 390, height: 844 }, deviceScaleFactor: scale, isMobile: true, hasTouch: true } ) ).newPage();
		const errors = [];
		page.on( 'pageerror', ( e ) => errors.push( String( e ) ) );
		await page.goto( `${ base }/imm-preset-${ key }.html`, { waitUntil: 'networkidle' } );
		await page.evaluate( () => window.immMenu.open() );
		await page.waitForTimeout( 1100 );
		// Abrir por código deja el foco de teclado visible; con un toque real no se ve.
		await page.evaluate( () => document.activeElement && document.activeElement.blur() );
		if ( sub ) {
			await page.click( 'summary:has-text("Celulares")' );
			await page.waitForTimeout( 900 );
		}
		await page.mouse.move( 0, 0 );
		await page.screenshot( { path: `${ out }/${ key }${ sub ? '-sub' : '' }.png` } );
		if ( rest.includes( '--closed' ) ) {
			await page.evaluate( () => window.immMenu.close() );
			await page.waitForTimeout( 600 );
			await page.screenshot( { path: `${ out }/${ key }-closed.png` } );
		}
		console.log( key, errors.length ? errors : 'ok' );
	}
	await browser.close();
} )();
