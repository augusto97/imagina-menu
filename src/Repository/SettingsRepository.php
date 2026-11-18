<?php
declare(strict_types=1);

namespace ImaginaMenu\Repository;

defined( 'ABSPATH' ) || exit;

use ImaginaMenu\Model\Normalizer;

/** Ajustes globales: opción sin autoload (solo se leen en el admin y al compilar). */
final class SettingsRepository {

	public const OPTION = 'imm_settings';

	/** @return array<string, mixed> */
	public function get(): array {
		$value = get_option( self::OPTION, array() );
		return Normalizer::settings( is_array( $value ) ? $value : array() );
	}

	/**
	 * @param array<mixed> $data
	 * @return array<string, mixed>
	 */
	public function save( array $data ): array {
		$clean = Normalizer::settings( $data );
		update_option( self::OPTION, $clean, false );
		return $clean;
	}
}
