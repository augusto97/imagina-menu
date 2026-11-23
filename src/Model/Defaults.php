<?php
declare(strict_types=1);

namespace ImaginaMenu\Model;

defined( 'ABSPATH' ) || exit;

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
			// Dónde no se muestra nada del menú (ni HTML, ni CSS, ni JS). Se decide por URL: compatible
			// con la caché de página. Los editores visuales (Elementor, Divi…) se excluyen siempre.
			'exclude'             => array(
				'ids'     => array(), // páginas, entradas o productos concretos
				'urls'    => '', // una por línea; «*» = cualquier cosa; sin «*»: la ruta contiene el texto
				'blank'   => true, // plantillas en blanco o lienzo (Elementor Canvas y similares)
				'iframes' => true, // dentro de un iframe de otro sitio (lo decide el navegador)
			),
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
				'view_all_position' => 'bottom', // bottom | top — «Ver todo …» al final o al inicio de cada submenú
				'show_level_title' => true,
				'open_active'      => true,
				'remember_level'   => false,
				'swipe_close'      => true,
				'whatsapp'         => array(
					'enabled' => false,
					'number'  => '',
					'message' => '',
					'label'   => 'Escríbenos por WhatsApp',
					// Horario de atención (hora del sitio). Fuera de horario el botón muestra off_label;
					// lo decide el navegador (las páginas están en caché).
					'hours'   => array(
						'enabled'   => false,
						'days'      => array( 1, 2, 3, 4, 5 ), // 0 = domingo … 6 = sábado
						'from'      => '08:00',
						'to'        => '18:00',
						'off_label' => 'Déjanos tu mensaje',
					),
				),
				// Banners de promoción: [{image: {id, url}, url, alt, from, to}] (from/to: campaña programada).
				'banners'          => array(),
				'banners_position' => 'top', // top (bajo el buscador) | bottom (antes del pie)
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
				// Contadores (carrito, favoritos, texto fijo) con colores propios; apagado: los de las
				// insignias (Diseño → Acento e insignias).
				'badge_custom'   => false,
				'badge_bg'       => '#e11d48',
				'badge_fg'       => '#ffffff',
			),
			'search'              => array(
				'placeholder' => 'Buscar…',
				'post_type'   => 'auto', // auto | any | product | post
				'popular'     => array(), // [string]
				'recent'      => true,
				'provider'    => 'auto', // auto (Imagina Search si está activo) | native
			),
			// Barra superior móvil (app bar): hamburguesa, logo, cuenta, carrito y, debajo, el buscador
			// siempre a la vista (Amazon, Mercado Libre). Se imprime al inicio del <body> (wp_body_open).
			'app_bar'             => array(
				'enabled'        => false,
				'logo'           => true, // mostrar logo (sin imagen: el nombre del sitio)
				'logo_image'     => array( // otra imagen solo para la barra (vacía = el logo del sitio)
					'id'  => 0,
					'url' => '',
				),
				'logo_height'    => 28, // alto en px (la barra mide 52)
				'logo_width'     => 150, // ancho máximo en px
				'logo_align'     => 'left', // left (junto al menú) | center
				// Diseño (plantillas en el admin): distribución, forma, campo de búsqueda y efecto vidrio.
				'layout'         => 'stacked', // stacked (buscador debajo) | inline (todo en una fila)
				'shape'          => 'flat', // flat | curved (esquinas de abajo redondeadas) | floating (isla) | line (minimal, sin sombra)
				'field'          => 'pill', // pill | rounded | soft (translúcido, del color de la barra)
				'glass'          => false, // fondo translúcido con desenfoque
				// Cabecera del tema que se oculta en celulares cuando la barra está activa (selector CSS).
				'hide_header'    => '',
				// Botones de la derecha (hasta 3): iconos o un botón con texto, con su acción.
				// Por defecto, los de una tienda; sin WooCommerce el carrito no se muestra.
				'actions'        => array(
					array_merge( self::app_bar_action(), array( 'id' => 'ab_account', 'action' => 'account', 'icon' => 'user-round' ) ),
					array_merge( self::app_bar_action(), array( 'id' => 'ab_cart', 'action' => 'cart', 'icon' => 'shopping-cart' ) ),
				),
				'search'         => true, // campo de búsqueda debajo (abre el buscador)
				'hide_on_scroll' => 'top', // none | top (al bajar queda el buscador) | all
				// Colores propios (apagado: los de la cabecera del panel, en Diseño).
				'custom_colors'  => false,
				'colors'         => array(
					'bg'        => '#0f172a', // fondo
					'bg2'       => '', // segundo color: degradado (vacío = color sólido)
					'fg'        => '#ffffff', // iconos, nombre del sitio
					'search_bg' => '#ffffff', // fondo del campo de búsqueda
					'search_fg' => '#62626b', // texto e icono del campo de búsqueda
					'badge_bg'  => '#e11d48', // contador del carrito
					'badge_fg'  => '#ffffff',
					'cta_bg'    => '#ffffff', // botón con texto (por defecto: los colores de la barra invertidos)
					'cta_fg'    => '#0f172a',
				),
			),
			// Escritorio: el mismo panel con un botón tipo «☰ Todo» (Amazon) o con submenús en columnas
			// a la derecha (Falabella, Mercado Libre). Se decide con CSS a partir del breakpoint.
			'desktop'             => array(
				'enabled'    => false,
				'floating'   => false, // botón flotante también en escritorio (si no: shortcode, bloque o selector)
				'selector'   => '', // elementos del tema que abren el panel (p. ej. un ítem del menú principal)
				'width'      => 380, // ancho del panel en px
				'layout'     => 'panel', // panel (como en el celular) | cascade (submenús en columnas a la derecha)
				'flyout'     => 640, // ancho de la columna de subcategorías en cascada (px)
				'hover'      => true, // abrir subcategorías al pasar el mouse (cascada y dos columnas)
				'bottom_bar' => false, // barra inferior también en escritorio
			),
			'design'              => array(
				'preset'      => 'marketplace',
				'color_mode'  => 'light', // light | dark | auto
				'tokens'      => Presets::tokens( 'marketplace' ),
				'dark_tokens' => Presets::dark_tokens(),
				'style'       => Presets::style( 'marketplace' ),
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
			// Campaña: el ítem solo aparece entre estas fechas (hora del sitio, «2026-11-27T00:00»).
			'schedule'    => array(
				'from' => '',
				'to'   => '',
			),
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
				'exclude'     => array(), // ids de términos que no se muestran (con sus hijos)
			),
			'children'    => array(),
		);
	}

	/**
	 * Botón de la derecha de la barra superior.
	 *
	 * @return array<string, mixed>
	 */
	public static function app_bar_action(): array {
		return array(
			'id'     => '',
			'action' => 'link', // link | search | account | cart | wishlist | whatsapp | phone
			'style'  => 'icon', // icon (solo icono) | button (botón con texto, como «Cotizar»)
			'icon'   => 'star', // con «button» puede ir vacío (solo texto)
			'label'  => '', // texto del botón; en los iconos, lo que lee el lector de pantalla
			'url'    => '', // enlace, o número de WhatsApp o teléfono
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
