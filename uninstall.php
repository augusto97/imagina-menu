<?php
/**
 * Desinstalación de Imagina Menu. Solo borra los datos si el usuario lo pidió en Ajustes → Avanzado.
 *
 * @package ImaginaMenu
 */

if ( ! defined( 'WP_UNINSTALL_PLUGIN' ) ) {
	exit;
}

$imm_settings = get_option( 'imm_settings', array() );
if ( empty( $imm_settings['delete_on_uninstall'] ) ) {
	// Se conserva todo; solo se borran los archivos compilados (el frontend ya no los usa).
	if ( defined( 'WP_CONTENT_DIR' ) && is_file( WP_CONTENT_DIR . '/imagina-menu/config.php' ) ) {
		wp_delete_file( WP_CONTENT_DIR . '/imagina-menu/config.php' );
	}
	return;
}

define( 'IMM_DIR', __DIR__ );
spl_autoload_register(
	function ( $class_name ) {
		$prefix = 'ImaginaMenu\\';
		if ( 0 === strncmp( $class_name, $prefix, strlen( $prefix ) ) ) {
			$file = __DIR__ . '/src/' . str_replace( '\\', '/', substr( $class_name, strlen( $prefix ) ) ) . '.php';
			if ( is_file( $file ) ) {
				require_once $file;
			}
		}
	}
);
\ImaginaMenu\Core\Installer::uninstall();
