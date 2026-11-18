<?php
declare(strict_types=1);

namespace ImaginaMenu\Model;

defined( 'ABSPATH' ) || exit;

/**
 * Valida y limpia todo lo que entra al modelo (REST, importación, migraciones).
 *
 * Regla: lista blanca. Solo entran claves que existen en Defaults; cada valor se convierte al tipo
 * del valor por defecto; los enumerados fuera de rango vuelven al defecto; los textos se limpian.
 * Así el compilador y las plantillas pueden confiar en la forma de los datos.
 */
final class Normalizer {

	/** Valores permitidos por ruta de clave ("drawer.side"). El primero no es el defecto: manda Defaults. */
	private const ENUMS = array(
		'load_js'                 => array( 'eager', 'interaction' ),
		'trigger.mode'            => array( 'floating', 'theme_selector', 'manual' ),
		'trigger.position'        => array( 'bottom-left', 'bottom-right', 'top-left', 'top-right' ),
		'trigger.icon'            => array( 'menu', 'align-left', 'layout-grid', 'grip' ),
		'drawer.side'             => array( 'left', 'right', 'bottom' ),
		'drawer.submenu_mode'     => array( 'slide', 'accordion', 'two_pane', 'tabs', 'grid' ),
		'rules.match'             => array( 'all', 'any' ),
		'design.style.panel'      => array( 'flat', 'rounded', 'floating', 'glass' ),
		'design.style.header'     => array( 'solid', 'gradient', 'minimal', 'card', 'image' ),
		'design.style.items'      => array( 'list', 'divided', 'cards', 'pills', 'grouped' ),
		'design.style.icons'      => array( 'plain', 'soft', 'tile', 'color', 'none' ),
		'design.style.font'       => array( 'theme', 'system', 'rounded', 'serif' ),
		'design.style.weight'     => array( 'regular', 'medium', 'semibold' ),
		'design.style.headings'   => array( 'caps', 'bold', 'accent' ),
		'design.style.active'     => array( 'text', 'bar', 'pill' ),
		'design.style.chevron'    => array( 'chevron', 'arrow', 'none' ),
		'design.style.badge'      => array( 'solid', 'soft', 'outline' ),
		'design.style.search'     => array( 'filled', 'outline', 'underline' ),
		'design.style.overlay'    => array( 'dim', 'blur' ),
		'design.style.shadow'     => array( 'none', 'soft', 'strong' ),
		'design.style.motion'     => array( 'smooth', 'snappy', 'spring' ),
		'html_depth'              => array( 'auto', 'full', 'hybrid' ),
		'drawer.close_position'   => array( 'outside', 'inside', 'none' ),
		'bottom_bar.style'        => array( 'labels', 'icons', 'active_label' ),
		'bottom_bar.indicator'    => array( 'pill', 'line', 'dot', 'color' ),
		'bottom_bar.shape'        => array( 'bar', 'floating' ),
		'search.post_type'        => array( 'auto', 'any', 'product', 'post' ),
		'search.provider'         => array( 'auto', 'native' ),
		'drawer.view_all_position' => array( 'bottom', 'top' ),
		'drawer.banners_position' => array( 'top', 'bottom' ),
		'desktop.layout'          => array( 'panel', 'cascade' ),
		'app_bar.hide_on_scroll'  => array( 'none', 'top', 'all' ),
		'app_bar.logo_align'      => array( 'left', 'center' ),
		'design.color_mode'       => array( 'light', 'dark', 'auto' ),
		'item.type'               => array( 'link', 'heading', 'divider', 'source' ),
		'item.target'             => array( '_self', '_blank' ),
		'item.visibility'         => array( 'any', 'logged_in', 'logged_out' ),
		'item.badge.style'        => array( 'new', 'sale', 'hot', 'info' ),
		'item.object.kind'        => array( '', 'post', 'term' ),
		'item.source.kind'        => array( 'wp_menu', 'woo_categories', 'taxonomy' ),
		'item.source.orderby'     => array( 'menu_order', 'name', 'count' ),
		'bottom_item.action'      => array( 'link', 'drawer', 'search', 'cart', 'account', 'wishlist', 'whatsapp', 'phone', 'top' ),
		'bottom_item.badge'       => array( 'none', 'cart', 'wishlist', 'custom' ),
	);

