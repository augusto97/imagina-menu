<?php
/**
 * Genera una página de demostración por preset (menú de ejemplo con iconos e insignias sobre una
 * tienda ficticia) para revisar el diseño y sacar las miniaturas del admin.
 *
 * Uso: wp eval-file bin/presets/render.php <carpeta-de-salida> [preset] [json-con-cambios-de-estilo]
 *
 * @package ImaginaMenu
 */

use ImaginaMenu\Compiler\CssBuilder;
use ImaginaMenu\Compiler\Renderer;
use ImaginaMenu\Model\Defaults;
use ImaginaMenu\Model\Normalizer;
use ImaginaMenu\Model\Presets;

$imm_out  = rtrim( (string) ( $args[0] ?? '' ), '/' );
$imm_only = (string) ( $args[1] ?? '' );
$imm_mod  = json_decode( (string) ( $args[2] ?? '{}' ), true );
if ( '' === $imm_out || ! is_dir( $imm_out ) ) {
	echo "Carpeta de salida no válida\n";
	return;
}

$imm_kid  = static fn( $label ) => array( 'label' => $label, 'url' => 'https://demo.test/' . sanitize_title( $label ) . '/' );
$imm_menu = Normalizer::menu(
	array(
		'items' => array(
			array( 'label' => 'Ofertas del día', 'icon' => 'flame', 'url' => 'https://demo.test/ofertas/', 'badge' => array( 'text' => '-40 %', 'style' => 'sale' ), 'highlight' => true ),
			array( 'label' => 'Novedades', 'icon' => 'sparkles', 'url' => 'https://demo.test/novedades/', 'badge' => array( 'text' => 'Nuevo', 'style' => 'new' ) ),
			array(
				'type'     => 'heading',
				'label'    => 'Categorías',
				'children' => array(
					array( 'label' => 'Celulares', 'icon' => 'smartphone', 'url' => 'https://demo.test/celulares/', 'children' => array( $imm_kid( 'Samsung' ), $imm_kid( 'Apple' ), $imm_kid( 'Xiaomi' ) ) ),
					array( 'label' => 'Computadores', 'icon' => 'laptop', 'url' => 'https://demo.test/computadores/', 'children' => array( $imm_kid( 'Portátiles' ), $imm_kid( 'Monitores' ) ) ),
					array( 'label' => 'Moda', 'icon' => 'shirt', 'url' => 'https://demo.test/moda/', 'children' => array( $imm_kid( 'Mujer' ), $imm_kid( 'Hombre' ) ) ),
					array( 'label' => 'Hogar y cocina', 'icon' => 'sofa', 'url' => 'https://demo.test/hogar/', 'children' => array( $imm_kid( 'Cocina' ) ) ),
					array( 'label' => 'Deportes', 'icon' => 'dumbbell', 'url' => 'https://demo.test/deportes/' ),
					array( 'label' => 'Belleza', 'icon' => 'flower-2', 'url' => 'https://demo.test/belleza/' ),
				),
			),
			array(
				'type'     => 'heading',
				'label'    => 'Ayuda',
				'children' => array(
					array( 'label' => 'Mis pedidos', 'icon' => 'package', 'url' => 'https://demo.test/pedidos/' ),
					array( 'label' => 'Contacto', 'icon' => 'message-circle', 'url' => 'https://demo.test/contacto/' ),
				),
			),
		),
	)
);

$imm_site = array(
	'name'             => 'Tienda',
	'logo'             => '',
	'home_url'         => 'https://demo.test/',
	'account_url'      => 'https://demo.test/cuenta/',
	'cart_url'         => 'https://demo.test/carrito/',
	'search_post_type' => 'product',
	'cfg'              => '{"p":1,"pf":0}',
);

foreach ( Presets::all() as $imm_key => $imm_preset ) {
	if ( '' !== $imm_only && $imm_only !== $imm_key ) {
		continue;
	}
	$p                         = Defaults::profile();
	$p['id']                   = 1;
	$p['design']['preset']     = $imm_key;
	$p['design']['tokens']     = $imm_preset['tokens'];
	$p['design']['style']      = array_merge( $imm_preset['style'], is_array( $imm_mod ) ? $imm_mod : array() );
	$p['drawer']               = array_merge( $p['drawer'], $imm_preset['structure']['drawer'], array( 'side' => 'left', 'submenu_mode' => 'slide' ) );
	$p['bottom_bar']           = array_merge( $p['bottom_bar'], $imm_preset['structure']['bottom_bar'], array( 'enabled' => true, 'items' => Defaults::suggested_bottom_items( true ) ) );
	$p['bottom_bar']['items'][2]['prominent'] = in_array( $imm_key, array( 'aurora', 'pop', 'app', 'midnight' ), true );
	$p['search']['placeholder'] = 'Buscar productos…';
	$p                         = Normalizer::profile( $p );

	$imm_r     = new Renderer( $p, $imm_site );
	$imm_parts = $imm_r->render( $imm_menu['items'] );
	$imm_css   = CssBuilder::build( $p, Normalizer::settings( array() ) );
	$imm_html  = str_replace( 'href="https://demo.test/novedades/"', 'href="https://demo.test/novedades/" aria-current="page"', $imm_parts['drawer_guest'] . $imm_parts['search'] . $imm_parts['bbar'] );
	$imm_html  = str_replace( 'href="https://demo.test/"', 'href="https://demo.test/" aria-current="page"', $imm_html );

	$imm_page = '<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' . esc_html( $imm_preset['label'] ) . '</title>'
		. '<style>body{margin:0;font-family:system-ui,sans-serif;background:#f6f6f7;color:#111}.hd{display:flex;align-items:center;justify-content:space-between;padding:14px 18px;background:#fff;border-bottom:1px solid #eee;font-weight:800}.hero{margin:16px;height:190px;border-radius:18px;background:linear-gradient(120deg,#ff8a00,#e52e71 45%,#7b2ff7);color:#fff;display:flex;align-items:flex-end;padding:20px;font:800 26px/1.1 system-ui}.grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:16px}.card{height:150px;border-radius:14px;background:linear-gradient(160deg,#ffe0c2,#ffd1dc)}.card:nth-child(2n){background:linear-gradient(160deg,#c9e7ff,#d8ccff)}</style>'
		. '<style>' . $imm_css['critical'] . $imm_css['bbar_space'] . '</style></head><body>'
		. '<div class="hd"><span>Tienda</span><span>☰</span></div><div class="hero">Hasta 50 % en tecnología</div><div class="grid"><div class="card"></div><div class="card"></div><div class="card"></div><div class="card"></div></div>'
		. '<style>' . $imm_css['full'] . '</style>' . $imm_r->icons()->sprite() . $imm_html
		. '<script type="module" src="/wp-content/plugins/imagina-menu/assets/dist/core.js"></script></body></html>';
	file_put_contents( $imm_out . '/imm-preset-' . $imm_key . '.html', $imm_page ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_file_put_contents
	echo $imm_key . "\n";
}
