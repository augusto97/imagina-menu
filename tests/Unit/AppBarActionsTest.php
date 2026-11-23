<?php
declare(strict_types=1);

namespace ImaginaMenu\Tests\Unit;

use ImaginaMenu\Compiler\CssBuilder;
use ImaginaMenu\Compiler\Renderer;
use ImaginaMenu\Model\Normalizer;
use PHPUnit\Framework\TestCase;

/**
 * v0.5.7: botones de la derecha de la barra superior configurables (iconos o botón con texto).
 */
final class AppBarActionsTest extends TestCase {

	private const SITE = array(
		'name'             => 'Tienda',
		'logo'             => '',
		'home_url'         => 'https://tienda.test/',
		'account_url'      => 'https://tienda.test/mi-cuenta/',
		'cart_url'         => 'https://tienda.test/carrito/',
		'wishlist_url'     => '',
		'search_post_type' => 'product',
		'breakpoint'       => 1024,
	);

	/** @param list<array<string, mixed>> $actions */
	private static function profile( array $actions, array $app_bar = array() ): array {
		return Normalizer::profile( array( 'app_bar' => array_merge( array( 'enabled' => true, 'actions' => $actions ), $app_bar ) ) );
	}

	/** @return array<string, string> */
	private static function render( array $profile, array $site = array() ): array {
		$menu = Normalizer::menu( array( 'items' => array() ) );
		return ( new Renderer( $profile, array_merge( self::SITE, $site ) ) )->render( $menu['items'] );
	}

	/** Lo que hay a la derecha del logo. */
	private static function right( array $profile, array $site = array() ): string {
		$bar = self::render( $profile, $site )['appbar'];
		$at  = (int) strpos( $bar, '<span class="imm-ab-sp"></span>' );
		return substr( $bar, $at, (int) strpos( $bar, '</div>', $at ) - $at );
	}

	public function test_defaults_are_account_and_cart(): void {
		$actions = Normalizer::profile( array() )['app_bar']['actions'];
		$this->assertSame( array( 'account', 'cart' ), array_column( $actions, 'action' ) );
		$this->assertSame( array( 'icon', 'icon' ), array_column( $actions, 'style' ) );
	}

	public function test_profiles_from_before_keep_their_switches(): void {
		$only_cart = Normalizer::profile( array( 'app_bar' => array( 'account' => false, 'cart' => true ) ) )['app_bar'];
		$this->assertSame( array( 'cart' ), array_column( $only_cart['actions'], 'action' ) );
		$this->assertArrayNotHasKey( 'account', $only_cart, 'Los interruptores viejos desaparecen al guardar' );

		$none = Normalizer::profile( array( 'app_bar' => array( 'account' => false, 'cart' => false ) ) )['app_bar'];
		$this->assertSame( array(), $none['actions'] );

		// Con la lista nueva, los interruptores viejos no cuentan; una lista vacía es válida.
		$new = Normalizer::profile( array( 'app_bar' => array( 'account' => true, 'actions' => array() ) ) )['app_bar'];
		$this->assertSame( array(), $new['actions'] );
	}

	public function test_normalizer_cleans_actions(): void {
		$actions = self::profile(
			array(
				array( 'action' => 'phone', 'url' => '+57 (300) 123-4567', 'label' => str_repeat( 'x', 40 ) ),
				array( 'action' => 'hack', 'style' => 'huge', 'url' => 'javascript:alert(1)', 'icon' => '<svg>' ),
				array( 'action' => 'whatsapp', 'url' => '57 300 123 4567' ),
				array( 'action' => 'cart' ),
			)
		)['app_bar']['actions'];
		$this->assertCount( 3, $actions, 'Hasta 3' );
		$this->assertSame( '+573001234567', $actions[0]['url'] );
		$this->assertSame( 24, mb_strlen( $actions[0]['label'] ) );
		$this->assertSame( 'link', $actions[1]['action'] );
		$this->assertSame( 'icon', $actions[1]['style'] );
		$this->assertSame( '', $actions[1]['url'] );
		$this->assertSame( '', $actions[1]['icon'] );
		$this->assertSame( '573001234567', $actions[2]['url'] );
		$this->assertCount( 3, array_unique( array_column( $actions, 'id' ) ), 'Cada botón con su id' );
	}