	/** Rangos numéricos [min, max] por ruta. */
	private const RANGES = array(
		'breakpoint'               => array( 320, 4000 ),
		'trigger.offset'           => array( 0, 80 ),
		'trigger.size'             => array( 36, 80 ),
		'drawer.width'             => array( 50, 100 ),
		'drawer.max_width'         => array( 240, 1200 ),
		'desktop.width'            => array( 280, 640 ),
		'desktop.flyout'           => array( 320, 1000 ),
		'app_bar.logo_height'      => array( 16, 44 ),
		'app_bar.logo_width'       => array( 60, 240 ),
		'item.source.depth'        => array( 1, 4 ),
		'item.source.limit'        => array( 1, 300 ),
		'design.tokens.overlay'    => array( 0, 95 ),
		'design.tokens.radius'     => array( 0, 32 ),
		'design.tokens.item_height' => array( 40, 80 ),
		'design.tokens.font_size'  => array( 12, 24 ),
		'design.tokens.duration'   => array( 0, 800 ),
		'analytics.sample'         => array( 1, 100 ),
		'analytics.retention'      => array( 30, 730 ),
	);

	public const MAX_ITEMS       = 1500;
	public const MAX_DEPTH       = 6;
	public const MAX_BOTTOM      = 6;
	public const MAX_CUSTOM_CSS  = 20000;

	/** Condiciones de los perfiles y qué campos usa cada una. */
	public const RULE_TYPES = array( 'front_page', 'blog', 'page', 'post_type', 'term', 'woo', 'url', 'logged_in', 'logged_out', 'role', 'language', 'date' );

	public const WOO_PAGES = array( 'any', 'shop', 'product', 'cart', 'checkout', 'account' );

	private int $item_count = 0;

	/**
	 * @param array<mixed> $input
	 * @return array<string, mixed>
	 */
	public static function settings( array $input ): array {
		return ( new self() )->merge( Defaults::settings(), $input, '' );
	}

