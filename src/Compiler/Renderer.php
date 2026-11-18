<?php
declare(strict_types=1);

namespace ImaginaMenu\Compiler;

/**
 * Genera el HTML del menú (se ejecuta al compilar, no en cada visita).
 *
 * Mejora progresiva:
 * - El panel y el buscador son elementos con el atributo `popover`: los botones con `popovertarget`
 *   los abren sin JavaScript. Con JS, el panel se abre como diálogo modal (foco atrapado, fondo inerte).
 * - Los submenús son `<details>`: sin JS funcionan como acordeón; con JS (modo deslizante) se
 *   convierten en paneles que entran desde el lado.
 * - Todos los enlaces son `<a href>` reales (SEO) y la página actual se marca en el servidor.
 */
final class Renderer {

	/** Marcador que el frontend reemplaza por el nombre del usuario conectado (escapado). */
	public const NAME_TOKEN = '%%IMM_NAME%%';

	/** Marcador del selector de idioma (se reemplaza en tiempo de ejecución). */
	public const LANGS_TOKEN = '<!--imm:langs-->';

	private Icons $icons;

	/** @var array<string, mixed> */
	private array $profile;

	private string $variant = 'guest';

	/** @var array<string, string> id => etiqueta (para la analítica). */
	private array $labels = array();

	/**
	 * @param array<string, mixed> $profile Perfil normalizado.
	 * @param array<string, mixed> $site    Datos del sitio: name, logo, account_url, cart_url, home_url, woo, search_post_type.
	 */
	public function __construct( array $profile, private array $site, ?Icons $icons = null ) {
		$this->profile = $profile;
		$this->icons   = $icons ?? new Icons();
	}

	public function icons(): Icons {
		return $this->icons;
	}

	/** @return array<string, string> */
	public function labels(): array {
		return $this->labels;
	}

	/**
	 * Textos propios del menú. Se escriben con __() aquí para que las herramientas de traducción los
	 * encuentren; el compilador además los pasa por WPML/Polylang por idioma (site['ui']).
	 *
	 * @return array<string, string> texto fuente => texto en el idioma del sitio
	 */
	public static function ui_strings(): array {
		return array(
			'Menú'                   => __( 'Menú', 'imagina-menu' ),
			'Abrir menú'             => __( 'Abrir menú', 'imagina-menu' ),
			'Cerrar menú'            => __( 'Cerrar menú', 'imagina-menu' ),
			'Menú principal'         => __( 'Menú principal', 'imagina-menu' ),
			'Hola, %s'               => __( 'Hola, %s', 'imagina-menu' ),
			'Mi cuenta'              => __( 'Mi cuenta', 'imagina-menu' ),
			'Hola, inicia sesión'    => __( 'Hola, inicia sesión', 'imagina-menu' ),
			'Ingresar o registrarse' => __( 'Ingresar o registrarse', 'imagina-menu' ),
			'Buscar'                 => __( 'Buscar', 'imagina-menu' ),
			'Cerrar búsqueda'        => __( 'Cerrar búsqueda', 'imagina-menu' ),
			'Búsquedas recientes'    => __( 'Búsquedas recientes', 'imagina-menu' ),
			'Populares'              => __( 'Populares', 'imagina-menu' ),
			'Navegación inferior'    => __( 'Navegación inferior', 'imagina-menu' ),
		);
	}

	private function s( string $source ): string {
		if ( isset( $this->site['ui'][ $source ] ) ) {
			return (string) $this->site['ui'][ $source ];
		}
		return self::ui_strings()[ $source ] ?? $source;
	}

	/** Niveles desde el 3.º en <template> (catálogos grandes: menos nodos DOM). */
	private function hybrid(): bool {
		return ! empty( $this->site['hybrid'] );
	}

	/** Atributo con la configuración que lee el JS (analítica, prefetch, perfil). */
	private function cfg_attr(): string {
		return '' !== ( $this->site['cfg'] ?? '' ) ? ' data-imm-cfg="' . esc_attr( (string) $this->site['cfg'] ) . '"' : '';
	}

