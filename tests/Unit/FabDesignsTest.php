<?php
declare(strict_types=1);

namespace ImaginaMenu\Tests\Unit;

use ImaginaMenu\Compiler\CssBuilder;
use ImaginaMenu\Compiler\Renderer;
use ImaginaMenu\Model\Normalizer;
use PHPUnit\Framework\TestCase;

/**
 * v0.5.10: diseños del botón flotante (forma, estilo, tamaño y distancia al borde), su CSS solo si
 * se muestra, sin duplicar el botón de la barra superior, y el CSS del botón del shortcode aparte.
 */
final class FabDesignsTest extends TestCase {

	private static function profile( array $input = array() ): array {
		return Normalizer::profile( $input );
	}

	private static function css( array $profile ): string {
		return CssBuilder::build( $profile, Normalizer::settings( array() ) )['critical'];
	}

	private static function dist( string $file ): string {
		return trim( (string) file_get_contents( dirname( __DIR__, 2 ) . '/assets/dist/' . $file ) );
	}

	private static function fab( array $profile ): string {
		$site = array( 'name' => 'T', 'logo' => '', 'home_url' => 'https://t.test/', 'search_post_type' => 'any', 'breakpoint' => 1024 );
		return ( new Renderer( $profile, $site ) )->render( array() )['fab'];
	}

	public function test_defaults_and_invalid_values(): void {
		$t = self::profile()['trigger'];
		$this->assertSame( array( 'circle', 'solid', 52, 16 ), array( $t['shape'], $t['style'], $t['size'], $t['offset'] ) );
		$bad = self::profile( array( 'trigger' => array( 'shape' => 'star', 'style' => 'neon', 'size' => 200 ) ) )['trigger'];
		$this->assertSame( array( 'circle', 'solid', 80 ), array( $bad['shape'], $bad['style'], $bad['size'] ) );
	}

	public function test_which_fab_the_profile_gets(): void {
		$this->assertSame( 'mobile', Renderer::fab_kind( self::profile() ) );
		$this->assertSame( '', Renderer::fab_kind( self::profile( array( 'drawer' => array( 'enabled' => false ) ) ) ) );
		$this->assertSame( 'fallback', Renderer::fab_kind( self::profile( array( 'trigger' => array( 'mode' => 'theme_selector' ) ) ) ) );
		$this->assertSame( '', Renderer::fab_kind( self::profile( array( 'trigger' => array( 'mode' => 'manual' ) ) ) ) );

		// La barra superior ya tiene el botón del menú: en el celular el flotante sobra (en escritorio, no).
		$app = self::profile( array( 'app_bar' => array( 'enabled' => true ) ) );
		$this->assertSame( 'desktop', Renderer::fab_kind( $app ) );
		$this->assertStringContainsString( 'imm-only-desktop', self::fab( $app ) );
		$this->assertSame( '', Renderer::fab_kind( self::profile( array( 'app_bar' => array( 'enabled' => true ), 'trigger' => array( 'mode' => 'theme_selector' ) ) ) ) );

		// La barra inferior lo abre: nada, salvo el de escritorio si se pide.
		$bar = array(
			'bottom_bar' => array(
				'enabled' => true,
				'items'   => array( array( 'action' => 'drawer', 'label' => 'Menú' ) ),
			),
		);
		$this->assertSame( '', Renderer::fab_kind( self::profile( $bar ) ) );
		$this->assertSame( 'desktop', Renderer::fab_kind( self::profile( $bar + array( 'desktop' => array( 'enabled' => true, 'floating' => true ) ) ) ) );
	}

	public function test_fab_css_only_when_shown(): void {
		$this->assertStringContainsString( self::dist( 'fab.css' ), self::css( self::profile() ) );
		$none = self::css( self::profile( array( 'trigger' => array( 'mode' => 'manual' ) ) ) );
		$this->assertStringNotContainsString( self::dist( 'fab.css' ), $none );
		$this->assertStringNotContainsString( 'imm-fab--', $none );
		// El botón del shortcode ya no va en el crítico: va junto al botón.
		$this->assertStringNotContainsString( 'button.imm-toggle{', self::css( self::profile() ) );
		$this->assertStringContainsString( 'button.imm-toggle', CssBuilder::build( self::profile(), Normalizer::settings( array() ) )['toggle'] );
	}

	public function test_shape_style_size_and_offset(): void {
		$plain = self::css( self::profile() );
		$this->assertStringNotContainsString( '--imm-fab-s', str_replace( self::dist( 'fab.css' ), '', $plain ), 'Sin cambios, sin variables' );
		$this->assertStringNotContainsString( self::dist( 'fab/shape-rounded.css' ), $plain );

		$css = self::css( self::profile( array( 'trigger' => array( 'shape' => 'rounded', 'style' => 'glass', 'size' => 44, 'offset' => 24, 'position' => 'top-right' ) ) ) );
		$this->assertStringContainsString( self::dist( 'fab/shape-rounded.css' ), $css );
		$this->assertStringContainsString( self::dist( 'fab/style-glass.css' ), $css );
		$this->assertStringNotContainsString( self::dist( 'fab/style-light.css' ), $css );
		$this->assertStringContainsString( self::dist( 'fab/top-right.css' ), $css );
		$this->assertStringContainsString( '.imm-fab{--imm-fab-s:44px;--imm-fab-o:24px;}', $css );
	}
}
