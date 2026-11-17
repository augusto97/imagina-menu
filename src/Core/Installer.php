<?php
declare(strict_types=1);

namespace ImaginaMenu\Core;

use ImaginaMenu\Compiler\Compiler;
use ImaginaMenu\Compiler\Storage;
use ImaginaMenu\Model\Defaults;
use ImaginaMenu\Repository\MenuRepository;
use ImaginaMenu\Repository\ProfileRepository;
use ImaginaMenu\Repository\SettingsRepository;

/**
 * Activación, actualización y contenido inicial.
 *
 * Al activar por primera vez se crea un menú útil desde el minuto uno: si hay WooCommerce, sus
 * categorías; si el tema tiene un menú asignado, ese menú; si no, las páginas principales.
 */
final class Installer {

	public const VERSION_OPTION = 'imm_db_version';

	public static function activate(): void {
		$role = get_role( 'administrator' );
		if ( $role && ! $role->has_cap( Plugin::CAP ) ) {
			$role->add_cap( Plugin::CAP );
		}
		// Los CPT deben existir para crear el contenido inicial.
		Plugin::register_post_types();
		$profiles = new ProfileRepository();
		if ( ! $profiles->all() ) {
			self::seed();
		}
		update_option( self::VERSION_OPTION, IMM_VERSION, false );
		Plugin::compiler()->publish();
	}

	public static function deactivate(): void {
		wp_clear_scheduled_hook( 'imm_recompile' );
		// Sin config compilada, el frontend no imprime nada aunque quede un caché de opcode.
		\ImaginaMenu\Integrations\CachePurge::purge_all();
	}

	/** Tras actualizar el plugin: recompilar con el nuevo CSS, JS y plantillas. */
	public static function maybe_upgrade(): void {
		if ( get_option( self::VERSION_OPTION ) === IMM_VERSION ) {
			if ( Compiler::is_dirty() && ! wp_next_scheduled( 'imm_recompile' ) ) {
				wp_schedule_single_event( time(), 'imm_recompile' );
			}
			return;
		}
		$role = get_role( 'administrator' );
		if ( $role && ! $role->has_cap( Plugin::CAP ) ) {
			$role->add_cap( Plugin::CAP );
		}
		if ( ! ( new ProfileRepository() )->all() ) {
			self::seed();
		}
		update_option( self::VERSION_OPTION, IMM_VERSION, false );
		Plugin::compiler()->publish();
	}

	public static function seed(): void {
		$woo     = class_exists( 'WooCommerce' );
		$menus   = new MenuRepository();
		$menu_id = $menus->create(
			array(
				'title' => __( 'Menú móvil', 'imagina-menu' ),
				'items' => self::seed_items( $woo ),
			)
		);

		$profile                         = Defaults::profile();
		$profile['title']                = __( 'Predeterminado', 'imagina-menu' );
		$profile['drawer']['menu_id']    = $menu_id;
		$profile['drawer']['footer_links'] = self::seed_footer( $woo );
		$profile['bottom_bar']['enabled'] = $woo;
		$profile['bottom_bar']['items']   = Defaults::suggested_bottom_items( $woo );
		$profile['search']['placeholder'] = $woo ? __( 'Buscar productos…', 'imagina-menu' ) : __( 'Buscar…', 'imagina-menu' );
		$profile['search']['popular']     = self::seed_popular( $woo );

		// Si conocemos el botón del menú móvil del tema, ese botón abre nuestro panel (sin botón flotante extra).
		$env = \ImaginaMenu\Integrations\Environment::info();
		if ( in_array( $env['theme']['template'], \ImaginaMenu\Integrations\Environment::known_themes(), true ) ) {
			$profile['trigger']['mode']     = 'theme_selector';
			$profile['trigger']['selector'] = implode( ', ', $env['theme']['selectors'] );
		}
		( new ProfileRepository() )->create( $profile );

		( new SettingsRepository() )->save( array() );
	}

