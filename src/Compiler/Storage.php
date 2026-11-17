<?php
declare(strict_types=1);

namespace ImaginaMenu\Compiler;

/**
 * Archivos compilados.
 *
 * - wp-content/imagina-menu/config.php: configuración y fragmentos HTML (vive en OPcache).
 * - wp-content/uploads/imagina-menu/imm-{hash}.css: CSS completo, con caché larga.
 *
 * Escritura atómica (temporal + rename) para que un request nunca lea un archivo a medias.
 */
final class Storage {

	public static function config_dir(): string {
		return WP_CONTENT_DIR . '/imagina-menu';
	}

	public static function config_file(): string {
		return self::config_dir() . '/config.php';
	}

	/** @return array{dir: string, url: string} */
	public static function public_dir(): array {
		$uploads = wp_get_upload_dir();
		return array(
			'dir' => $uploads['basedir'] . '/imagina-menu',
			'url' => set_url_scheme( $uploads['baseurl'] . '/imagina-menu' ),
		);
	}

	/** @return array<string, mixed>|null */
	public static function load(): ?array {
		$file = self::config_file();
		if ( ! is_file( $file ) ) {
			return null;
		}
		try {
			$config = include $file;
		} catch ( \Throwable $e ) {
			return null;
		}
		return is_array( $config ) && isset( $config['version'] ) ? $config : null;
	}

	/** @param array<string, mixed> $config */
	public static function write_config( array $config ): bool {
		$dir = self::config_dir();
		if ( ! self::ensure_dir( $dir, true ) ) {
			return false;
		}
		$code = "<?php\n// Generado por Imagina Menu. No editar: se reescribe al publicar.\nif ( ! defined( 'ABSPATH' ) ) { exit; }\nreturn " . var_export( $config, true ) . ";\n"; // phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_var_export
		$ok   = self::atomic_write( self::config_file(), $code );
		if ( $ok && function_exists( 'opcache_invalidate' ) ) {
			opcache_invalidate( self::config_file(), true );
		}
		return $ok;
	}

	/**
	 * Escribe el CSS con su hash y devuelve la URL (o null si no se pudo).
	 */
	public static function write_css( string $css ): ?string {
		$pub  = self::public_dir();
		$name = 'imm-' . substr( md5( $css ), 0, 10 ) . '.css';
		if ( ! self::ensure_dir( $pub['dir'], false ) ) {
			return null;
		}
		$path = $pub['dir'] . '/' . $name;
		if ( ! is_file( $path ) && ! self::atomic_write( $path, $css ) ) {
			return null;
		}
		return $pub['url'] . '/' . $name;
	}

	/**
	 * Borra CSS antiguos que ya no se usan. Se conservan 7 días: las páginas en caché pueden
	 * seguir apuntando a la versión anterior.
	 *
	 * @param list<string> $keep URLs en uso.
	 */
	public static function cleanup( array $keep ): void {
		$pub   = self::public_dir();
		$names = array_map( 'basename', $keep );
		foreach ( (array) glob( $pub['dir'] . '/imm-*.css' ) as $file ) {
			if ( is_string( $file ) && ! in_array( basename( $file ), $names, true ) && filemtime( $file ) < time() - 7 * DAY_IN_SECONDS ) {
				wp_delete_file( $file );
			}
		}
	}

	public static function delete_all(): void {
		wp_delete_file( self::config_file() );
		$pub = self::public_dir();
		foreach ( (array) glob( $pub['dir'] . '/imm-*.css' ) as $file ) {
			if ( is_string( $file ) ) {
				wp_delete_file( $file );
			}
		}
	}

	private static function ensure_dir( string $dir, bool $protect ): bool {
		if ( ! is_dir( $dir ) && ! wp_mkdir_p( $dir ) ) {
			return false;
		}
		if ( $protect ) {
			if ( ! is_file( $dir . '/index.php' ) ) {
				self::atomic_write( $dir . '/index.php', "<?php\n// Silence is golden.\n" );
			}
			if ( ! is_file( $dir . '/.htaccess' ) ) {
				self::atomic_write( $dir . '/.htaccess', "Require all denied\n" );
			}
		}
		return is_writable( $dir );
	}

	private static function atomic_write( string $path, string $content ): bool {
		$tmp = $path . '.' . wp_generate_password( 6, false ) . '.tmp';
		if ( false === file_put_contents( $tmp, $content, LOCK_EX ) ) { // phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_file_put_contents
			return false;
		}
		if ( ! @rename( $tmp, $path ) ) { // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged, WordPress.WP.AlternativeFunctions.rename_rename
			wp_delete_file( $tmp );
			return false;
		}
		return true;
	}
}
