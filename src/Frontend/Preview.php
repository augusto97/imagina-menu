<?php
declare(strict_types=1);

namespace ImaginaMenu\Frontend;

defined( 'ABSPATH' ) || exit;

/**
 * Vista previa del borrador. El admin pide un token firmado (HMAC con las sales de WordPress),
 * de vida corta, y carga el sitio con ?imm_preview=token en un iframe o en el celular (QR).
 */
final class Preview {

	private const TTL = HOUR_IN_SECONDS;

	public static function token( int $user_id ): string {
		$expires = time() + self::TTL;
		$payload = $expires . '.' . $user_id;
		return $payload . '.' . substr( hash_hmac( 'sha256', $payload, wp_salt( 'auth' ) ), 0, 32 );
	}

	public static function url( int $user_id, string $base = '' ): string {
		return add_query_arg( 'imm_preview', self::token( $user_id ), '' !== $base ? $base : home_url( '/' ) );
	}

	public static function verify( string $token ): bool {
		if ( strlen( $token ) > 80 ) {
			return false;
		}
		$parts = explode( '.', $token );
		if ( 3 !== count( $parts ) || ! ctype_digit( $parts[0] ) || ! ctype_digit( $parts[1] ) ) {
			return false;
		}
		$expires = (int) $parts[0];
		if ( $expires < time() || $expires > time() + self::TTL + MINUTE_IN_SECONDS ) {
			return false;
		}
		$expected = substr( hash_hmac( 'sha256', $parts[0] . '.' . $parts[1], wp_salt( 'auth' ) ), 0, 32 );
		if ( ! hash_equals( $expected, $parts[2] ) ) {
			return false;
		}
		// Si al usuario que lo pidió le quitaron el permiso, sus enlaces dejan de valer.
		return user_can( (int) $parts[1], \ImaginaMenu\Core\Plugin::CAP );
	}

	/** La vista previa nunca se guarda en caché ni muestra la barra de administración. */
	public static function prepare_request(): void {
		if ( ! defined( 'DONOTCACHEPAGE' ) ) {
			define( 'DONOTCACHEPAGE', true ); // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedConstantFound -- constante estándar de los plugins de caché.
		}
		nocache_headers();
		header( 'X-Robots-Tag: noindex, nofollow' );
		// El token va en la URL: que no viaje a terceros en la cabecera Referer.
		header( 'Referrer-Policy: no-referrer' );
		add_filter( 'show_admin_bar', '__return_false' );
		do_action( 'litespeed_control_set_nocache', 'imagina menu preview' );
	}
}
