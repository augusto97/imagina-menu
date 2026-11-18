<?php
declare(strict_types=1);

namespace ImaginaMenu\Tests\Unit;

use ImaginaMenu\Compiler\CssBuilder;
use ImaginaMenu\Compiler\Renderer;
use ImaginaMenu\Core\Schedule;
use ImaginaMenu\Model\Defaults;
use ImaginaMenu\Model\Normalizer;
use PHPUnit\Framework\TestCase;

/**
 * v0.5: campañas programadas, banners, WhatsApp con contexto y horario, barra superior y favoritos.
 * (Sin wp_timezone en las pruebas, las fechas se interpretan en UTC.)
 */
final class CampaignsAndAppBarTest extends TestCase {

	private const NOW = 1795000000; // 2026-11-18 (UTC)

	/** @return array<string, string> */
	private function render( array $profile, array $items = array(), array $extra = array() ): array {
		$site = array(
			'name'             => 'Tienda',
			'logo'             => '',
			'home_url'         => 'https://tienda.test/',
			'account_url'      => 'https://tienda.test/mi-cuenta/',
			'cart_url'         => 'https://tienda.test/carrito/',
			'wishlist_url'     => 'https://tienda.test/favoritos/',
			'search_post_type' => 'product',
			'breakpoint'       => 1024,
			'now'              => self::NOW,
		);
		$menu = Normalizer::menu( array( 'items' => $items ) );
		return ( new Renderer( Normalizer::profile( $profile ), array_merge( $site, $extra ) ) )->render( $menu['items'] );
	}

	private static function at( int $ts ): string {
		return gmdate( 'Y-m-d\TH:i', $ts );
	}

	public function test_schedule_helpers(): void {
		$this->assertSame( '2026-11-27T00:00', Schedule::clean( '2026-11-27T00:00' ) );
		$this->assertSame( '', Schedule::clean( '27/11/2026' ) );
		$this->assertSame( '', Schedule::clean( '2026-13-45T99:99' ) );
		$this->assertSame( gmmktime( 0, 0, 0, 11, 27, 2026 ), Schedule::ts( '2026-11-27T00:00' ) );

		$from = self::at( self::NOW - 60 );
		$to   = self::at( self::NOW + 3600 );
		$this->assertTrue( Schedule::active( array( 'from' => '', 'to' => '' ), self::NOW ) );
		$this->assertTrue( Schedule::active( array( 'from' => $from, 'to' => $to ), self::NOW ) );
		$this->assertFalse( Schedule::active( array( 'from' => $to, 'to' => '' ), self::NOW ), 'Aún no empieza' );
		$this->assertFalse( Schedule::active( array( 'from' => '', 'to' => $from ), self::NOW ), 'Ya terminó' );
		$this->assertCount( 2, Schedule::bounds( array( 'from' => $from, 'to' => $to ) ) );
		$this->assertSame( array(), Schedule::bounds( array( 'from' => '', 'to' => 'x' ) ) );
	}

	public function test_normalizer_keeps_valid_campaign_data_only(): void {
		$p = Normalizer::profile(
			array(
				'rules'  => array(
					'conditions' => array(
						array( 'type' => 'date', 'value' => '2026-11-27T00:00|2026-11-30T23:59' ),
						array( 'type' => 'date', 'value' => 'mañana|' ), // sin fechas válidas: se descarta
					),
				),
				'drawer' => array(
					'banners'  => array(
						array( 'image' => array( 'url' => 'https://cdn.test/a.webp' ), 'url' => '/ofertas/', 'alt' => 'Ofertas', 'from' => 'ayer' ),
						array( 'image' => array( 'url' => 'javascript:alert(1)' ) ),
					),
					'whatsapp' => array( 'hours' => array( 'enabled' => '1', 'days' => array( 9, 1, '2', 1 ), 'from' => '8:00', 'to' => '18:30' ) ),
				),
			)
		);
		$this->assertCount( 1, $p['rules']['conditions'] );
		$this->assertSame( '2026-11-27T00:00|2026-11-30T23:59', $p['rules']['conditions'][0]['value'] );
		$this->assertCount( 1, $p['drawer']['banners'], 'Una imagen sin URL http(s) no entra' );
		$this->assertSame( '', $p['drawer']['banners'][0]['from'] );
		$this->assertSame( array( 1, 2 ), $p['drawer']['whatsapp']['hours']['days'] );
		$this->assertSame( '08:00', $p['drawer']['whatsapp']['hours']['from'], 'Hora mal escrita: la de por defecto' );
		$this->assertSame( '18:30', $p['drawer']['whatsapp']['hours']['to'] );
	}