	/**
	 * Partes del HTML de un perfil.
	 *
	 * @param list<array<string, mixed>> $items Árbol ya resuelto (SourceResolver).
	 * @return array<string, string>
	 */
	public function render( array $items ): array {
		$parts = array(
			'fab'          => '',
			'drawer_guest' => '',
			'drawer_user'  => '',
			'search'       => '',
			'bbar'         => '',
		);
		$drawer = $this->profile['drawer'];
		if ( $drawer['enabled'] ) {
			// El icono del disparador siempre va en el sprite: lo usan el shortcode y el bloque.
			$this->icons->use( $this->profile['trigger']['icon'] );
			// Si la barra inferior ya tiene un botón que abre el panel, el botón flotante sobra.
			if ( 'floating' === $this->profile['trigger']['mode'] && ! $this->bar_opens_drawer() ) {
				$parts['fab'] = $this->fab();
			} elseif ( 'theme_selector' === $this->profile['trigger']['mode'] && ! $this->bar_opens_drawer() ) {
				// Red de seguridad: si el botón del tema no está en la página, el JS muestra este.
				$parts['fab'] = $this->fab( true );
			}
			$this->variant         = 'guest';
			$parts['drawer_guest'] = $this->drawer( $items );
			$this->variant         = 'user';
			$parts['drawer_user']  = $this->drawer( $items );
			if ( $parts['drawer_user'] === $parts['drawer_guest'] ) {
				$parts['drawer_user'] = ''; // Sin diferencias: el frontend usa la de invitado.
			}
		}
		if ( $this->needs_search() ) {
			$parts['search'] = $this->search();
		}
		if ( $this->profile['bottom_bar']['enabled'] && $this->profile['bottom_bar']['items'] ) {
			$parts['bbar'] = $this->bottom_bar();
		}
		return $parts;
	}

	private function bar_opens_drawer(): bool {
		if ( ! $this->profile['bottom_bar']['enabled'] ) {
			return false;
		}
		foreach ( $this->profile['bottom_bar']['items'] as $item ) {
			if ( 'drawer' === $item['action'] ) {
				return true;
			}
		}
		return false;
	}

	private function needs_search(): bool {
		if ( $this->profile['drawer']['enabled'] && $this->profile['drawer']['search'] ) {
			return true;
		}
		if ( $this->profile['bottom_bar']['enabled'] ) {
			foreach ( $this->profile['bottom_bar']['items'] as $item ) {
				if ( 'search' === $item['action'] ) {
					return true;
				}
			}
		}
		return false;
	}

	// ── Disparador flotante ─────────────────────────────────────────────────────────────────────

	private function fab( bool $fallback = false ): string {
		$t     = $this->profile['trigger'];
		$label = '' !== $t['label'] ? $t['label'] : $this->s( 'Menú' );
		$class = 'imm-fab imm-fab--' . $t['position'] . ( '' !== $t['label'] ? ' imm-fab--label' : '' ) . ( $t['hide_on_scroll'] ? ' imm-hide-scroll' : '' );
		return '<button type="button" class="' . esc_attr( $class ) . '" popovertarget="imm-drawer" aria-controls="imm-drawer" aria-expanded="false" aria-label="' . esc_attr( $this->s( 'Abrir menú' ) ) . '" data-imm-open' . ( $fallback ? ' data-imm-fallback hidden' : '' ) . '>'
			. $this->icons->use( $t['icon'] )
			. ( '' !== $t['label'] ? '<span>' . esc_html( $label ) . '</span>' : '' )
			. '</button>';
	}

	// ── Panel ───────────────────────────────────────────────────────────────────────────────────

