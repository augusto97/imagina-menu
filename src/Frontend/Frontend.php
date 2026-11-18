<?php
declare(strict_types=1);

namespace ImaginaMenu\Frontend;

use ImaginaMenu\Compiler\Compiler;
use ImaginaMenu\Compiler\Renderer;
use ImaginaMenu\Compiler\Storage;
use ImaginaMenu\Core\Plugin;
use ImaginaMenu\Integrations\Languages;

/**
 * Lo que corre en cada visita. Presupuesto: < 1 ms, 0 consultas propias.
 *
 * 1. template_redirect: carga la configuración compilada (un include que vive en OPcache) y elige el perfil.
 * 2. wp_head: CSS crítico inline (tokens, botón, barra inferior, reserva de espacio).
 * 3. wp_footer: HTML ya renderizado + CSS completo (no bloquea: está al final del body) + módulo JS.
 */
final class Frontend {

	/** @var array<string, mixed>|null|false false = aún no se cargó. */
	private static array|null|false $config = false;

	/** @var array<string, mixed>|null */
	private static ?array $profile = null;

	private static bool $show_bbar = false;

	private static bool $preview = false;

	public static function boot(): void {
		if ( is_admin() || ( defined( 'IMM_DISABLE' ) && IMM_DISABLE ) ) {
			return;
		}
		add_action( 'template_redirect', array( self::class, 'select' ), 1 );
		add_shortcode( 'imagina_menu_toggle', array( Toggle::class, 'shortcode' ) );
	}

	/** Configuración publicada (memorizada). */
	public static function config(): ?array {
		if ( false === self::$config ) {
			self::$config = Storage::load();
		}
		return self::$config;
	}

	/** Perfil elegido para este request (null si no hay menú en esta página). */
	public static function profile(): ?array {
		return self::$profile;
	}

	public static function select(): void {
		if ( is_feed() || is_embed() || is_robots() || is_trackback() || is_favicon() ) {
			return;
		}
		// phpcs:disable WordPress.Security.NonceVerification.Recommended -- solo lectura; el token de vista previa lleva su propia firma.
		if ( isset( $_GET['imm_off'] ) && current_user_can( Plugin::CAP ) ) {
			return;
		}
		if ( isset( $_GET['imm_preview'] ) && Preview::verify( sanitize_text_field( wp_unslash( $_GET['imm_preview'] ) ) ) ) {
			self::$preview = true;
			self::$config  = Plugin::compiler()->build( true );
			Preview::prepare_request();
		}
		// phpcs:enable

		$config = self::config();
		if ( ! $config || ! $config['profiles'] ) {
			return;
		}
		$profile = null;
		foreach ( $config['profiles'] as $candidate ) {
			if ( RuleMatcher::matches( $candidate['rules'] ?? array() ) ) {
				$profile = $candidate;
				break;
			}
		}
		$profile = apply_filters( 'imm/profile/match', $profile, $config['profiles'] );
		if ( ! is_array( $profile ) ) {
			return;
		}
		// HTML del idioma actual (WPML/Polylang). Sin traducción compilada: el del idioma principal.
		$lang = ! empty( $profile['i18n'] ) ? Languages::current() : '';
		if ( '' !== $lang && isset( $profile['i18n'][ $lang ] ) ) {
			$profile['parts']  = $profile['i18n'][ $lang ]['parts'];
			$profile['sprite'] = $profile['i18n'][ $lang ]['sprite'];
		}
		unset( $profile['i18n'] );
		self::$profile   = $profile;
		self::$show_bbar = '' !== $profile['parts']['bbar'] && ! self::bbar_hidden_here( $profile['bbar_hide_on'] );

		add_action( 'wp_head', array( self::class, 'head' ), 2 );
		add_action( 'wp_footer', array( self::class, 'footer' ), 5 );
		add_action( 'wp_enqueue_scripts', array( self::class, 'enqueue' ), 20 );
	}

	/** @param list<string> $hide_on */
	private static function bbar_hidden_here( array $hide_on ): bool {
		foreach ( $hide_on as $page ) {
			$hidden = match ( $page ) {
				'checkout' => function_exists( 'is_checkout' ) && is_checkout(),
				'cart'     => function_exists( 'is_cart' ) && is_cart(),
				'product'  => function_exists( 'is_product' ) && is_product(),
				'account'  => function_exists( 'is_account_page' ) && is_account_page(),
				default    => false,
			};
			if ( $hidden ) {
				return true;
			}
		}
		return false;
	}