	/**
	 * @param array<mixed> $input
	 * @return array<string, mixed>
	 */
	public static function profile( array $input ): array {
		$self     = new self();
		$defaults = Defaults::profile();
		$preset   = is_array( $input['design'] ?? null ) ? (string) ( $input['design']['preset'] ?? '' ) : '';
		if ( ! Presets::exists( $preset ) ) {
			$preset = 'marketplace';
		}
		// Los tokens que falten se toman del preset elegido, no del preset por defecto.
		$defaults['design']['tokens'] = Presets::tokens( $preset );
		$defaults['design']['style']  = Presets::style( $preset );

		$out                     = $self->merge( $defaults, $input, '' );
		$out['design']['preset'] = $preset;
		$out['title']            = self::text( $out['title'], 80 ) ?: 'Perfil';

		$out['hide_theme_selector'] = self::selector( (string) $out['hide_theme_selector'] );
		$out['trigger']['selector'] = self::selector( (string) $out['trigger']['selector'] );
		$out['desktop']['selector'] = self::selector( (string) $out['desktop']['selector'] );

		$out['app_bar']['logo_image']['url'] = self::url( (string) $out['app_bar']['logo_image']['url'] );
		$out['bottom_bar']['badge_bg']       = self::color( (string) $out['bottom_bar']['badge_bg'] ) ?? '#e11d48';
		$out['bottom_bar']['badge_fg']       = self::color( (string) $out['bottom_bar']['badge_fg'] ) ?? '#ffffff';
		$out['app_bar']['hide_header']       = self::selector( (string) $out['app_bar']['hide_header'] );

		// Colores de la barra superior: solo hexadecimales (van al CSS crítico); el degradado es opcional.
		$ab_defaults = Defaults::profile()['app_bar']['colors'];
		foreach ( $ab_defaults as $key => $default ) {
			$value = self::color( (string) ( $out['app_bar']['colors'][ $key ] ?? '' ) );
			$out['app_bar']['colors'][ $key ] = $value ?? ( 'bg2' === $key ? '' : $default );
		}

		$drawer                 = &$out['drawer'];
		$drawer['whatsapp']['number'] = preg_replace( '/[^0-9]/', '', (string) $drawer['whatsapp']['number'] ) ?? '';
		$drawer['whatsapp']['message'] = self::text( $drawer['whatsapp']['message'], 300 );
		$drawer['cta']['url']   = self::url( (string) $drawer['cta']['url'] );
		$drawer['footer_links'] = self::links( $input['drawer']['footer_links'] ?? array(), 12 );
		$drawer['menu_by_lang'] = self::lang_map( $input['drawer']['menu_by_lang'] ?? array() );
		$drawer['social']       = self::social( $input['drawer']['social'] ?? array() );
		$drawer['banners']      = self::banners( $input['drawer']['banners'] ?? array() );
		$drawer['whatsapp']['hours'] = self::hours( $input['drawer']['whatsapp']['hours'] ?? array() );
		unset( $drawer );

		$out['rules']['conditions'] = self::conditions( $input['rules']['conditions'] ?? array() );

		$bar = $input['bottom_bar']['items'] ?? array();
		$out['bottom_bar']['items']   = $self->bottom_items( is_array( $bar ) ? $bar : array() );
		$out['bottom_bar']['hide_on'] = self::string_list( $input['bottom_bar']['hide_on'] ?? array( 'checkout' ), array( 'checkout', 'cart', 'product', 'account' ) );

		$popular                    = is_array( $input['search']['popular'] ?? null ) ? $input['search']['popular'] : array();
		$out['search']['popular']   = array_values( array_filter( array_map( static fn( $t ) => self::text( $t, 40 ), array_slice( $popular, 0, 10 ) ) ) );

		$out['design']['tokens']      = self::tokens( $out['design']['tokens'], Presets::tokens( $preset ) );
		$out['design']['dark_tokens'] = self::tokens( $out['design']['dark_tokens'], Presets::dark_tokens() );
		$out['design']['custom_css']  = self::css( (string) $out['design']['custom_css'] );
		$out['design']['style']['header_image']['url'] = self::url( (string) $out['design']['style']['header_image']['url'] );

		return $out;
	}

	/**
	 * @param array<mixed> $input
	 * @return array<string, mixed>
	 */
	public static function menu( array $input ): array {
		$self          = new self();
		$out           = $self->merge( array_diff_key( Defaults::menu(), array( 'items' => 1 ) ), $input, '' );
		$out['title']  = self::text( $out['title'], 80 ) ?: 'Menú';
		$items         = $input['items'] ?? array();
		$out['items']  = $self->items( is_array( $items ) ? $items : array(), 0 );
		return $out;
	}

	/**
	 * @param array<mixed> $items
	 * @return list<array<string, mixed>>
	 */
	private function items( array $items, int $depth ): array {
		$out = array();
		foreach ( $items as $raw ) {
			if ( ! is_array( $raw ) || $this->item_count >= self::MAX_ITEMS ) {
				continue;
			}
			++$this->item_count;
			$defaults = Defaults::item();
			unset( $defaults['children'] );
			$item = $this->merge( $defaults, $raw, 'item' );

			$item['id']          = self::id( (string) $item['id'] );
			$item['label']       = self::text( $item['label'], 120 );
			$item['description'] = self::text( $item['description'], 160 );
			$item['url']         = self::url( (string) $item['url'] );
			$item['icon']        = self::icon_name( (string) $item['icon'] );
			$item['rel']         = implode( ' ', self::string_list( explode( ' ', (string) $item['rel'] ), array( 'nofollow', 'sponsored', 'ugc', 'noopener' ) ) );
			$item['css_class']   = implode( ' ', array_filter( array_map( 'sanitize_html_class', explode( ' ', (string) $item['css_class'] ) ) ) );
			$item['badge']['text'] = self::text( $item['badge']['text'], 16 );
			$item['image']['url']  = self::url( (string) $item['image']['url'] );
			$item['object']['type'] = sanitize_key( (string) $item['object']['type'] );
			$item['source']['taxonomy'] = sanitize_key( (string) $item['source']['taxonomy'] );
			$item['schedule']    = self::window( $item['schedule'] );

			$children         = $raw['children'] ?? array();
			$item['children'] = ( $depth + 1 < self::MAX_DEPTH && is_array( $children ) && in_array( $item['type'], array( 'link', 'heading' ), true ) )
				? $this->items( $children, $depth + 1 )
				: array();
			$out[] = $item;
		}
		return $out;
	}