	/** @param list<array<string, mixed>> $items */
	private function drawer( array $items ): string {
		$d = $this->profile['drawer'];
		// A ancho casi completo no queda espacio fuera del panel: el botón de cerrar va dentro.
		if ( 'outside' === $d['close_position'] && $d['width'] >= 92 && 'bottom' !== $d['side'] ) {
			$d['close_position']                       = 'inside';
			$this->profile['drawer']['close_position'] = 'inside';
		}
		$mode  = $d['submenu_mode'];
		$class = 'imm-drawer imm-side-' . $d['side'] . ' imm-mode-' . $mode . ( 'grid' === $mode ? ' imm-mode-slide' : '' ) . ( 'tabs' === $mode ? ' imm-mode-two_pane' : '' ) . ' imm-close-' . $d['close_position'];
		$data  = array(
			'data-back'   => $d['back_label'],
			'data-active' => $d['open_active'] ? '1' : '0',
			'data-swipe'  => $d['swipe_close'] ? '1' : '0',
			'data-recall' => $d['remember_level'] ? '1' : '0',
		);
		if ( 'theme_selector' === $this->profile['trigger']['mode'] && '' !== $this->profile['trigger']['selector'] ) {
			$data['data-trigger'] = $this->profile['trigger']['selector'];
		}

		$style = '--imm-w:' . (int) $d['width'] . 'vw;--imm-mw:' . (int) $d['max_width'] . 'px';
		$html  = '<dialog id="imm-drawer" class="' . esc_attr( $class ) . '" style="' . esc_attr( $style ) . '" popover aria-label="' . esc_attr( $this->s( 'Menú' ) ) . '"' . self::attrs( $data ) . $this->cfg_attr() . '>';
		$html .= '<div class="imm-d-in">';
		$html .= $this->drawer_head();
		$html .= '<nav class="imm-nav" aria-label="' . esc_attr( $this->s( 'Menú principal' ) ) . '">';
		if ( 'slide' === $mode || 'grid' === $mode ) {
			$html .= '<div class="imm-nav-bar" hidden><button type="button" class="imm-back" data-imm-back>'
				. $this->icons->use( 'chevron-left' ) . '<span class="imm-back-l">' . esc_html( $d['back_label'] ) . '</span></button>'
				. ( $d['show_level_title'] ? '<p class="imm-level-t" aria-live="polite"></p>' : '<p class="imm-level-t imm-sr" aria-live="polite"></p>' )
				. '</div>';
		}
		if ( 'two_pane' === $mode || 'tabs' === $mode ) {
			$html .= $this->two_pane( $items, 'tabs' === $mode );
		} else {
			$root  = 'grid' === $mode ? 'imm-level imm-root imm-grid' : 'imm-level imm-root';
			$html .= '<div class="imm-vp"><ul class="' . $root . '" role="list">' . $this->items( $items ) . '</ul></div>';
		}
		$html .= '</nav>';
		$html .= $this->drawer_foot();
		$html .= '</div>';
		if ( 'outside' === $d['close_position'] ) {
			$html .= $this->close_button( 'imm-close imm-close--out' );
		}
		$html .= '</dialog>';
		return $html;
	}

	private function close_button( string $class ): string {
		return '<button type="button" class="' . esc_attr( $class ) . '" popovertarget="imm-drawer" popovertargetaction="hide" aria-label="' . esc_attr( $this->s( 'Cerrar menú' ) ) . '" data-imm-close>'
			. $this->icons->use( 'x' ) . '</button>';
	}

	private function drawer_head(): string {
		$d    = $this->profile['drawer'];
		$top  = '';
		if ( $d['show_logo'] && '' !== ( $this->site['logo'] ?? '' ) ) {
			$top .= '<a class="imm-logo" href="' . esc_url( $this->site['home_url'] ) . '"><img src="' . esc_url( $this->site['logo'] ) . '" alt="' . esc_attr( $this->site['name'] ) . '" height="32" decoding="async" loading="lazy"></a>';
		} elseif ( '' !== $d['title'] ) {
			$top .= '<p class="imm-d-title">' . esc_html( $d['title'] ) . '</p>';
		}
		if ( 'inside' === $d['close_position'] ) {
			$top .= $this->close_button( 'imm-close imm-close--in' );
		}

		$html = '';
		if ( '' !== $top || $d['account'] ) {
			$html .= '<header class="imm-d-head">';
			if ( '' !== $top ) {
				$html .= '<div class="imm-d-top">' . $top . '</div>';
			}
			if ( $d['account'] ) {
				$html .= $this->account();
			}
			$html .= '</header>';
		}
		if ( $d['search'] ) {
			$html .= '<button type="button" class="imm-d-search" popovertarget="imm-search" data-imm-search>'
				. $this->icons->use( 'search' ) . '<span>' . esc_html( $this->profile['search']['placeholder'] ) . '</span></button>';
		}
		return $html;
	}

