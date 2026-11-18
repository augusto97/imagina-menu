<?php
declare(strict_types=1);

namespace ImaginaMenu\Frontend;

defined( 'ABSPATH' ) || exit;

use ImaginaMenu\Integrations\Languages;

/**
 * Decide si un perfil aplica a la página actual. Solo usa condicionales de WordPress que ya están
 * resueltos por la consulta principal (sin consultas propias). Nunca se mira el dispositivo en PHP:
 * eso rompería la caché de página; el "solo móvil" se resuelve con CSS.
 */
final class RuleMatcher {

	/** @param array<string, mixed> $rules */
	public static function matches( array $rules ): bool {
		$conditions = $rules['conditions'] ?? array();
		if ( ! $conditions ) {
			return true; // Perfil general.
		}
		$any = 'any' === ( $rules['match'] ?? 'all' );
		foreach ( $conditions as $c ) {
			$result = self::check( $c );
			if ( ! empty( $c['not'] ) ) {
				$result = ! $result;
			}
			if ( $any && $result ) {
				return true;
			}
			if ( ! $any && ! $result ) {
				return false;
			}
		}
		return ! $any;
	}

	/** @param array<string, mixed> $c */
	public static function check( array $c ): bool {
		$value = (string) ( $c['value'] ?? '' );
		$ids   = array_map( 'intval', (array) ( $c['ids'] ?? array() ) );
		switch ( $c['type'] ?? '' ) {
			case 'front_page':
				return is_front_page();
			case 'blog':
				return is_home() || is_category() || is_tag() || is_date() || is_author() || is_singular( 'post' );
			case 'page':
				return is_singular() && in_array( (int) get_queried_object_id(), $ids, true );
			case 'post_type':
				return '' !== $value && ( is_singular( $value ) || is_post_type_archive( $value ) || ( 'post' === $value && is_home() ) );
			case 'term':
				return self::term( $value, $ids, array_map( 'intval', (array) ( $c['all'] ?? array() ) ) );
			case 'woo':
				return self::woo( $value );
			case 'url':
				$uri = isset( $_SERVER['REQUEST_URI'] ) ? (string) wp_unslash( $_SERVER['REQUEST_URI'] ) : ''; // phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized -- solo se compara.
				return '' !== $value && str_contains( rawurldecode( (string) strtok( $uri, '?' ) ), $value );
			case 'logged_in':
				return is_user_logged_in();
			case 'logged_out':
				return ! is_user_logged_in();
			case 'role':
				return is_user_logged_in() && in_array( $value, (array) wp_get_current_user()->roles, true );
			case 'language':
				return '' !== $value && Languages::current() === $value;
		}
		return false;
	}

	/**
	 * Archivo del término (o de una subcategoría) o contenido individual que lo tiene. Las
	 * subcategorías vienen precalculadas desde la compilación ('all'): cero consultas.
	 *
	 * @param list<int> $ids
	 * @param list<int> $all
	 */
	private static function term( string $taxonomy, array $ids, array $all ): bool {
		if ( '' === $taxonomy ) {
			return false;
		}
		$all    = $all ? $all : $ids;
		$object = get_queried_object();
		if ( $object instanceof \WP_Term ) {
			return $object->taxonomy === $taxonomy && ( ! $ids || in_array( (int) $object->term_id, $all, true ) );
		}
		if ( is_singular() ) {
			// Los términos del contenido actual ya están en caché (los cargó la consulta principal).
			return has_term( $ids ? $all : '', $taxonomy, (int) get_queried_object_id() );
		}
		return false;
	}

	private static function woo( string $page ): bool {
		if ( ! function_exists( 'is_woocommerce' ) ) {
			return false;
		}
		return match ( $page ) {
			'shop'     => is_shop() || is_product_taxonomy(),
			'product'  => is_product(),
			'cart'     => is_cart(),
			'checkout' => is_checkout(),
			'account'  => is_account_page(),
			default    => is_woocommerce() || is_cart() || is_checkout() || is_account_page(),
		};
	}
}
