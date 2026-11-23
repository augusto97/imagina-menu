<?php
/**
 * Plugin Name:       Imagina Menu
 * Plugin URI:        https://imaginawp.com/
 * Description:       Navegación móvil tipo app: panel con submenús deslizantes, barra de navegación inferior y buscador. HTML renderizado en el servidor, sin jQuery y sin afectar PageSpeed.
 * Version:           0.5.10
 * Requires at least: 6.5
 * Requires PHP:      8.1
 * Author:            Imagina WP
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       imagina-menu
 * Domain Path:       /languages
 *
 * Este archivo debe seguir siendo válido en PHP antiguo (para mostrar un aviso en lugar de un
 * error fatal) y compatible con la inyección de protección de Imagina Updater, que inserta su
 * bloque justo después de la comprobación de ABSPATH. Por eso no declara strict_types ni namespace.
 *
 * @package ImaginaMenu
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

if ( defined( 'IMM_VERSION' ) ) {
	// Otra copia del plugin ya se cargó (por ejemplo, dos carpetas con el mismo plugin).
	return;
}

// phpcs:disable WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedConstantFound -- prefijo IMM_ fijado en CLAUDE.md.
define( 'IMM_VERSION', '0.5.10' );
define( 'IMM_FILE', __FILE__ );
define( 'IMM_DIR', __DIR__ );
define( 'IMM_MIN_PHP', 80100 );
// phpcs:enable

if ( PHP_VERSION_ID < IMM_MIN_PHP ) { // @phpstan-ignore smaller.alwaysFalse (aviso en PHP antiguo, fuera del rango analizado)
	add_action(
		'admin_notices',
		function () {
			if ( ! current_user_can( 'activate_plugins' ) ) {
				return;
			}
			echo '<div class="notice notice-error"><p>';
			echo esc_html__( 'Imagina Menu necesita PHP 8.1 o superior. El plugin no se cargó.', 'imagina-menu' );
			echo '</p></div>';
		}
	);
	return;
}

if ( is_file( __DIR__ . '/vendor/autoload.php' ) ) {
	require_once __DIR__ . '/vendor/autoload.php';
} else {
	// Sin Composer (copia de desarrollo o ZIP sin vendor): autoloader PSR-4 mínimo.
	spl_autoload_register(
		function ( $class_name ) {
			$prefix = 'ImaginaMenu\\';
			if ( 0 !== strncmp( $class_name, $prefix, strlen( $prefix ) ) ) {
				return;
			}
			$file = __DIR__ . '/src/' . str_replace( '\\', '/', substr( $class_name, strlen( $prefix ) ) ) . '.php';
			if ( is_file( $file ) ) {
				require_once $file;
			}
		}
	);
}

register_activation_hook( __FILE__, array( '\ImaginaMenu\Core\Installer', 'activate' ) );
register_deactivation_hook( __FILE__, array( '\ImaginaMenu\Core\Installer', 'deactivate' ) );

\ImaginaMenu\Core\Plugin::boot( __FILE__ );