	/**
	 * @param array<mixed> $items
	 * @return list<array<string, mixed>>
	 */
	private function bottom_items( array $items ): array {
		$out = array();
		foreach ( array_slice( $items, 0, self::MAX_BOTTOM ) as $raw ) {
			if ( ! is_array( $raw ) ) {
				continue;
			}
			$item               = $this->merge( Defaults::bottom_item(), $raw, 'bottom_item' );
			$item['id']         = self::id( (string) $item['id'] );
			$item['label']      = self::text( $item['label'], 24 );
			$item['icon']       = self::icon_name( (string) $item['icon'] ) ?: 'circle';
			$item['badge_text'] = self::text( $item['badge_text'], 6 );
			$item['url']        = 'phone' === $item['action'] || 'whatsapp' === $item['action']
				? preg_replace( '/[^0-9+]/', '', (string) $item['url'] ) ?? ''
				: self::url( (string) $item['url'] );
			$out[] = $item;
		}
		return $out;
	}

	/**
	 * Mezcla recursiva guiada por los defectos.
	 *
	 * @param array<string, mixed> $defaults
	 * @param mixed                $input
	 * @return array<string, mixed>
	 */
	private function merge( array $defaults, $input, string $path ): array {
		$input = is_array( $input ) ? $input : array();
		$out   = array();
		foreach ( $defaults as $key => $default ) {
			$key_path = '' === $path ? (string) $key : $path . '.' . $key;
			if ( ! array_key_exists( $key, $input ) ) {
				$out[ $key ] = $default;
				continue;
			}
			$value = $input[ $key ];
			if ( is_array( $default ) ) {
				// Listas (footer_links, items…) se normalizan aparte; aquí solo objetos.
				$out[ $key ] = array_is_list( $default ) ? ( is_array( $value ) ? $value : $default ) : $this->merge( $default, $value, $key_path );
				continue;
			}
			$out[ $key ] = $this->scalar( $default, $value, $key_path );
		}
		return $out;
	}

	/**
	 * @param mixed $default
	 * @param mixed $value
	 * @return mixed
	 */
	private function scalar( $default, $value, string $path ) {
		if ( is_bool( $default ) ) {
			return filter_var( $value, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE ) ?? $default;
		}
		if ( is_int( $default ) ) {
			if ( ! is_numeric( $value ) ) {
				return $default;
			}
			$value = (int) round( (float) $value );
			$range = self::RANGES[ self::range_key( $path ) ] ?? null;
			if ( $range ) {
				$value = max( $range[0], min( $range[1], $value ) );
			}
			return $value;
		}
		if ( ! is_scalar( $value ) ) {
			return $default;
		}
		$value = (string) $value;
		$enum  = self::ENUMS[ $path ] ?? null;
		if ( $enum ) {
			return in_array( $value, $enum, true ) ? $value : $default;
		}
		return self::text( $value, 400 );
	}

	/** "design.tokens.radius" ya es la clave; las rutas de ítems se quedan igual. */
	private static function range_key( string $path ): string {
		return $path;
	}

