<?php
declare(strict_types=1);

namespace ImaginaMenu\Cli;

defined( 'ABSPATH' ) || exit;

use ImaginaMenu\Core\Plugin;
use ImaginaMenu\Core\Transfer;
use ImaginaMenu\Repository\ProfileRepository;

/**
 * Imagina Menu desde la terminal: publicar, exportar e importar la configuración (replicarla entre
 * sitios de clientes), ver el estado y recompilar.
 *
 * ## EJEMPLOS
 *
 *     wp imagina-menu export --file=menu.json
 *     wp imagina-menu import menu.json --publish --enable
 *     wp imagina-menu publish
 *     wp imagina-menu status
 */
final class Command {

	public static function register(): void {
		if ( defined( 'WP_CLI' ) && WP_CLI && class_exists( '\WP_CLI' ) ) {
			\WP_CLI::add_command( 'imagina-menu', self::class );
		}
	}

	/**
	 * Estado: última compilación, perfiles activos, pesos y próximo cambio programado.
	 *
	 * [--format=<format>]
	 * : table o json.
	 * ---
	 * default: table
	 * options:
	 *   - table
	 *   - json
	 * ---
	 *
	 * @param list<string>          $args
	 * @param array<string, string> $assoc
	 */
	public function status( array $args, array $assoc ): void {
		$state    = Plugin::compiler()->state();
		$profiles = array();
		foreach ( ( new ProfileRepository() )->all() as $p ) {
			$profiles[] = array(
				'id'          => $p['id'],
				'perfil'      => $p['title'],
				'activo'      => $p['enabled'] ? 'sí' : 'no',
				'condiciones' => count( $p['rules']['conditions'] ),
				'borrador'    => ( new ProfileRepository() )->has_draft( (int) $p['id'] ) ? 'sí' : 'no',
			);
		}
		$next = wp_next_scheduled( \ImaginaMenu\Core\Schedule::HOOK );
		if ( 'json' === ( $assoc['format'] ?? 'table' ) ) {
			\WP_CLI::line( (string) wp_json_encode( array( 'compile' => $state, 'profiles' => $profiles, 'next_change' => $next ?: null ), JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE ) );
			return;
		}
		\WP_CLI::line( sprintf( 'Imagina Menu %s · compilado %s · hash %s', IMM_VERSION, ! empty( $state['time'] ) ? wp_date( 'Y-m-d H:i', (int) $state['time'] ) : '—', $state['hash'] ?? '—' ) );
		if ( ! empty( $state['sizes'] ) ) {
			\WP_CLI::line( sprintf( 'CSS crítico %s B · CSS %s B · HTML %s B · %s ítems', $state['sizes']['critical'], $state['sizes']['css'], $state['sizes']['html'], $state['sizes']['items'] ) );
		}
		\WP_CLI::line( 'Próximo cambio programado: ' . ( $next ? wp_date( 'Y-m-d H:i', $next ) : 'ninguno' ) );
		foreach ( (array) ( $state['warnings'] ?? array() ) as $warning ) {
			\WP_CLI::warning( (string) $warning );
		}
		\WP_CLI\Utils\format_items( 'table', $profiles, array( 'id', 'perfil', 'activo', 'condiciones', 'borrador' ) );
	}

	/**
	 * Publica los borradores de todos los menús y perfiles, compila y vacía la caché del sitio.
	 *
	 * @param list<string>          $args
	 * @param array<string, string> $assoc
	 */
	public function publish( array $args, array $assoc ): void {
		self::report( Transfer::publish() );
	}

	/**
	 * Vuelve a compilar lo publicado (sin tocar los borradores).
	 *
	 * [--[no-]purge]
	 * : Vaciar la caché del sitio si algo cambió (por defecto sí; --no-purge para no hacerlo).
	 *
	 * @param list<string>          $args
	 * @param array<string, string> $assoc
	 */
	public function recompile( array $args, array $assoc ): void {
		self::report( Plugin::compiler()->publish( (bool) \WP_CLI\Utils\get_flag_value( $assoc, 'purge', true ) ) );
	}

	/**
	 * Exporta ajustes, menús y perfiles (con sus borradores) en JSON.
	 *
	 * [--file=<archivo>]
	 * : Archivo de salida. Sin él, se escribe en la salida estándar.
	 *
	 * @param list<string>          $args
	 * @param array<string, string> $assoc
	 */
	public function export( array $args, array $assoc ): void {
		$json = (string) wp_json_encode( Transfer::export(), JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES );
		if ( empty( $assoc['file'] ) ) {
			\WP_CLI::line( $json );
			return;
		}
		if ( false === file_put_contents( $assoc['file'], $json ) ) { // phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_file_put_contents
			\WP_CLI::error( 'No se pudo escribir ' . $assoc['file'] );
		}
		\WP_CLI::success( 'Exportado en ' . $assoc['file'] );
	}

	/**
	 * Importa menús y perfiles desde un JSON de `wp imagina-menu export` (o del admin).
	 *
	 * Los perfiles llegan como nuevos, desactivados y en borrador, salvo que se pida otra cosa.
	 *
	 * <archivo>
	 * : JSON exportado.
	 *
	 * [--settings]
	 * : Importar también los ajustes globales.
	 *
	 * [--enable]
	 * : Activar los perfiles importados.
	 *
	 * [--publish]
	 * : Publicar y compilar al terminar.
	 *
	 * @param list<string>          $args
	 * @param array<string, string> $assoc
	 */
	public function import( array $args, array $assoc ): void {
		$file = $args[0] ?? '';
		$raw  = is_readable( $file ) ? (string) file_get_contents( $file ) : ''; // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents
		$data = json_decode( $raw, true );
		if ( ! is_array( $data ) ) {
			\WP_CLI::error( 'No se pudo leer un JSON válido de ' . $file );
		}
		$flag   = static fn( string $name ): bool => (bool) \WP_CLI\Utils\get_flag_value( $assoc, $name, false );
		$result = Transfer::import( $data, $flag( 'settings' ), $flag( 'enable' ) );
		if ( is_wp_error( $result ) ) {
			\WP_CLI::error( $result->get_error_message() );
		}
		\WP_CLI::success( sprintf( 'Importados %d menús y %d perfiles%s.', $result['menus'], $result['profiles'], $flag( 'enable' ) ? ' (activos)' : ' (desactivados: actívalos en Perfiles o usa --enable)' ) );
		if ( $flag( 'publish' ) ) {
			self::report( Transfer::publish() );
		}
	}

	/** @param array<string, mixed> $state */
	private static function report( array $state ): void {
		foreach ( (array) ( $state['warnings'] ?? array() ) as $warning ) {
			\WP_CLI::warning( (string) $warning );
		}
		if ( empty( $state['ok'] ) ) {
			\WP_CLI::error( (string) ( $state['error'] ?? 'La compilación falló.' ) );
		}
		$purged = (array) ( $state['purged'] ?? array() );
		\WP_CLI::success( sprintf( 'Compilado (hash %s)%s%s.', $state['hash'] ?? '—', ! empty( $state['unchanged'] ) ? ', sin cambios' : '', $purged ? '; caché vaciada: ' . implode( ', ', $purged ) : '' ) );
	}
}
