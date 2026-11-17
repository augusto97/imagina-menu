<?php
declare(strict_types=1);

namespace ImaginaMenu\Tests\Unit;

use ImaginaMenu\Compiler\Renderer;
use ImaginaMenu\Model\Defaults;
use ImaginaMenu\Model\Normalizer;
use PHPUnit\Framework\TestCase;

final class RendererTest extends TestCase {

	/** @return array<string, string> */
	private function render( array $profile, array $items ): array {
		$site = array(
			'name'             => 'Tienda',
			'logo'             => '',
			'home_url'         => 'https://tienda.test/',
			'account_url'      => 'https://tienda.test/mi-cuenta/',
			'cart_url'         => 'https://tienda.test/carrito/',
			'search_post_type' => 'product',
		);
		$menu = Normalizer::menu( array( 'items' => $items ) );
		return ( new Renderer( Normalizer::profile( $profile ), $site ) )->render( $menu['items'] );
	}

	public function test_links_are_real_and_escaped(): void {
		$parts = $this->render( array(), array( array( 'label' => 'A "b" <c>', 'url' => 'https://tienda.test/x/' ) ) );
		$html  = $parts['drawer_guest'];
		$this->assertStringContainsString( '<a class="imm-a" href="https://tienda.test/x/"', $html );
		$this->assertStringContainsString( 'A &quot;b&quot;', $html );
		$this->assertStringNotContainsString( '<c>', $html );
		$this->assertStringContainsString( 'popover', $html );
	}

	public function test_submenus_are_details_with_view_all(): void {
		$parts = $this->render(
			array(),
			array(
				array(
					'id'       => 'cel',
					'label'    => 'Celulares',
					'url'      => 'https://tienda.test/cel/',
					'children' => array( array( 'label' => 'Apple', 'url' => 'https://tienda.test/apple/' ) ),
				),
			)
		);
		$html = $parts['drawer_guest'];
		$this->assertStringContainsString( '<details class="imm-sub" id="imm-s-cel">', $html );
		$this->assertStringContainsString( 'Ver todo Celulares', $html );
	}

	public function test_visibility_variants(): void {
		$parts = $this->render(
			array(),
			array(
				array( 'label' => 'Solo socios', 'url' => '/s/', 'visibility' => 'logged_in' ),
				array( 'label' => 'Entrar', 'url' => '/e/', 'visibility' => 'logged_out' ),
			)
		);
		$this->assertStringNotContainsString( 'Solo socios', $parts['drawer_guest'] );
		$this->assertStringContainsString( 'Entrar', $parts['drawer_guest'] );
		$this->assertStringContainsString( 'Solo socios', $parts['drawer_user'] );
		$this->assertStringContainsString( Renderer::NAME_TOKEN, $parts['drawer_user'] );
	}

	public function test_bottom_bar_actions(): void {
		$profile = Defaults::profile();
		$profile['bottom_bar']['enabled'] = true;
		$profile['bottom_bar']['items']   = Defaults::suggested_bottom_items( true );
		$html = $this->render( $profile, array() )['bbar'];
		$this->assertStringContainsString( 'popovertarget="imm-drawer"', $html );
		$this->assertStringContainsString( 'popovertarget="imm-search"', $html );
		$this->assertStringContainsString( 'href="https://tienda.test/carrito/"', $html );
		$this->assertStringContainsString( 'data-imm-count="cart"', $html );
	}

	public function test_whatsapp_url(): void {
		$this->assertSame( 'https://wa.me/573001234567?text=Hola%20%C3%B1', Renderer::whatsapp_url( '+57 300 123 4567', 'Hola ñ' ) );
	}
}