	private function account(): string {
		$url = (string) ( $this->site['account_url'] ?? '' );
		if ( 'user' === $this->variant ) {
			$hello = sprintf( /* translators: %s: nombre */ $this->s( 'Hola, %s' ), self::NAME_TOKEN );
			$cta   = $this->s( 'Mi cuenta' );
		} else {
			$hello = $this->s( 'Hola, inicia sesión' );
			$cta   = $this->s( 'Ingresar o registrarse' );
		}
		// Invitado: el JS puede saludar por nombre si existe la cookie opcional imm_un (páginas en caché).
		$data = 'guest' === $this->variant
			? ' data-hello="' . esc_attr( $this->s( 'Hola, %s' ) ) . '" data-cta="' . esc_attr( $this->s( 'Mi cuenta' ) ) . '"'
			: '';
		return '<a class="imm-account" href="' . esc_url( $url ) . '"' . $data . '>'
			. '<span class="imm-avatar">' . $this->icons->use( 'user-round' ) . '</span>'
			. '<span class="imm-account-t"><small>' . str_replace( esc_html( self::NAME_TOKEN ), self::NAME_TOKEN, esc_html( $hello ) ) . '</small><strong>' . esc_html( $cta ) . '</strong></span>'
			. $this->icons->use( 'chevron-right', 'imm-i imm-chev' )
			. '</a>';
	}

	private function drawer_foot(): string {
		$d    = $this->profile['drawer'];
		$html = '';
		if ( $d['cta']['enabled'] && '' !== $d['cta']['label'] && '' !== $d['cta']['url'] ) {
			$html .= '<a class="imm-cta" href="' . esc_url( $d['cta']['url'] ) . '">' . esc_html( $d['cta']['label'] ) . '</a>';
		}
		if ( $d['whatsapp']['enabled'] && '' !== $d['whatsapp']['number'] ) {
			$html .= '<a class="imm-wa" href="' . esc_url( self::whatsapp_url( $d['whatsapp']['number'], $d['whatsapp']['message'] ) ) . '" target="_blank" rel="noopener">'
				. $this->icons->use( 'si-whatsapp' ) . '<span>' . esc_html( $d['whatsapp']['label'] ) . '</span></a>';
		}
		if ( $d['footer_links'] ) {
			$html .= '<ul class="imm-links" role="list">';
			foreach ( $d['footer_links'] as $link ) {
				$html .= '<li><a href="' . esc_url( \ImaginaMenu\Sources\SourceResolver::absolute( $link['url'] ) ) . '">' . $this->icons->use( $link['icon'] ) . '<span>' . esc_html( $link['label'] ) . '</span></a></li>';
			}
			$html .= '</ul>';
		}
		if ( $d['social'] ) {
			$html .= '<ul class="imm-social" role="list">';
			foreach ( $d['social'] as $row ) {
				$html .= '<li><a href="' . esc_url( $row['url'] ) . '" target="_blank" rel="noopener" aria-label="' . esc_attr( ucfirst( $row['network'] ) ) . '">' . $this->icons->use( 'si-' . $row['network'] ) . '</a></li>';
			}
			$html .= '</ul>';
		}
		if ( $d['language_switcher'] && ! empty( $this->site['multilingual'] ) ) {
			$html .= self::LANGS_TOKEN; // Depende de la página: se reemplaza en cada visita.
		}
		return '' === $html ? '' : '<footer class="imm-d-foot">' . $html . '</footer>';
	}

	/** @param list<array<string, mixed>> $items */
	private function items( array $items, int $depth = 0 ): string {
		$html = '';
		foreach ( $items as $item ) {
			if ( ! $this->visible( $item ) ) {
				continue;
			}
			$html .= match ( $item['type'] ) {
				'divider' => '<li class="imm-div" role="separator"></li>',
				'heading' => '<li class="imm-head">' . esc_html( $item['label'] ) . '</li>' . $this->items( $item['children'], $depth ),
				default   => $this->item( $item, $depth ),
			};
		}
		return $html;
	}

	/** @param array<string, mixed> $item */
	private function visible( array $item ): bool {
		return match ( $item['visibility'] ?? 'any' ) {
			'logged_in'  => 'user' === $this->variant,
			'logged_out' => 'guest' === $this->variant,
			default      => true,
		};
	}

