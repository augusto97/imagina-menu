<?php
declare(strict_types=1);

namespace ImaginaMenu\Compiler;

/**
 * Iconos del menú. Al renderizar se registran los usados y al final se genera un sprite SVG con
 * solo esos símbolos (se incrusta una vez en la página: cero peticiones).
 *
 * Nombres: los de Lucide ("shopping-cart") y los de marca con prefijo "si-" ("si-whatsapp").
 */
final class Icons {

	/** @var array{lucide: array<string, string>, brands: array<string, string>}|null */
	private static ?array $library = null;

	/** @var array<string, true> */
	private array $used = array();

	public function use( string $name, string $class = 'imm-i' ): string {
		$name = $this->resolve( $name );
		if ( '' === $name ) {
			return '';
		}
		$this->used[ $name ] = true;
		return '<svg class="' . esc_attr( $class ) . '" aria-hidden="true"><use href="#imm-i-' . esc_attr( $name ) . '"/></svg>';
	}

	public function exists( string $name ): bool {
		return '' !== $this->resolve( $name );
	}

	public function sprite(): string {
		if ( ! $this->used ) {
			return '';
		}
		$lib     = self::library();
		$symbols = '';
		foreach ( array_keys( $this->used ) as $name ) {
			if ( str_starts_with( $name, 'si-' ) ) {
				$body     = $lib['brands'][ substr( $name, 3 ) ] ?? '';
				$symbols .= '<symbol id="imm-i-' . $name . '" viewBox="0 0 24 24" fill="currentColor" stroke="none">' . $body . '</symbol>';
			} else {
				$symbols .= '<symbol id="imm-i-' . $name . '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' . ( $lib['lucide'][ $name ] ?? '' ) . '</symbol>';
			}
		}
		// Los atributos de trazo van en cada <symbol>: el contenido clonado por <use> hereda del
		// <svg> que lo usa, no del sprite.
		return '<svg class="imm-sprite" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style="position:absolute;width:0;height:0;overflow:hidden">' . $symbols . '</svg>';
	}

	/** @return list<string> */
	public function used(): array {
		return array_keys( $this->used );
	}

	private function resolve( string $name ): string {
		$name = strtolower( trim( $name ) );
		if ( '' === $name ) {
			return '';
		}
		$lib = self::library();
		if ( str_starts_with( $name, 'si-' ) ) {
			return isset( $lib['brands'][ substr( $name, 3 ) ] ) ? $name : '';
		}
		return isset( $lib['lucide'][ $name ] ) ? $name : '';
	}

	/** @return array{lucide: array<string, string>, brands: array<string, string>} */
	private static function library(): array {
		if ( null === self::$library ) {
			$file          = IMM_DIR . '/icons/icons.json';
			$data          = is_readable( $file ) ? json_decode( (string) file_get_contents( $file ), true ) : null; // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents
			self::$library = array(
				'lucide' => is_array( $data['lucide'] ?? null ) ? $data['lucide'] : array(),
				'brands' => is_array( $data['brands'] ?? null ) ? $data['brands'] : array(),
			);
		}
		return self::$library;
	}
}