	public static function head(): void {
		$p = self::$profile;
		if ( ! $p ) {
			return;
		}
		$css = $p['critical'] . ( self::$show_bbar ? $p['bbar_space'] : '' );
		echo '<style id="imm-critical">' . $css . '</style>' . "\n"; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- CSS compilado desde valores validados.
	}

	public static function footer(): void {
		$p = self::$profile;
		if ( ! $p ) {
			return;
		}
		$parts  = $p['parts'];
		$user   = is_user_logged_in();
		$drawer = $user && '' !== $parts['drawer_user'] ? $parts['drawer_user'] : $parts['drawer_guest'];
		if ( $user && str_contains( $drawer, Renderer::NAME_TOKEN ) ) {
			$current = wp_get_current_user();
			$name    = '' !== $current->first_name ? $current->first_name : $current->display_name;
			$drawer  = str_replace( Renderer::NAME_TOKEN, esc_html( $name ), $drawer );
		}

		if ( str_contains( $drawer, Renderer::LANGS_TOKEN ) ) {
			$drawer = str_replace( Renderer::LANGS_TOKEN, Languages::switcher(), $drawer );
		}

		$html = $p['sprite'] . $parts['fab'] . $drawer . $parts['search'] . ( self::$show_bbar ? $parts['bbar'] : '' );
		$html = self::mark_current( $html );

		if ( '' !== $p['css_url'] && null !== $p['css_url'] ) {
			echo '<link rel="stylesheet" id="imm-css" href="' . esc_url( $p['css_url'] ) . '">'; // phpcs:ignore WordPress.WP.EnqueuedResources.NonEnqueuedStylesheet -- se imprime al final del body a propósito: no bloquea el render.
		} else {
			echo '<style id="imm-css">' . $p['css_inline'] . '</style>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
		}
		echo "\n<!-- Imagina Menu -->\n" . $html . "\n"; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- HTML renderizado y escapado al compilar.

		$config = self::config();
		if ( $config && 'interaction' === $config['settings']['load_js'] && 'theme_selector' !== $p['trigger']['mode'] ) {
			// El panel abre sin JS (Popover API); el JS se descarga con el primer gesto del usuario.
			echo '<script type="module">const e=["pointerdown","keydown","scroll","touchstart"],l=()=>{e.forEach(t=>removeEventListener(t,l,{capture:!0}));import(' . wp_json_encode( self::script_url() ) . ')};e.forEach(t=>addEventListener(t,l,{capture:!0,passive:!0,once:!0}))</script>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped, WordPress.WP.EnqueuedResources.NonEnqueuedScript
		}
	}

	public static function enqueue(): void {
		$config = self::config();
		$p      = self::$profile;
		if ( ! $config || ! $p ) {
			return;
		}
		if ( 'interaction' === $config['settings']['load_js'] && 'theme_selector' !== $p['trigger']['mode'] ) {
			return; // Lo carga el cargador por interacción del footer.
		}
		if ( function_exists( 'wp_enqueue_script_module' ) ) {
			wp_enqueue_script_module( 'imagina-menu', self::script_url(), array(), null );
		}
	}

	private static function script_url(): string {
		return plugins_url( 'assets/dist/core.js', IMM_FILE ) . '?ver=' . IMM_VERSION;
	}

	/**
	 * Marca el enlace de la página actual con aria-current (sirve para el estilo activo y para abrir
	 * el panel en el nivel correcto). Un str_replace sobre HTML estático: la caché de página ya es por URL.
	 */
	private static function mark_current( string $html ): string {
		$uri  = isset( $_SERVER['REQUEST_URI'] ) ? (string) wp_unslash( $_SERVER['REQUEST_URI'] ) : '/'; // phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized -- solo se compara.
		$path = (string) strtok( $uri, '?#' );
		$home = wp_parse_url( home_url(), PHP_URL_SCHEME ) . '://' . wp_parse_url( home_url(), PHP_URL_HOST );
		$port = wp_parse_url( home_url(), PHP_URL_PORT );
		if ( $port ) {
			$home .= ':' . $port;
		}
		$urls = array_unique( array( $home . $path, $home . rtrim( $path, '/' ), $home . trailingslashit( $path ) ) );
		foreach ( $urls as $url ) {
			$attr = 'href="' . esc_url( $url ) . '"';
			if ( str_contains( $html, $attr ) ) {
				return str_replace( $attr, $attr . ' aria-current="page"', $html );
			}
		}
		return $html;
	}

	public static function is_preview(): bool {
		return self::$preview;
	}
}
