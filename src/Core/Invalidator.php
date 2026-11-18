<?php
declare(strict_types=1);

namespace ImaginaMenu\Core;

defined( 'ABSPATH' ) || exit;

use ImaginaMenu\Compiler\Compiler;

/**
 * Detecta cambios fuera del plugin que alteran el menú compilado (un menú de WordPress sincronizado,
 * una categoría renombrada, un cambio de enlaces permanentes o del logo) y programa una recompilación
 * en segundo plano. Mientras tanto se sigue sirviendo la compilación anterior.
 */
final class Invalidator {

	public static function boot(): void {
		foreach ( array( 'switch_theme', 'customize_save_after', 'update_option_permalink_structure', 'update_option_woocommerce_myaccount_page_id', 'update_option_woocommerce_cart_page_id', 'update_option_blogname' ) as $hook ) {
			add_action( $hook, array( self::class, 'dirty' ) );
		}
		add_action( 'wp_update_nav_menu', array( self::class, 'nav_menu' ) );
		add_action( 'wp_delete_nav_menu', array( self::class, 'nav_menu' ) );
		foreach ( array( 'created_term', 'edited_term', 'delete_term' ) as $hook ) {
			add_action( $hook, array( self::class, 'term' ), 10, 3 );
		}
		add_action( 'post_updated', array( self::class, 'post_updated' ), 10, 3 );
	}

	/** @return array{posts: list<int>, taxonomies: list<string>, menus: list<int>} */
	private static function refs(): array {
		$refs = get_option( Compiler::REFS_OPTION, array() );
		return array(
			'posts'      => array_map( 'intval', (array) ( $refs['posts'] ?? array() ) ),
			'taxonomies' => array_map( 'strval', (array) ( $refs['taxonomies'] ?? array() ) ),
			'menus'      => array_map( 'intval', (array) ( $refs['menus'] ?? array() ) ),
		);
	}

	public static function nav_menu( int $menu_id ): void {
		if ( in_array( $menu_id, self::refs()['menus'], true ) ) {
			self::dirty();
		}
	}

	public static function term( int $term_id, int $tt_id = 0, string $taxonomy = '' ): void {
		if ( in_array( $taxonomy, self::refs()['taxonomies'], true ) ) {
			self::dirty();
		}
	}

	public static function dirty(): void {
		if ( ! Compiler::is_dirty() ) {
			Compiler::mark_dirty();
		}
		if ( ! wp_next_scheduled( 'imm_recompile' ) ) {
			wp_schedule_single_event( time() + 5, 'imm_recompile' );
		}
	}

	/** Solo si cambió algo que sale en un menú: título, slug o estado. */
	public static function post_updated( int $id, \WP_Post $after, \WP_Post $before ): void {
		if ( in_array( $after->post_type, array( 'imm_menu', 'imm_profile', 'revision', 'nav_menu_item' ), true ) ) {
			return;
		}
		if ( ! in_array( $id, self::refs()['posts'], true ) ) {
			return;
		}
		if ( $after->post_title !== $before->post_title || $after->post_name !== $before->post_name || $after->post_status !== $before->post_status ) {
			self::dirty();
		}
	}
}