	/** @param array<string, mixed> $item */
	private function item( array $item, int $depth = 0 ): string {
		$children = array_values( array_filter( $item['children'], fn( $c ) => $this->visible( $c ) ) );
		$classes  = 'imm-it' . ( $item['highlight'] ? ' imm-hl' : '' ) . ( '' !== $item['css_class'] ? ' ' . $item['css_class'] : '' );
		$inner    = $this->item_inner( $item );

		if ( ! $children ) {
			if ( '' === $item['url'] ) {
				return '<li class="' . esc_attr( $classes ) . '"><span class="imm-a imm-a--text">' . $inner . '</span></li>';
			}
			return '<li class="' . esc_attr( $classes ) . '"><a class="imm-a" href="' . esc_url( $item['url'] ) . '"' . $this->link_attrs( $item ) . '>' . $inner . '</a></li>';
		}

		$sub = '';
		if ( $item['view_all'] && '' !== $item['url'] ) {
			$label = $this->profile['drawer']['view_all_label'] . ' ' . $item['label'];
			$sub  .= '<li class="imm-it imm-all"><a class="imm-a" href="' . esc_url( $item['url'] ) . '"' . $this->link_attrs( $item ) . '><span class="imm-t">' . esc_html( $label ) . '</span></a></li>';
		}
		$rest = $this->items( $children, $depth + 1 );
		$tpl  = '';
		if ( $depth >= 1 && $this->hybrid() ) {
			// Sin JS queda «Ver todo»; con JS el resto se clona al abrir el submenú.
			$tpl = '<template class="imm-tpl">' . $rest . '</template>';
		} else {
			$sub .= $rest;
		}

		return '<li class="' . esc_attr( $classes . ' imm-has' ) . '"><details class="imm-sub" id="imm-s-' . esc_attr( $item['id'] ) . '">'
			. '<summary class="imm-a">' . $inner . $this->icons->use( 'chevron-right', 'imm-i imm-chev' ) . '</summary>'
			. '<ul class="imm-level" role="list" data-title="' . esc_attr( $item['label'] ) . '">' . $sub . '</ul>' . $tpl
			. '</details></li>';
	}

	// ── Dos columnas (rail de categorías + rejilla con imágenes) ─────────────────────────────────

	/**
	 * Patrón de las apps de compras: a la izquierda las categorías de primer nivel; a la derecha
	 * las subcategorías como títulos y sus hijas como tarjetas con imagen.
	 *
	 * Sin JS funciona con radios + CSS (`:checked + .imm-tp-pane`); el JS marca la pestaña activa y
	 * carga las imágenes del panel visible.
	 *
	 * @param list<array<string, mixed>> $items
	 */
	private function two_pane( array $items, bool $tabs = false ): string {
		$rail  = '';
		$panes = '';
		$first = true;
		$n     = 0;
		$top   = $this->flatten_headings( $items );
		foreach ( $top as $item ) {
			if ( ! $this->visible( $item ) || ! in_array( $item['type'], array( 'link' ), true ) ) {
				continue;
			}
			$children = array_values( array_filter( $item['children'], fn( $c ) => $this->visible( $c ) && 'link' === $c['type'] ) );
			$icon     = '' !== $item['icon'] ? $this->icons->use( $item['icon'] ) : '';
			$label    = '<span>' . esc_html( $item['label'] ) . '</span>';
			$badge    = '' !== $item['badge']['text'] ? '<span class="imm-badge imm-badge--' . esc_attr( $item['badge']['style'] ) . '">' . esc_html( $item['badge']['text'] ) . '</span>' : '';
			$hl       = $item['highlight'] ? ' imm-hl' : '';
			if ( ! $children ) {
				$rail .= '<li><a class="imm-tp-tab' . $hl . '" href="' . esc_url( $item['url'] ) . '"' . $this->link_attrs( $item ) . '>' . $icon . $label . $badge . '</a></li>';
				continue;
			}
			$id    = 'imm-tp-' . $item['id'];
			$rail .= '<li><label class="imm-tp-tab' . $hl . ( $first ? ' imm-on' : '' ) . '" for="' . esc_attr( $id ) . '">' . $icon . $label . $badge . '</label></li>';
			$panes .= '<input class="imm-tp-r imm-sr" type="radio" name="imm-tp" id="' . esc_attr( $id ) . '"' . ( $first ? ' checked' : '' ) . '>'
				. '<div class="imm-tp-pane" data-title="' . esc_attr( $item['label'] ) . '">' . $this->pane( $item, $children, ! $first && $this->hybrid() ) . '</div>';
			$first = false;
			++$n;
		}
		if ( ! $n && ! $rail ) {
			return '<div class="imm-vp"><ul class="imm-level imm-root" role="list">' . $this->items( $items ) . '</ul></div>';
		}
		return '<div class="imm-tp' . ( $tabs ? ' imm-tabs' : '' ) . '"><ul class="imm-tp-rail" role="list">' . $rail . '</ul><div class="imm-tp-panes">' . $panes . '</div></div>';
	}

