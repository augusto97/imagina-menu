<?php
declare(strict_types=1);

namespace ImaginaMenu\Compiler;

use ImaginaMenu\Integrations\CachePurge;
use ImaginaMenu\Integrations\Languages;
use ImaginaMenu\Repository\MenuRepository;
use ImaginaMenu\Repository\ProfileRepository;
use ImaginaMenu\Repository\SettingsRepository;
use ImaginaMenu\Sources\SourceResolver;

/**
 * Convierte menús, perfiles y ajustes en la configuración que usa el frontend.
 * Todo el trabajo caro (consultas, árboles, HTML, CSS) ocurre aquí, al publicar.
 */
final class Compiler {

	public const STATE_OPTION = 'imm_compile_state';
	public const DIRTY_OPTION = 'imm_dirty';
	public const REFS_OPTION  = 'imm_refs';
	private const LOCK        = 'imm_compile_lock';

	private SourceResolver $resolver;

	/** Con más ítems que esto, «auto» pasa los niveles profundos a <template>. */
	public const HYBRID_FROM = 150;

	/** @var array<int, array<string, string>> Etiquetas por perfil (analítica). */
	private array $labels = array();

	/** @var array<string, string> Cadenas traducibles encontradas. */
	private array $strings = array();

	public function __construct(
		private MenuRepository $menus,
		private ProfileRepository $profiles,
		private SettingsRepository $settings
	) {}

	/**
	 * Compila lo publicado, escribe los archivos y purga la caché de página.
	 *
	 * @return array<string, mixed> Estado de la compilación.
	 */
	public function publish( bool $purge = true ): array {
		if ( get_transient( self::LOCK ) ) {
			// Otra compilación en curso: se marca sucio para que la siguiente lo recoja.
			update_option( self::DIRTY_OPTION, time(), false );
			return $this->state();
		}
		set_transient( self::LOCK, 1, 60 );
		try {
			$config = $this->build( false );
			// Lo que solo usa el admin no va al archivo que se carga en cada visita.
			$ok     = Storage::write_config( array_diff_key( $config, array_flip( array( 'labels', 'strings', 'refs', 'warnings' ) ) ) );
			$state  = array(
				'ok'          => $ok,
				'time'        => time(),
				'hash'        => $config['hash'],
				'sizes'       => $config['sizes'],
				'warnings'    => $config['warnings'],
				'error'       => $ok ? '' : __( 'No se pudo escribir en wp-content/imagina-menu. Revisa los permisos de la carpeta.', 'imagina-menu' ),
				'purged'      => array(),
				'languages'   => $config['languages'],
			);
			if ( $ok ) {
				delete_option( self::DIRTY_OPTION );
				update_option( self::REFS_OPTION, $config['refs'], false );
				update_option( 'imm_labels', $config['labels'], false );
				update_option( 'imm_i18n_strings', $config['strings'], false );
				\ImaginaMenu\Analytics\Stats::sync_schedule( ! empty( $config['settings']['analytics_server'] ) );
				Storage::cleanup( array_values( array_filter( array_column( $config['profiles'], 'css_url' ) ) ) );
				if ( $purge ) {
					$state['purged'] = CachePurge::purge_all();
				}
			}
			update_option( self::STATE_OPTION, $state, false );
			do_action( 'imm/compiled', $config, $state );
			return $state;
		} finally {
			delete_transient( self::LOCK );
		}
	}

	/** @return array<string, mixed> */
	public function state(): array {
		$state = get_option( self::STATE_OPTION, array() );
		return is_array( $state ) ? $state : array();
	}

	public static function mark_dirty(): void {
		update_option( self::DIRTY_OPTION, time(), false );
	}

	public static function is_dirty(): bool {
		return (bool) get_option( self::DIRTY_OPTION, false );
	}

