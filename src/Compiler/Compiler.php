<?php
declare(strict_types=1);

namespace ImaginaMenu\Compiler;

use ImaginaMenu\Integrations\CachePurge;
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
			$ok     = Storage::write_config( $config );
			$state  = array(
				'ok'          => $ok,
				'time'        => time(),
				'hash'        => $config['hash'],
				'sizes'       => $config['sizes'],
				'warnings'    => $config['warnings'],
				'error'       => $ok ? '' : __( 'No se pudo escribir en wp-content/imagina-menu. Revisa los permisos de la carpeta.', 'imagina-menu' ),
				'purged'      => array(),
			);
			if ( $ok ) {
				delete_option( self::DIRTY_OPTION );
				update_option( self::REFS_OPTION, $config['refs'], false );
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
			),
			'profiles' => $profiles,
			'sizes'    => $sizes,
			'warnings' => array_values( array_unique( $warnings ) ),
			'refs'     => $this->resolver->refs(),
		);
		$config['hash'] = substr( md5( (string) wp_json_encode( $profiles ) ), 0, 12 );
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
		$menu_id = (int) $profile['drawer']['menu_id'];
		$menu    = $menus[ $menu_id ] ?? ( $menus ? reset( $menus ) : null );
		$items   = $menu ? $this->resolver->resolve( $menu['items'] ) : array();
		$items   = apply_filters( 'imm/menu/items', $items, $profile );

		if ( $profile['drawer']['enabled'] && ! $items ) {
			/* translators: %s: nombre del perfil */
			$warnings[] = sprintf( __( 'El perfil «%s» tiene el panel activo pero su menú está vacío.', 'imagina-menu' ), $profile['title'] );
		}
		if ( 'theme_selector' === $profile['trigger']['mode'] && '' === $profile['trigger']['selector'] ) {
			/* translators: %s: nombre del perfil */
			$warnings[] = sprintf( __( 'El perfil «%s» se abre con el botón del tema, pero falta el selector.', 'imagina-menu' ), $profile['title'] );
		}

		$renderer = new Renderer( $profile, self::site( $profile ) );
		$parts    = $renderer->render( $items );
		$css      = CssBuilder::build( $profile, $settings );

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
			'parts'        => $parts,
			'sprite'       => $renderer->icons()->sprite(),
			'critical'     => $css['critical'],
			'bbar_space'   => $css['bbar_space'],
			'css_url'      => $css_url,
			'css_inline'   => null === $css_url ? $css['full'] : '',
			'css_size'     => strlen( $css['full'] ),
			'item_count'   => self::count_items( $items ),
			'bbar_hide_on' => $profile['bottom_bar']['hide_on'],
			'trigger'      => array(
				'mode'     => $profile['trigger']['mode'],
				'selector' => $profile['trigger']['selector'],
			),
			'color_mode'   => $profile['design']['color_mode'],
		);
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