	/**
	 * Los encabezados de sección no tienen sentido en el rail: sus hijos suben de nivel.
	 *
	 * @param list<array<string, mixed>> $items
	 * @return list<array<string, mixed>>
	 */
	private function flatten_headings( array $items ): array {
		$out = array();
		foreach ( $items as $item ) {
			if ( 'heading' === $item['type'] ) {
				foreach ( $this->flatten_headings( $item['children'] ) as $child ) {
					$out[] = $child;
				}
				continue;
			}
			$out[] = $item;
		}
		return $out;
	}

	/**
	 * @param array<string, mixed>       $item
	 * @param list<array<string, mixed>> $children
	 */
	private function pane( array $item, array $children, bool $defer = false ): string {
		$html = '';
		if ( '' !== $item['url'] ) {
			$html .= '<a class="imm-tp-all" href="' . esc_url( $item['url'] ) . '"' . $this->link_attrs( $item ) . '>'
				. esc_html( $this->profile['drawer']['view_all_label'] . ' ' . $item['label'] ) . $this->icons->use( 'chevron-right' ) . '</a>';
		}
		$loose    = array();
		$sections = '';
		foreach ( $children as $child ) {
			$grand = array_values( array_filter( $child['children'], fn( $c ) => $this->visible( $c ) && 'link' === $c['type'] ) );
			if ( ! $grand ) {
				$loose[] = $child;
				continue;
			}
			$title     = '' !== $child['url']
				? '<a href="' . esc_url( $child['url'] ) . '"' . $this->link_attrs( $child ) . '>' . esc_html( $child['label'] ) . $this->icons->use( 'chevron-right' ) . '</a>'
				: esc_html( $child['label'] );
			$sections .= '<section class="imm-tp-sec"><p class="imm-tp-h">' . $title . '</p>' . $this->tiles( $grand ) . '</section>';
		}
		$body = ( $loose ? '<section class="imm-tp-sec">' . $this->tiles( $loose ) . '</section>' : '' ) . $sections;
		return $html . ( $defer ? '<template class="imm-tpl">' . $body . '</template>' : $body );
	}

	/** @param list<array<string, mixed>> $items */
	private function tiles( array $items ): string {
		$html = '<ul class="imm-tp-grid" role="list">';
		foreach ( $items as $item ) {
			if ( '' !== $item['image']['url'] ) {
				$media = '<img class="imm-tp-img" data-src="' . esc_url( $item['image']['url'] ) . '" alt="" width="64" height="64" decoding="async">';
			} elseif ( '' !== $item['icon'] ) {
				$media = '<span class="imm-tp-ph">' . $this->icons->use( $item['icon'] ) . '</span>';
			} else {
				$media = '<span class="imm-tp-ph" aria-hidden="true">' . esc_html( mb_strtoupper( mb_substr( $item['label'], 0, 1 ) ) ) . '</span>';
			}
			$badge = '' !== $item['badge']['text'] ? '<span class="imm-badge imm-badge--' . esc_attr( $item['badge']['style'] ) . '">' . esc_html( $item['badge']['text'] ) . '</span>' : '';
			$html .= '<li><a class="imm-tile" href="' . esc_url( $item['url'] ) . '"' . $this->link_attrs( $item ) . '>' . $media . $badge . '<span class="imm-tile-l">' . esc_html( $item['label'] ) . '</span></a></li>';
		}
		return $html . '</ul>';
	}