	/**
	 * @param mixed                       $tokens
	 * @param array<string, string|int>   $fallback
	 * @return array<string, string|int>
	 */
	private static function tokens( $tokens, array $fallback ): array {
		$tokens = is_array( $tokens ) ? $tokens : array();
		$out    = array();
		foreach ( $fallback as $key => $default ) {
			$value = $tokens[ $key ] ?? $default;
			if ( is_int( $default ) ) {
				$range       = self::RANGES[ 'design.tokens.' . $key ] ?? array( 0, 1000 );
				$out[ $key ] = is_numeric( $value ) ? max( $range[0], min( $range[1], (int) $value ) ) : $default;
			} else {
				$out[ $key ] = self::color( (string) $value ) ?? $default;
			}
		}
		return $out;
	}

	public static function color( string $value ): ?string {
		$value = strtolower( trim( $value ) );
		if ( preg_match( '/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/', $value ) ) {
			return $value;
		}
		return null;
	}

	public static function text( mixed $value, int $max ): string {
		if ( ! is_scalar( $value ) ) {
			return '';
		}
		$value = sanitize_text_field( (string) $value );
		return mb_substr( $value, 0, $max );
	}

	/** URL permitida: http(s), relativa a la raíz, ancla, mailto, tel. Todo lo demás se descarta. */
	public static function url( string $value ): string {
		$value = trim( $value );
		if ( '' === $value ) {
			return '';
		}
		if ( str_starts_with( $value, '//' ) ) {
			$value = 'https:' . $value; // Relativa al protocolo: se fija a https.
		}
		if ( str_starts_with( $value, '#' ) ) {
			return '#' . preg_replace( '/[^A-Za-z0-9_\-]/', '', substr( $value, 1 ) );
		}
		if ( str_starts_with( $value, '/' ) && ! str_starts_with( $value, '//' ) ) {
			return esc_url_raw( $value, array( 'http', 'https' ) ) ?: '';
		}
		$value = esc_url_raw( $value, array( 'http', 'https', 'mailto', 'tel' ) );
		// esc_url_raw quita tabuladores y saltos: «/\t/otro.sitio» acabaría en «//otro.sitio».
		return str_starts_with( $value, '//' ) ? 'https:' . $value : $value;
	}

	public static function id( string $value ): string {
		$value = preg_replace( '/[^a-z0-9_]/', '', strtolower( $value ) ) ?? '';
		if ( '' === $value ) {
			$value = 'i_' . substr( md5( uniqid( '', true ) ), 0, 8 );
		}
		return substr( $value, 0, 24 );
	}

	public static function icon_name( string $value ): string {
		$value = strtolower( trim( $value ) );
		return preg_match( '/^[a-z0-9][a-z0-9\-]{0,48}$/', $value ) ? $value : '';
	}

	/** Selector CSS para ocultar o vincular elementos del tema. Sin llaves ni "<" para no salir de la regla. */
	/**
	 * Selector CSS para ocultar o capturar el botón del tema. Va dentro de una regla CSS crítica: no
	 * puede abrir ni cerrar bloques, comentarios ni cadenas. Se permiten combinadores (`>`, `+`, `~`)
	 * y escapes (`.md\\:hidden`), pero los paréntesis, corchetes y comillas deben estar equilibrados y
	 * no puede terminar en `\\` (escaparía la llave que se añade detrás).
	 */
	public static function selector( string $value ): string {
		$value = trim( wp_strip_all_tags( $value ) );
		$value = str_replace( array( '{', '}', ';', '<', '/*', '*/', '@', "\n", "\r" ), '', $value );
		$value = rtrim( mb_substr( $value, 0, 300 ), '\\ ' );
		$depth = array(
			'(' => 0,
			'[' => 0,
		);
		$quote = '';
		$len   = strlen( $value );
		for ( $i = 0; $i < $len; $i++ ) {
			$ch = $value[ $i ];
			if ( '\\' === $ch ) {
				++$i; // Carácter escapado.
				continue;
			}
			if ( '' !== $quote ) {
				$quote = $ch === $quote ? '' : $quote;
				continue;
			}
			if ( '"' === $ch || "'" === $ch ) {
				$quote = $ch;
			} elseif ( '(' === $ch || '[' === $ch ) {
				++$depth[ $ch ];
			} elseif ( ')' === $ch && --$depth['('] < 0 ) {
				return '';
			} elseif ( ']' === $ch && --$depth['['] < 0 ) {
				return '';
			}
		}
		return ( '' === $quote && 0 === $depth['('] && 0 === $depth['['] ) ? $value : '';
	}

