<?php
declare(strict_types=1);

namespace ImaginaMenu\Integrations\Elementor;

defined( 'ABSPATH' ) || exit;

/** Registra el widget solo cuando Elementor está activo y pide sus widgets. */
final class Loader {

	public static function boot(): void {
		add_action( 'elementor/widgets/register', array( self::class, 'register' ) );
	}

	/** @param object $widgets Elementor\Widgets_Manager. */
	public static function register( $widgets ): void {
		if ( class_exists( '\Elementor\Widget_Base' ) && method_exists( $widgets, 'register' ) ) {
			$widgets->register( new ToggleWidget() );
		}
	}
}