	/** @param array<string, mixed> $item */
	private function item_inner( array $item ): string {
		$html = '';
		if ( '' !== $item['image']['url'] ) {
			// data-src: la imagen no se descarga hasta que el nivel se muestra.
			$html .= '<img class="imm-img" data-src="' . esc_url( $item['image']['url'] ) . '" alt="" width="32" height="32" decoding="async">';
		} elseif ( '' !== $item['icon'] ) {
			$html .= $this->icons->use( $item['icon'] );
		}
		$html .= '<span class="imm-t">' . esc_html( $item['label'] );
		if ( '' !== $item['description'] ) {
			$html .= '<small>' . esc_html( $item['description'] ) . '</small>';
		}
		$html .= '</span>';
		if ( '' !== $item['badge']['text'] ) {
			$html .= '<span class="imm-badge imm-badge--' . esc_attr( $item['badge']['style'] ) . '">' . esc_html( $item['badge']['text'] ) . '</span>';
		}
		return $html;
	}

	/** @param array<string, mixed> $item */
	private function link_attrs( array $item ): string {
		$rel = trim( (string) $item['rel'] );
		$out = '';
		if ( '_blank' === $item['target'] ) {
			$out .= ' target="_blank"';
			$rel  = trim( $rel . ' noopener' );
		}
		if ( '' !== $rel ) {
			$out .= ' rel="' . esc_attr( implode( ' ', array_unique( explode( ' ', $rel ) ) ) ) . '"';
		}
		$this->labels[ (string) $item['id'] ] = (string) $item['label'];
		return $out . ' data-imm-id="' . esc_attr( $item['id'] ) . '"';
	}

	// ── Buscador ────────────────────────────────────────────────────────────────────────────────

	private function search(): string {
		$s         = $this->profile['search'];
		$post_type = $this->site['search_post_type'] ?? '';
		$hidden    = '' !== $post_type ? '<input type="hidden" name="post_type" value="' . esc_attr( $post_type ) . '">' : '';

		$html  = '<dialog id="imm-search" class="imm-search" popover aria-label="' . esc_attr( $this->s( 'Buscar' ) ) . '"' . ( $s['recent'] ? ' data-recent="1"' : '' ) . $this->cfg_attr() . '>';
		$html .= '<form class="imm-s-form" role="search" method="get" action="' . esc_url( $this->site['home_url'] ) . '">';
		$html .= '<button type="button" class="imm-s-back" popovertarget="imm-search" popovertargetaction="hide" aria-label="' . esc_attr( $this->s( 'Cerrar búsqueda' ) ) . '" data-imm-close>' . $this->icons->use( 'arrow-left' ) . '</button>';
		$html .= '<input class="imm-s-input" type="search" name="s" placeholder="' . esc_attr( $s['placeholder'] ) . '" aria-label="' . esc_attr( $s['placeholder'] ) . '" autocomplete="off" enterkeyhint="search" autofocus>' . $hidden;
		$html .= '<button type="submit" class="imm-s-go" aria-label="' . esc_attr( $this->s( 'Buscar' ) ) . '">' . $this->icons->use( 'search' ) . '</button>';
		$html .= '</form><div class="imm-s-body">';
		if ( $s['recent'] ) {
			$html .= '<section class="imm-s-sec imm-s-recent" hidden><p class="imm-s-h">' . esc_html( $this->s( 'Búsquedas recientes' ) ) . '</p><ul class="imm-chips" role="list"></ul></section>';
		}
		if ( $s['popular'] ) {
			$html .= '<section class="imm-s-sec"><p class="imm-s-h">' . esc_html( $this->s( 'Populares' ) ) . '</p><ul class="imm-chips" role="list">';
			foreach ( $s['popular'] as $term ) {
				$args = array( 's' => $term );
				if ( '' !== $post_type ) {
					$args['post_type'] = $post_type;
				}
				$html .= '<li><a href="' . esc_url( add_query_arg( $args, $this->site['home_url'] ) ) . '">' . $this->icons->use( 'trending-up' ) . esc_html( $term ) . '</a></li>';
			}
			$html .= '</ul></section>';
		}
		$html .= '</div></dialog>';
		return $html;
	}

