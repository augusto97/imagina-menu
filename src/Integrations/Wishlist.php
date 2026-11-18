<?php
declare(strict_types=1);

namespace ImaginaMenu\Integrations;

defined( 'ABSPATH' ) || exit;

use ImaginaMenu\Frontend\Hydration;

/**
 * Favoritos (YITH WooCommerce Wishlist o TI WooCommerce Wishlist): contador en la barra inferior.
 *
 * Igual que el del carrito: una cookie pequeña (imm_wl) que se actualiza cuando cambia la lista
 * (peticiones que ya no se guardan en caché) y que el JS lee sin pedir nada al servidor. Así las
 * páginas siguen en caché para todos.
 */
final class Wishlist {

	public const COOKIE = 'imm_wl';

	/** Los ganchos solo se disparan si el plugin de favoritos está activo: no hace falta detectarlo aquí. */
	public static function boot(): void {
		add_action( 'yith_wcwl_added_to_wishlist', array( self::class, 'sync' ), 20 );
		add_action( 'yith_wcwl_removed_from_wishlist', array( self::class, 'sync' ), 20 );
		add_action( 'tinvwl_ajax_actions_after', array( self::class, 'sync' ), 20 );
		add_action( 'tinvwl_product_removed', array( self::class, 'sync' ), 20 );
		add_action( 'wp_login', array( self::class, 'sync_later' ) );
	}

	public static function provider(): string {
		if ( function_exists( 'yith_wcwl_count_all_products' ) && class_exists( 'YITH_WCWL' ) ) {
			return 'yith';
		}
		if ( class_exists( 'TInvWL_Public_WishlistCounter' ) ) {
			return 'ti';
		}
		return '';
	}

	/** Página de la lista de favoritos (para el ítem «Favoritos» de la barra inferior). */
	public static function url(): string {
		$url = self::raw_url();
		// Sin página de favoritos configurada, YITH devuelve «?wishlist-action»: mejor nada.
		return str_starts_with( $url, 'http' ) ? $url : '';
	}

	private static function raw_url(): string {
		try {
			if ( 'yith' === self::provider() ) {
				return (string) \YITH_WCWL::get_instance()->get_wishlist_url();
			}
			if ( 'ti' === self::provider() && function_exists( 'tinv_url_wishlist_default' ) ) {
				return (string) tinv_url_wishlist_default();
			}
		} catch ( \Throwable $e ) {
			return '';
		}
		return '';
	}

	public static function count(): int {
		try {
			if ( 'yith' === self::provider() ) {
				return (int) yith_wcwl_count_all_products();
			}
			if ( 'ti' === self::provider() ) {
				// counter() recalcula (get_counter() devolvería lo calculado antes del cambio).
				return (int) \TInvWL_Public_WishlistCounter::instance()->counter();
			}
		} catch ( \Throwable $e ) {
			return 0;
		}
		return 0;
	}

	/** Cambió la lista: la cookie lleva el nuevo total (o se borra si quedó vacía). */
	public static function sync(): void {
		Hydration::counter_cookie( self::COOKIE, self::count() );
	}

	/** Al iniciar sesión las listas se fusionan después: se actualiza al final del request. */
	public static function sync_later(): void {
		add_action( 'shutdown', array( self::class, 'sync' ), 0 );
	}
}
