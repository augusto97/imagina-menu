<?php
declare(strict_types=1);

namespace ImaginaMenu\Compiler;

/**
 * CSS del frontend.
 *
 * - Crítico (inline en <head>, ~1,5 KB): tokens, botón flotante, barra inferior, reserva de espacio y
 *   ocultar el menú del tema. Evita saltos de diseño (CLS) sin bloquear el render con un archivo.
 * - Completo (archivo con hash, cargado al final del <body>): panel, submenús y buscador. Como el
 *   panel está cerrado al cargar, no afecta el primer pintado.
 *
 * El CSS fuente está en frontend/css y se minifica en assets/dist (npm run build).
 */
final class CssBuilder {

	private const NUMERIC = array(
		'overlay'     => array( '--imm-ov', '' ),
		'radius'      => array( '--imm-r', 'px' ),
		'item_height' => array( '--imm-ih', 'px' ),
		'font_size'   => array( '--imm-fs', 'px' ),
		'duration'    => array( '--imm-dur', 'ms' ),
	);

	/**
	 * @param array<string, mixed> $profile
	 * @param array<string, mixed> $settings
	 * @return array{critical: string, bbar_space: string, full: string}
	 */
	public static function build( array $profile, array $settings ): array {
		$bp       = (int) $settings['breakpoint'];
		$mobile   = (bool) $settings['mobile_only'];
		$design   = $profile['design'];
		$critical = self::vars( $design['tokens'] );

		if ( 'dark' === $design['color_mode'] ) {
			$critical .= self::vars( $design['dark_tokens'] );
		} elseif ( 'auto' === $design['color_mode'] ) {
			$critical .= '@media (prefers-color-scheme:dark){' . self::vars( $design['dark_tokens'] ) . '}';
		}
		$critical .= self::asset( 'critical.css' );

		if ( $mobile ) {
			$critical .= '@media (min-width:' . ( $bp + 1 ) . 'px){.imm-fab,.imm-bbar{display:none!important}}';
		}
		if ( '' !== $profile['hide_theme_selector'] ) {
			$rule      = $profile['hide_theme_selector'] . '{display:none!important}';
			$critical .= $mobile ? '@media (max-width:' . $bp . 'px){' . $rule . '}' : $rule;
		}

		// Reserva el alto de la barra (sin saltos) y sube el botón flotante por encima de ella.
		$gap        = 'floating' === $profile['bottom_bar']['shape'] ? 10 : 0;
		$space      = ':root{--imm-fab-y:calc(var(--imm-bb-h) + ' . ( $gap + 16 ) . 'px)}body{padding-bottom:calc(var(--imm-bb-h) + ' . $gap . 'px + env(safe-area-inset-bottom,0px))}';
		$bbar_space = $mobile ? '@media (max-width:' . $bp . 'px){' . $space . '}' : $space;

		$full = self::asset( 'drawer.css' );
		if ( 'two_pane' === $profile['drawer']['submenu_mode'] ) {
			$full .= self::asset( 'two-pane.css' );
		}
		if ( '' !== trim( (string) $design['custom_css'] ) ) {
			$full .= "\n" . $design['custom_css'];
		}

		return array(
			'critical'   => $critical,
			'bbar_space' => $bbar_space,
			'full'       => $full,
		);
	}

	/** @param array<string, string|int> $tokens */
	private static function vars( array $tokens ): string {
		$out = '';
		foreach ( $tokens as $key => $value ) {
			if ( isset( self::NUMERIC[ $key ] ) ) {
				[ $name, $unit ] = self::NUMERIC[ $key ];
				$out            .= $name . ':' . ( 'overlay' === $key ? round( (int) $value / 100, 2 ) : (int) $value . $unit ) . ';';
				continue;
			}
			$out .= '--imm-' . str_replace( '_', '-', $key ) . ':' . $value . ';';
		}
		return '' === $out ? '' : ':root{' . $out . '}';
	}

	private static function asset( string $file ): string {
		$path = IMM_DIR . '/assets/dist/' . $file;
		return is_readable( $path ) ? trim( (string) file_get_contents( $path ) ) : ''; // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents
	}
}
