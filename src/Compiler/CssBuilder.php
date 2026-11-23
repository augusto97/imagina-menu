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
	 * @return array{critical: string, bbar_space: string, full: string, toggle: string}
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
		if ( '' !== Renderer::fab_kind( $profile ) ) {
			$critical .= self::fab_css( $profile['trigger'] );
		}
		if ( $profile['bottom_bar']['enabled'] && $profile['bottom_bar']['items'] ) {
			$critical .= self::bottom_bar_css( $profile['bottom_bar'] );
		}
		// Dentro de un iframe de otro sitio (Ajustes → Dónde no se muestra) el <html> lleva .imm-framed:
		// nada del menú se ve y no se reserva su espacio ni se oculta la cabecera o el menú del tema.
		$root = ! empty( $settings['exclude']['iframes'] ) ? 'html:not(.imm-framed) ' : '';
		if ( '' !== $root ) {
			$critical .= '.imm-framed :is(.imm-fab,.imm-bbar,.imm-toggle' . ( $profile['app_bar']['enabled'] ? ',.imm-appbar' : '' ) . '){display:none!important}';
		}
		if ( ! empty( $profile['bottom_bar']['badge_custom'] ) ) {
			// Colores propios de los contadores de la barra inferior (hexadecimales validados).
			$critical .= '.imm-bbar{--imm-bb-bbg:' . $profile['bottom_bar']['badge_bg'] . ';--imm-bb-bfg:' . $profile['bottom_bar']['badge_fg'] . '}';
		}

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
			$rule      = self::scope( $root, $profile['hide_theme_selector'] ) . '{display:none!important}';
			$critical .= $mobile ? '@media (max-width:' . $bp . 'px){' . $rule . '}' : $rule;
		}

		// Barra superior móvil: su CSS va en el crítico (se ve en el primer pintado) y su alto queda
		// reservado en el <body>. Solo en celulares (hasta el breakpoint).
		$ab = $profile['app_bar'];
		if ( $ab['enabled'] ) {
			// 52 px la fila; 50 más con el buscador debajo; la isla flotante deja 8 px arriba y abajo.
			$field     = array( 'sm' => 44, 'lg' => 56 )[ $ab['field_size'] ] ?? 50; // el campo y 8 px debajo
			$height    = 52 + ( $ab['search'] && 'inline' !== $ab['layout'] ? $field : 0 ) + ( 'floating' === $ab['shape'] ? 16 : 0 );
			// La cabecera del tema se oculta solo en celulares y solo con la barra activa (la reemplaza).
			$header    = '' !== $ab['hide_header'] ? self::scope( $root, $ab['hide_header'] ) . '{display:none!important}' : '';
			$critical .= '@media (max-width:' . $bp . 'px){' . self::asset( 'appbar.css' ) . self::app_bar_extras( $ab ) . self::app_bar_vars( $ab ) . self::app_bar_colors( $ab ) . $header . $root . 'body{padding-top:calc(' . $height . 'px + env(safe-area-inset-top,0px))!important}}'
				. '@media (min-width:' . ( $bp + 1 ) . 'px){.imm-appbar{display:none!important}}';
		}

		// Reserva el alto de la barra (sin saltos) y sube el botón flotante por encima de ella.
		$gap        = 'floating' === $profile['bottom_bar']['shape'] ? 10 : 0;
		$space      = ':root{--imm-fab-y:calc(var(--imm-bb-h) + ' . ( $gap + 16 ) . 'px)}' . $root . 'body{padding-bottom:calc(var(--imm-bb-h) + ' . $gap . 'px + env(safe-area-inset-bottom,0px))}';
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
			// Botón del shortcode, bloque o Elementor: se imprime junto al primero de la página.
			'toggle'     => self::asset( 'toggle.css' ),
		);
	}

	/**
	 * Limita un selector del dueño (puede ser una lista) a las páginas fuera de un iframe ajeno.
	 * :is() acepta listas y descarta las partes inválidas sin anular la regla.
	 */
	private static function scope( string $root, string $selector ): string {
		return '' === $root ? $selector : $root . ':is(' . $selector . ')';
	}

	/**
	 * Medidas del logo de la barra superior (solo si no son las de por defecto).
	 *
	 * @param array<string, mixed> $ab
	 */
	private static function app_bar_vars( array $ab ): string {
		$h = (int) $ab['logo_height'];
		$w = (int) $ab['logo_width'];
		return 28 === $h && 150 === $w ? '' : '.imm-appbar{--imm-ab-logo-h:' . $h . 'px;--imm-ab-logo-w:' . $w . 'px}';
	}

	/**
	 * Colores propios de la barra superior (los mismos en modo claro y oscuro). Valores ya validados
	 * como hexadecimales por el Normalizer.
	 *
	 * @param array<string, mixed> $ab
	 */
	private static function app_bar_colors( array $ab ): string {
		if ( empty( $ab['custom_colors'] ) ) {
			return '';
		}
		$c  = $ab['colors'];
		$bg = '' !== $c['bg2'] ? 'linear-gradient(135deg,' . $c['bg'] . ',' . $c['bg2'] . ')' : $c['bg'];
		return '.imm-appbar{--imm-ab-bg:' . $bg . ';--imm-ab-ring:' . $c['bg'] . ';--imm-ab-fg:' . $c['fg'] . ';--imm-ab-sbg:' . $c['search_bg'] . ';--imm-ab-sfg:' . $c['search_fg'] . ';--imm-ab-bbg:' . $c['badge_bg'] . ';--imm-ab-bfg:' . $c['badge_fg'] . ';--imm-ab-cbg:' . $c['cta_bg'] . ';--imm-ab-cfg:' . $c['cta_fg'] . '}';
	}

	/**
	 * Variantes de la barra superior que el perfil usa (diseño, logo centrado, botón con texto): un
	 * archivo por opción en assets/dist/appbar/. Nada extra con el diseño clásico.
	 *
	 * @param array<string, mixed> $ab
	 */
	private static function app_bar_extras( array $ab ): string {
		$inline = $ab['search'] && 'inline' === $ab['layout'];
		$files  = array();
		if ( 'flat' !== $ab['shape'] ) {
			$files[] = 'shape-' . $ab['shape'];
		}
		if ( 'pill' !== $ab['field'] && $ab['search'] ) {
			$files[] = 'field-' . $ab['field'];
		}
		if ( $ab['glass'] ) {
			$files[] = 'glass';
		}
		// En una fila con el buscador no hay sitio para el logo centrado: va junto al menú.
		if ( $inline ) {
			$files[] = 'inline';
		} elseif ( 'center' === $ab['logo_align'] ) {
			$files[] = 'center';
		}
		// Después de «inline»: el tamaño también cambia el alto del campo en una fila.
		if ( 'md' !== $ab['field_size'] && $ab['search'] ) {
			$files[] = 'size-' . $ab['field_size'];
		}
		foreach ( $ab['actions'] as $action ) {
			if ( 'button' === $action['style'] && '' !== $action['label'] ) {
				$files[] = 'cta';
				break;
			}
		}
		return implode( '', array_map( static fn( $f ) => self::asset( 'appbar/' . $f . '.css' ), $files ) );
	}

	/**
	 * Botón flotante con solo su posición, forma y estilo; tamaño y distancia al borde como variables
	 * (solo si cambian).
	 *
	 * @param array<string, mixed> $t
	 */
	private static function fab_css( array $t ): string {
		$css = self::asset( 'fab.css' ) . self::asset( 'fab/' . $t['position'] . '.css' );
		if ( 'circle' !== $t['shape'] ) {
			$css .= self::asset( 'fab/shape-' . $t['shape'] . '.css' );
		}
		if ( 'solid' !== $t['style'] ) {
			$css .= self::asset( 'fab/style-' . $t['style'] . '.css' );
		}
		$vars = ( 52 !== (int) $t['size'] ? '--imm-fab-s:' . (int) $t['size'] . 'px;' : '' ) . ( 16 !== (int) $t['offset'] ? '--imm-fab-o:' . (int) $t['offset'] . 'px;' : '' );
		return $css . ( '' !== $vars ? '.imm-fab{' . $vars . '}' : '' );
	}

	/**
	 * Barra inferior con solo las variantes elegidas (indicador, etiquetas ocultas, flotante,
	 * translúcida, botón central).
	 *
	 * @param array<string, mixed> $bar
	 */
	private static function bottom_bar_css( array $bar ): string {
		$files = array( 'bbar' );
		if ( 'color' !== $bar['indicator'] ) {
			$files[] = 'bbar/ind-' . $bar['indicator'];
		}
		if ( 'labels' !== $bar['style'] ) {
			$files[] = 'bbar/labels-hidden';
		}
		if ( 'bar' !== $bar['shape'] ) {
			$files[] = 'bbar/' . $bar['shape']; // floating | rounded
		}
		if ( $bar['blur'] ) {
			$files[] = 'bbar/blur';
		}
		if ( in_array( true, array_column( $bar['items'], 'prominent' ), true ) ) {
			$files[] = 'bbar/main';
		}
		return implode( '', array_map( static fn( $f ) => self::asset( $f . '.css' ), $files ) );
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
