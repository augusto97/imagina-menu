<?php
declare(strict_types=1);

namespace ImaginaMenu\Tests\Unit;

use ImaginaMenu\Compiler\CssBuilder;
use ImaginaMenu\Model\Presets;
use PHPUnit\Framework\TestCase;

final class CssBuilderTest extends TestCase {

	public function test_only_selected_variants_are_included(): void {
		$css = CssBuilder::style( Presets::style( 'ios' ), Presets::tokens( 'ios' ) );
		$this->assertStringContainsString( 'nth-child(8n+1)', $css, 'Iconos multicolor' );
		$this->assertStringContainsString( 'border-start-start-radius', $css, 'Ítems agrupados' );
		$this->assertStringNotContainsString( 'imm-in', $css, 'Sin entrada escalonada' );
		$this->assertStringNotContainsString( 'backdrop-filter:blur(28px', $css, 'Sin cristal' );
	}

	public function test_glass_includes_floating_and_spring_easing(): void {
		$css = CssBuilder::style( Presets::style( 'midnight' ), Presets::tokens( 'midnight' ) );
		$this->assertStringContainsString( '--imm-m:10px', $css, 'El cristal flota' );
		$this->assertStringContainsString( 'backdrop-filter', $css );
		$this->assertStringContainsString( '--imm-ease-l:linear(', $css );
		$this->assertStringContainsString( '@keyframes imm-in', $css );
	}

	public function test_header_image_url_is_quoted_and_cleaned(): void {
		$style                        = Presets::style( 'marketplace' );
		$style['header']              = 'image';
		$style['header_image']['url'] = 'https://cdn.test/a.jpg");}body{display:none';
		$css                          = CssBuilder::style( $style, Presets::tokens( 'marketplace' ) );
		$this->assertStringNotContainsString( '");}body', $css );
		$this->assertMatchesRegularExpression( '/--imm-head-img:url\\("[^"]*"\\);/', $css );
	}
}
