<?php
/**
 * Costo propio del frontend por request (presupuesto: < 1 ms, < 300 KB).
 * Uso: wp eval-file tests/Performance/render-benchmark.php  (con opcache.enable_cli=1 para medir como en producción)
 *
 * Mide lo que hace cada visita: cargar la config compilada, elegir el perfil, CSS crítico y volcar
 * el HTML con aria-current.
 *
 * @package ImaginaMenu
 */

defined( 'ABSPATH' ) || exit;

use ImaginaMenu\Compiler\Storage;
use ImaginaMenu\Frontend\Frontend;

$imm_runs = 1000;
$_SERVER['REQUEST_URI'] = '/product-category/electronica/';
$imm_ref  = new ReflectionClass( Frontend::class );
$imm_prop = $imm_ref->getProperty( 'config' );

$imm_mem0 = memory_get_usage();
$imm_t0   = hrtime( true );
for ( $i = 0; $i < $imm_runs; $i++ ) {
	$imm_prop->setValue( null, false ); // Forzar la carga como en un request nuevo.
	$config = Frontend::config();
	$imm_profile = $config['profiles'][0];
	ob_start();
	$imm_sel = $imm_ref->getMethod( 'select' );
	echo '<style>' . $imm_profile['critical'] . '</style>'; // phpcs:ignore
	$imm_html = $imm_profile['sprite'] . $imm_profile['parts']['fab'] . $imm_profile['parts']['drawer_guest'] . $imm_profile['parts']['search'] . $imm_profile['parts']['bbar'];
	$imm_mark = $imm_ref->getMethod( 'mark_current' );
	echo $imm_mark->invoke( null, $imm_html ); // phpcs:ignore
	ob_end_clean();
}
$imm_ms  = ( hrtime( true ) - $imm_t0 ) / 1e6 / $imm_runs;
$imm_kb  = ( memory_get_usage() - $imm_mem0 ) / 1024;
printf( "Por request: %.3f ms · memoria retenida: %.1f KB · OPcache CLI: %s\n", $imm_ms, $imm_kb, ini_get( 'opcache.enable_cli' ) ? 'sí' : 'no' );
printf( "HTML del menú: %.1f KB · items: %d\n", strlen( $imm_html ) / 1024, $config['sizes']['items'] );
