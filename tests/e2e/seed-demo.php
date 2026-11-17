<?php
/**
 * Datos de demostración para pruebas locales: wp eval-file tests/e2e/seed-demo.php
 * Crea categorías de WooCommerce en 3 niveles con imágenes generadas, productos y páginas.
 *
 * @package ImaginaMenu
 */

if ( ! defined( 'ABSPATH' ) || ! class_exists( 'WooCommerce' ) ) {
	echo "Requiere WordPress con WooCommerce.\n";
	return;
}

require_once ABSPATH . 'wp-admin/includes/image.php';

$imm_tree = array(
	'Electrónica' => array(
		'Celulares'    => array( 'Samsung', 'Apple', 'Xiaomi', 'Motorola' ),
		'Computadores' => array( 'Portátiles', 'Escritorio', 'Monitores' ),
		'Audio'        => array( 'Audífonos', 'Parlantes' ),
		'Televisores'  => array(),
	),
	'Moda'        => array(
		'Mujer'      => array( 'Vestidos', 'Blusas', 'Zapatos de mujer' ),
		'Hombre'     => array( 'Camisas', 'Pantalones', 'Zapatos de hombre' ),
		'Accesorios' => array( 'Relojes', 'Bolsos' ),
	),
	'Hogar'       => array(
		'Cocina'     => array( 'Ollas', 'Electrodomésticos' ),
		'Decoración' => array(),
		'Muebles'    => array(),
	),
	'Deportes'    => array(
		'Fitness'    => array(),
		'Ciclismo'   => array(),
		'Camping'    => array(),
	),
	'Belleza'     => array(),
	'Juguetes'    => array(),
);

$imm_colors = array( array( 249, 115, 22 ), array( 37, 99, 235 ), array( 22, 163, 74 ), array( 219, 39, 119 ), array( 124, 58, 237 ), array( 8, 145, 178 ) );

$imm_image = function ( string $name, int $i ) use ( $imm_colors ): int {
	$img = imagecreatetruecolor( 200, 200 );
	$c   = $imm_colors[ $i % count( $imm_colors ) ];
	imagefill( $img, 0, 0, imagecolorallocate( $img, $c[0], $c[1], $c[2] ) );
	$white = imagecolorallocate( $img, 255, 255, 255 );
	imagefilledellipse( $img, 100, 100, 120, 120, imagecolorallocatealpha( $img, 255, 255, 255, 90 ) );
	imagestring( $img, 5, 100 - (int) ( strlen( $name ) * 4.5 ), 92, $name, $white );
	$upload = wp_upload_dir();
	$file   = $upload['path'] . '/cat-' . sanitize_title( $name ) . '.png';
	imagepng( $img, $file );
	$id = wp_insert_attachment( array( 'post_mime_type' => 'image/png', 'post_title' => $name, 'post_status' => 'inherit' ), $file );
	wp_update_attachment_metadata( $id, wp_generate_attachment_metadata( $id, $file ) );
	return (int) $id;
};

$imm_n    = 0;
$imm_make = function ( string $name, int $parent ) use ( &$imm_n, $imm_image ): int {
	$existing = get_term_by( 'name', $name, 'product_cat' );
	if ( $existing ) {
		return (int) $existing->term_id;
	}
	$term = wp_insert_term( $name, 'product_cat', array( 'parent' => $parent ) );
	if ( is_wp_error( $term ) ) {
		return 0;
	}
	update_term_meta( $term['term_id'], 'thumbnail_id', $imm_image( $name, $imm_n++ ) );
	update_term_meta( $term['term_id'], 'order', $imm_n );
	return (int) $term['term_id'];
};

foreach ( $imm_tree as $l1 => $l2s ) {
	$id1 = $imm_make( $l1, 0 );
	foreach ( $l2s as $l2 => $l3s ) {
		$id2 = $imm_make( $l2, $id1 );
		foreach ( $l3s as $l3 ) {
			$id3 = $imm_make( $l3, $id2 );
			$p   = new WC_Product_Simple();
			$p->set_name( 'Producto ' . $l3 );
			$p->set_regular_price( (string) wp_rand( 20, 900 ) );
			$p->set_category_ids( array( $id3 ) );
			$p->save();
		}
		if ( ! $l3s ) {
			$p = new WC_Product_Simple();
			$p->set_name( 'Producto ' . $l2 );
			$p->set_regular_price( (string) wp_rand( 20, 900 ) );
			$p->set_category_ids( array( $id2 ) );
			$p->save();
		}
	}
	if ( ! $l2s ) {
		$p = new WC_Product_Simple();
		$p->set_name( 'Producto ' . $l1 );
		$p->set_regular_price( (string) wp_rand( 20, 900 ) );
		$p->set_category_ids( array( $id1 ) );
		$p->save();
	}
}

foreach ( array( 'Contacto', 'Nosotros', 'Preguntas frecuentes' ) as $imm_title ) {
	if ( ! get_page_by_path( sanitize_title( $imm_title ) ) ) {
		wp_insert_post( array( 'post_type' => 'page', 'post_status' => 'publish', 'post_title' => $imm_title, 'post_content' => '<!-- wp:paragraph --><p>' . str_repeat( 'Contenido de ejemplo. ', 80 ) . '</p><!-- /wp:paragraph -->' ) );
	}
}
echo 'Categorías: ' . wp_count_terms( array( 'taxonomy' => 'product_cat' ) ) . "\n";