	/**
	 * Configuración completa. Con $draft usa los borradores (vista previa) y deja el CSS inline.
	 *
	 * @return array<string, mixed>
	 */
	public function build( bool $draft ): array {
		$this->resolver = new SourceResolver();
		$this->labels   = array();
		$this->strings  = array();
		$settings       = $this->settings->get();
		$menus    = array();
		foreach ( $this->menus->all( $draft ) as $menu ) {
			$menus[ (int) $menu['id'] ] = $menu;
		}

		$profiles = array();
		$warnings = array();
		$sizes    = array(
			'critical' => 0,
			'css'      => 0,
			'html'     => 0,
			'items'    => 0,
		);

		foreach ( $this->profiles->all( $draft ) as $profile ) {
			if ( ! $profile['enabled'] ) {
				continue;
			}
			$compiled = $this->compile_profile( $profile, $menus, $settings, $draft, $warnings );
			$sizes['critical'] = max( $sizes['critical'], strlen( $compiled['critical'] ) );
			$sizes['css']      = max( $sizes['css'], $compiled['css_size'] );
			$sizes['html']     = max( $sizes['html'], strlen( $compiled['sprite'] . implode( '', $compiled['parts'] ) ) );
			$sizes['items']    = max( $sizes['items'], $compiled['item_count'] );
			unset( $compiled['css_size'], $compiled['item_count'] );
			$profiles[] = $compiled;
		}

		$config = array(
			'version'  => IMM_VERSION,
			'time'     => time(),
			'settings' => array(
				'load_js'     => $settings['load_js'],
				'cart_cookie' => (bool) $settings['cart_cookie'],
				'name_cookie' => (bool) $settings['name_cookie'],
				'analytics_server' => $settings['analytics']['enabled'] && $settings['analytics']['server'],
			),
			'profiles' => $profiles,
			'sizes'    => $sizes,
			'warnings' => array_values( array_unique( $warnings ) ),
			'refs'     => $this->resolver->refs(),
			'labels'   => $this->labels,
			'strings'  => $this->strings,
			'languages' => array_values( array_filter( Languages::compiled() ) ),
		);
		// Primero los perfiles con condiciones (en su orden); los generales al final.
		usort( $profiles, static fn( $a, $b ) => ( $a['rules']['conditions'] ? 0 : 1 ) <=> ( $b['rules']['conditions'] ? 0 : 1 ) );
		$config['profiles'] = $profiles;
		$config['hash']     = substr( md5( (string) wp_json_encode( $profiles ) ), 0, 12 );
		return apply_filters( 'imm/compile/config', $config, $draft );
	}

	/**
	 * @param array<string, mixed>              $profile
	 * @param array<int, array<string, mixed>>  $menus
	 * @param array<string, mixed>              $settings
	 * @param list<string>                      $warnings
	 * @return array<string, mixed>
	 */
	private function compile_profile( array $profile, array $menus, array $settings, bool $draft, array &$warnings ): array {
		if ( 'theme_selector' === $profile['trigger']['mode'] && '' === $profile['trigger']['selector'] ) {
			/* translators: %s: nombre del perfil */
			$warnings[] = sprintf( __( 'El perfil «%s» se abre con el botón del tema, pero falta el selector.', 'imagina-menu' ), $profile['title'] );
		}

		$provider     = Languages::provider();
		$langs        = Languages::compiled();
		$default_lang = Languages::default();
		$cfg          = self::client_config( $profile, $settings );
		$i18n         = array();
		$count        = 0;

		foreach ( $langs as $lang ) {
			$previous = Languages::switch_to( $lang );
			try {
				$tr      = new Translator( $lang );
				$p       = $tr->profile( $profile );
				$menu_id = (int) ( $profile['drawer']['menu_by_lang'][ $lang ] ?? 0 );
				$menu_id = $menu_id > 0 && isset( $menus[ $menu_id ] ) ? $menu_id : (int) $profile['drawer']['menu_id'];
				$menu    = $menus[ $menu_id ] ?? ( $menus ? reset( $menus ) : null );
				$raw     = $menu ? $tr->items( $menu['items'], (int) $menu['id'] ) : array();
				$items   = apply_filters( 'imm/menu/items', $this->resolver->for_language( $lang )->resolve( $raw ), $profile, $lang );
				$count   = max( $count, self::count_items( $items ) );

				if ( $profile['drawer']['enabled'] && ! $items ) {
					/* translators: %s: nombre del perfil */
					$warnings[] = sprintf( __( 'El perfil «%s» tiene el panel activo pero su menú está vacío.', 'imagina-menu' ), $profile['title'] );
				}

				$depth = (string) $settings['html_depth'];
				$site  = self::site( $p ) + array(
					'hybrid'       => 'hybrid' === $depth || ( 'auto' === $depth && self::count_items( $items ) > self::HYBRID_FROM ),
					'multilingual' => in_array( $provider, array( 'wpml', 'polylang' ), true ),
					'cfg'          => $cfg,
				);
				$renderer      = new Renderer( $p, $site );
				$parts         = $renderer->render( $items );
				$i18n[ $lang ] = array(
					'parts'  => $parts,
					'sprite' => $renderer->icons()->sprite(),
				);
				$this->labels[ (int) $profile['id'] ] = ( $this->labels[ (int) $profile['id'] ] ?? array() ) + $renderer->labels();
				$this->strings                        = $this->strings + $tr->strings();
			} finally {
				Languages::restore( $previous );
			}
		}

		$main = $i18n[ $default_lang ] ?? reset( $i18n );
		unset( $i18n[ $default_lang ] );
		if ( 1 === count( $langs ) ) {
			$i18n = array();
		}

		$css     = CssBuilder::build( $profile, $settings );
		$css_url = null;
		if ( ! $draft ) {
			$css_url = Storage::write_css( $css['full'] );
			if ( null === $css_url ) {
				$warnings[] = __( 'No se pudo escribir el CSS en uploads/imagina-menu: se imprime inline.', 'imagina-menu' );
			}
		}

		return array(
			'id'           => (int) $profile['id'],
			'title'        => (string) $profile['title'],
			'rules'        => $profile['rules'],
			'parts'        => $main['parts'],
			'sprite'       => $main['sprite'],
			'i18n'         => $i18n,
			'critical'     => $css['critical'],
			'bbar_space'   => $css['bbar_space'],
			'css_url'      => $css_url,
			'css_inline'   => null === $css_url ? $css['full'] : '',
			'css_size'     => strlen( $css['full'] ),
			'item_count'   => $count,
			'bbar_hide_on' => $profile['bottom_bar']['hide_on'],
			'trigger'      => array(
				'mode'     => $profile['trigger']['mode'],
				'selector' => $profile['trigger']['selector'],
				'icon'     => $profile['trigger']['icon'],
			),
			'color_mode'   => $profile['design']['color_mode'],
		);
	}

