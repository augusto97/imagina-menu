<?php
declare(strict_types=1);

namespace ImaginaMenu\Tests\Unit;

use ImaginaMenu\Model\Normalizer;
use PHPUnit\Framework\TestCase;

final class NormalizerTest extends TestCase {

	public function test_unknown_keys_are_dropped_and_types_coerced(): void {
		$p = Normalizer::profile(
			array(
				'evil'   => 'x',
				'drawer' => array(
					'side'      => 'diagonal',
					'width'     => '999',
					'enabled'   => 'false',
					'submenu_mode' => 'accordion',
				),
			)
		);
		$this->assertArrayNotHasKey( 'evil', $p );
		$this->assertSame( 'left', $p['drawer']['side'] );
		$this->assertSame( 100, $p['drawer']['width'] );
		$this->assertFalse( $p['drawer']['enabled'] );
		$this->assertSame( 'accordion', $p['drawer']['submenu_mode'] );
	}

	public function test_urls_reject_javascript_scheme(): void {
		$this->assertSame( '', Normalizer::url( 'javascript:alert(1)' ) );
		$this->assertSame( '/tienda/', Normalizer::url( '/tienda/' ) );
		$this->assertSame( 'https://evil.test/x', Normalizer::url( '//evil.test/x' ) );
		$this->assertSame( '#topscript', Normalizer::url( '#top"><script>' ) );
	}

	public function test_selector_cannot_escape_css_rule(): void {
		$this->assertSame( '.menu-toggle body', Normalizer::selector( '.menu-toggle} body{' ) );
		$this->assertStringNotContainsString( '<', Normalizer::selector( '</style><script>' ) );
	}

	public function test_custom_css_cannot_close_style_tag(): void {
		$css = Normalizer::css( 'a{color:red}</style><script>alert(1)</script>@import url(x.css);' );
		$this->assertStringNotContainsString( '</style', $css );
		$this->assertStringNotContainsString( '<', $css );
		$this->assertStringNotContainsString( '@import', $css );
	}

	public function test_tokens_only_accept_hex_colors(): void {
		$p = Normalizer::profile( array( 'design' => array( 'preset' => 'minimal', 'tokens' => array( 'accent' => 'red;}body{display:none', 'radius' => 500 ) ) ) );
		$this->assertMatchesRegularExpression( '/^#[0-9a-f]{6}$/', $p['design']['tokens']['accent'] );
		$this->assertSame( 32, $p['design']['tokens']['radius'] );
		$this->assertSame( 'minimal', $p['design']['preset'] );
	}

	public function test_menu_items_are_limited_and_cleaned(): void {
		$menu = Normalizer::menu(
			array(
				'items' => array(
					array(
						'label'    => '<b>Hola</b>',
						'icon'     => '../../etc',
						'type'     => 'link',
						'children' => array( array( 'label' => 'Hijo', 'type' => 'divider', 'children' => array( array( 'label' => 'no' ) ) ) ),
					),
				),
			)
		);
		$item = $menu['items'][0];
		$this->assertSame( 'Hola', $item['label'] );
		$this->assertSame( '', $item['icon'] );
		$this->assertMatchesRegularExpression( '/^i_[a-f0-9]{8}$/', $item['id'] );
		$this->assertSame( array(), $item['children'][0]['children'], 'Un divisor no tiene hijos' );
	}

	public function test_bottom_bar_is_capped(): void {
		$items = array_fill( 0, 10, array( 'action' => 'link', 'label' => 'x', 'icon' => 'house' ) );
		$p     = Normalizer::profile( array( 'bottom_bar' => array( 'items' => $items ) ) );
		$this->assertCount( Normalizer::MAX_BOTTOM, $p['bottom_bar']['items'] );
	}

	public function test_rule_conditions_are_whitelisted(): void {
		$p = Normalizer::profile(
			array(
				'rules' => array(
					'match'      => 'any',
					'conditions' => array(
						array( 'type' => 'term', 'value' => 'Product_Cat<x>', 'ids' => array( '12', 'abc', 12 ), 'not' => 'true' ),
						array( 'type' => 'eval', 'value' => 'phpinfo()' ),
						array( 'type' => 'woo', 'value' => 'nope' ),
					),
				),
			)
		);
		$this->assertSame( 'any', $p['rules']['match'] );
		$this->assertCount( 2, $p['rules']['conditions'] );
		$this->assertSame( 'product_cat', $p['rules']['conditions'][0]['value'] );
		$this->assertSame( array( 12 ), $p['rules']['conditions'][0]['ids'] );
		$this->assertTrue( $p['rules']['conditions'][0]['not'] );
		$this->assertSame( 'any', $p['rules']['conditions'][1]['value'] );
	}

	public function test_menu_by_lang_and_new_modes(): void {
		$p = Normalizer::profile( array( 'drawer' => array( 'submenu_mode' => 'tabs', 'menu_by_lang' => array( 'EN' => '5', 'x' => 0, '<b>' => 3 ) ) ) );
		$this->assertSame( 'tabs', $p['drawer']['submenu_mode'] );
		$this->assertSame( array( 'en' => 5, 'b' => 3 ), $p['drawer']['menu_by_lang'] );
		$s = Normalizer::settings( array( 'html_depth' => 'hybrid', 'analytics' => array( 'enabled' => '1', 'sample' => 500 ) ) );
		$this->assertSame( 'hybrid', $s['html_depth'] );
		$this->assertTrue( $s['analytics']['enabled'] );
		$this->assertSame( 100, $s['analytics']['sample'] );
	}
}