	public function test_icons_buttons_and_destinations(): void {
		$right = self::right(
			self::profile(
				array(
					array( 'action' => 'whatsapp', 'icon' => 'si-whatsapp', 'url' => '573001234567' ),
					array( 'action' => 'phone', 'icon' => 'phone', 'url' => '+573001234567', 'label' => 'Llámanos' ),
					array( 'action' => 'link', 'style' => 'button', 'icon' => '', 'label' => 'Cotizar', 'url' => '/contacto/' ),
				)
			)
		);
		$this->assertStringContainsString( 'href="https://wa.me/573001234567" target="_blank" rel="noopener"', $right );
		$this->assertStringContainsString( 'aria-label="WhatsApp"', $right, 'Icono sin nombre propio: el de la acción' );
		$this->assertStringContainsString( 'fill="currentColor"', $right, 'El icono de marca va dibujado en línea' );
		$this->assertStringContainsString( 'aria-label="Llámanos" href="tel:+573001234567"', $right );
		$this->assertStringContainsString( '<a class="imm-ab-btn imm-ab-cta" href="https://tienda.test/contacto/"><span>Cotizar</span></a>', $right, 'Botón con texto: sin aria-label (el texto ya lo nombra) y sin icono' );
		$this->assertStringNotContainsString( '<use', $right );
	}

	public function test_actions_without_destination_are_skipped(): void {
		$right = self::right(
			self::profile(
				array(
					array( 'action' => 'cart' ),
					array( 'action' => 'whatsapp', 'url' => '' ),
					array( 'action' => 'link', 'url' => '' ),
				)
			),
			array( 'cart_url' => '' )
		);
		$this->assertStringNotContainsString( 'imm-ab-btn', $right, 'Sin WooCommerce, sin número y sin enlace: nada' );

		$wishlist = self::right( self::profile( array( array( 'action' => 'wishlist' ) ) ), array( 'wishlist_url' => 'https://tienda.test/favoritos/' ) );
		$this->assertStringContainsString( 'data-imm-count="wishlist"', $wishlist );
	}

	public function test_search_button_brings_the_search_dialog(): void {
		$parts = self::render( self::profile( array( array( 'action' => 'search' ) ), array( 'search' => false ) ) );
		$this->assertStringContainsString( 'popovertarget="imm-search" data-imm-search', $parts['appbar'] );
		$this->assertStringContainsString( 'aria-label="Buscar"', $parts['appbar'] );
		$this->assertNotSame( '', $parts['search'] ?? '', 'Sin el campo de búsqueda, el botón igual necesita el buscador' );
	}

	public function test_button_and_centered_logo_css_only_when_used(): void {
		$settings = Normalizer::settings( array() );
		$icons    = CssBuilder::build( self::profile( array( array( 'action' => 'account' ) ) ), $settings )['critical'];
		$this->assertStringNotContainsString( 'imm-ab-cta', $icons );
		$this->assertStringNotContainsString( 'imm-ab-center', $icons );

		$profile = self::profile( array( array( 'action' => 'link', 'style' => 'button', 'label' => 'Cotizar', 'url' => '/c/' ) ), array( 'logo_align' => 'center' ) );
		$css     = CssBuilder::build( $profile, $settings )['critical'];
		$this->assertStringContainsString( '.imm-ab-row .imm-ab-cta{', $css );
		$this->assertStringContainsString( '.imm-ab-center a.imm-ab-logo{', $css );

		$custom                              = $profile;
		$custom['app_bar']['custom_colors']  = true;
		$custom['app_bar']['colors']['cta_bg'] = '#16a34a';
		$this->assertStringContainsString( '--imm-ab-cbg:#16a34a;--imm-ab-cfg:#0f172a', CssBuilder::build( $custom, $settings )['critical'] );
	}

	public function test_saved_custom_colors_get_an_inverted_button(): void {
		$colors = Normalizer::profile( array( 'app_bar' => array( 'colors' => array( 'bg' => '#fde68a', 'fg' => '#78350f' ) ) ) )['app_bar']['colors'];
		$this->assertSame( '#78350f', $colors['cta_bg'] );
		$this->assertSame( '#fde68a', $colors['cta_fg'] );
		$kept = Normalizer::profile( array( 'app_bar' => array( 'colors' => array( 'cta_bg' => '#16a34a', 'cta_fg' => '#ffffff' ) ) ) )['app_bar']['colors'];
		$this->assertSame( '#16a34a', $kept['cta_bg'] );
	}
}
