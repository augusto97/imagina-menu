<?php
declare(strict_types=1);

namespace ImaginaMenu\Rest;

defined( 'ABSPATH' ) || exit;

use ImaginaMenu\Compiler\Compiler;
use ImaginaMenu\Core\Plugin;
use ImaginaMenu\Core\Transfer;
use ImaginaMenu\Frontend\Preview;
use ImaginaMenu\Integrations\Environment;
use ImaginaMenu\Licensing\ImaginaUpdater;
use ImaginaMenu\Model\Defaults;
use ImaginaMenu\Model\Normalizer;
use ImaginaMenu\Model\Presets;
use ImaginaMenu\Repository\MenuRepository;
use ImaginaMenu\Repository\ProfileRepository;
use ImaginaMenu\Repository\SettingsRepository;
use ImaginaMenu\Sources\SourceResolver;
use WP_Error;
use WP_REST_Request;
use WP_REST_Response;

/**
 * API del admin (namespace imagina-menu/v1). Todo requiere la capacidad imm_manage y el nonce wp_rest.
 *
 * Flujo: el admin edita borradores (PUT menus/profiles), los ve en la vista previa y al pulsar
 * «Publicar» (POST /publish) los borradores pasan a publicados y se compila.
 */
final class Routes {

	public const NAMESPACE = 'imagina-menu/v1';

	/**
	 * Para el admin, los mapas vacíos van como objeto JSON ({}), no como lista ([]).
	 *
	 * @param array<string, mixed>|null $profile
	 * @return array<string, mixed>|null
	 */
	private static function out( ?array $profile ): ?array {
		if ( $profile && ! $profile['drawer']['menu_by_lang'] ) {
			$profile['drawer']['menu_by_lang'] = new \stdClass();
		}
		return $profile;
	}

	public static function register(): void {
		$auth = array( self::class, 'can' );
		$id   = array(
			'id' => array(
				'type'     => 'integer',
				'required' => true,
			),
		);

		self::route( '/state', 'GET', 'state', $auth );
		self::route( '/settings', 'PUT', 'save_settings', $auth );
		self::route( '/menus', 'POST', 'create_menu', $auth );
		self::route( '/menus/(?P<id>\d+)', 'PUT', 'save_menu', $auth, $id );
		self::route( '/menus/(?P<id>\d+)', 'DELETE', 'delete_menu', $auth, $id );
		self::route( '/menus/(?P<id>\d+)/duplicate', 'POST', 'duplicate_menu', $auth, $id );
		self::route( '/profiles', 'POST', 'create_profile', $auth );
		self::route( '/profiles/(?P<id>\d+)', 'PUT', 'save_profile', $auth, $id );
		self::route( '/profiles/(?P<id>\d+)', 'DELETE', 'delete_profile', $auth, $id );
		self::route( '/publish', 'POST', 'publish', $auth );
		self::route( '/discard', 'POST', 'discard', $auth );
		self::route( '/preview', 'POST', 'preview', $auth );
		self::route( '/search', 'GET', 'search', $auth );
		self::route( '/source-preview', 'POST', 'source_preview', $auth );
		self::route( '/export', 'GET', 'export', $auth );
		self::route( '/profiles/order', 'PUT', 'order_profiles', $auth );
		self::route( '/stats', 'GET', 'stats', $auth );
		// Público: recibe los clics de la analítica (sin cookies). Solo existe si la analítica en el
		// servidor está activa; validación estricta y cola en archivo.
		$config = \ImaginaMenu\Frontend\Frontend::config();
		if ( ! empty( $config['settings']['analytics_server'] ) ) {
			self::route( '/hit', 'POST', 'hit', '__return_true' );
		}
		self::route( '/import', 'POST', 'import', $auth );
	}

