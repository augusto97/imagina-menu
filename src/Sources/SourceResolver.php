<?php
declare(strict_types=1);

namespace ImaginaMenu\Sources;

use ImaginaMenu\Model\Defaults;

/**
 * Convierte el árbol guardado en el árbol final: expande las fuentes dinámicas (menú de WordPress,
 * categorías de WooCommerce, taxonomías), resuelve los objetos enlazados a su URL actual y vuelve
 * absolutas las URLs relativas. Solo corre al compilar: el frontend nunca consulta términos ni menús.
 */
final class SourceResolver {

	private const MAX_TERMS = 1500;

	private int $term_count = 0;

	/** Idioma en el que se resuelve (vacío: el del sitio). */
	private string $lang = '';

	public function for_language( string $lang ): self {
		$this->lang       = $lang;
		$this->term_count = 0;
		return $this;
	}

	/** @var array{posts: array<int, true>, taxonomies: array<string, true>, menus: array<int, true>} */
	private array $refs = array(
		'posts'      => array(),
		'taxonomies' => array(),
		'menus'      => array(),
	);

	/**
	 * Objetos de los que depende el menú (para recompilar solo cuando cambian).
	 *
	 * @return array{posts: list<int>, taxonomies: list<string>, menus: list<int>}
	 */
	public function refs(): array {
		return array(
			'posts'      => array_keys( $this->refs['posts'] ),
			'taxonomies' => array_map( 'strval', array_keys( $this->refs['taxonomies'] ) ),
			'menus'      => array_keys( $this->refs['menus'] ),
		);
	}

	/**
	 * @param list<array<string, mixed>> $items
	 * @return list<array<string, mixed>>
	 */
	public function resolve( array $items ): array {
		$out = array();
		foreach ( $items as $item ) {
			if ( 'source' === $item['type'] ) {
				foreach ( $this->expand( $item['source'] ) as $generated ) {
					$out[] = $generated;
				}
				continue;
			}
			$item['url']      = $this->item_url( $item );
			$item['children'] = $this->resolve( $item['children'] ?? array() );
			$out[]            = $item;
		}
		return $out;
	}

	/** @param array<string, mixed> $item */
	private function item_url( array $item ): string {
		$object = $item['object'] ?? array();
		$id     = \ImaginaMenu\Integrations\Languages::object_id( (int) ( $object['id'] ?? 0 ), (string) ( $object['kind'] ?? '' ), (string) ( $object['type'] ?? '' ), $this->lang );
		if ( $id > 0 && 'post' === ( $object['kind'] ?? '' ) ) {
			$this->refs['posts'][ $id ] = true;
			$link = get_permalink( $id );
			if ( is_string( $link ) && 'publish' === get_post_status( $id ) ) {
				return $link;
			}
		}
		if ( $id > 0 && 'term' === ( $object['kind'] ?? '' ) ) {
			$this->refs['taxonomies'][ (string) ( $object['type'] ?? '' ) ] = true;
			$link = get_term_link( $id, (string) ( $object['type'] ?? '' ) );
			if ( is_string( $link ) ) {
				return $link;
			}
		}
		return self::absolute( (string) $item['url'] );
	}

	/** Portada del idioma que se compila (vacío: la del sitio). Las URL relativas cuelgan de ella. */
	private static string $home = '';

	public static function set_home( string $home ): void {
		self::$home = $home;
	}

	public static function absolute( string $url ): string {
		if ( str_starts_with( $url, '/' ) && ! str_starts_with( $url, '//' ) ) {
			return '' !== self::$home ? rtrim( self::$home, '/' ) . $url : home_url( $url );
		}
		return $url;
	}

	/**
	 * @param array<string, mixed> $source
	 * @return list<array<string, mixed>>
	 */
	private function expand( array $source ): array {
		return match ( $source['kind'] ) {
			'wp_menu'        => $this->wp_menu( (int) $source['menu_id'], (int) $source['depth'] ),
			'woo_categories' => taxonomy_exists( 'product_cat' ) ? $this->terms( 'product_cat', $source, $this->parent( (int) $source['parent'], 'product_cat' ), 1 ) : array(),
			'taxonomy'       => taxonomy_exists( (string) $source['taxonomy'] ) ? $this->terms( (string) $source['taxonomy'], $source, $this->parent( (int) $source['parent'], (string) $source['taxonomy'] ), 1 ) : array(),
			default          => array(),
		};
	}

	private function parent( int $id, string $taxonomy ): int {
		return $id > 0 ? \ImaginaMenu\Integrations\Languages::object_id( $id, 'term', $taxonomy, $this->lang ) : 0;
	}

