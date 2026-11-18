<?php
declare(strict_types=1);

namespace ImaginaMenu\Compiler;

defined( 'ABSPATH' ) || exit;

/**
 * Archivos compilados.
 *
 * - wp-content/imagina-menu/config-{hash}.php: configuración y fragmentos HTML (vive en OPcache).
 *   El nombre cambia en cada compilación y una opción mínima con autocarga apunta al vigente: así
 *   OPcache nunca sirve una versión vieja aunque se compile desde WP-CLI o el cron del sistema (donde
 *   opcache_invalidate() no alcanza a PHP-FPM) o con opcache.validate_timestamps=0. La opción viaja
 *   en la consulta de autocarga que WordPress ya hace: ninguna consulta extra.
 * - wp-content/uploads/imagina-menu/imm-{hash}.css: CSS completo, con caché larga.
 *
 * Escritura atómica (temporal + rename) para que un request nunca lea un archivo a medias.
 */
final class Storage {

	public const POINTER_OPTION = 'imm_config';

	public static function config_dir(): string {
		return WP_CONTENT_DIR . '/imagina-menu';
	}

	/** Archivo de configuración vigente (o el de versiones anteriores si aún no hay puntero). */
	public static function config_file(): string {
		$hash = get_option( self::POINTER_OPTION );
		if ( is_string( $hash ) && preg_match( '/^[a-f0-9]{12}$/', $hash ) ) {
			return self::config_dir() . '/config-' . $hash . '.php';
		}
		return self::config_dir() . '/config.php';
	}

	/**
	 * La URL se guarda tal como la da WordPress (con el esquema de la dirección del sitio): el
	 * esquema definitivo se ajusta en cada visita con set_url_scheme() (ver Frontend::footer). Si se
	 * fijara aquí y la compilación corriera desde la línea de comandos, quedaría en http:// y el
	 * navegador lo bloquearía en un sitio con HTTPS.
	 *
	 * @return array{dir: string, url: string}
	 */
	public static function public_dir(): array {
		$uploads = wp_get_upload_dir();
		return array(
			'dir' => $uploads['basedir'] . '/imagina-menu',
			'url' => $uploads['baseurl'] . '/imagina-menu',
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
		$hash = substr( md5( (string) wp_json_encode( $config ) ), 0, 12 );
		$file = $dir . '/config-' . $hash . '.php';
		$code = "<?php\n// Generado por Imagina Menu. No editar: se reescribe al publicar.\nif ( ! defined( 'ABSPATH' ) ) { exit; }\nreturn " . var_export( $config, true ) . ";\n"; // phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_var_export
		if ( ! is_file( $file ) && ! self::atomic_write( $file, $code ) ) {
			return false;
		}
		$previous = get_option( self::POINTER_OPTION );
		update_option( self::POINTER_OPTION, $hash, true );
		// Se conserva el anterior un rato (requests en curso); el resto se borra.
		foreach ( (array) glob( $dir . '/config*.php' ) as $old ) {
			if ( is_string( $old ) && $old !== $file && basename( $old ) !== 'config-' . $previous . '.php' ) {
				wp_delete_file( $old );
			}
		}
		return true;
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
		// Temporales de escrituras interrumpidas.
		foreach ( (array) glob( self::config_dir() . '/*.tmp.php' ) as $file ) {
			if ( is_string( $file ) && filemtime( $file ) < time() - HOUR_IN_SECONDS ) {
				wp_delete_file( $file );
			}
		}
	}

	/** Desinstalación: borra las dos carpetas del plugin con todo su contenido. */
	public static function delete_all(): void {
		foreach ( array( self::config_dir(), self::public_dir()['dir'] ) as $dir ) {
			if ( ! is_dir( $dir ) || basename( $dir ) !== 'imagina-menu' ) {
				continue;
			}
			foreach ( (array) scandir( $dir ) as $name ) {
				if ( is_string( $name ) && is_file( $dir . '/' . $name ) ) {
					wp_delete_file( $dir . '/' . $name );
				}
			}
			@rmdir( $dir ); // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged, WordPress.WP.AlternativeFunctions.file_system_operations_rmdir
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
			// Solo Apache la respeta; en nginx y OpenLiteSpeed protegen los propios archivos .php.
			if ( ! is_file( $dir . '/.htaccess' ) ) {
				self::atomic_write( $dir . '/.htaccess', "Require all denied\n" );
			}
		}
		return is_writable( $dir );
	}

	/**
	 * Temporal con nombre aleatorio. En la carpeta privada termina en .php: si una escritura se
	 * interrumpe, el resto no se puede descargar por URL en servidores que ignoran .htaccess.
	 */
	private static function atomic_write( string $path, string $content ): bool {
		$tmp = $path . '.' . wp_generate_password( 12, false ) . ( str_starts_with( $path, self::config_dir() ) ? '.tmp.php' : '.tmp' );
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
