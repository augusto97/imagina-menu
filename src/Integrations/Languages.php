<?php
declare(strict_types=1);

namespace ImaginaMenu\Integrations;

/**
 * Multi-idioma con WPML, Polylang o TranslatePress (solo APIs públicas de cada uno).
 *
 * - Al compilar se genera el HTML de cada idioma: se cambia de idioma, se traducen los textos del
 *   usuario (registrados como cadenas) y los contenidos enlazados (página o categoría traducida).
 * - En cada visita se elige el HTML del idioma actual (una llamada barata del plugin de idiomas).
 * - El selector de idioma depende de la página: se imprime en tiempo de ejecución.
 *
 * TranslatePress traduce el HTML final por su cuenta (incluido el del menú), así que con él basta
 * compilar una sola vez.
 */
final class Languages {

	public const CONTEXT = 'Imagina Menu';

	private static ?string $provider = null;

	public static function provider(): string {
		if ( null === self::$provider ) {
			if ( defined( 'ICL_SITEPRESS_VERSION' ) && has_filter( 'wpml_active_languages' ) ) {
				self::$provider = 'wpml';
			} elseif ( function_exists( 'pll_languages_list' ) ) {
				self::$provider = 'polylang';
			} elseif ( class_exists( 'TRP_Translate_Press' ) ) {
				self::$provider = 'translatepress';
			} else {
				self::$provider = '';
			}
		}
		return self::$provider;
	}

	/**
	 * Idiomas para el admin y el compilador.
	 *
	 * @return list<array{code: string, name: string, default: bool}>
	 */
	public static function languages(): array {
		$out = array();
		switch ( self::provider() ) {
			case 'wpml':
				$default = (string) apply_filters( 'wpml_default_language', null );
				foreach ( (array) apply_filters( 'wpml_active_languages', null, array( 'skip_missing' => 0 ) ) as $code => $lang ) {
					$out[] = array(
						'code'    => (string) $code,
						'name'    => (string) ( $lang['native_name'] ?? $lang['translated_name'] ?? $code ),
						'default' => $default === (string) $code,
					);
				}
				break;
			case 'polylang':
				$default = (string) pll_default_language( 'slug' );
				$names   = (array) pll_languages_list( array( 'fields' => 'name' ) );
				foreach ( (array) pll_languages_list( array( 'fields' => 'slug' ) ) as $i => $code ) {
					$out[] = array(
						'code'    => (string) $code,
						'name'    => (string) ( $names[ $i ] ?? $code ),
						'default' => $default === (string) $code,
					);
				}
				break;
		}
		return $out;
	}

	/** Idiomas que se compilan por separado (TranslatePress y sitios de un idioma: uno solo). */
	public static function compiled(): array {
		$codes = array_column( self::languages(), 'code' );
		return $codes ? $codes : array( '' );
	}

	public static function default(): string {
		foreach ( self::languages() as $lang ) {
			if ( $lang['default'] ) {
				return $lang['code'];
			}
		}
		return '';
	}

	/** Idioma de la página actual (frontend). */
	public static function current(): string {
		return match ( self::provider() ) {
			'wpml'     => (string) apply_filters( 'wpml_current_language', null ),
			'polylang' => (string) pll_current_language( 'slug' ),
			default    => '',
		};
	}

	/** Cambia el idioma activo mientras se compila. Devuelve el anterior para restaurarlo. */
	public static function switch_to( string $lang ): string {
		if ( '' === $lang ) {
			return '';
		}
		$previous = '';
		if ( 'wpml' === self::provider() ) {
			$previous = (string) apply_filters( 'wpml_current_language', null );
			do_action( 'wpml_switch_language', $lang );
		} elseif ( 'polylang' === self::provider() && function_exists( 'PLL' ) ) {
			$pll      = PLL();
			$previous = isset( $pll->curlang->slug ) ? (string) $pll->curlang->slug : '';
			$language = $pll->model->get_language( $lang );
			if ( $language ) {
				$pll->curlang = $language;
			}
		}
		return $previous;
	}

