<?php
declare(strict_types=1);

namespace ImaginaMenu\Tests\Unit;

use ImaginaMenu\Compiler\CssBuilder;
use ImaginaMenu\Compiler\Renderer;
use ImaginaMenu\Integrations\SmartSearch;
use ImaginaMenu\Model\Defaults;
use ImaginaMenu\Model\Normalizer;
use PHPUnit\Framework\TestCase;

/**
 * v0.4: «Ver todo» al final, cuenta sin flecha, escritorio (panel y cascada) e Imagina Search.
 */
final class DesktopAndSearchTest extends TestCase {

	private const CATEGORY = array(
		'id'       => 'cel',
		'label'    => 'Celulares',
		'url'      => 'https://tienda.test/cel/',
		'children' => array(
			array( 'label' => 'Apple', 'url' => 'https://tienda.test/apple/' ),
			array( 'label' => 'Samsung', 'url' => 'https://tienda.test/samsung/' ),
		),
	);

	/** @return array<string, string> */
	private function render( array $profile, array $items = array( self::CATEGORY ), array $extra = array() ): array {
		$site = array(
			'name'             => 'Tienda',
			'logo'             => '',
			'home_url'         => 'https://tienda.test/',
			'account_url'      => 'https://tienda.test/mi-cuenta/',
			'cart_url'         => '',
			'search_post_type' => 'product',
			'breakpoint'       => 1024,
		);
		$menu = Normalizer::menu( array( 'items' => $items ) );
		return ( new Renderer( Normalizer::profile( $profile ), $site + $extra ) )->render( $menu['items'] );
	}

	public function test_view_all_goes_last_by_default(): void {
		$html = $this->render( array() )['drawer_guest'];
		$this->assertMatchesRegularExpression( '#Samsung</span></a></li><li class="imm-it imm-all imm-end"><a class="imm-a" href="https://tienda.test/cel/"[^>]*><span class="imm-t">Ver todo Celulares</span></a></li></ul>#', $html );
	}

	public function test_view_all_can_go_first_and_use_a_placeholder(): void {
		$html = $this->render( array( 'drawer' => array( 'view_all_position' => 'top', 'view_all_label' => 'Todo en %s' ) ) )['drawer_guest'];
		$this->assertMatchesRegularExpression( '#<ul class="imm-level"[^>]*><li class="imm-it imm-all"><a[^>]*><span class="imm-t">Todo en Celulares</span>#', $html );
		$this->assertStringNotContainsString( 'imm-end', $html );
	}

	public function test_no_view_all_for_anchor_parents(): void {
		$item        = self::CATEGORY;
		$item['url'] = '#';
		$this->assertStringNotContainsString( 'imm-all', $this->render( array(), array( $item ) )['drawer_guest'] );
	}

	public function test_view_all_stays_last_with_deferred_levels(): void {
		$deep = self::CATEGORY;
		$deep['children'][0]['children'] = array( array( 'label' => 'iPhone 16', 'url' => 'https://tienda.test/i16/' ) );
		$root = array( 'id' => 'tec', 'label' => 'Tecnología', 'url' => 'https://tienda.test/tec/', 'children' => array( $deep ) );
		$html = $this->render( array(), array( $root ), array( 'hybrid' => true ) )['drawer_guest'];
		// El nivel diferido deja «Ver todo» en el HTML (sin JS) y el resto en <template> (fill() lo inserta antes).
		$this->assertMatchesRegularExpression( '#<li class="imm-it imm-all imm-end">.*?Ver todo Celulares.*?</ul><template class="imm-tpl">#s', $html );
	}

	public function test_account_block_has_no_arrow(): void {
		$html = $this->render( array() )['drawer_guest'];
		$this->assertMatchesRegularExpression( '#<a class="imm-account"[^>]*>.*?</a>#s', $html );
		preg_match( '#<a class="imm-account"[^>]*>.*?</a>#s', $html, $m );
		$this->assertStringNotContainsString( 'imm-chev', $m[0] );
	}

	public function test_desktop_cascade_marks_the_drawer(): void {
		$html = $this->render( array( 'desktop' => array( 'enabled' => true, 'layout' => 'cascade', 'selector' => '.imm-open > a' ) ) )['drawer_guest'];
		$this->assertStringContainsString( 'imm-casc', $html );
		$this->assertStringContainsString( 'data-desk="(min-width:1025px)"', $html );
		$this->assertStringContainsString( 'data-trigger=".imm-open &gt; a"', $html );

		$off = $this->render( array( 'desktop' => array( 'enabled' => false, 'layout' => 'cascade' ) ) )['drawer_guest'];
		$this->assertStringNotContainsString( 'imm-casc', $off );
		$this->assertStringNotContainsString( 'data-desk', $off );
	}

	public function test_cascade_needs_slide_mode(): void {
		$html = $this->render( array( 'drawer' => array( 'submenu_mode' => 'accordion' ), 'desktop' => array( 'enabled' => true, 'layout' => 'cascade' ) ) )['drawer_guest'];
		$this->assertStringNotContainsString( 'imm-casc', $html );
	}

