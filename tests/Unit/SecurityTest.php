<?php
declare(strict_types=1);

namespace ImaginaMenu\Tests\Unit;

use ImaginaMenu\Analytics\Stats;
use ImaginaMenu\Model\Normalizer;
use PHPUnit\Framework\TestCase;

/** Regresiones de la auditoría de seguridad. */
final class SecurityTest extends TestCase {

	/** @return array<string, array{string, string}> */
	public static function selectors(): array {
		return array(
			'combinador hijo se conserva'      => array( '.wd-header-mobile-nav > a', '.wd-header-mobile-nav > a' ),
			'escape de clase se conserva'      => array( '.md\\:hidden', '.md\\:hidden' ),
			'comillas equilibradas'            => array( '[data-open="#main-menu"]', '[data-open="#main-menu"]' ),
			'llaves no abren reglas'           => array( '.a}body{display:none', '.abodydisplay:none' ),
			'comentario no se abre'            => array( '.a/* resto', '.a resto' ),
			'barra final no escapa la llave'   => array( '.a\\', '.a' ),
			'comilla sin cerrar se rechaza'    => array( '[data-x="a]', '' ),
			'paréntesis sin cerrar se rechaza' => array( ':not(.a', '' ),
			'corchete sobrante se rechaza'     => array( '.a]', '' ),
		);
	}

	/** @dataProvider selectors */
	public function test_selector_cannot_break_the_css_rule( string $in, string $out ): void {
		$this->assertSame( $out, Normalizer::selector( $in ) );
	}

	public function test_protocol_relative_and_obfuscated_urls_become_https(): void {
		$this->assertSame( 'https://otro.test/x', Normalizer::url( '//otro.test/x' ) );
		$this->assertSame( '', Normalizer::url( 'javascript:alert(1)' ) );
		$this->assertSame( '', Normalizer::url( 'data:text/html,<script>' ) );
	}

	public function test_cloudflare_ranges(): void {
		$cf = array( '173.245.48.0/20', '2606:4700::/32' );
		$this->assertTrue( Stats::in_ranges( '173.245.48.10', $cf ) );
		$this->assertTrue( Stats::in_ranges( '173.245.63.255', $cf ) );
		$this->assertFalse( Stats::in_ranges( '173.245.64.1', $cf ) );
		$this->assertTrue( Stats::in_ranges( '2606:4700:10::1', $cf ) );
		$this->assertFalse( Stats::in_ranges( '2607:4700::1', $cf ) );
		$this->assertFalse( Stats::in_ranges( 'no-es-ip', $cf ) );
	}

	public function test_cf_header_is_only_trusted_from_cloudflare(): void {
		$_SERVER['REMOTE_ADDR']           = '203.0.113.7';
		$_SERVER['HTTP_CF_CONNECTING_IP'] = '198.51.100.1';
		$this->assertSame( '203.0.113.7', Stats::client_ip(), 'Cabecera falsa desde fuera de Cloudflare' );
		$_SERVER['REMOTE_ADDR'] = '172.64.1.1';
		$this->assertSame( '198.51.100.1', Stats::client_ip(), 'Desde Cloudflare sí se usa' );
		unset( $_SERVER['REMOTE_ADDR'], $_SERVER['HTTP_CF_CONNECTING_IP'] );
	}
}