	/** CSS propio: sin salir de la etiqueta style, sin imports, sin expresiones de IE. */
	public static function css( string $value ): string {
		$value = wp_strip_all_tags( $value );
		$value = preg_replace( '#</?style[^>]*>#i', '', $value ) ?? '';
		$value = preg_replace( '/@import[^;]*;?/i', '', $value ) ?? '';
		$value = preg_replace( '/expression\s*\(/i', '', $value ) ?? '';
		$value = str_replace( '<', '', $value );
		return mb_substr( $value, 0, self::MAX_CUSTOM_CSS );
	}

	/**
	 * @param mixed        $list
	 * @param list<string> $allowed
	 * @return list<string>
	 */
	private static function string_list( $list, array $allowed ): array {
		if ( ! is_array( $list ) ) {
			return array();
		}
		return array_values( array_unique( array_filter( array_map( 'strval', $list ), static fn( $v ) => in_array( $v, $allowed, true ) ) ) );
	}

	/**
	 * @param mixed $links
	 * @return list<array{label: string, url: string, icon: string}>
	 */
	private static function links( $links, int $max ): array {
		$out = array();
		foreach ( is_array( $links ) ? array_slice( $links, 0, $max ) : array() as $link ) {
			if ( ! is_array( $link ) ) {
				continue;
			}
			$label = self::text( $link['label'] ?? '', 60 );
			$url   = self::url( (string) ( $link['url'] ?? '' ) );
			if ( '' === $label || '' === $url ) {
				continue;
			}
			$out[] = array(
				'label' => $label,
				'url'   => $url,
				'icon'  => self::icon_name( (string) ( $link['icon'] ?? '' ) ),
			);
		}
		return $out;
	}

	/**
	 * @param mixed $map
	 * @return array<string, int>
	 */
	private static function lang_map( $map ): array {
		$out = array();
		foreach ( is_array( $map ) ? $map : array() as $lang => $menu ) {
			$lang = preg_replace( '/[^a-z0-9_\-]/', '', strtolower( (string) $lang ) ) ?? '';
			if ( '' !== $lang && is_numeric( $menu ) && (int) $menu > 0 ) {
				$out[ substr( $lang, 0, 12 ) ] = (int) $menu;
			}
		}
		return $out;
	}

	/**
	 * @param mixed $conditions
	 * @return list<array{type: string, not: bool, value: string, ids: list<int>}>
	 */
	public static function conditions( $conditions ): array {
		$out = array();
		foreach ( is_array( $conditions ) ? array_slice( $conditions, 0, 20 ) : array() as $c ) {
			if ( ! is_array( $c ) || ! in_array( $c['type'] ?? '', self::RULE_TYPES, true ) ) {
				continue;
			}
			$type  = (string) $c['type'];
			$value = self::text( $c['value'] ?? '', 120 );
			if ( in_array( $type, array( 'post_type', 'term', 'role', 'language' ), true ) ) {
				$value = sanitize_key( $value );
			}
			if ( 'woo' === $type && ! in_array( $value, self::WOO_PAGES, true ) ) {
				$value = 'any';
			}
			if ( 'date' === $type ) {
				// «desde|hasta» (cualquiera de los dos puede faltar).
				$parts = explode( '|', (string) ( $c['value'] ?? '' ) . '|' );
				$value = \ImaginaMenu\Core\Schedule::clean( $parts[0] ) . '|' . \ImaginaMenu\Core\Schedule::clean( $parts[1] );
				if ( '|' === $value ) {
					continue;
				}
			}
			$ids = array_values( array_unique( array_filter( array_map( 'intval', is_array( $c['ids'] ?? null ) ? array_slice( $c['ids'], 0, 200 ) : array() ) ) ) );
			$out[] = array(
				'type'  => $type,
				'not'   => (bool) filter_var( $c['not'] ?? false, FILTER_VALIDATE_BOOLEAN ),
				'value' => $value,
				'ids'   => $ids,
			);
		}
		return $out;
	}

