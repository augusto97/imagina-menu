<?php
declare(strict_types=1);

namespace ImaginaMenu\Frontend;

defined( 'ABSPATH' ) || exit;

/**
 * Datos dinámicos sin romper la caché de página: cookies propias, pequeñas y legibles por JS.
 *
 * - imm_cc: número de productos en el carrito (solo si hay carrito; si no, no existe la cookie).
 * - imm_un: primer nombre del usuario conectado (opcional, apagado por defecto).
 *
 * El JS las lee sin hacer peticiones al servidor.
 */
final class Hydration {

	public const CART_COOKIE = 'imm_cc';
	public const NAME_COOKIE = 'imm_un';

	public static function boot(): void {
		add_action( 'woocommerce_set_cart_cookies', array( self::class, 'cart_cookie' ) );
		add_action( 'wp_login', array( self::class, 'login' ), 10, 2 );
		add_action( 'wp_logout', array( self::class, 'logout' ) );
	}

	private static function enabled( string $key ): bool {
		$config = Frontend::config();
		return (bool) ( $config['settings'][ $key ] ?? false );
	}

	/** Último valor enviado en este request (WooCommerce dispara la acción más de una vez). */
	private static ?int $sent = null;

	public static function cart_cookie( bool $set = true ): void {
		if ( headers_sent() || ! self::enabled( 'cart_cookie' ) || ! function_exists( 'WC' ) ) {
			return;
		}
		$count = ( $set && WC()->cart ) ? (int) WC()->cart->get_cart_contents_count() : 0;
		if ( self::$sent === $count ) {
			return;
		}
		self::$sent = $count;
		if ( $count > 0 ) {
			self::set( self::CART_COOKIE, (string) min( $count, 999 ), time() + 2 * DAY_IN_SECONDS );
		} elseif ( isset( $_COOKIE[ self::CART_COOKIE ] ) ) {
			self::set( self::CART_COOKIE, '', time() - YEAR_IN_SECONDS );
		}
	}

	public static function login( string $login, \WP_User $user ): void {
		if ( headers_sent() || ! self::enabled( 'name_cookie' ) ) {
			return;
		}
		$name = '' !== $user->first_name ? $user->first_name : $user->display_name;
		self::set( self::NAME_COOKIE, wp_strip_all_tags( mb_substr( $name, 0, 30 ) ), 0 );
	}

	public static function logout(): void {
		if ( ! headers_sent() && isset( $_COOKIE[ self::NAME_COOKIE ] ) ) {
			self::set( self::NAME_COOKIE, '', time() - YEAR_IN_SECONDS );
		}
	}

	/**
	 * Cookie legible por JS. Se codifica una sola vez con rawurlencode (setcookie() codificaría otra
	 * vez y «María José» llegaría como «Mar%C3%ADa%20Jos%C3%A9»); el JS la lee con decodeURIComponent.
	 */
	private static function set( string $name, string $value, int $expires ): void {
		setrawcookie(
			$name,
			rawurlencode( $value ),
			array(
				'expires'  => $expires,
				'path'     => COOKIEPATH ? COOKIEPATH : '/',
				'domain'   => COOKIE_DOMAIN ? COOKIE_DOMAIN : '',
				'secure'   => is_ssl(),
				'httponly' => false, // Debe leerla el JS. No contiene nada sensible.
				'samesite' => 'Lax',
			)
		);
	}
}
