<?php
/**
 * Dependencias del script del editor del bloque (WordPress lo lee junto a index.js).
 *
 * @package ImaginaMenu
 */

defined( 'ABSPATH' ) || exit;

return array(
	'dependencies' => array( 'wp-blocks', 'wp-element', 'wp-block-editor', 'wp-components', 'wp-i18n' ),
	'version'      => '0.3.1',
);