	/**
	 * @return list<array<string, mixed>>
	 */
	private function wp_menu( int $menu_id, int $depth ): array {
		if ( $menu_id <= 0 ) {
			return array();
		}
		$this->refs['menus'][ $menu_id ] = true;
		$menu_id                         = \ImaginaMenu\Integrations\Languages::object_id( $menu_id, 'term', 'nav_menu', 'wpml' === \ImaginaMenu\Integrations\Languages::provider() ? $this->lang : '' );
		$this->refs['menus'][ $menu_id ] = true;
		$items = wp_get_nav_menu_items( $menu_id, array( 'update_post_term_cache' => false ) );
		if ( ! is_array( $items ) ) {
			return array();
		}
		$by_parent = array();
		foreach ( $items as $menu_item ) {
			$by_parent[ (int) $menu_item->menu_item_parent ][] = $menu_item;
		}
		return $this->wp_menu_level( $by_parent, 0, 1, max( 1, $depth ) );
	}

	/**
	 * @param array<int, list<object>> $by_parent
	 * @return list<array<string, mixed>>
	 */
	private function wp_menu_level( array $by_parent, int $parent, int $level, int $max ): array {
		$out = array();
		foreach ( $by_parent[ $parent ] ?? array() as $menu_item ) {
			if ( 'post_type' === $menu_item->type ) {
				$this->refs['posts'][ (int) $menu_item->object_id ] = true;
			} elseif ( 'taxonomy' === $menu_item->type ) {
				$this->refs['taxonomies'][ (string) $menu_item->object ] = true;
			}
			$item = self::base_item( 'w_' . (int) $menu_item->ID, wp_strip_all_tags( (string) $menu_item->title ), (string) $menu_item->url );
			if ( '_blank' === $menu_item->target ) {
				$item['target'] = '_blank';
			}
			$item['description'] = '';
			$item['css_class']   = implode( ' ', array_filter( array_map( 'sanitize_html_class', (array) $menu_item->classes ) ) );
			if ( $level < $max ) {
				$item['children'] = $this->wp_menu_level( $by_parent, (int) $menu_item->ID, $level + 1, $max );
			}
			$out[] = $item;
		}
		return $out;
	}

	/**
	 * @param array<string, mixed> $source
	 * @return list<array<string, mixed>>
	 */
	private function terms( string $taxonomy, array $source, int $parent, int $level ): array {
		if ( $this->term_count >= self::MAX_TERMS ) {
			return array();
		}
		$this->refs['taxonomies'][ $taxonomy ] = true;
		$args = array(
			'taxonomy'   => $taxonomy,
			'parent'     => $parent,
			'hide_empty' => (bool) $source['hide_empty'],
			'number'     => (int) $source['limit'],
		) + \ImaginaMenu\Integrations\Languages::terms_args( $this->lang );
		switch ( $source['orderby'] ) {
			case 'name':
				$args['orderby'] = 'name';
				break;
			case 'count':
				$args['orderby'] = 'count';
				$args['order']   = 'DESC';
				break;
			default:
				// WooCommerce ordena product_cat por su meta "order"; otras taxonomías por nombre.
				$args['orderby'] = 'product_cat' === $taxonomy ? 'menu_order' : 'name';
		}
		$terms = get_terms( $args );
		if ( ! is_array( $terms ) ) {
			return array();
		}
		$out = array();
		foreach ( $terms as $term ) {
			if ( ! $term instanceof \WP_Term ) {
				continue;
			}
			if ( 'product_cat' === $taxonomy && 'uncategorized' === $term->slug && 0 === $parent ) {
				continue; // "Sin categorizar" no aporta en un menú.
			}
			++$this->term_count;
			$link = get_term_link( $term );
			$item = self::base_item( 't_' . $term->term_id, $term->name, is_string( $link ) ? $link : '' );
			if ( $source['with_images'] ) {
				$thumb = (int) get_term_meta( $term->term_id, 'thumbnail_id', true );
				if ( $thumb > 0 ) {
					$item['image'] = array(
						'id'  => $thumb,
						'url' => (string) wp_get_attachment_image_url( $thumb, 'thumbnail' ),
					);
				}
			}
			if ( $level < (int) $source['depth'] ) {
				$item['children'] = $this->terms( $taxonomy, $source, (int) $term->term_id, $level + 1 );
			}
			$out[] = $item;
		}
		return $out;
	}

	/** @return array<string, mixed> */
	private static function base_item( string $id, string $label, string $url ): array {
		$item             = Defaults::item();
		$item['id']       = $id;
		$item['label']    = html_entity_decode( $label, ENT_QUOTES, 'UTF-8' );
		$item['url']      = $url;
		$item['children'] = array();
		return $item;
	}
}