	/**
	 * @param array<string, mixed> $args
	 */
	private static function route( string $path, string $method, string $callback, callable|string $auth, array $args = array() ): void {
		register_rest_route(
			self::NAMESPACE,
			$path,
			array(
				'methods'             => $method,
				'callback'            => array( self::class, $callback ),
				'permission_callback' => $auth,
				'args'                => $args,
			)
		);
	}

	public static function can(): bool {
		return current_user_can( Plugin::CAP );
	}

	// ── Estado ──────────────────────────────────────────────────────────────────────────────────

	public static function state(): WP_REST_Response {
		$menus    = new MenuRepository();
		$profiles = new ProfileRepository();
		$all_m    = array_map(
			static function ( array $m ): array {
				$m['items'] = self::with_urls( $m['items'] );
				return $m;
			},
			$menus->all( true )
		);
		$all_p    = array_map( array( self::class, 'out' ), $profiles->all( true ) );
		$drafts   = 0;
		foreach ( $all_m as $m ) {
			$drafts += $menus->has_draft( (int) $m['id'] ) ? 1 : 0;
		}
		foreach ( $all_p as $p ) {
			$drafts += $profiles->has_draft( (int) $p['id'] ) ? 1 : 0;
		}
		$compiler = Plugin::compiler();
		return new WP_REST_Response(
			array(
				'settings' => ( new SettingsRepository() )->get(),
				'menus'    => $all_m,
				'profiles' => $all_p,
				'drafts'   => $drafts,
				'presets'  => Presets::all(),
				'defaults' => array(
					'item'        => Defaults::item(),
					'bottom_item' => Defaults::bottom_item(),
					'profile'     => Defaults::profile(),
				),
				'compile'  => $compiler->state(),
				'dirty'    => Compiler::is_dirty(),
				'env'      => Environment::info() + array( 'license' => ( new ImaginaUpdater() )->status() ) + self::env_lists(),
			)
		);
	}

	/**
	 * Para el constructor: los ítems enlazados a un contenido muestran su URL actual.
	 *
	 * @param list<array<string, mixed>> $items
	 * @return list<array<string, mixed>>
	 */
	private static function with_urls( array $items ): array {
		foreach ( $items as &$item ) {
			$id = (int) ( $item['object']['id'] ?? 0 );
			$visible = 'term' === $item['object']['kind']
				? taxonomy_exists( (string) $item['object']['type'] ) && is_taxonomy_viewable( (string) $item['object']['type'] )
				: self::public_post( $id );
			if ( $id > 0 && '' === $item['url'] && $visible ) {
				$link = 'term' === $item['object']['kind'] ? get_term_link( $id, (string) $item['object']['type'] ) : get_permalink( $id );
				if ( is_string( $link ) ) {
					$item['url'] = $link;
				}
			}
			$item['children'] = self::with_urls( $item['children'] ?? array() );
		}
		unset( $item );
		return $items;
	}

	/**
	 * Listas para el editor de reglas e idiomas.
	 *
	 * @return array<string, mixed>
	 */
	private static function env_lists(): array {
		$post_types = array();
		foreach ( get_post_types( array( 'public' => true ), 'objects' ) as $type ) {
			if ( 'attachment' !== $type->name ) {
				$post_types[] = array( 'slug' => $type->name, 'label' => $type->labels->name );
			}
		}
		$taxonomies = array();
		foreach ( get_taxonomies( array( 'public' => true ), 'objects' ) as $tax ) {
			if ( 'post_format' !== $tax->name ) {
				$taxonomies[] = array( 'slug' => $tax->name, 'label' => $tax->labels->name );
			}
		}
		$roles = array();
		foreach ( wp_roles()->get_names() as $slug => $name ) {
			$roles[] = array( 'slug' => (string) $slug, 'label' => translate_user_role( (string) $name ) );
		}
		return array(
			'multilingual' => \ImaginaMenu\Integrations\Languages::provider(),
			'languages'    => \ImaginaMenu\Integrations\Languages::languages(),
			'post_types'   => $post_types,
			'taxonomies'   => $taxonomies,
			'roles'        => $roles,
			// WordPress 6.8+ ya precarga los enlaces al tocarlos: el prefetch propio no se usa.
			'core_speculation' => function_exists( 'wp_get_speculation_rules_configuration' ),
			'rule_labels'      => self::rule_labels(),
			// CSS propio y selectores que ocultan o capturan partes del tema: como «CSS adicional».
			'can_edit_css'     => current_user_can( 'edit_css' ),
		);
	}

