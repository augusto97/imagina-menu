<?php
declare(strict_types=1);

namespace ImaginaMenu\Frontend;

defined( 'ABSPATH' ) || exit;

/**
 * Vista previa del borrador. El admin pide un token firmado (HMAC con las sales de WordPress),
 * de vida corta, y carga el sitio con ?imm_preview=token en un iframe o en el celular (QR).
 */
final class Preview {

	private const TTL = 30 * MINUTE_IN_SECONDS;

	/** Revisión de los borradores: cambia con cada guardado y renueva la caché de la vista previa. */
	public const REV_OPTION = 'imm_draft_rev';

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

	public static function bump(): void {
		update_option( self::REV_OPTION, uniqid( '', true ), false );
	}

	/**
	 * Configuración del borrador. Compilar cuesta (consultas y HTML): se guarda 10 minutos por
	 * revisión, así quien tenga un enlace de vista previa no fuerza una compilación en cada visita.
	 *
	 * @return array<string, mixed>
	 */
	public static function config(): array {
		$key    = 'imm_prev_' . substr( md5( get_option( self::REV_OPTION, '' ) . IMM_VERSION ), 0, 16 );
		$config = get_transient( $key );
		if ( ! is_array( $config ) ) {
			$config = \ImaginaMenu\Core\Plugin::compiler()->build( true );
			set_transient( $key, $config, 10 * MINUTE_IN_SECONDS );
		}
		return $config;
	}

	/**
	 * Huella del HTML de una parte del menú (data-imm-h en su primera etiqueta). El script de la vista
	 * previa la compara para cambiar solo lo que cambió, sin recargar la página.
	 */
	public static function fingerprint( string $html ): string {
		if ( '' === $html ) {
			return '';
		}
		return (string) preg_replace( '/^<([a-z]+)/', '<$1 data-imm-h="' . substr( md5( $html ), 0, 12 ) . '"', $html, 1 );
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