	// ── Barra inferior ──────────────────────────────────────────────────────────────────────────

	private function bottom_bar(): string {
		$b     = $this->profile['bottom_bar'];
		$class = 'imm-bbar imm-bb--' . $b['shape'] . ' imm-bb-ind--' . $b['indicator'] . ' imm-bb-st--' . $b['style'] . ( $b['blur'] ? ' imm-bb--blur' : '' );
		$html  = '<nav class="' . esc_attr( $class ) . '" aria-label="' . esc_attr( $this->s( 'Navegación inferior' ) ) . '"' . ( $b['hide_on_scroll'] ? ' data-hide-scroll' : '' ) . $this->cfg_attr() . '><ul role="list">';
		foreach ( $b['items'] as $item ) {
			$html .= '<li' . ( $item['prominent'] ? ' class="imm-bb-main"' : '' ) . '>' . $this->bottom_item( $item ) . '</li>';
		}
		return $html . '</ul></nav>';
	}

	/** @param array<string, mixed> $item */
	private function bottom_item( array $item ): string {
		$inner = '<span class="imm-bb-ic">' . $this->icons->use( $item['icon'] ) . $this->bottom_badge( $item ) . '</span><span class="imm-bb-l">' . esc_html( $item['label'] ) . '</span>';
		$attrs = ' class="imm-bb-it" data-imm-id="' . esc_attr( $item['id'] ) . '"';
		$this->labels[ (string) $item['id'] ] = (string) $item['label'];

		switch ( $item['action'] ) {
			case 'drawer':
				if ( ! $this->profile['drawer']['enabled'] ) {
					return '';
				}
				return '<button type="button"' . $attrs . ' popovertarget="imm-drawer" aria-controls="imm-drawer" aria-expanded="false" data-imm-open>' . $inner . '</button>';
			case 'search':
				return '<button type="button"' . $attrs . ' popovertarget="imm-search" data-imm-search>' . $inner . '</button>';
			case 'top':
				return '<a' . $attrs . ' href="#" data-imm-top>' . $inner . '</a>';
			case 'cart':
				$url = (string) ( $this->site['cart_url'] ?? '' );
				break;
			case 'account':
				$url = (string) ( $this->site['account_url'] ?? '' );
				break;
			case 'whatsapp':
				$url = self::whatsapp_url( (string) $item['url'], '' );
				return '<a' . $attrs . ' href="' . esc_url( $url ) . '" target="_blank" rel="noopener">' . $inner . '</a>';
			case 'phone':
				return '<a' . $attrs . ' href="' . esc_url( 'tel:' . $item['url'], array( 'tel' ) ) . '">' . $inner . '</a>';
			default:
				$url = \ImaginaMenu\Sources\SourceResolver::absolute( (string) $item['url'] );
		}
		if ( '' === $url ) {
			$url = $this->site['home_url'];
		}
		return '<a' . $attrs . ' href="' . esc_url( $url ) . '">' . $inner . '</a>';
	}

	/** @param array<string, mixed> $item */
	private function bottom_badge( array $item ): string {
		if ( 'cart' === $item['badge'] || ( 'cart' === $item['action'] && 'none' !== $item['badge'] ) ) {
			return '<span class="imm-badge imm-bb-badge" data-imm-count="cart" hidden></span>';
		}
		if ( 'custom' === $item['badge'] && '' !== $item['badge_text'] ) {
			return '<span class="imm-badge imm-bb-badge">' . esc_html( $item['badge_text'] ) . '</span>';
		}
		return '';
	}

	public static function whatsapp_url( string $number, string $message ): string {
		$number = preg_replace( '/[^0-9]/', '', $number ) ?? '';
		$url    = 'https://wa.me/' . $number;
		return '' !== $message ? $url . '?text=' . rawurlencode( $message ) : $url;
	}

	/** @param array<string, string> $attrs */
	private static function attrs( array $attrs ): string {
		$out = '';
		foreach ( $attrs as $key => $value ) {
			$out .= ' ' . $key . '="' . esc_attr( $value ) . '"';
		}
		return $out;
	}
}