	/**
	 * Nombres de las páginas y términos usados en las reglas (el perfil solo guarda los ids).
	 *
	 * @return array<string, string>|\stdClass
	 */
	private static function rule_labels(): array|\stdClass {
		$out = array();
		foreach ( ( new ProfileRepository() )->all( true ) as $profile ) {
			foreach ( $profile['rules']['conditions'] as $c ) {
				foreach ( $c['ids'] as $id ) {
					if ( 'page' === $c['type'] ) {
						if ( self::public_post( (int) $id ) ) {
							$out[ 'post:' . $id ] = html_entity_decode( get_the_title( $id ), ENT_QUOTES, 'UTF-8' );
						}
					} elseif ( 'term' === $c['type'] ) {
						$term = get_term( $id );
						if ( $term instanceof \WP_Term && is_taxonomy_viewable( $term->taxonomy ) ) {
							$out[ 'term:' . $id ] = html_entity_decode( $term->name, ENT_QUOTES, 'UTF-8' );
						}
					}
				}
			}
		}
		return $out ? $out : new \stdClass();
	}

	/**
	 * Contenido publicado de un tipo público y legible por el usuario: lo único que el admin del menú
	 * puede nombrar o enlazar (nada de borradores, privados, cupones ni solicitudes de privacidad).
	 */
	private static function public_post( int $id ): bool {
		$post = get_post( $id );
		return $post instanceof \WP_Post
			&& 'publish' === $post->post_status
			&& '' === $post->post_password
			&& is_post_type_viewable( $post->post_type )
			&& current_user_can( 'read_post', $id );
	}

	public static function order_profiles( WP_REST_Request $request ): WP_REST_Response {
		$data = $request->get_json_params();
		$repo = new ProfileRepository();
		foreach ( array_values( array_map( 'intval', (array) ( $data['ids'] ?? array() ) ) ) as $i => $id ) {
			if ( $repo->get( $id ) ) {
				$repo->set_order( $id, $i );
			}
		}
		return new WP_REST_Response( array( 'profiles' => array_map( array( self::class, 'out' ), $repo->all( true ) ) ) );
	}

	public static function stats( WP_REST_Request $request ): WP_REST_Response {
		$days = (int) $request->get_param( 'days' );
		$days = in_array( $days, array( 7, 30, 90 ), true ) ? $days : 7;
		return new WP_REST_Response( \ImaginaMenu\Analytics\Stats::summary( $days, (int) $request->get_param( 'profile' ) ) );
	}

	/** Un evento de analítica. Siempre 204: nunca se le da información a quien llama. */
	public static function hit( WP_REST_Request $request ): WP_REST_Response {
		$config = \ImaginaMenu\Frontend\Frontend::config();
		$body   = (string) $request->get_body();
		$data   = strlen( $body ) <= 256 ? json_decode( $body, true ) : null;
		$data   = is_array( $data ) ? $data : array();
		$event  = is_string( $data['e'] ?? null ) ? $data['e'] : '';
		$item   = is_string( $data['i'] ?? null ) ? $data['i'] : '';
		$pid    = is_int( $data['p'] ?? null ) ? $data['p'] : 0;
		$ok     = $config && ! empty( $config['settings']['analytics_server'] )
			&& self::same_site( $request )
			&& in_array( $event, \ImaginaMenu\Analytics\Stats::EVENTS, true )
			&& isset( $config['hit_ids'][ $pid ] )
			// Solo ítems que existen en el menú publicado (no se aceptan ids inventados).
			&& ( '' === $item || isset( $config['hit_ids'][ $pid ][ $item ] ) );
		if ( $ok ) {
			$who = \ImaginaMenu\Analytics\Stats::visitor();
			if ( ! \ImaginaMenu\Analytics\Stats::throttled( $who['ip'] ) ) {
				\ImaginaMenu\Analytics\Stats::record( $pid, $event, $item, $who );
			}
		}
		$response = new WP_REST_Response( null, 204 );
		$response->header( 'Cache-Control', 'no-store' );
		return $response;
	}

