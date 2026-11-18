<?php
declare(strict_types=1);

namespace ImaginaMenu\Integrations;

defined( 'ABSPATH' ) || exit;

/**
 * El HTML del menú está en todas las páginas: al publicar hay que purgar la caché de página.
 * Solo se usan funciones y acciones públicas de cada plugin.
 */
final class CachePurge {

	/** @return list<string> Plugins de caché purgados. */
	public static function purge_all(): array {
		$done = array();
		if ( defined( 'LSCWP_V' ) || has_action( 'litespeed_purge_all' ) ) {
			do_action( 'litespeed_purge_all', 'Imagina Menu' );
			$done[] = 'LiteSpeed Cache';
		}
		if ( function_exists( 'rocket_clean_domain' ) ) {
			rocket_clean_domain();
			$done[] = 'WP Rocket';
		}
		if ( function_exists( 'w3tc_flush_all' ) ) {
			w3tc_flush_all();
			$done[] = 'W3 Total Cache';
		}
		if ( function_exists( 'wp_cache_clear_cache' ) ) {
			wp_cache_clear_cache();
			$done[] = 'WP Super Cache';
		}
		if ( class_exists( '\FlyingPress\Purge' ) && is_callable( array( '\FlyingPress\Purge', 'purge_everything' ) ) ) {
			\FlyingPress\Purge::purge_everything();
			$done[] = 'FlyingPress';
		}
		// Imagina Turbo y otros: pueden engancharse aquí para purgar también el edge (Cloudflare).
		do_action( 'imm/purge_all' );
		return $done;
	}
}
