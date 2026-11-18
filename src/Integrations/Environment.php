<?php
declare(strict_types=1);

namespace ImaginaMenu\Integrations;

defined( 'ABSPATH' ) || exit;

/** Detección del entorno para el admin (avisos y sugerencias). Solo se usa en el admin. */
final class Environment {

	/** Selectores del botón del menú móvil en temas populares. */
	private const THEME_SELECTORS = array(
		'astra'             => array( '.menu-toggle', '.ast-mobile-menu-trigger-minimal' ),
		'generatepress'     => array( '.menu-toggle' ),
		'kadence'           => array( '.menu-toggle-open' ),
		'blocksy'           => array( '[data-id="trigger"]' ),
		'hello-elementor'   => array( '.site-navigation-toggle', '.elementor-menu-toggle' ),
		'woodmart'          => array( '.wd-header-mobile-nav > a' ),
		'flatsome'          => array( '[data-open="#main-menu"]' ),
		'oceanwp'           => array( '.oceanwp-mobile-menu-icon a' ),
		'storefront'        => array( '.menu-toggle' ),
		'twentytwentyfive'  => array( '.wp-block-navigation__responsive-container-open' ),
		'twentytwentyfour'  => array( '.wp-block-navigation__responsive-container-open' ),
	);

	/**
	 * Temas cuyo botón móvil existe siempre (verificado con Playwright). Hello Elementor no está:
	 * sin el constructor de cabeceras de Elementor no imprime botón de menú.
	 *
	 * @return list<string>
	 */
	public static function known_themes(): array {
		return array_values( array_diff( array_keys( self::THEME_SELECTORS ), array( 'hello-elementor' ) ) );
	}

	/** @return array<string, mixed> */
	public static function info(): array {
		$theme    = wp_get_theme();
		$template = (string) $theme->get_template();
		$menus    = array();
		foreach ( wp_get_nav_menus() as $menu ) {
			$menus[] = array(
				'id'    => (int) $menu->term_id,
				'name'  => $menu->name,
				'count' => (int) $menu->count,
			);
		}
		return array(
			'woo'              => class_exists( 'WooCommerce' ),
			'wp_menus'         => $menus,
			'theme'            => array(
				'name'      => $theme->get( 'Name' ),
				'template'  => $template,
				'selectors' => self::THEME_SELECTORS[ $template ] ?? array( '.menu-toggle' ),
			),
			'optimizers'       => self::optimizers(),
			'imagina_turbo'    => defined( 'ITB_VERSION' ),
			// Imagina Search es el plugin «Woo Smart Search» (carpeta woo-smart-search).
			'imagina_search'   => SmartSearch::active() ? SmartSearch::version() : '',
			'writable'         => wp_is_writable( WP_CONTENT_DIR ),
			'has_logo'         => (bool) get_theme_mod( 'custom_logo' ),
		);
	}

	/** @return list<array{name: string, advice: string}> */
	private static function optimizers(): array {
		$out = array();
		if ( defined( 'LSCWP_V' ) ) {
			$out[] = array(
				'name'   => 'LiteSpeed Cache',
				'advice' => 'Page Optimization → CSS Settings: si usas UCSS, agrega «.imm-» a la lista blanca de selectores (UCSS Selector Allowlist). El JS del menú puede retrasarse sin problema.',
			);
		}
		if ( defined( 'WP_ROCKET_VERSION' ) ) {
			$out[] = array(
				'name'   => 'WP Rocket',
				'advice' => 'File Optimization → Remove Unused CSS: agrega «.imm-(.*)» en «CSS safelist». «Delay JavaScript execution» no afecta la apertura del menú.',
			);
		}
		if ( defined( 'PERFMATTERS_VERSION' ) ) {
			$out[] = array(
				'name'   => 'Perfmatters',
				'advice' => 'Assets → Remove Unused CSS: agrega «.imm-» en «Excluded Selectors».',
			);
		}
		if ( defined( 'AUTOPTIMIZE_PLUGIN_VERSION' ) ) {
			$out[] = array(
				'name'   => 'Autoptimize',
				'advice' => 'Excluye «imagina-menu» de la agregación de CSS: el archivo ya está minificado y es pequeño.',
			);
		}
		return $out;
	}
}
