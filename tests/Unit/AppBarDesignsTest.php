<?php
declare(strict_types=1);

namespace ImaginaMenu\Tests\Unit;

use ImaginaMenu\Compiler\CssBuilder;
use ImaginaMenu\Compiler\Renderer;
use ImaginaMenu\Model\Normalizer;
use PHPUnit\Framework\TestCase;

/**
 * v0.5.8: diseños de la barra superior, CSS crítico con solo las variantes usadas y el buscador
 * que queda al bajar con margen arriba.
 */
final class AppBarDesignsTest extends TestCase {

	private static function profile( array $app_bar = array(), array $extra = array() ): array {
		return Normalizer::profile( array_merge( array( 'app_bar' => array_merge( array( 'enabled' => true ), $app_bar ) ), $extra ) );
	}

	private static function css( array $profile ): string {
		return CssBuilder::build( $profile, Normalizer::settings( array() ) )['critical'];
	}

	private static function bar( array $profile ): string {
		$site = array(
			'name'             => 'Tienda',
			'logo'             => '',
			'home_url'         => 'https://tienda.test/',
			'account_url'      => 'https://tienda.test/mi-cuenta/',
			'cart_url'         => 'https://tienda.test/carrito/',
			'search_post_type' => 'product',
			'breakpoint'       => 1024,
		);
		return ( new Renderer( $profile, $site ) )->render( Normalizer::menu( array( 'items' => array() ) )['items'] )['appbar'];
	}

	private static function dist( string $file ): string {
		return trim( (string) file_get_contents( dirname( __DIR__, 2 ) . '/assets/dist/' . $file ) );
	}

	public function test_defaults_and_invalid_values(): void {
		$ab = self::profile()['app_bar'];
		$this->assertSame( array( 'stacked', 'flat', 'pill', false ), array( $ab['layout'], $ab['shape'], $ab['field'], $ab['glass'] ) );
		$bad = self::profile( array( 'layout' => 'grid', 'shape' => 'star', 'field' => '<x>' ) )['app_bar'];
		$this->assertSame( array( 'stacked', 'flat', 'pill' ), array( $bad['layout'], $bad['shape'], $bad['field'] ) );
	}

	public function test_classic_design_adds_nothing(): void {
		$css = self::css( self::profile() );
		$this->assertStringContainsString( self::dist( 'appbar.css' ), $css );
		foreach ( array( 'shape-curved', 'shape-floating', 'shape-line', 'field-rounded', 'field-soft', 'glass', 'inline', 'center', 'cta' ) as $file ) {
			$this->assertStringNotContainsString( self::dist( 'appbar/' . $file . '.css' ), $css, $file );
		}
	}

	public function test_each_design_brings_only_its_css(): void {
		$css = self::css( self::profile( array( 'shape' => 'floating', 'field' => 'soft', 'glass' => true ) ) );
		$this->assertStringContainsString( self::dist( 'appbar/shape-floating.css' ), $css );
		$this->assertStringContainsString( self::dist( 'appbar/field-soft.css' ), $css );
		$this->assertStringContainsString( self::dist( 'appbar/glass.css' ), $css );
		$this->assertStringNotContainsString( self::dist( 'appbar/shape-curved.css' ), $css );
		$this->assertStringContainsString( 'body{padding-top:calc(118px', $css, 'Isla: 8 px arriba y abajo de más' );

		// Sin buscador, el estilo del campo no hace falta.
		$this->assertStringNotContainsString( self::dist( 'appbar/field-rounded.css' ), self::css( self::profile( array( 'field' => 'rounded', 'search' => false ) ) ) );
	}

	public function test_inline_layout_puts_the_field_in_the_row(): void {
		$profile = self::profile( array( 'layout' => 'inline', 'logo_align' => 'center' ) );
		$bar     = self::bar( $profile );
		$this->assertStringStartsWith( '<div class="imm-appbar imm-ab-inline"', $bar, 'Sin «keep» (no hay fila que esconder) ni logo centrado' );
		$this->assertStringContainsString( 'class="imm-ab-field"', substr( $bar, 0, (int) strpos( $bar, 'imm-ab-btn', (int) strpos( $bar, 'imm-ab-logo' ) ) ), 'El campo va entre el logo y los botones' );
		$this->assertStringNotContainsString( 'imm-ab-sp', $bar );

		$css = self::css( $profile );
		$this->assertStringContainsString( self::dist( 'appbar/inline.css' ), $css );
		$this->assertStringNotContainsString( self::dist( 'appbar/center.css' ), $css );
		$this->assertStringContainsString( 'body{padding-top:calc(52px', $css, 'Una fila: 52 px' );

		// Sin buscador, la distribución no cambia nada.
		$this->assertStringContainsString( 'imm-ab-sp', self::bar( self::profile( array( 'layout' => 'inline', 'search' => false ) ) ) );
	}

	public function test_search_keeps_a_margin_when_scrolling_down(): void {
		$css = self::dist( 'appbar.css' );
		$this->assertStringContainsString( '.imm-ab-keep.imm-hidden{transform:translateY(-44px)}', $css, 'Quedan 8 px de barra sobre el campo' );
		$this->assertStringContainsString( '.imm-ab-keep.imm-hidden .imm-ab-row{visibility:hidden}', $css, 'La fila no asoma bajo la barra de estado' );
		$this->assertStringContainsString( 'imm-ab-keep', self::bar( self::profile() ) );
	}

	public function test_bottom_bar_and_fab_css_only_as_used(): void {
		$none = self::css( self::profile( array( 'enabled' => false ), array( 'bottom_bar' => array( 'enabled' => false ) ) ) );
		$this->assertStringNotContainsString( self::dist( 'bbar.css' ), $none, 'Sin barra inferior, nada de su CSS' );
		$this->assertStringNotContainsString( 'imm-bb-ind', $none );
		$this->assertStringContainsString( self::dist( 'fab/bottom-left.css' ), $none );
		$this->assertStringNotContainsString( self::dist( 'fab/top-right.css' ), $none );

		$bar = array(
			'enabled'   => true,
			'indicator' => 'pill',
			'style'     => 'labels',
			'items'     => array(
				array( 'action' => 'link', 'label' => 'Inicio', 'url' => '/' ),
				array( 'action' => 'drawer', 'label' => 'Menú', 'prominent' => true ),
			),
		);
		$css = self::css( self::profile( array( 'enabled' => false ), array( 'bottom_bar' => $bar ) ) );
		$this->assertStringContainsString( self::dist( 'bbar.css' ), $css );
		$this->assertStringContainsString( self::dist( 'bbar/ind-pill.css' ), $css );
		$this->assertStringContainsString( self::dist( 'bbar/main.css' ), $css );
		foreach ( array( 'ind-line', 'ind-dot', 'labels-hidden', 'floating', 'blur' ) as $file ) {
			$this->assertStringNotContainsString( self::dist( 'bbar/' . $file . '.css' ), $css, $file );
		}
	}
}
