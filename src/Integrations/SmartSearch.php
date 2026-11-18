<?php
declare(strict_types=1);

namespace ImaginaMenu\Integrations;

defined( 'ABSPATH' ) || exit;

/**
 * Integración con Imagina Search (plugin «Woo Smart Search», carpeta woo-smart-search).
 *
 * El buscador del menú (botón del panel y de la barra inferior) muestra el widget de Imagina Search
 * dentro de su diálogo a pantalla completa: resultados instantáneos con imágenes y precios, y su
 * página de resultados. No se modifica Imagina Search ni se carga nada extra: su JS y su CSS ya
 * están en todas las páginas y su script inicializa el widget al cargar (el menú se imprime antes).
 *
 * El HTML compilado del menú lleva dos marcadores; en cada visita se cambian por el widget si
 * Imagina Search está activo (así activarlo o desactivarlo no exige volver a publicar el menú).
 */
final class SmartSearch {

	/** Apertura del <form> nativo (se cambia por un <div> cuando se usa Imagina Search). */
	public const FORM_OPEN     = '<!--imm:sf-->';
	public const FORM_OPEN_END = '<!--/imm:sf-->';

	/** Campo y botón nativos (se cambian por el widget). */
	public const FIELD     = '<!--imm:s-->';
	public const FIELD_END = '<!--/imm:s-->';

	/** Diseños de Imagina Search con el mismo HTML (desplegable): los demás abren su propia capa. */
	private const DROPDOWN_LAYOUTS = array( 'standard', 'compact', 'amazon' );

	public static function active(): bool {
		return defined( 'WSS_VERSION' ) && class_exists( 'WSS_Frontend' ) && method_exists( 'WSS_Frontend', 'get_search_widget_html' );
	}

	public static function version(): string {
		return defined( 'WSS_VERSION' ) ? (string) constant( 'WSS_VERSION' ) : '';
	}

	/**
	 * Pone el widget en el HTML del buscador, o quita los marcadores si no se usa.
	 *
	 * @param string $html     Parte «search» compilada (ya en el idioma de la página).
	 * @param string $provider auto | native (ajuste del perfil).
	 */
	public static function apply( string $html, string $provider ): string {
		if ( '' === $html || ! str_contains( $html, self::FIELD ) ) {
			return $html;
		}
		$widget = '';
		if ( 'native' !== $provider && self::active() ) {
			// El mismo texto del campo propio (ya traducido): coincide con el del botón del panel.
			$placeholder = preg_match( '/class="imm-s-input"[^>]*placeholder="([^"]*)"/', $html, $m ) ? html_entity_decode( $m[1], ENT_QUOTES, 'UTF-8' ) : '';
			$widget      = self::widget( $placeholder );
		}
		if ( '' === $widget ) {
			return str_replace( array( self::FORM_OPEN, self::FORM_OPEN_END, self::FIELD, self::FIELD_END ), '', $html );
		}
		$html = self::replace_between( $html, self::FORM_OPEN, self::FORM_OPEN_END, '<div class="imm-s-form imm-s-wss">' );
		$html = self::replace_between( $html, self::FIELD, self::FIELD_END, $widget . self::css() );
		// El </form> que cerraba el formulario nativo pasa a cerrar el <div>.
		return str_replace( '</form><div class="imm-s-body">', '</div><div class="imm-s-body">', $html );
	}

	private static function replace_between( string $html, string $start, string $end, string $with ): string {
		$a = strpos( $html, $start );
		$b = false === $a ? false : strpos( $html, $end, $a );
		if ( false === $a || false === $b ) {
			return $html;
		}
		return substr( $html, 0, $a ) . $with . substr( $html, $b + strlen( $end ) );
	}

	/** HTML del widget con un diseño de desplegable (los de capa propia no caben dentro de otro diálogo). */
	private static function widget( string $placeholder ): string {
		$layout = self::layout();
		// Una sola versión del widget (sin la de celular aparte): el diálogo del menú ya es la vista móvil.
		$same = static function ( $value ) {
			if ( is_array( $value ) ) {
				$value['widget_layout_mobile'] = 'same';
			}
			return $value;
		};
		add_filter( 'option_wss_settings', $same );
		try {
			$frontend = new \WSS_Frontend();
			$html     = (string) $frontend->get_search_widget_html(
				array_filter(
					array(
						'layout'      => $layout,
						'placeholder' => $placeholder,
						'width'       => '100%',
					)
				)
			);
		} catch ( \Throwable $e ) {
			$html = ''; // Si Imagina Search falla, queda el buscador propio.
		} finally {
			remove_filter( 'option_wss_settings', $same );
		}
		return str_contains( $html, 'wss-search-input' ) ? $html : '';
	}

	private static function layout(): string {
		$settings = get_option( 'wss_settings', array() );
		$layout   = is_array( $settings ) ? (string) ( $settings['widget_layout'] ?? 'standard' ) : 'standard';
		return in_array( $layout, self::DROPDOWN_LAYOUTS, true ) ? $layout : 'standard';
	}

	/**
	 * Dentro del diálogo del menú el campo se queda en la cabecera (junto a la flecha de regreso) y
	 * los resultados ocupan el resto de la pantalla. Sin esto, en celulares Imagina Search fija su
	 * propia barra encima de la del menú con una segunda flecha.
	 */
	private static function css(): string {
		$w = 'dialog.imm-search .imm-s-wss .wss-search-wrapper';
		return '<style>'
			. '.imm-s-wss{display:flex;align-items:center;gap:6px}'
			. $w . '{flex:1 1 auto;min-width:0;width:auto!important;max-width:none!important;margin:0!important}'
			. $w . ' .wss-search-input{font-size:16px!important}'
			. $w . '.wss-mobile-open .wss-search-input-container{position:relative!important;inset:auto!important;z-index:auto;padding:0!important;border:0!important;box-shadow:none!important;background:transparent!important}'
			. $w . ' .wss-mobile-back-btn,' . $w . ' .wss-mobile-backdrop{display:none!important}'
			. $w . ' .wss-results-dropdown{position:fixed!important;top:calc(64px + env(safe-area-inset-top,0px))!important;left:0!important;right:0!important;bottom:0!important;width:auto!important;max-width:none!important;max-height:none!important;margin:0!important;border:0!important;border-radius:0!important;box-shadow:none!important;overflow-y:auto!important;z-index:2}'
			. '</style>';
	}
}
