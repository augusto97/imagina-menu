<?php
declare(strict_types=1);

namespace ImaginaMenu\Model;

/**
 * Valores por defecto del modelo. Son también la "forma" contra la que el Normalizer valida:
 * una clave que no está aquí no entra; un valor de otro tipo se convierte al tipo del defecto.
 */
final class Defaults {

	public const SCHEMA_VERSION = 1;

	/** @return array<string, mixed> */
	public static function settings(): array {
		return array(
			'breakpoint'          => 1024,
			'mobile_only'         => true,
			'load_js'             => 'eager', // eager | interaction
			'cart_cookie'         => true,
			'name_cookie'         => false,
			'delete_on_uninstall' => false,
			'html_depth'          => 'auto', // auto | full | hybrid
			'prefetch'            => true,
			'analytics'           => array(
				'enabled'   => false,
				'server'    => true,
				'ga4'       => true,
				'sample'    => 100,
				'retention' => 180,
			),
		);
	}

	/** @return array<string, mixed> */
	public static function profile(): array {
		return array(
			'schema_version'      => self::SCHEMA_VERSION,
			'id'                  => 0,
			'title'               => 'Predeterminado',
			'enabled'             => true,
			'is_default'          => true,
			'rules'               => array(
				'match'      => 'all', // all | any
				'conditions' => array(), // [{type, not, value, ids}] — vacío = perfil general
			),
			'hide_theme_selector' => '',
			'trigger'             => array(
				'mode'           => 'floating', // floating | theme_selector | manual
				'selector'       => '',
				'icon'           => 'menu',
				'label'          => '',
				'position'       => 'bottom-left', // bottom-left | bottom-right | top-left | top-right
				'offset'         => 16,
				'size'           => 52,
				'hide_on_scroll' => false,
			),
			'drawer'              => array(
				'enabled'          => true,
				'menu_id'          => 0,
				'side'             => 'left', // left | right | bottom
				'width'            => 86,
				'max_width'        => 420,
				'submenu_mode'     => 'slide', // slide | accordion | two_pane | tabs | grid
				'menu_by_lang'     => array(), // {código de idioma: id de menú}
				'language_switcher' => true,
				'close_position'   => 'outside', // outside | inside | none
				'show_logo'        => true,
				'title'            => '',
				'account'          => true,
				'search'           => true,
				'back_label'       => 'Menú principal',
				'view_all_label'   => 'Ver todo',
				'show_level_title' => true,
				'open_active'      => true,
				'remember_level'   => false,
				'swipe_close'      => true,
				'whatsapp'         => array(
					'enabled' => false,
					'number'  => '',
					'message' => '',
					'label'   => 'Escríbenos por WhatsApp',
				),
				'cta'              => array(
					'enabled' => false,
					'label'   => '',
					'url'     => '',
				),
				'footer_links'     => array(), // [{label, url, icon}]
				'social'           => array(), // [{network, url}]
			),
			'bottom_bar'          => array(
				'enabled'        => false,
				'items'          => array(),
				'style'          => 'labels', // labels | icons | active_label
				'indicator'      => 'pill', // pill | line | dot | color
				'shape'          => 'bar', // bar | floating
				'hide_on_scroll' => true,
				'hide_on'        => array( 'checkout' ),
				'blur'           => false,
			),
			'search'              => array(
				'placeholder' => 'Buscar…',
				'post_type'   => 'auto', // auto | any | product | post
				'popular'     => array(), // [string]
				'recent'      => true,
			),
			'design'              => array(
				'preset'      => 'marketplace',
				'color_mode'  => 'light', // light | dark | auto
				'tokens'      => Presets::tokens( 'marketplace' ),
				'dark_tokens' => Presets::dark_tokens(),
				'custom_css'  => '',
			),
		);
	}

	/** @return array<string, mixed> */
	public static function menu(): array {
		return array(
			'schema_version' => self::SCHEMA_VERSION,
			'id'             => 0,
			'title'          => 'Menú móvil',
			'items'          => array(),
		);
	}

	/** @return array<string, mixed> */
	public static function item(): array {
		return array(
			'id'          => '',
			'type'        => 'link', // link | heading | divider | source
			'label'       => '',
			'url'         => '',
			'object'      => array(
				'kind' => '', // '' | post | term
				'id'   => 0,
				'type' => '', // post type o taxonomía
			),
			'icon'        => '',
			'image'       => array(
				'id'  => 0,
				'url' => '',
			),
			'badge'       => array(
				'text'  => '',
				'style' => 'sale', // new | sale | hot | info
			),
			'description' => '',
			'highlight'   => false,
			'view_all'    => true,
			'target'      => '_self',
			'rel'         => '',
			'visibility'  => 'any', // any | logged_in | logged_out
			'css_class'   => '',
			'source'      => array(
				'kind'        => 'woo_categories', // wp_menu | woo_categories | taxonomy
				'menu_id'     => 0,
				'taxonomy'    => 'category',
				'parent'      => 0,
				'depth'       => 2,
				'hide_empty'  => true,
				'limit'       => 30,
				'orderby'     => 'menu_order', // menu_order | name | count
				'with_images' => true,
			),
			'children'    => array(),
		);
	}

	/** @return array<string, mixed> */
	public static function bottom_item(): array {
		return array(
			'id'         => '',
			'action'     => 'link', // link | drawer | search | cart | account | whatsapp | phone | top
			'label'      => '',
			'icon'       => 'house',
			'url'        => '',
			'badge'      => 'none', // none | cart | custom
			'badge_text' => '',
			'prominent'  => false,
		);
	}

	/**
	 * Barra inferior sugerida: con WooCommerce, la clásica de tienda; sin él, una de contenido.
	 *
	 * @return list<array<string, mixed>>
	 */
	public static function suggested_bottom_items( bool $woo ): array {
		$items = array(
			array( 'action' => 'link', 'label' => 'Inicio', 'icon' => 'house', 'url' => '/' ),
			array( 'action' => 'drawer', 'label' => $woo ? 'Categorías' : 'Menú', 'icon' => 'layout-grid' ),
			array( 'action' => 'search', 'label' => 'Buscar', 'icon' => 'search' ),
		);
		if ( $woo ) {
			$items[] = array( 'action' => 'cart', 'label' => 'Carrito', 'icon' => 'shopping-cart', 'badge' => 'cart' );
			$items[] = array( 'action' => 'account', 'label' => 'Cuenta', 'icon' => 'user' );
		} else {
			$items[] = array( 'action' => 'whatsapp', 'label' => 'WhatsApp', 'icon' => 'message-circle' );
		}
		return $items;
	}
}