	public function test_scheduled_items_and_banners_follow_the_clock(): void {
		$later = self::at( self::NOW + 86400 );
		$items = array(
			array( 'label' => 'Hot Sale', 'url' => '/hot/', 'schedule' => array( 'from' => self::at( self::NOW - 60 ), 'to' => '' ) ),
			array( 'label' => 'Black Friday', 'url' => '/bf/', 'schedule' => array( 'from' => $later, 'to' => '' ) ),
		);
		$banners = array(
			array( 'image' => array( 'url' => 'https://cdn.test/now.webp' ), 'url' => '/a/', 'alt' => 'Ahora' ),
			array( 'image' => array( 'url' => 'https://cdn.test/later.webp' ), 'url' => '/b/', 'alt' => 'Luego', 'from' => $later ),
		);
		$html = $this->render( array( 'drawer' => array( 'banners' => $banners ) ), $items )['drawer_guest'];
		$this->assertStringContainsString( 'Hot Sale', $html );
		$this->assertStringNotContainsString( 'Black Friday', $html );
		$this->assertStringContainsString( 'now.webp', $html );
		$this->assertStringNotContainsString( 'later.webp', $html );
		$this->assertStringContainsString( 'loading="lazy"', $html );

		// Al día siguiente (lo que hará el evento de WP-Cron al recompilar).
		$next = $this->render( array( 'drawer' => array( 'banners' => $banners ) ), $items, array( 'now' => self::NOW + 2 * 86400 ) )['drawer_guest'];
		$this->assertStringContainsString( 'Black Friday', $next );
		$this->assertStringContainsString( 'imm-bn-many', $next );
	}

	public function test_whatsapp_context_tokens_and_hours(): void {
		$wa   = array(
			'enabled' => true,
			'number'  => '57 300 123 4567',
			'message' => 'Hola, me interesa {titulo} {url}',
			'hours'   => array( 'enabled' => true, 'days' => array( 1, 2, 3, 4, 5 ), 'from' => '08:00', 'to' => '18:00', 'off_label' => 'Te respondemos mañana' ),
		);
		$html = $this->render( array( 'drawer' => array( 'whatsapp' => $wa ) ) )['drawer_guest'];
		$this->assertStringContainsString( 'https://wa.me/573001234567?text=Hola%2C%20me%20interesa%20' . Renderer::PAGE_TITLE_TOKEN . '%20' . Renderer::PAGE_URL_TOKEN, $html );
		$this->assertStringContainsString( 'data-imm-hours="1,2,3,4,5|08:00|18:00|0"', $html );
		$this->assertStringContainsString( 'data-off="Te respondemos mañana"', $html );
	}

	public function test_app_bar_markup(): void {
		$parts = $this->render( array( 'app_bar' => array( 'enabled' => true ) ) );
		$bar   = $parts['appbar'];
		$this->assertStringStartsWith( '<div class="imm-appbar imm-ab-keep"', $bar );
		$this->assertStringContainsString( 'data-hide-scroll', $bar );
		$this->assertStringContainsString( 'popovertarget="imm-drawer"', $bar );
		$this->assertStringContainsString( 'popovertarget="imm-search"', $bar );
		$this->assertStringContainsString( 'data-imm-count="cart"', $bar );
		// Iconos dibujados en línea (el sprite llega al final del <body>).
		$this->assertStringNotContainsString( '<use', $bar );
		$this->assertStringContainsString( 'viewBox="0 0 24 24"', $bar );
		$this->assertNotSame( '', $parts['search'], 'El campo de la barra necesita el buscador' );

		$plain = $this->render( array( 'app_bar' => array( 'enabled' => true, 'search' => false, 'hide_on_scroll' => 'none' ), 'drawer' => array( 'enabled' => false ) ) )['appbar'];
		$this->assertStringNotContainsString( 'imm-drawer', $plain );
		$this->assertStringNotContainsString( 'imm-ab-search', $plain );
		$this->assertStringNotContainsString( 'data-hide-scroll', $plain );
	}