	/**
	 * Los navegadores marcan de dónde viene la petición: se rechazan los envíos desde otros sitios
	 * (alguien usando a sus visitantes para inflar tus cifras). Un cliente sin esas cabeceras
	 * (curl) pasa, pero igual le aplican los topes por visitante.
	 */
	private static function same_site( WP_REST_Request $request ): bool {
		$fetch = (string) $request->get_header( 'sec_fetch_site' );
		if ( '' !== $fetch && ! in_array( $fetch, array( 'same-origin', 'none' ), true ) ) {
			return false;
		}
		$origin = (string) $request->get_header( 'origin' );
		if ( '' !== $origin ) {
			return strtolower( (string) wp_parse_url( $origin, PHP_URL_HOST ) ) === strtolower( (string) wp_parse_url( home_url(), PHP_URL_HOST ) );
		}
		return true;
	}

	public static function save_settings( WP_REST_Request $request ): WP_REST_Response {
		$data     = $request->get_json_params();
		$incoming = is_array( $data['settings'] ?? null ) ? $data['settings'] : array();
		$repo     = new SettingsRepository();
		// Borrar todo al desinstalar y guardar el nombre de cada usuario en una cookie legible por JS
		// son decisiones del dueño del sitio: solo con manage_options.
		if ( ! current_user_can( 'manage_options' ) ) {
			$current                         = $repo->get();
			$incoming['delete_on_uninstall'] = $current['delete_on_uninstall'];
			$incoming['name_cookie']         = $current['name_cookie'];
		}
		return new WP_REST_Response( array( 'settings' => $repo->save( $incoming ) ) );
	}

	// ── Menús ───────────────────────────────────────────────────────────────────────────────────

	public static function create_menu( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$data  = $request->get_json_params();
		$title = Normalizer::text( $data['title'] ?? '', 80 );
		$items = array();
		$from  = (string) ( $data['from'] ?? 'empty' );
		if ( 'woo' === $from ) {
			$items[] = array(
				'type'   => 'source',
				'source' => array( 'kind' => 'woo_categories', 'depth' => 3 ),
			);
		} elseif ( 'wp_menu' === $from ) {
			$items = self::import_wp_menu( (int) ( $data['wp_menu_id'] ?? 0 ) );
		}
		$repo = new MenuRepository();
		$id   = $repo->create(
			array(
				'title' => '' !== $title ? $title : __( 'Menú nuevo', 'imagina-menu' ),
				'items' => $items,
			)
		);
		if ( ! $id ) {
			return new WP_Error( 'imm_create_failed', __( 'No se pudo crear el menú.', 'imagina-menu' ), array( 'status' => 500 ) );
		}
		return new WP_REST_Response( array( 'menu' => $repo->get( $id, true ) ), 201 );
	}

