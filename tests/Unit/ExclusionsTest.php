<?php
declare(strict_types=1);

namespace ImaginaMenu\Tests\Unit;

use ImaginaMenu\Compiler\Compiler;
use ImaginaMenu\Compiler\CssBuilder;
use ImaginaMenu\Model\Normalizer;
use PHPUnit\Framework\TestCase;

/**
 * v0.5.6: dónde no se muestra el menú (páginas, URL, plantillas en blanco e iframes de otro sitio).
 */
final class ExclusionsTest extends TestCase {

	/** @return array{ids: array<int, true>, urls: list<string>, blank: bool, iframes: bool} */
	private static function compiled( array $exclude ): array {
		$settings = Normalizer::settings( array( 'exclude' => $exclude ) );
		$method   = new \ReflectionMethod( Compiler::class, 'exclusions' );
		return $method->invoke( null, $settings['exclude'] );
	}

	private static function hits( array $regexes, string $path ): bool {
		foreach ( $regexes as $regex ) {
			if ( preg_match( $regex, $path ) ) {
				return true;
			}
		}
		return false;
	}

	public function test_defaults_exclude_blank_templates_and_foreign_iframes(): void {
		$ex = Normalizer::settings( array() )['exclude'];
		$this->assertSame( array(), $ex['ids'] );
		$this->assertSame( '', $ex['urls'] );
		$this->assertTrue( $ex['blank'] );
		$this->assertTrue( $ex['iframes'] );
	}

	public function test_normalizer_cleans_ids_and_urls(): void {
		$ex = Normalizer::settings(
			array(
				'exclude' => array(
					'ids'     => array( '12', 12, -3, 0, 'x', 40 ),
					'urls'    => "  /landing/  \r\nhttps://tienda.test/gracias/?utm=1\n\n<b>/promo</b>\n/landing/\n" . str_repeat( 'a', 201 ),
					'blank'   => false,
					'iframes' => '0',
				),
			)
		)['exclude'];
		$this->assertSame( array( 12, 40 ), $ex['ids'], 'Solo ids positivos, sin repetir' );
		$this->assertSame( "/landing/\n/gracias/\n/promo", $ex['urls'], 'Solo rutas: sin dominio, parámetros, etiquetas ni duplicados' );
		$this->assertFalse( $ex['blank'] );
		$this->assertFalse( $ex['iframes'] );

		$many = Normalizer::settings( array( 'exclude' => array( 'urls' => implode( "\n", array_map( static fn( $i ) => '/p' . $i, range( 1, 80 ) ) ) ) ) );
		$this->assertCount( 50, explode( "\n", $many['exclude']['urls'] ), 'Hasta 50 patrones' );
	}

	public function test_compiled_url_patterns(): void {
		$ex = self::compiled( array( 'ids' => array( 7 ), 'urls' => "/landing/\n/promo-*/gracias\n/" ) );
		$this->assertSame( array( 7 => true ), $ex['ids'] );

		$this->assertTrue( self::hits( $ex['urls'], '/landing/' ) );
		$this->assertTrue( self::hits( $ex['urls'], '/landing/black-friday/' ), 'La ruta contiene el texto: también lo de debajo' );
		$this->assertTrue( self::hits( $ex['urls'], '/es/LANDING/' ), 'Sin distinguir mayúsculas' );
		$this->assertTrue( self::hits( $ex['urls'], '/promo-navidad/gracias/' ), '* es comodín' );
		$this->assertTrue( self::hits( $ex['urls'], '/' ), '«/» sola es la portada' );
		$this->assertFalse( self::hits( $ex['urls'], '/tienda/' ), '«/» no excluye todo el sitio' );
		$this->assertFalse( self::hits( $ex['urls'], '/promo-navidad/' ) );

		// Los caracteres especiales del patrón se toman literalmente (sin expresiones regulares del usuario).
		$literal = self::compiled( array( 'urls' => '/a.b(c)/' ) );
		$this->assertTrue( self::hits( $literal['urls'], '/a.b(c)/' ) );
		$this->assertFalse( self::hits( $literal['urls'], '/aXb(c)/' ) );
	}

	public function test_iframe_css_scopes_spacing_and_theme_selectors(): void {
		$profile = Normalizer::profile(
			array(
				'hide_theme_selector' => '.menu-toggle, #mobile-nav',
				'app_bar'             => array(
					'enabled'     => true,
					'hide_header' => '#masthead',
				),
			)
		);

		$on = CssBuilder::build( $profile, Normalizer::settings( array() ) );
		$this->assertStringContainsString( '.imm-framed :is(.imm-fab,.imm-bbar,.imm-toggle,.imm-appbar){display:none!important}', $on['critical'] );
		$this->assertStringContainsString( 'html:not(.imm-framed) :is(#masthead){display:none!important}', $on['critical'], 'La cabecera del tema vuelve a verse en el iframe' );
		$this->assertStringContainsString( 'html:not(.imm-framed) :is(.menu-toggle, #mobile-nav){display:none!important}', $on['critical'] );
		$this->assertStringContainsString( 'html:not(.imm-framed) body{padding-top:', $on['critical'], 'Sin espacio reservado para la barra superior' );
		$this->assertStringContainsString( 'html:not(.imm-framed) body{padding-bottom:', $on['bbar_space'], 'Ni para la inferior' );

		$off = CssBuilder::build( $profile, Normalizer::settings( array( 'exclude' => array( 'iframes' => false ) ) ) );
		$this->assertStringNotContainsString( 'imm-framed', $off['critical'] . $off['bbar_space'], 'Apagado no añade ni un byte' );
		$this->assertStringContainsString( '#masthead{display:none!important}', $off['critical'] );
	}
}
