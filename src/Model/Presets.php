<?php
declare(strict_types=1);

namespace ImaginaMenu\Model;

/**
 * Presets de diseño. Toman los patrones de navegación de las grandes tiendas, no sus marcas:
 * los colores son propios. Cada preset define tokens y una sugerencia de estructura que el
 * admin aplica al elegirlo (el usuario puede cambiarla después).
 */
final class Presets {

	/** Tokens base: cualquier preset parte de aquí. */
	private const BASE = array(
		'bg'             => '#ffffff',
		'fg'             => '#18181b',
		'muted'          => '#62626b',
		'border'         => '#ececee',
		'hover_bg'       => '#f4f4f5',
		'accent'         => '#ff6a00',
		'accent_fg'      => '#ffffff',
		'head_bg'        => '#ffffff',
		'head_fg'        => '#18181b',
		'overlay'        => 50,
		'radius'         => 12,
		'item_height'    => 52,
		'font_size'      => 16,
		'duration'       => 280,
		'bbar_bg'        => '#ffffff',
		'bbar_fg'        => '#71717a',
		'bbar_active'    => '#ff6a00',
		'bbar_active_bg' => '#fff1e6',
		'badge_bg'       => '#e11d48',
		'badge_fg'       => '#ffffff',
		'fab_bg'         => '#18181b',
		'fab_fg'         => '#ffffff',
	);

	private const PRESETS = array(
		'marketplace' => array(
			'label'     => 'Marketplace',
			'hint'      => 'Cabecera de cuenta en color, secciones con títulos y submenús deslizantes.',
			'tokens'    => array(
				'head_bg'        => '#1e293b',
				'head_fg'        => '#ffffff',
				'accent'         => '#f97316',
				'bbar_active'    => '#ea580c',
				'bbar_active_bg' => '#ffedd5',
				'fab_bg'         => '#1e293b',
			),
			'structure' => array(
				'drawer'     => array( 'submenu_mode' => 'slide', 'close_position' => 'outside', 'side' => 'left' ),
				'bottom_bar' => array( 'shape' => 'bar', 'indicator' => 'line', 'style' => 'labels' ),
			),
		),
		'app'         => array(
			'label'     => 'App de compras',
			'hint'      => 'Barra inferior protagonista con botón central y acentos vivos.',
			'tokens'    => array(
				'accent'         => '#fb5607',
				'head_bg'        => '#fff7ed',
				'head_fg'        => '#7c2d12',
				'radius'         => 16,
				'bbar_active'    => '#fb5607',
				'bbar_active_bg' => '#ffedd5',
				'fab_bg'         => '#fb5607',
			),
			'structure' => array(
				'drawer'     => array( 'submenu_mode' => 'slide', 'close_position' => 'inside', 'side' => 'left' ),
				'bottom_bar' => array( 'shape' => 'floating', 'indicator' => 'pill', 'style' => 'labels' ),
			),
		),
		'minimal'     => array(
			'label'     => 'Minimal',
			'hint'      => 'Blanco y negro, tipografía grande, sin distracciones.',
			'tokens'    => array(
				'accent'         => '#18181b',
				'border'         => '#f1f1f2',
				'radius'         => 6,
				'item_height'    => 56,
				'font_size'      => 17,
				'bbar_fg'        => '#a1a1aa',
				'bbar_active'    => '#18181b',
				'bbar_active_bg' => '#f4f4f5',
				'badge_bg'       => '#18181b',
			),
			'structure' => array(
				'drawer'     => array( 'submenu_mode' => 'slide', 'close_position' => 'inside', 'side' => 'right' ),
				'bottom_bar' => array( 'shape' => 'bar', 'indicator' => 'dot', 'style' => 'active_label' ),
			),
		),
		'corporate'   => array(
			'label'     => 'Corporativo',
			'hint'      => 'Sobrio y confiable, ideal para servicios con WhatsApp y CTA.',
			'tokens'    => array(
				'accent'         => '#2563eb',
				'head_bg'        => '#eff6ff',
				'head_fg'        => '#1e3a8a',
				'bbar_active'    => '#2563eb',
				'bbar_active_bg' => '#dbeafe',
				'fab_bg'         => '#2563eb',
				'badge_bg'       => '#2563eb',
			),
			'structure' => array(
				'drawer'     => array( 'submenu_mode' => 'accordion', 'close_position' => 'inside', 'side' => 'right' ),
				'bottom_bar' => array( 'shape' => 'bar', 'indicator' => 'pill', 'style' => 'labels' ),
			),
		),
		'fresh'       => array(
			'label'     => 'Fresco',
			'hint'      => 'Verde y redondeado: supermercados, salud, restaurantes.',
			'tokens'    => array(
				'accent'         => '#16a34a',
				'head_bg'        => '#16a34a',
				'head_fg'        => '#ffffff',
				'radius'         => 18,
				'bbar_active'    => '#15803d',
				'bbar_active_bg' => '#dcfce7',
				'fab_bg'         => '#16a34a',
				'badge_bg'       => '#f59e0b',
				'badge_fg'       => '#1c1917',
			),
			'structure' => array(
				'drawer'     => array( 'submenu_mode' => 'slide', 'close_position' => 'outside', 'side' => 'left' ),
				'bottom_bar' => array( 'shape' => 'floating', 'indicator' => 'pill', 'style' => 'labels' ),
			),
		),
		'dark'        => array(
			'label'     => 'Oscuro premium',
			'hint'      => 'Fondo oscuro con acentos dorados.',
			'tokens'    => array(
				'bg'             => '#0f0f12',
				'fg'             => '#f4f4f5',
				'muted'          => '#a1a1aa',
				'border'         => '#232329',
				'hover_bg'       => '#1c1c21',
				'accent'         => '#e4b860',
				'accent_fg'      => '#0f0f12',
				'head_bg'        => '#16161a',
				'head_fg'        => '#f4f4f5',
				'overlay'        => 65,
				'bbar_bg'        => '#16161a',
				'bbar_fg'        => '#a1a1aa',
				'bbar_active'    => '#e4b860',
				'bbar_active_bg' => '#2a2418',
				'fab_bg'         => '#e4b860',
				'fab_fg'         => '#0f0f12',
			),
			'structure' => array(
				'drawer'     => array( 'submenu_mode' => 'slide', 'close_position' => 'inside', 'side' => 'left' ),
				'bottom_bar' => array( 'shape' => 'floating', 'indicator' => 'color', 'style' => 'labels' ),
			),
		),
	);