	/**
	 * Copia un menú de WordPress como ítems editables (con sus iconos e insignias por añadir).
	 *
	 * @return list<array<string, mixed>>
	 */
	private static function import_wp_menu( int $menu_id ): array {
		$items = wp_get_nav_menu_items( $menu_id );
		if ( ! is_array( $items ) ) {
			return array();
		}
		$nodes = array();
		$tree  = array();
		foreach ( $items as $item ) {
			$object = array(
				'kind' => '',
				'id'   => 0,
				'type' => '',
			);
			if ( 'post_type' === $item->type ) {
				$object = array(
					'kind' => 'post',
					'id'   => (int) $item->object_id,
					'type' => (string) $item->object,
				);
			} elseif ( 'taxonomy' === $item->type ) {
				$object = array(
					'kind' => 'term',
					'id'   => (int) $item->object_id,
					'type' => (string) $item->object,
				);
			}
			$nodes[ (int) $item->ID ] = array(
				'id'       => 'w' . (int) $item->ID,
				'label'    => wp_strip_all_tags( (string) $item->title ),
				'url'      => (string) $item->url,
				'object'   => $object,
				'target'   => '_blank' === $item->target ? '_blank' : '_self',
				'children' => array(),
				'_parent'  => (int) $item->menu_item_parent,
			);
		}
		// Construir el árbol por referencia, respetando el orden del menú.
		foreach ( $nodes as $key => &$node ) {
			$parent = $node['_parent'];
			if ( $parent && isset( $nodes[ $parent ] ) ) {
				$nodes[ $parent ]['children'][] = &$node;
			} else {
				$tree[] = &$node;
			}
		}
		unset( $node );
		$strip = static function ( array $list ) use ( &$strip ): array {
			$out = array();
			foreach ( $list as $n ) {
				unset( $n['_parent'] );
				$n['children'] = $strip( $n['children'] );
				$out[]         = $n;
			}
			return $out;
		};
		return $strip( $tree );
	}

	public static function save_menu( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$id   = (int) $request['id'];
		$data = $request->get_json_params();
		$repo = new MenuRepository();
		if ( ! $repo->save_draft( $id, is_array( $data['menu'] ?? null ) ? $data['menu'] : array() ) ) {
			return new WP_Error( 'imm_not_found', __( 'El menú no existe.', 'imagina-menu' ), array( 'status' => 404 ) );
		}
		return new WP_REST_Response( array( 'menu' => $repo->get( $id, true ) ) );
	}

	public static function duplicate_menu( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$repo = new MenuRepository();
		$menu = $repo->get( (int) $request['id'], true );
		if ( ! $menu ) {
			return new WP_Error( 'imm_not_found', __( 'El menú no existe.', 'imagina-menu' ), array( 'status' => 404 ) );
		}
		/* translators: %s: nombre del menú */
		$menu['title'] = sprintf( __( '%s (copia)', 'imagina-menu' ), $menu['title'] );
		$id            = $repo->create( $menu );
		return new WP_REST_Response( array( 'menu' => $repo->get( $id, true ) ), 201 );
	}

	public static function delete_menu( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$id = (int) $request['id'];
		foreach ( ( new ProfileRepository() )->all( true ) as $profile ) {
			if ( (int) $profile['drawer']['menu_id'] === $id ) {
				/* translators: %s: perfil */
				return new WP_Error( 'imm_in_use', sprintf( __( 'El perfil «%s» usa este menú. Cámbialo antes de eliminarlo.', 'imagina-menu' ), $profile['title'] ), array( 'status' => 409 ) );
			}
		}
		( new MenuRepository() )->delete( $id );
		return new WP_REST_Response( array( 'deleted' => true ) );
	}

	// ── Perfiles ────────────────────────────────────────────────────────────────────────────────

	public static function create_profile( WP_REST_Request $request ): WP_REST_Response {
		$data                  = $request->get_json_params();
		$profile               = Defaults::profile();
		$profile['title']      = Normalizer::text( $data['title'] ?? '', 80 ) ?: __( 'Perfil nuevo', 'imagina-menu' );
		$profile['is_default'] = false;
		$repo                  = new ProfileRepository();
		$id                    = $repo->create( $profile + array( 'menu_order' => count( $repo->all() ) ) );
		return new WP_REST_Response( array( 'profile' => self::out( $repo->get( $id, true ) ) ), 201 );
	}