	public function test_desktop_only_fab_when_the_bar_opens_the_drawer(): void {
		$bar = array(
			'enabled' => true,
			'items'   => array( array_merge( Defaults::bottom_item(), array( 'label' => 'Menú', 'action' => 'drawer', 'icon' => 'menu' ) ) ),
		);
		$this->assertSame( '', $this->render( array( 'bottom_bar' => $bar ) )['fab'] );
		$fab = $this->render( array( 'bottom_bar' => $bar, 'desktop' => array( 'enabled' => true, 'floating' => true ) ) )['fab'];
		$this->assertStringContainsString( 'imm-only-desktop', $fab );
	}

	public function test_desktop_css(): void {
		$settings = Normalizer::settings( array() );
		$base     = CssBuilder::build( Normalizer::profile( array() ), $settings );
		$this->assertStringContainsString( '@media (min-width:1025px){.imm-fab,.imm-bbar{display:none!important}}', $base['critical'] );
		$this->assertStringNotContainsString( 'imm-casc', $base['full'] );

		$desk = CssBuilder::build( Normalizer::profile( array( 'desktop' => array( 'enabled' => true, 'floating' => true, 'layout' => 'cascade', 'width' => 360 ) ) ), $settings );
		$this->assertStringContainsString( '@media (min-width:1025px){.imm-bbar{display:none!important}}', $desk['critical'] );
		$this->assertStringContainsString( '--imm-mw:360px!important', $desk['full'] );
		$this->assertStringContainsString( '.imm-js.imm-casc', $desk['full'] );
	}

	public function test_normalizer_limits_desktop_values(): void {
		$p = Normalizer::profile( array( 'desktop' => array( 'layout' => 'mega', 'width' => 5000, 'selector' => 'a{}</style>' ) ) );
		$this->assertSame( 'panel', $p['desktop']['layout'] );
		$this->assertSame( 640, $p['desktop']['width'] );
		$this->assertStringNotContainsString( '{', $p['desktop']['selector'] );
		$this->assertStringNotContainsString( '<', $p['desktop']['selector'] );
		$this->assertSame( 'auto', Normalizer::profile( array( 'search' => array( 'provider' => 'x' ) ) )['search']['provider'] );
	}

	public function test_search_markers_fall_back_to_the_native_form(): void {
		$search = $this->render( array() )['search'];
		$this->assertStringContainsString( SmartSearch::FIELD, $search );
		// Sin Imagina Search (o con «buscador propio»): el formulario queda intacto y sin marcadores.
		foreach ( array( 'auto', 'native' ) as $provider ) {
			$html = SmartSearch::apply( $search, $provider );
			$this->assertStringNotContainsString( '<!--imm:', $html );
			$this->assertStringNotContainsString( '<!--/imm:', $html );
			$this->assertStringContainsString( '<form class="imm-s-form" role="search"', $html );
			$this->assertStringContainsString( 'class="imm-s-input"', $html );
		}
	}

	/**
	 * Con Imagina Search activo, su widget sustituye al campo propio (un <div>: sin formularios anidados).
	 *
	 * @runInSeparateProcess
	 * @preserveGlobalState disabled
	 */
	public function test_smart_search_widget_replaces_the_field(): void {
		require_once __DIR__ . '/../bootstrap.php';
		define( 'WSS_VERSION', '6.36.0' );
		foreach ( array( 'get_option' => 'return $b;', 'add_filter' => 'return true;', 'remove_filter' => 'return true;' ) as $fn => $body ) {
			if ( ! function_exists( $fn ) ) {
				eval( "function {$fn}( \$a = null, \$b = null ) { {$body} }" ); // phpcs:ignore
			}
		}
		eval( 'class WSS_Frontend { public function get_search_widget_html( $a = array() ) { return \'<div class="wss-search-wrapper wss-layout-\' . $a["layout"] . \'"><input class="wss-search-input" placeholder="\' . $a["placeholder"] . \'"></div>\'; } }' ); // phpcs:ignore
		$search = $this->render( array( 'search' => array( 'placeholder' => 'Busca aquí' ) ) )['search'];
		$html   = SmartSearch::apply( $search, 'auto' );
		$this->assertStringContainsString( '<div class="imm-s-form imm-s-wss"><button type="button" class="imm-s-back"', $html );
		$this->assertStringContainsString( 'wss-layout-standard', $html );
		$this->assertStringContainsString( 'placeholder="Busca aquí"', $html );
		$this->assertStringNotContainsString( 'class="imm-s-input"', $html );
		$this->assertStringNotContainsString( '<form', $html );
		$this->assertStringContainsString( '</div><div class="imm-s-body">', $html );
		// «Buscador propio» ignora Imagina Search aunque esté activo.
		$this->assertStringContainsString( 'class="imm-s-input"', SmartSearch::apply( $search, 'native' ) );
	}
}