	public static function restore( string $previous ): void {
		if ( 'wpml' === self::provider() ) {
			do_action( 'wpml_switch_language', '' !== $previous ? $previous : null );
		} elseif ( 'polylang' === self::provider() && function_exists( 'PLL' ) ) {
			PLL()->curlang = '' !== $previous ? PLL()->model->get_language( $previous ) : null;
		}
	}

	/** Id del contenido traducido (página, producto, término). */
	public static function object_id( int $id, string $kind, string $type, string $lang ): int {
		if ( '' === $lang || $id <= 0 ) {
			return $id;
		}
		if ( 'wpml' === self::provider() ) {
			$translated = apply_filters( 'wpml_object_id', $id, '' !== $type ? $type : ( 'term' === $kind ? 'category' : 'any' ), true, $lang );
			return (int) ( $translated ?: $id );
		}
		if ( 'polylang' === self::provider() ) {
			$translated = 'term' === $kind ? pll_get_term( $id, $lang ) : pll_get_post( $id, $lang );
			return (int) ( $translated ?: $id );
		}
		return $id;
	}

	/** Argumentos extra de get_terms para filtrar por idioma. */
	public static function terms_args( string $lang ): array {
		return ( '' !== $lang && 'polylang' === self::provider() ) ? array( 'lang' => $lang ) : array();
	}

	/**
	 * Traduce un texto del usuario. El nombre es estable (id del ítem + campo) para que la
	 * traducción sobreviva a cambios de orden.
	 */
	public static function translate( string $name, string $value, string $lang ): string {
		if ( '' === $value || '' === $lang || $lang === self::default() ) {
			return $value;
		}
		if ( 'wpml' === self::provider() ) {
			return (string) apply_filters( 'wpml_translate_single_string', $value, self::CONTEXT, $name, $lang );
		}
		if ( 'polylang' === self::provider() && function_exists( 'pll_translate_string' ) ) {
			return (string) pll_translate_string( $value, $lang );
		}
		return $value;
	}

	/**
	 * Registra las cadenas compiladas para que aparezcan en WPML → Traducción de cadenas o en
	 * Idiomas → Traducciones de cadenas (Polylang las pide en cada carga del admin).
	 */
	public static function register_strings(): void {
		$strings = get_option( 'imm_i18n_strings', array() );
		if ( ! is_array( $strings ) || ! $strings ) {
			return;
		}
		foreach ( $strings as $name => $value ) {
			if ( 'wpml' === self::provider() ) {
				do_action( 'wpml_register_single_string', self::CONTEXT, (string) $name, (string) $value );
			} elseif ( 'polylang' === self::provider() && function_exists( 'pll_register_string' ) ) {
				pll_register_string( (string) $name, (string) $value, self::CONTEXT );
			}
		}
	}

	/**
	 * Selector de idioma para la página actual (enlaces a sus traducciones).
	 */
	public static function switcher(): string {
		$links = array();
		if ( 'wpml' === self::provider() ) {
			foreach ( (array) apply_filters( 'wpml_active_languages', null, array( 'skip_missing' => 0 ) ) as $code => $lang ) {
				$links[] = array( (string) $code, (string) ( $lang['native_name'] ?? $code ), (string) ( $lang['url'] ?? '' ), ! empty( $lang['active'] ) );
			}
		} elseif ( 'polylang' === self::provider() && function_exists( 'pll_the_languages' ) ) {
			foreach ( (array) pll_the_languages( array( 'raw' => 1, 'hide_if_empty' => 0 ) ) as $lang ) {
				$links[] = array( (string) $lang['slug'], (string) $lang['name'], (string) $lang['url'], ! empty( $lang['current_lang'] ) );
			}
		}
		if ( count( $links ) < 2 ) {
			return '';
		}
		$html = '<ul class="imm-langs" role="list" aria-label="' . esc_attr__( 'Idioma', 'imagina-menu' ) . '">';
		foreach ( $links as [ $code, $name, $url, $active ] ) {
			$html .= '<li><a href="' . esc_url( $url ) . '" hreflang="' . esc_attr( $code ) . '" lang="' . esc_attr( $code ) . '"' . ( $active ? ' aria-current="true"' : '' ) . '>' . esc_html( $name ) . '</a></li>';
		}
		return $html . '</ul>';
	}
}