	/** @return list<array<string, mixed>> */
	private static function seed_items( bool $woo ): array {
		$items = array();
		if ( $woo ) {
			$shop = (int) get_option( 'woocommerce_shop_page_id' );
			if ( $shop > 0 ) {
				$items[] = array(
					'label'  => __( 'Ofertas', 'imagina-menu' ),
					'icon'   => 'flame',
					'object' => array( 'kind' => 'post', 'id' => $shop, 'type' => 'page' ),
					'highlight' => true,
				);
			}
			$items[] = array( 'type' => 'heading', 'label' => __( 'Comprar por categoría', 'imagina-menu' ) );
			$items[] = array(
				'type'   => 'source',
				'source' => array( 'kind' => 'woo_categories', 'depth' => 3, 'with_images' => true ),
			);
			return $items;
		}

		$locations = get_nav_menu_locations();
		$menu_id   = (int) ( $locations['primary'] ?? $locations['menu-1'] ?? ( $locations ? reset( $locations ) : 0 ) );
		if ( $menu_id > 0 ) {
			$items[] = array(
				'type'   => 'source',
				'source' => array( 'kind' => 'wp_menu', 'menu_id' => $menu_id, 'depth' => 4 ),
			);
			return $items;
		}

		$items[] = array(
			'label' => __( 'Inicio', 'imagina-menu' ),
			'icon'  => 'house',
			'url'   => '/',
		);
		$pages   = get_pages(
			array(
				'parent'      => 0,
				'sort_column' => 'menu_order,post_title',
				'number'      => 8,
			)
		);
		foreach ( is_array( $pages ) ? $pages : array() as $page ) {
			if ( (int) get_option( 'page_on_front' ) === $page->ID ) {
				continue;
			}
			$items[] = array(
				'label'  => $page->post_title,
				'object' => array( 'kind' => 'post', 'id' => $page->ID, 'type' => 'page' ),
			);
		}
		return $items;
	}

	/** @return list<string> */
	private static function seed_popular( bool $woo ): array {
		if ( ! $woo ) {
			return array();
		}
		$terms = get_terms(
			array(
				'taxonomy'   => 'product_cat',
				'parent'     => 0,
				'hide_empty' => true,
				'number'     => 5,
				'orderby'    => 'count',
				'order'      => 'DESC',
				'exclude'    => array( (int) get_option( 'default_product_cat' ) ),
			)
		);
		return is_array( $terms ) ? array_values( array_map( static fn( $t ) => $t->name, $terms ) ) : array();
	}

	/** @return list<array{label: string, url: string, icon: string}> */
	private static function seed_footer( bool $woo ): array {
		if ( ! $woo ) {
			return array();
		}
		$links   = array();
		$account = (int) get_option( 'woocommerce_myaccount_page_id' );
		if ( $account > 0 ) {
			$links[] = array(
				'label' => __( 'Mis pedidos', 'imagina-menu' ),
				'url'   => (string) wc_get_endpoint_url( 'orders', '', (string) get_permalink( $account ) ),
				'icon'  => 'package',
			);
		}
		$links[] = array(
			'label' => __( 'Ayuda y contacto', 'imagina-menu' ),
			'url'   => '/contacto/',
			'icon'  => 'circle-help',
		);
		return $links;
	}

	/** Desinstalación (la llama uninstall.php si el usuario lo pidió en Ajustes). */
	public static function uninstall(): void {
		foreach ( array( MenuRepository::POST_TYPE, ProfileRepository::POST_TYPE ) as $type ) {
			$ids = get_posts(
				array(
					'post_type'      => $type,
					'post_status'    => 'any',
					'posts_per_page' => -1,
					'fields'         => 'ids',
				)
			);
			foreach ( $ids as $id ) {
				wp_delete_post( (int) $id, true );
			}
		}
		foreach ( array( SettingsRepository::OPTION, Compiler::STATE_OPTION, Compiler::DIRTY_OPTION, Compiler::REFS_OPTION, self::VERSION_OPTION ) as $option ) {
			delete_option( $option );
		}
		Storage::delete_all();
		$role = get_role( 'administrator' );
		if ( $role ) {
			$role->remove_cap( Plugin::CAP );
		}
	}
}