	public static function save_profile( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$id   = (int) $request['id'];
		$data = $request->get_json_params();
		$repo = new ProfileRepository();
		$doc  = is_array( $data['profile'] ?? null ) ? $data['profile'] : array();
		$doc  = self::guard_css( $doc, $repo->get( $id, true ) );
		if ( ! $repo->save_draft( $id, $doc ) ) {
			return new WP_Error( 'imm_not_found', __( 'El perfil no existe.', 'imagina-menu' ), array( 'status' => 404 ) );
		}
		return new WP_REST_Response( array( 'profile' => self::out( $repo->get( $id, true ) ) ) );
	}

	/**
	 * El CSS propio y los selectores que ocultan partes del tema cambian el aspecto de todo el sitio:
	 * igual que el «CSS adicional» de WordPress, solo los edita quien tiene `edit_css` (normalmente
	 * el administrador). A los demás se les conserva el valor actual.
	 *
	 * @param array<mixed>              $doc
	 * @param array<string, mixed>|null $current
	 * @return array<mixed>
	 */
	private static function guard_css( array $doc, ?array $current ): array {
		if ( current_user_can( 'edit_css' ) ) {
			return $doc;
		}
		// JSON malformado ("design":"x") no debe provocar un error 500.
		foreach ( array( 'design', 'trigger', 'desktop' ) as $key ) {
			$doc[ $key ] = is_array( $doc[ $key ] ?? null ) ? $doc[ $key ] : array();
		}
		$doc['design']['custom_css'] = $current['design']['custom_css'] ?? '';
		$doc['hide_theme_selector']  = $current['hide_theme_selector'] ?? '';
		$doc['trigger']['selector']  = $current['trigger']['selector'] ?? '';
		$doc['desktop']['selector']  = $current['desktop']['selector'] ?? '';
		return $doc;
	}

	public static function delete_profile( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$repo = new ProfileRepository();
		$all  = $repo->all();
		if ( count( $all ) <= 1 ) {
			return new WP_Error( 'imm_last_profile', __( 'Debe quedar al menos un perfil.', 'imagina-menu' ), array( 'status' => 409 ) );
		}
		$repo->delete( (int) $request['id'] );
		return new WP_REST_Response( array( 'deleted' => true ) );
	}

	// ── Publicar, descartar, vista previa ───────────────────────────────────────────────────────

	public static function publish(): WP_REST_Response {
		$state = Transfer::publish();
		return new WP_REST_Response( array( 'compile' => $state ), $state['ok'] ? 200 : 500 );
	}

	public static function discard(): WP_REST_Response {
		$menus    = new MenuRepository();
		$profiles = new ProfileRepository();
		foreach ( $menus->all() as $menu ) {
			$menus->discard_draft( (int) $menu['id'] );
		}
		foreach ( $profiles->all() as $profile ) {
			$profiles->discard_draft( (int) $profile['id'] );
		}
		return self::state();
	}

	public static function preview( WP_REST_Request $request ): WP_REST_Response {
		$data = $request->get_json_params();
		$path = is_string( $data['path'] ?? null ) ? $data['path'] : '/';
		$base = SourceResolver::absolute( '/' . ltrim( wp_parse_url( $path, PHP_URL_PATH ) ?: '/', '/' ) );
		return new WP_REST_Response( array( 'url' => Preview::url( get_current_user_id(), $base ) ) );
	}

	// ── Búsqueda de objetos para enlazar ────────────────────────────────────────────────────────

