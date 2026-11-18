<?php
declare(strict_types=1);

namespace ImaginaMenu\Core;

use ImaginaMenu\Admin\AdminPage;
use ImaginaMenu\Compiler\Compiler;
use ImaginaMenu\Frontend\Frontend;
use ImaginaMenu\Frontend\Hydration;
use ImaginaMenu\Repository\MenuRepository;
use ImaginaMenu\Repository\ProfileRepository;
use ImaginaMenu\Repository\SettingsRepository;
use ImaginaMenu\Rest\Routes;

/**
 * Arranque. En el frontend solo registra dos acciones; el resto se carga en el admin o en REST.
 */
final class Plugin {

	public const CAP = 'imm_manage';

	private static ?Compiler $compiler = null;

	public static function boot( string $file ): void {
		Frontend::boot();
		Hydration::boot();
		Invalidator::boot();
		\ImaginaMenu\Analytics\Stats::boot();

		add_action( 'init', array( self::class, 'init' ) );
		add_action( 'rest_api_init', array( Routes::class, 'register' ) );
		add_action( 'imm_recompile', array( self::class, 'recompile' ) );

		if ( is_admin() ) {
			AdminPage::boot();
			if ( in_array( \ImaginaMenu\Integrations\Languages::provider(), array( 'wpml', 'polylang' ), true ) ) {
				add_action( 'admin_init', array( \ImaginaMenu\Integrations\Languages::class, 'register_strings' ) );
			}
			add_action( 'admin_init', array( Installer::class, 'maybe_upgrade' ) );
		}
	}

	public static function init(): void {
		load_plugin_textdomain( 'imagina-menu', false, dirname( plugin_basename( IMM_FILE ) ) . '/languages' );
		self::register_post_types();

		if ( function_exists( 'register_block_type' ) && is_dir( IMM_DIR . '/blocks/toggle' ) ) {
			register_block_type(
				IMM_DIR . '/blocks/toggle',
				array( 'render_callback' => array( \ImaginaMenu\Frontend\Toggle::class, 'shortcode' ) )
			);
		}
	}

	/** CPT de almacenamiento (no públicos). También se llama al activar, antes de crear el contenido inicial. */
	public static function register_post_types(): void {
		if ( post_type_exists( MenuRepository::POST_TYPE ) ) {
			return;
		}
		$args = array(
			'public'              => false,
			'show_ui'             => false,
			'show_in_rest'        => false,
			'rewrite'             => false,
			'query_var'           => false,
			'exclude_from_search' => true,
			'supports'            => array( 'title', 'revisions' ),
			'capability_type'     => 'page',
			'map_meta_cap'        => true,
		);
		register_post_type( MenuRepository::POST_TYPE, $args + array( 'label' => __( 'Menús móviles', 'imagina-menu' ) ) );
		register_post_type( ProfileRepository::POST_TYPE, $args + array( 'label' => __( 'Perfiles de navegación', 'imagina-menu' ) ) );
	}

	public static function compiler(): Compiler {
		if ( null === self::$compiler ) {
			self::$compiler = new Compiler( new MenuRepository(), new ProfileRepository(), new SettingsRepository() );
		}
		return self::$compiler;
	}

	/** Recompilación en segundo plano (WP-Cron) tras un cambio de menús, términos o enlaces. */
	public static function recompile(): void {
		if ( Compiler::is_dirty() ) {
			self::compiler()->publish();
		}
	}
}
