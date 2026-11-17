<?php
declare(strict_types=1);

namespace ImaginaMenu\Frontend;

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
		$parts = explode( '.', $token );
		if ( 3 !== count( $parts ) || (int) $parts[0] < time() ) {
			return false;
		}
		$expected = substr( hash_hmac( 'sha256', $parts[0] . '.' . $parts[1], wp_salt( 'auth' ) ), 0, 32 );
		return hash_equals( $expected, $parts[2] );
	}

	/** La vista previa nunca se guarda en caché ni muestra la barra de administración. */
	public static function prepare_request(): void {
		if ( ! defined( 'DONOTCACHEPAGE' ) ) {
			define( 'DONOTCACHEPAGE', true ); // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedConstantFound -- constante estándar de los plugins de caché.
		}
		nocache_headers();
		header( 'X-Robots-Tag: noindex, nofollow' );
		add_filter( 'show_admin_bar', '__return_false' );
		do_action( 'litespeed_control_set_nocache', 'imagina menu preview' );
	}
}
