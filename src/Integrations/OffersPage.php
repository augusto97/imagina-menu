<?php
declare(strict_types=1);

namespace ImaginaMenu\Integrations;

defined( 'ABSPATH' ) || exit;

/**
 * Página «Ofertas» con los productos rebajados de WooCommerce, para el ítem «Ofertas» del menú.
 *
 * WooCommerce no tiene una dirección propia para los productos en oferta: se crea una página con
 * el shortcode nativo [products on_sale="true"] (funciona con temas clásicos y de bloques), que se
 * actualiza sola al poner o quitar precios rebajados. Si ya se creó antes y sigue publicada, se
 * reutiliza (nunca se duplica).
 */
final class OffersPage {

	public const OPTION = 'imm_offers_page';

	public const SHORTCODE = '[products on_sale="true" limit="24" columns="4" paginate="true" orderby="date" order="DESC"]';

	/**
	 * La página de ofertas (existente o nueva).
	 *
	 * @return array{id: int, url: string, title: string, edit_url: string, created: bool}|\WP_Error
	 */
	public static function ensure(): array|\WP_Error {
		if ( ! class_exists( 'WooCommerce' ) ) {
			return new \WP_Error( 'imm_no_woo', __( 'La página de ofertas necesita WooCommerce.', 'imagina-menu' ), array( 'status' => 400 ) );
		}
		$id = (int) get_option( self::OPTION, 0 );
		if ( $id > 0 && 'page' === get_post_type( $id ) && 'publish' === get_post_status( $id ) ) {
			return self::describe( $id, false );
		}
		$id = wp_insert_post(
			array(
				'post_type'    => 'page',
				'post_status'  => 'publish',
				'post_title'   => __( 'Ofertas', 'imagina-menu' ),
				'post_name'    => sanitize_title( _x( 'ofertas', 'slug de la página de ofertas', 'imagina-menu' ) ),
				'post_content' => '<!-- wp:shortcode -->' . self::SHORTCODE . '<!-- /wp:shortcode -->',
				'post_author'  => get_current_user_id(),
			),
			true
		);
		if ( is_wp_error( $id ) ) {
			return $id;
		}
		update_option( self::OPTION, (int) $id, false );
		return self::describe( (int) $id, true );
	}

	/** @return array{id: int, url: string, title: string, edit_url: string, created: bool} */
	private static function describe( int $id, bool $created ): array {
		return array(
			'id'       => $id,
			'url'      => (string) get_permalink( $id ),
			'title'    => get_the_title( $id ),
			'edit_url' => (string) get_edit_post_link( $id, 'raw' ),
			'created'  => $created,
		);
	}
}
