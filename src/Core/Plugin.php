<?php
declare(strict_types=1);

namespace ImaginaMenu\Core;

defined( 'ABSPATH' ) || exit;

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
		\ImaginaMenu\Repository\JsonPostRepository::boot();
		\ImaginaMenu\Analytics\Stats::boot();
		Schedule::boot();
		\ImaginaMenu\Integrations\Wishlist::boot();
		\ImaginaMenu\Cli\Command::register();
		\ImaginaMenu\Integrations\Elementor\Loader::boot();

		add_action( 'init', array( self::class, 'init' ) );
		add_action( 'rest_api_init', array( Routes::class, 'register' ) );
		add_action( 'imm_recompile', array( self::class, 'recompile' ) );
		add_action( 'imm_upgrade', array( Installer::class, 'maybe_upgrade' ) );

		// Los menús y perfiles solo se escriben desde la API del plugin: nunca por XML-RPC.
		add_filter( 'xmlrpc_allow_post_type_writes', array( self::class, 'block_xmlrpc' ), 10, 2 );
		// Cada revisión es una copia completa del JSON: se guardan las últimas 20.
		add_filter( 'wp_revisions_to_keep', array( self::class, 'revisions' ), 10, 2 );

		if ( is_admin() && ! wp_doing_ajax() ) {
			AdminPage::boot();
			// admin_init también corre en admin-ajax.php (incluso para visitantes): solo con usuarios del plugin.
			add_action( 'admin_init', array( self::class, 'admin_init' ) );
		}
	}

	public static function admin_init(): void {
		if ( ! current_user_can( self::CAP ) ) {
			return;
		}
		Installer::maybe_upgrade();
		if ( in_array( \ImaginaMenu\Integrations\Languages::provider(), array( 'wpml', 'polylang' ), true ) ) {
			\ImaginaMenu\Integrations\Languages::register_strings();
		}
	}

	/**
	 * Filtro de WordPress 7.1.1+ (recibe el objeto del tipo). En versiones anteriores no existe; ahí
	 * protege JsonPostRepository::block_insert().
	 *
	 * @param mixed $allowed
	 * @param mixed $post_type WP_Post_Type (o el nombre, por compatibilidad).
	 */
	public static function block_xmlrpc( $allowed, $post_type ): bool {
		$name = $post_type instanceof \WP_Post_Type ? $post_type->name : (string) $post_type;
		return in_array( $name, array( MenuRepository::POST_TYPE, ProfileRepository::POST_TYPE ), true ) ? false : (bool) $allowed;
	}

	public static function revisions( int $num, \WP_Post $post ): int {
		return in_array( $post->post_type, array( MenuRepository::POST_TYPE, ProfileRepository::POST_TYPE ), true ) ? 20 : $num;
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
			// Permisos propios: con «page», un editor o un gestor de tienda podría editar estos datos
			// (por XML-RPC o edición rápida) sin tener imm_manage ni edit_css.
			'capability_type'     => array( 'imm_doc', 'imm_docs' ),
			'map_meta_cap'        => true,
			'capabilities'        => array_fill_keys(
				array( 'create_posts', 'edit_posts', 'edit_others_posts', 'edit_published_posts', 'edit_private_posts', 'publish_posts', 'delete_posts', 'delete_others_posts', 'delete_published_posts', 'delete_private_posts', 'read_private_posts' ),
				self::CAP
			),
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