	public static function search( WP_REST_Request $request ): WP_REST_Response {
		$q    = sanitize_text_field( (string) $request->get_param( 'q' ) );
		$kind = (string) $request->get_param( 'kind' );
		$only = sanitize_key( (string) $request->get_param( 'type' ) );
		$out  = array();

		$types = array_values( array_diff( get_post_types( array( 'public' => true ) ), array( 'attachment' ) ) );
		if ( '' !== $only && 'post' === $kind && in_array( $only, $types, true ) ) {
			$types = array( $only );
		}
		$posts = 'term' === $kind ? array() : get_posts(
			array(
				's'              => $q,
				'post_type'      => $types,
				'post_status'    => 'publish',
				'posts_per_page' => 12,
				'orderby'        => '' === $q ? 'date' : 'relevance',
				'no_found_rows'  => true,
			)
		);
		foreach ( $posts as $post ) {
			$type  = get_post_type_object( $post->post_type );
			$out[] = array(
				'kind'     => 'post',
				'id'       => $post->ID,
				'type'     => $post->post_type,
				'label'    => html_entity_decode( get_the_title( $post ), ENT_QUOTES, 'UTF-8' ),
				'url'      => (string) get_permalink( $post ),
				'subtitle' => $type ? $type->labels->singular_name : $post->post_type,
			);
		}

		$taxonomies = array_values( array_diff( get_taxonomies( array( 'public' => true ) ), array( 'post_format' ) ) );
		if ( '' !== $only && 'term' === $kind && in_array( $only, $taxonomies, true ) ) {
			$taxonomies = array( $only );
		}
		$terms      = 'post' === $kind ? array() : get_terms(
			array(
				'taxonomy'   => $taxonomies,
				'search'     => $q,
				'number'     => 12,
				'hide_empty' => false,
			)
		);
		foreach ( is_array( $terms ) ? $terms : array() as $term ) {
			$tax   = get_taxonomy( $term->taxonomy );
			$link  = get_term_link( $term );
			$thumb = (int) get_term_meta( $term->term_id, 'thumbnail_id', true );
			$out[] = array(
				'kind'     => 'term',
				'id'       => $term->term_id,
				'type'     => $term->taxonomy,
				'label'    => html_entity_decode( $term->name, ENT_QUOTES, 'UTF-8' ),
				'url'      => is_string( $link ) ? $link : '',
				'subtitle' => $tax ? $tax->labels->singular_name : $term->taxonomy,
				'image'    => $thumb ? (string) wp_get_attachment_image_url( $thumb, 'thumbnail' ) : '',
				'image_id' => $thumb,
			);
		}
		return new WP_REST_Response( array( 'results' => $out ) );
	}

	/** Cómo se verá una fuente dinámica (para el constructor). */
	public static function source_preview( WP_REST_Request $request ): WP_REST_Response {
		$data = $request->get_json_params();
		$menu = Normalizer::menu(
			array(
				'items' => array(
					array(
						'type'   => 'source',
						'source' => is_array( $data['source'] ?? null ) ? $data['source'] : array(),
					),
				),
			)
		);
		$items = ( new SourceResolver() )->resolve( $menu['items'] );
		$slim  = static function ( array $list ) use ( &$slim ): array {
			return array_map(
				static fn( $i ) => array(
					'label'    => $i['label'],
					'url'      => $i['url'],
					'image'    => $i['image']['url'],
					'children' => $slim( $i['children'] ),
				),
				$list
			);
		};
		return new WP_REST_Response( array( 'items' => $slim( $items ) ) );
	}

	// ── Exportar / importar ─────────────────────────────────────────────────────────────────────

	public static function export(): WP_REST_Response {
		return new WP_REST_Response( Transfer::export() );
	}

	/**
	 * Importa menús y perfiles como nuevos (borradores publicados al pulsar «Publicar»). Los ids de
	 * menú de los perfiles se reasignan a los menús importados.
	 */
	public static function import( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$data   = (array) $request->get_json_params();
		$result = Transfer::import(
			$data,
			! empty( $data['import_settings'] ) && current_user_can( 'manage_options' ),
			false,
			static fn( array $profile ): array => self::guard_css( $profile, null )
		);
		if ( is_wp_error( $result ) ) {
			return $result;
		}
		return self::state();
	}
}
