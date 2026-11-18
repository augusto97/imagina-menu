<?php
declare(strict_types=1);

namespace ImaginaMenu\Core;

defined( 'ABSPATH' ) || exit;

use ImaginaMenu\Repository\MenuRepository;
use ImaginaMenu\Repository\ProfileRepository;
use ImaginaMenu\Repository\SettingsRepository;

/**
 * Exportar, importar y publicar: lo usan la API REST (admin) y WP-CLI (`wp imagina-menu`), para
 * replicar una configuración entre los sitios de los clientes.
 */
final class Transfer {

	public const MAX = 30;

	/** @return array<string, mixed> */
	public static function export(): array {
		return array(
			'plugin'   => 'imagina-menu',
			'version'  => IMM_VERSION,
			'settings' => ( new SettingsRepository() )->get(),
			'menus'    => ( new MenuRepository() )->all( true ),
			'profiles' => ( new ProfileRepository() )->all( true ),
		);
	}

	/**
	 * Importa menús y perfiles como nuevos (borradores). Los ids de menú de los perfiles se
	 * reasignan a los menús importados. Los perfiles llegan desactivados salvo $enable (evita que un
	 * perfil importado tape al actual) y nunca como predeterminados.
	 *
	 * @param array<string, mixed>                          $data
	 * @param callable(array<mixed>): array<mixed>|null     $guard Filtro por perfil (permisos del usuario).
	 * @return array{menus: int, profiles: int}|\WP_Error
	 */
	public static function import( array $data, bool $settings = false, bool $enable = false, ?callable $guard = null ): array|\WP_Error {
		if ( 'imagina-menu' !== ( $data['plugin'] ?? '' ) ) {
			return new \WP_Error( 'imm_bad_import', __( 'El archivo no es una exportación de Imagina Menu.', 'imagina-menu' ), array( 'status' => 400 ) );
		}
		if ( count( (array) ( $data['menus'] ?? array() ) ) > self::MAX || count( (array) ( $data['profiles'] ?? array() ) ) > self::MAX ) {
			return new \WP_Error( 'imm_import_too_big', __( 'La importación tiene demasiados menús o perfiles (máximo 30 de cada uno).', 'imagina-menu' ), array( 'status' => 400 ) );
		}
		$menus = new MenuRepository();
		$map   = array();
		foreach ( (array) ( $data['menus'] ?? array() ) as $menu ) {
			if ( is_array( $menu ) ) {
				$map[ (int) ( $menu['id'] ?? 0 ) ] = $menus->create( $menu );
			}
		}
		$profiles = new ProfileRepository();
		$count    = 0;
		foreach ( (array) ( $data['profiles'] ?? array() ) as $profile ) {
			if ( ! is_array( $profile ) ) {
				continue;
			}
			$profile['drawer'] = is_array( $profile['drawer'] ?? null ) ? $profile['drawer'] : array();
			$old               = (int) ( $profile['drawer']['menu_id'] ?? 0 );
			if ( isset( $map[ $old ] ) ) {
				$profile['drawer']['menu_id'] = $map[ $old ];
			}
			$profile['is_default'] = false;
			$profile['enabled']    = $enable;
			if ( $guard ) {
				$profile = $guard( $profile );
			}
			$profiles->create( $profile + array( 'menu_order' => 100 + $count ) );
			++$count;
		}
		if ( $settings && is_array( $data['settings'] ?? null ) ) {
			( new SettingsRepository() )->save( $data['settings'] );
		}
		return array(
			'menus'    => count( $map ),
			'profiles' => $count,
		);
	}

	/**
	 * Publica los borradores de todos los menús y perfiles y compila.
	 *
	 * @return array<string, mixed> Estado de la compilación.
	 */
	public static function publish(): array {
		$menus    = new MenuRepository();
		$profiles = new ProfileRepository();
		foreach ( $menus->all() as $menu ) {
			$menus->publish( (int) $menu['id'] );
		}
		foreach ( $profiles->all() as $profile ) {
			$profiles->publish( (int) $profile['id'] );
		}
		return Plugin::compiler()->publish();
	}
}