	/**
	 * Ventana de fechas de una campaña.
	 *
	 * @param mixed $window
	 * @return array{from: string, to: string}
	 */
	public static function window( $window ): array {
		$window = is_array( $window ) ? $window : array();
		return array(
			'from' => \ImaginaMenu\Core\Schedule::clean( $window['from'] ?? '' ),
			'to'   => \ImaginaMenu\Core\Schedule::clean( $window['to'] ?? '' ),
		);
	}

	/**
	 * @param mixed $banners
	 * @return list<array{image: array{id: int, url: string}, url: string, alt: string, from: string, to: string}>
	 */
	private static function banners( $banners ): array {
		$out = array();
		foreach ( is_array( $banners ) ? array_slice( $banners, 0, 6 ) : array() as $b ) {
			if ( ! is_array( $b ) ) {
				continue;
			}
			$image = self::url( (string) ( $b['image']['url'] ?? '' ) );
			if ( '' === $image ) {
				continue;
			}
			$out[] = array(
				'image' => array(
					'id'  => max( 0, (int) ( $b['image']['id'] ?? 0 ) ),
					'url' => $image,
				),
				'url'   => self::url( (string) ( $b['url'] ?? '' ) ),
				'alt'   => self::text( $b['alt'] ?? '', 120 ),
			) + self::window( $b );
		}
		return $out;
	}

	/**
	 * Horario de atención de WhatsApp.
	 *
	 * @param mixed $hours
	 * @return array{enabled: bool, days: list<int>, from: string, to: string, off_label: string}
	 */
	private static function hours( $hours ): array {
		$hours = is_array( $hours ) ? $hours : array();
		$time  = static fn( $v, string $d ) => 1 === preg_match( '/^([01]\d|2[0-3]):[0-5]\d$/', (string) $v ) ? (string) $v : $d;
		$days  = is_array( $hours['days'] ?? null ) ? $hours['days'] : array( 1, 2, 3, 4, 5 );
		$days  = array_values( array_unique( array_filter( array_map( 'intval', $days ), static fn( $d ) => $d >= 0 && $d <= 6 ) ) );
		sort( $days );
		return array(
			'enabled'   => (bool) filter_var( $hours['enabled'] ?? false, FILTER_VALIDATE_BOOLEAN ),
			'days'      => $days,
			'from'      => $time( $hours['from'] ?? '', '08:00' ),
			'to'        => $time( $hours['to'] ?? '', '18:00' ),
			'off_label' => self::text( $hours['off_label'] ?? '', 60 ) ?: 'Déjanos tu mensaje',
		);
	}

	/**
	 * @param mixed $social
	 * @return list<array{network: string, url: string}>
	 */
	private static function social( $social ): array {
		$networks = array( 'facebook', 'instagram', 'tiktok', 'youtube', 'x', 'linkedin', 'pinterest', 'telegram', 'whatsapp' );
		$out      = array();
		foreach ( is_array( $social ) ? array_slice( $social, 0, 10 ) : array() as $row ) {
			if ( ! is_array( $row ) || ! in_array( $row['network'] ?? '', $networks, true ) ) {
				continue;
			}
			$url = self::url( (string) ( $row['url'] ?? '' ) );
			if ( '' !== $url ) {
				$out[] = array(
					'network' => (string) $row['network'],
					'url'     => $url,
				);
			}
		}
		return $out;
	}
}
