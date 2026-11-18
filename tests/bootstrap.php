<?php
/**
 * Arranque de las pruebas unitarias: funciones mínimas de WordPress con el mismo comportamiento
 * relevante (escapado y limpieza), sin cargar WordPress.
 *
 * @package ImaginaMenu
 */

declare(strict_types=1);

define( 'ABSPATH', __DIR__ . '/' );
define( 'IMM_DIR', dirname( __DIR__ ) );
define( 'IMM_VERSION', 'test' );

require dirname( __DIR__ ) . '/vendor/autoload.php';

function esc_attr( $v ) { return htmlspecialchars( (string) $v, ENT_QUOTES, 'UTF-8' ); }
function esc_html( $v ) { return htmlspecialchars( (string) $v, ENT_QUOTES, 'UTF-8' ); }
function esc_attr__( $v ) { return esc_attr( $v ); }
function esc_html__( $v ) { return esc_html( $v ); }
function __( $v ) { return $v; }
function sanitize_text_field( $v ) { return trim( preg_replace( '/[\r\n\t ]+/', ' ', strip_tags( (string) $v ) ) ); }
function sanitize_key( $v ) { return preg_replace( '/[^a-z0-9_\-]/', '', strtolower( (string) $v ) ); }
function sanitize_html_class( $v ) { return preg_replace( '/[^A-Za-z0-9_-]/', '', (string) $v ); }
function wp_strip_all_tags( $v ) { return trim( strip_tags( preg_replace( '@<(script|style)[^>]*?>.*?</\\1>@si', '', (string) $v ) ) ); }
function esc_url_raw( $url, $protocols = null ) {
	$url = trim( (string) $url );
	if ( '' === $url ) { return ''; }
	if ( str_starts_with( $url, '/' ) ) { return $url; }
	$scheme = strtolower( (string) parse_url( $url, PHP_URL_SCHEME ) );
	$protocols = $protocols ?? array( 'http', 'https', 'mailto', 'tel' );
	return in_array( $scheme, $protocols, true ) ? $url : '';
}
function esc_url( $url, $protocols = null ) { return esc_attr( esc_url_raw( $url, $protocols ) ); }
function home_url( $path = '' ) { return 'https://tienda.test' . ( $path ? '/' . ltrim( $path, '/' ) : '' ); }
function add_query_arg( $args, $url ) { return $url . '?' . http_build_query( $args ); }
function rest_url( $path = '' ) { return 'https://tienda.test/wp-json/' . ltrim( $path, '/' ); }
function wp_json_encode( $data, $flags = 0 ) { return json_encode( $data, $flags ); }
