<?php
// Solo para pruebas locales: activa el tema indicado, le asigna un menú y apunta el disparador de
// Imagina Menu al botón móvil del tema (selector de Integrations\\Environment).
// Uso: wp eval-file theme-setup.php <tema>
$theme = $args[0];
switch_theme( $theme );
$menu = wp_get_nav_menu_object( 'Principal' );
$id   = $menu ? $menu->term_id : wp_create_nav_menu( 'Principal' );
if ( ! $menu ) {
	foreach ( array( 'Inicio' => home_url( '/' ), 'Tienda' => home_url( '/shop/' ), 'Contacto' => home_url( '/contacto/' ), 'Nosotros' => home_url( '/nosotros/' ) ) as $t => $u ) {
		wp_update_nav_menu_item( $id, 0, array( 'menu-item-title' => $t, 'menu-item-url' => $u, 'menu-item-status' => 'publish' ) );
	}
}
$locs = array();
foreach ( array_keys( get_registered_nav_menus() ) as $loc ) { $locs[ $loc ] = $id; }
set_theme_mod( 'nav_menu_locations', $locs );
$env  = \ImaginaMenu\Integrations\Environment::info();
$r    = new \ImaginaMenu\Repository\ProfileRepository();
$p    = $r->all()[0];
$p['trigger']['mode']     = 'theme_selector';
$p['trigger']['selector'] = implode( ', ', $env['theme']['selectors'] );
$r->save_draft( $p['id'], $p );
$r->publish( $p['id'] );
\ImaginaMenu\Core\Plugin::compiler()->publish();
echo $env['theme']['template'] . "\t" . $p['trigger']['selector'] . "\n";