	/** Tokens oscuros por defecto para el modo automático (prefers-color-scheme). */
	private const DARK = array(
		'bg'             => '#111113',
		'fg'             => '#f4f4f5',
		'muted'          => '#a1a1aa',
		'border'         => '#26262b',
		'hover_bg'       => '#1c1c20',
		'head_bg'        => '#18181b',
		'head_fg'        => '#f4f4f5',
		'bbar_bg'        => '#18181b',
		'bbar_fg'        => '#a1a1aa',
		'bbar_active_bg' => '#27272a',
	);

	/** @return array<string, string|int> */
	public static function base(): array {
		return self::BASE;
	}

	/** @return array<string, string|int> */
	public static function tokens( string $preset ): array {
		$tokens = self::PRESETS[ $preset ]['tokens'] ?? array();
		return array_merge( self::BASE, $tokens );
	}

	/** @return array<string, string|int> */
	public static function dark_tokens(): array {
		return self::DARK;
	}

	/** @return array<string, array{label: string, hint: string, tokens: array<string, string|int>, structure: array<string, mixed>}> */
	public static function all(): array {
		$out = array();
		foreach ( self::PRESETS as $key => $preset ) {
			$out[ $key ] = array(
				'label'     => $preset['label'],
				'hint'      => $preset['hint'],
				'tokens'    => self::tokens( $key ),
				'structure' => $preset['structure'],
			);
		}
		return $out;
	}

	public static function exists( string $preset ): bool {
		return isset( self::PRESETS[ $preset ] );
	}

	/** Tokens que son colores (para validar como #rrggbb). */
	public static function is_color_token( string $key ): bool {
		return ! in_array( $key, array( 'overlay', 'radius', 'item_height', 'font_size', 'duration' ), true );
	}
}
