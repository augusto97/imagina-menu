<?php
declare(strict_types=1);

namespace ImaginaMenu\Admin;

use ImaginaMenu\Core\Plugin;

/** Página del admin: un contenedor donde se monta la app React. */
final class AdminPage {

	public const SLUG = 'imagina-menu';

	private static ?string $hook = null;

	public static function boot(): void {
		add_action( 'admin_menu', array( self::class, 'menu' ) );
		add_action( 'admin_enqueue_scripts', array( self::class, 'enqueue' ) );
		add_filter( 'plugin_action_links_' . plugin_basename( IMM_FILE ), array( self::class, 'links' ) );
	}

	public static function menu(): void {
		$icon       = 'data:image/svg+xml;base64,' . base64_encode( '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2" stroke-linecap="round"><rect x="5" y="2" width="14" height="20" rx="3"/><path d="M9 7h6M9 11h6M9 15h3"/></svg>' ); // phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions.obfuscation_base64_encode
		self::$hook = (string) add_menu_page(
			__( 'Imagina Menu', 'imagina-menu' ),
			__( 'Imagina Menu', 'imagina-menu' ),
			Plugin::CAP,
			self::SLUG,
			array( self::class, 'render' ),
			$icon,
			61
		);
	}

	public static function render(): void {
		echo '<div class="wrap imm-wrap"><div id="imm-admin-root" class="imm-root">';
		if ( ! ( new AssetsLoader( IMM_DIR, plugins_url( '', IMM_FILE ) ) )->isBuilt() ) {
			echo '<p>' . esc_html__( 'Falta compilar el admin: ejecuta «npm ci && npm run build» en la carpeta admin/.', 'imagina-menu' ) . '</p>';
		}
		echo '</div></div>';
	}

	public static function enqueue( string $hook ): void {
		if ( $hook !== self::$hook ) {
			return;
		}
		wp_enqueue_media();
		( new AssetsLoader( IMM_DIR, plugins_url( '', IMM_FILE ) ) )->enqueue();
	}

	/**
	 * @param array<string, string> $links
	 * @return array<string, string>
	 */
	public static function links( array $links ): array {
		$url = admin_url( 'admin.php?page=' . self::SLUG );
		array_unshift( $links, '<a href="' . esc_url( $url ) . '">' . esc_html__( 'Configurar', 'imagina-menu' ) . '</a>' );
		return $links;
	}
}