	public function test_app_bar_css_is_critical_and_mobile_only(): void {
		$settings = Normalizer::settings( array() );
		$off      = CssBuilder::build( Normalizer::profile( array() ), $settings );
		$this->assertStringNotContainsString( 'imm-appbar', $off['critical'] );
		$on = CssBuilder::build( Normalizer::profile( array( 'app_bar' => array( 'enabled' => true ) ) ), $settings );
		$this->assertStringContainsString( 'body{padding-top:calc(102px', $on['critical'] );
		$this->assertStringContainsString( '@media (min-width:1025px){.imm-appbar{display:none!important}}', $on['critical'] );
	}

	public function test_app_bar_custom_colors(): void {
		$settings = Normalizer::settings( array() );
		$profile  = Normalizer::profile(
			array(
				'app_bar' => array(
					'enabled'       => true,
					'custom_colors' => true,
					'colors'        => array( 'bg' => '#FFFFFF', 'bg2' => '#f1f5f9', 'fg' => '#111827', 'search_bg' => 'red;}body{x', 'badge_bg' => '#16a34a' ),
				),
			)
		);
		$this->assertSame( '#ffffff', $profile['app_bar']['colors']['bg'] );
		$this->assertSame( '#ffffff', $profile['app_bar']['colors']['search_bg'], 'Un color no hexadecimal vuelve al de por defecto' );
		$css = CssBuilder::build( $profile, $settings )['critical'];
		$this->assertStringContainsString( '.imm-appbar{--imm-ab-bg:linear-gradient(135deg,#ffffff,#f1f5f9);--imm-ab-ring:#ffffff;--imm-ab-fg:#111827;', $css );
		$this->assertStringContainsString( '--imm-ab-bbg:#16a34a', $css );
		$this->assertStringNotContainsString( 'body{x', $css );

		// Apagados: no se emite nada (la barra usa los colores de la cabecera).
		$profile['app_bar']['custom_colors'] = false;
		$this->assertStringNotContainsString( '.imm-appbar{--imm-ab-bg:', CssBuilder::build( $profile, $settings )['critical'] );
	}

	public function test_app_bar_logo_options_and_theme_header(): void {
		$settings = Normalizer::settings( array() );
		$profile  = Normalizer::profile(
			array(
				'app_bar' => array(
					'enabled'     => true,
					'logo_image'  => array( 'id' => 5, 'url' => 'https://cdn.test/logo-blanco.webp' ),
					'logo_height' => 99,
					'logo_width'  => 200,
					'logo_align'  => 'center',
					'hide_header' => '#masthead{color:red}',
				),
			)
		);
		$this->assertSame( 44, $profile['app_bar']['logo_height'], 'Alto limitado a la fila' );
		$this->assertStringNotContainsString( '{', $profile['app_bar']['hide_header'] );

		$bar = $this->render( $profile )['appbar'];
		$this->assertStringContainsString( 'imm-ab-center', $bar );
		$this->assertStringContainsString( 'src="https://cdn.test/logo-blanco.webp"', $bar );

		$css = CssBuilder::build( $profile, $settings )['critical'];
		$this->assertStringContainsString( '.imm-appbar{--imm-ab-logo-h:44px;--imm-ab-logo-w:200px}', $css );
		// La cabecera del tema se oculta solo en celulares (dentro del @media de la barra).
		$rule = strpos( $css, '{display:none!important}', (int) strpos( $css, '#masthead' ) );
		$this->assertNotFalse( strpos( $css, '#masthead' ) );
		$this->assertGreaterThan( (int) strpos( $css, '@media (max-width:1024px){.imm-appbar{' ), (int) strpos( $css, '#masthead' ) );
		$this->assertLessThan( (int) strpos( $css, '@media (min-width:1025px){.imm-appbar{display:none' ), (int) $rule );
	}

	public function test_wishlist_item_and_badge(): void {
		$bar  = array(
			'enabled' => true,
			'items'   => array( array_merge( Defaults::bottom_item(), array( 'label' => 'Favoritos', 'action' => 'wishlist', 'icon' => 'heart', 'badge' => 'wishlist' ) ) ),
		);
		$html = $this->render( array( 'bottom_bar' => $bar ) )['bbar'];
		$this->assertStringContainsString( 'href="https://tienda.test/favoritos/"', $html );
		$this->assertStringContainsString( 'data-imm-count="wishlist"', $html );
	}
}
