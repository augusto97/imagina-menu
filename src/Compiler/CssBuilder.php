<?php
declare(strict_types=1);

namespace ImaginaMenu\Compiler;

defined( 'ABSPATH' ) || exit;

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

		$desk = $profile['desktop'];
		$on   = (bool) $desk['enabled'];
		if ( $mobile ) {
			// En escritorio el botón flotante y la barra inferior se ocultan, salvo que el perfil los pida.
			$hide = array_keys(
				array_filter(
					array(
						'.imm-fab'  => ! ( $on && $desk['floating'] ),
						'.imm-bbar' => ! ( $on && $desk['bottom_bar'] ),
					)
				)
			);
			if ( $hide ) {
				$critical .= '@media (min-width:' . ( $bp + 1 ) . 'px){' . implode( ',', $hide ) . '{display:none!important}}';
			}
		}
		// Botón del shortcode/bloque solo en escritorio o solo en celular (only="desktop|mobile").
		$critical .= '@media (max-width:' . $bp . 'px){.imm-only-desktop{display:none!important}}@media (min-width:' . ( $bp + 1 ) . 'px){.imm-only-mobile{display:none!important}}';
		if ( '' !== $profile['hide_theme_selector'] ) {
			$rule      = $profile['hide_theme_selector'] . '{display:none!important}';
			$critical .= $mobile ? '@media (max-width:' . $bp . 'px){' . $rule . '}' : $rule;
		}

		// Reserva el alto de la barra (sin saltos) y sube el botón flotante por encima de ella.
		$gap        = 'floating' === $profile['bottom_bar']['shape'] ? 10 : 0;
		$space      = ':root{--imm-fab-y:calc(var(--imm-bb-h) + ' . ( $gap + 16 ) . 'px)}body{padding-bottom:calc(var(--imm-bb-h) + ' . $gap . 'px + env(safe-area-inset-bottom,0px))}';
		$bbar_space = $mobile && ! ( $on && $desk['bottom_bar'] ) ? '@media (max-width:' . $bp . 'px){' . $space . '}' : $space;

		$full = self::asset( 'drawer.css' );
		$mode = $profile['drawer']['submenu_mode'];
		if ( 'two_pane' === $mode || 'tabs' === $mode ) {
			$full .= self::asset( 'two-pane.css' );
		}
		if ( 'tabs' === $mode ) {
			$full .= self::asset( 'tabs.css' );
		}
		if ( 'grid' === $mode ) {
			$full .= self::asset( 'grid.css' );
		}
		if ( $on ) {
			// Escritorio: panel de ancho fijo (Amazon: ~380 px). !important gana a las variables inline del panel.
			$wide  = '.imm-drawer{--imm-w:100vw!important;--imm-mw:' . (int) $desk['width'] . 'px!important;--imm-fly:' . (int) $desk['flyout'] . 'px}';
			$wide .= in_array( $mode, array( 'slide', 'grid' ), true ) && 'cascade' === $desk['layout'] && 'bottom' !== $profile['drawer']['side'] ? self::asset( 'cascade.css' ) : '';
			$full .= '@media (min-width:' . ( $bp + 1 ) . 'px){' . $wide . '}';
		}
		$full .= self::style( $design['style'], $design['tokens'] );
		if ( ! empty( $profile['drawer']['language_switcher'] ) ) {
			$full .= '.imm-langs{display:flex;flex-wrap:wrap;gap:6px;margin:0;padding:0;list-style:none}.imm-langs a{display:inline-flex;align-items:center;min-height:36px;padding:0 12px;border:1px solid var(--imm-border);border-radius:999px;color:inherit;font-size:.85em;text-decoration:none}.imm-langs a[aria-current]{border-color:var(--imm-accent);color:var(--imm-accent-text);font-weight:700}';
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

	/** Familias tipográficas del sistema (no se descarga ninguna fuente). */
	private const FONTS = array(
		'system'  => 'system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif',
		'rounded' => 'ui-rounded,"SF Pro Rounded","Nunito","Varela Round","Quicksand",system-ui,-apple-system,"Segoe UI",sans-serif',
		'serif'   => 'ui-serif,"New York","Iowan Old Style","Palatino Linotype",Palatino,Georgia,"Times New Roman",serif',
	);

	private const EASE = array(
		'smooth' => 'cubic-bezier(.2,.8,.2,1)',
		'snappy' => 'cubic-bezier(.16,1,.3,1)',
		'spring' => 'cubic-bezier(.16,1,.3,1)',
	);

	/** Resorte suave (≈4 % de rebote) para submenús e ítems; el panel nunca rebota (dejaría un hueco). */
	private const SPRING = 'linear(0,.157 7.4%,.483 15.3%,.788 24.2%,.958 32.4%,1.032 40.6%,1.045 47.6%,1.03 56.5%,1.008 68.5%,.998 82%,1)';

	private const SHADOW = array(
		'none'   => 'none',
		'soft'   => '0 0 0 1px rgb(0 0 0 / .04),0 18px 48px -12px rgb(0 0 0 / .28)',
		'strong' => '0 0 0 1px rgb(0 0 0 / .06),0 28px 70px -10px rgb(0 0 0 / .5)',
	);

	/** Opciones cuyo valor no predeterminado tiene un archivo de variante en assets/dist/styles. */
	private const VARIANTS = array( 'panel', 'header', 'items', 'icons', 'headings', 'active', 'chevron', 'badge', 'search', 'overlay' );

	/**
	 * CSS del estilo visual del panel: variables (tipografía, peso, movimiento, sombra) y solo las
	 * variantes elegidas. Así cada sitio descarga el CSS de su estilo y nada más.
	 *
	 * @param array<string, mixed>      $style
	 * @param array<string, string|int> $tokens
	 */
	public static function style( array $style, array $tokens ): string {
		$weight = array(
			'regular'  => 400,
			'medium'   => 500,
			'semibold' => 600,
		);
		$vars   = '--imm-fw:' . ( $weight[ $style['weight'] ] ?? 500 ) . ';--imm-shadow:' . ( self::SHADOW[ $style['shadow'] ] ?? self::SHADOW['soft'] ) . ';';
		$vars  .= '--imm-ease:' . ( self::EASE[ $style['motion'] ] ?? self::EASE['smooth'] ) . ';';
		if ( isset( self::FONTS[ $style['font'] ] ) ) {
			$vars .= '--imm-ff:' . self::FONTS[ $style['font'] ] . ';';
		}
		// Sangría de los separadores: alineados con el texto (después del icono si lo hay).
		$sep   = array(
			'none'  => 18,
			'plain' => 52,
			'soft'  => 66,
			'tile'  => 64,
			'color' => 62,
		);
		$vars .= '--imm-sep:' . ( $sep[ $style['icons'] ] ?? 18 ) . 'px;';
		if ( 'image' === $style['header'] && '' !== $style['header_image']['url'] ) {
			$vars .= '--imm-head-img:url("' . str_replace( array( '"', '\\', "\n" ), '', esc_url_raw( (string) $style['header_image']['url'] ) ) . '");';
		}
		$css = ':root{' . $vars . '}';
		if ( 'spring' === $style['motion'] ) {
			$css .= '@supports (transition-timing-function:linear(0,1)){:root{--imm-ease-l:' . self::SPRING . '}}';
		}

		foreach ( self::VARIANTS as $key ) {
			$value = (string) ( $style[ $key ] ?? '' );
			if ( 'panel' === $key && 'glass' === $value ) {
				$css .= self::asset( 'styles/panel-floating.css' );
			}
			$css .= self::asset( 'styles/' . $key . '-' . $value . '.css' );
		}
		if ( ! empty( $style['stagger'] ) ) {
			$css .= self::asset( 'styles/stagger.css' );
		}
		return $css;
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