	/**
	 * Configuración mínima para el JS (va en un atributo data-imm-cfg): perfil, prefetch y analítica.
	 *
	 * @param array<string, mixed> $profile
	 * @param array<string, mixed> $settings
	 */
	private static function client_config( array $profile, array $settings ): string {
		$a   = $settings['analytics'];
		$cfg = array(
			'p'  => (int) $profile['id'],
			// Con Imagina Turbo o con WordPress 6.8+ (que ya precarga los enlaces al tocarlos con sus
			// propias Speculation Rules) no se duplica: solo en sitios sin ninguno de los dos.
			'pf' => $settings['prefetch'] && ! defined( 'ITB_VERSION' ) && ! function_exists( 'wp_get_speculation_rules_configuration' ) ? 1 : 0,
		);
		if ( $a['enabled'] && ( $a['server'] || $a['ga4'] ) ) {
			$cfg['a'] = array(
				's' => $a['server'] ? 1 : 0,
				'g' => $a['ga4'] ? 1 : 0,
				'r' => (int) $a['sample'],
				'u' => esc_url_raw( rest_url( 'imagina-menu/v1/hit' ) ),
			);
		}
		return (string) wp_json_encode( $cfg, JSON_UNESCAPED_SLASHES );
	}

	/** @param list<array<string, mixed>> $items */
	private static function count_items( array $items ): int {
		$count = 0;
		foreach ( $items as $item ) {
			$count += 1 + self::count_items( $item['children'] ?? array() );
		}
		return $count;
	}

	/**
	 * Datos del sitio que usan las plantillas.
	 *
	 * @param array<string, mixed> $profile
	 * @return array<string, string>
	 */
	public static function site( array $profile ): array {
		$woo     = function_exists( 'wc_get_page_permalink' );
		$logo_id = (int) get_theme_mod( 'custom_logo' );
		$account = $woo ? (string) wc_get_page_permalink( 'myaccount' ) : '';
		if ( '' === $account || home_url( '/' ) === $account ) {
			$account = wp_login_url();
		}
		$post_type = (string) $profile['search']['post_type'];
		if ( 'auto' === $post_type ) {
			$post_type = $woo ? 'product' : '';
		} elseif ( 'any' === $post_type ) {
			$post_type = '';
		}
		return array(
			'name'             => wp_strip_all_tags( (string) get_bloginfo( 'name' ) ),
			'logo'             => $logo_id ? (string) wp_get_attachment_image_url( $logo_id, 'medium' ) : '',
			'home_url'         => home_url( '/' ),
			'account_url'      => $account,
			'cart_url'         => $woo && function_exists( 'wc_get_cart_url' ) ? (string) wc_get_cart_url() : '',
			'search_post_type' => $post_type,
		);
	}
}
