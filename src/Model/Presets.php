<?php
declare(strict_types=1);

namespace ImaginaMenu\Model;

defined( 'ABSPATH' ) || exit;

/**
 * Estilos prediseñados. Cada uno combina colores (tokens), un estilo visual completo del panel
 * (forma, cabecera, ítems, iconos, tipografía, movimiento…) y una estructura sugerida (lado,
 * submenús, barra inferior). Al elegirlo se copian al perfil y después todo se puede ajustar.
 *
 * Toman los patrones de navegación de las grandes apps, no sus marcas: colores y nombres propios.
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
		'head_bg2'       => '#f4f4f5',
		'head_fg'        => '#18181b',
		'overlay'        => 50,
		'radius'         => 12,
		'item_height'    => 52,
		'font_size'      => 16,
		'duration'       => 280,
		'bbar_bg'        => '#ffffff',
		'bbar_fg'        => '#62626b',
		'bbar_active'    => '#ff6a00',
		'bbar_active_bg' => '#fff1e6',
		'badge_bg'       => '#e11d48',
		'badge_fg'       => '#ffffff',
		'fab_bg'         => '#18181b',
		'fab_fg'         => '#ffffff',
	);

	/** Estilo visual base del panel (lo que un preset no define se toma de aquí). */
	private const STYLE = array(
		'panel'        => 'flat',
		'header'       => 'solid',
		'header_image' => array(
			'id'  => 0,
			'url' => '',
		),
		'items'        => 'list',
		'icons'        => 'plain',
		'font'         => 'theme',
		'weight'       => 'medium',
		'headings'     => 'caps',
		'active'       => 'text',
		'chevron'      => 'chevron',
		'badge'        => 'solid',
		'search'       => 'filled',
		'overlay'      => 'dim',
		'shadow'       => 'soft',
		'motion'       => 'smooth',
		'stagger'      => false,
	);

	private const PRESETS = array(
		'marketplace' => array(
			'label'     => 'Marketplace',
			'hint'      => 'Cabecera oscura con la cuenta, secciones con títulos y barra lateral en el ítem activo. El clásico de las grandes tiendas.',
			'tokens'    => array(
				'head_bg'        => '#0f172a',
				'head_bg2'       => '#1e293b',
				'head_fg'        => '#ffffff',
				'accent'         => '#f97316',
				'border'         => '#eceef2',
				'hover_bg'       => '#f4f5f7',
				'bbar_active'    => '#ea580c',
				'bbar_active_bg' => '#ffedd5',
				'fab_bg'         => '#0f172a',
			),
			'style'     => array(
				'icons'  => 'soft',
				'active' => 'bar',
			),
			'structure' => array(
				'drawer'     => array( 'submenu_mode' => 'slide', 'close_position' => 'outside', 'side' => 'left' ),
				'bottom_bar' => array( 'shape' => 'bar', 'indicator' => 'line', 'style' => 'labels' ),
			),
		),
		'aurora'      => array(
			'label'     => 'Aurora',
			'hint'      => 'Panel flotante con cabecera en degradado, ítems en píldora, fondo desenfocado y entrada con rebote. Muy de app.',
			'tokens'    => array(
				'accent'         => '#7c3aed',
				'head_bg'        => '#6d28d9',
				'head_bg2'       => '#db2777',
				'head_fg'        => '#ffffff',
				'muted'          => '#625b71',
				'border'         => '#ede9fe',
				'hover_bg'       => '#f5f3ff',
				'radius'         => 18,
				'overlay'        => 35,
				'duration'       => 340,
				'bbar_active'    => '#7c3aed',
				'bbar_active_bg' => '#ede9fe',
				'bbar_fg'        => '#625b71',
				'badge_bg'       => '#db2777',
				'fab_bg'         => '#7c3aed',
			),
			'style'     => array(
				'panel'   => 'floating',
				'header'  => 'gradient',
				'items'   => 'pills',
				'icons'   => 'soft',
				'font'    => 'system',
				'active'  => 'pill',
				'badge'   => 'soft',
				'overlay' => 'blur',
				'shadow'  => 'strong',
				'motion'  => 'spring',
				'stagger' => true,
			),
			'structure' => array(
				'drawer'     => array( 'submenu_mode' => 'slide', 'close_position' => 'inside', 'side' => 'left' ),
				'bottom_bar' => array( 'shape' => 'floating', 'indicator' => 'pill', 'style' => 'labels' ),
			),
		),
		'ios'         => array(
			'label'     => 'Ajustes',
			'hint'      => 'Grupos en tarjetas sobre fondo gris e iconos de colores, como la app de Ajustes del iPhone. Muy claro de leer.',
			'tokens'    => array(
				'bg'             => '#ffffff',
				'fg'             => '#000000',
				'muted'          => '#636366',
				'border'         => '#e3e3e8',
				'hover_bg'       => '#f2f2f7',
				'accent'         => '#007aff',
				'head_bg'        => '#f2f2f7',
				'head_bg2'       => '#e5e5ea',
				'head_fg'        => '#000000',
				'radius'         => 12,
				'item_height'    => 48,
				'bbar_bg'        => '#f9f9fb',
				'bbar_fg'        => '#636366',
				'bbar_active'    => '#007aff',
				'bbar_active_bg' => '#e5f0ff',
				'badge_bg'       => '#d70015',
				'fab_bg'         => '#007aff',
			),
			'style'     => array(
				'panel'   => 'rounded',
				'header'  => 'minimal',
				'items'   => 'grouped',
				'icons'   => 'color',
				'font'    => 'system',
				'weight'  => 'regular',
				'overlay' => 'blur',
			),
			'structure' => array(
				'drawer'     => array( 'submenu_mode' => 'slide', 'close_position' => 'inside', 'side' => 'left' ),
				'bottom_bar' => array( 'shape' => 'bar', 'indicator' => 'color', 'style' => 'labels' ),
			),
		),
		'editorial'   => array(
			'label'     => 'Editorial',
			'hint'      => 'Tipografía serif grande, líneas finas y sin iconos. Para moda, joyería, hoteles y marcas de autor.',
			'tokens'    => array(
				'bg'             => '#fbfaf7',
				'fg'             => '#1a1a1a',
				'muted'          => '#5f5b54',
				'border'         => '#e7e3da',
				'hover_bg'       => '#f3f0e8',
				'accent'         => '#1a1a1a',
				'accent_fg'      => '#fbfaf7',
				'head_bg'        => '#fbfaf7',
				'head_bg2'       => '#f3f0e8',
				'head_fg'        => '#1a1a1a',
				'radius'         => 0,
				'item_height'    => 58,
				'font_size'      => 19,
				'duration'       => 320,
				'bbar_bg'        => '#fbfaf7',
				'bbar_fg'        => '#5f5b54',
				'bbar_active'    => '#1a1a1a',
				'bbar_active_bg' => '#f3f0e8',
				'badge_bg'       => '#1a1a1a',
				'badge_fg'       => '#fbfaf7',
				'fab_bg'         => '#1a1a1a',
				'fab_fg'         => '#fbfaf7',
			),
			'style'     => array(
				'header'   => 'minimal',
				'items'    => 'divided',
				'icons'    => 'none',
				'font'     => 'serif',
				'weight'   => 'regular',
				'headings' => 'accent',
				'chevron'  => 'arrow',
				'badge'    => 'outline',
				'search'   => 'underline',
				'shadow'   => 'none',
				'stagger'  => true,
			),
			'structure' => array(
				'drawer'     => array( 'submenu_mode' => 'slide', 'close_position' => 'inside', 'side' => 'right' ),
				'bottom_bar' => array( 'shape' => 'bar', 'indicator' => 'dot', 'style' => 'active_label' ),
			),
		),
		'material'    => array(
			'label'     => 'Material',
			'hint'      => 'Tarjeta de cuenta tonal, ítems en píldora y tipografía redondeada, como las apps de Android.',
			'tokens'    => array(
				'bg'             => '#f8fafd',
				'fg'             => '#1b1b1f',
				'muted'          => '#4f5159',
				'border'         => '#e1e5ec',
				'hover_bg'       => '#e9eef6',
				'accent'         => '#0b57d0',
				'head_bg'        => '#d3e3fd',
				'head_bg2'       => '#c2e7ff',
				'head_fg'        => '#041e49',
				'radius'         => 16,
				'duration'       => 260,
				'bbar_bg'        => '#f0f4f9',
				'bbar_fg'        => '#4f5159',
				'bbar_active'    => '#0b57d0',
				'bbar_active_bg' => '#d3e3fd',
				'badge_bg'       => '#b3261e',
				'fab_bg'         => '#d3e3fd',
				'fab_fg'         => '#041e49',
			),
			'style'     => array(
				'panel'    => 'rounded',
				'header'   => 'card',
				'items'    => 'pills',
				'font'     => 'rounded',
				'headings' => 'bold',
				'active'   => 'pill',
				'motion'   => 'snappy',
			),
			'structure' => array(
				'drawer'     => array( 'submenu_mode' => 'slide', 'close_position' => 'inside', 'side' => 'left' ),
				'bottom_bar' => array( 'shape' => 'bar', 'indicator' => 'pill', 'style' => 'labels' ),
			),
		),
		'midnight'    => array(
			'label'     => 'Medianoche',
			'hint'      => 'Cristal oscuro translúcido con degradado índigo y cian. Para tecnología, gaming y marcas nocturnas.',
			'tokens'    => array(
				'bg'             => '#0b0d17',
				'fg'             => '#eef0ff',
				'muted'          => '#b6bad3',
				'border'         => '#22263a',
				'hover_bg'       => '#171b2e',
				'accent'         => '#a78bfa',
				'accent_fg'      => '#0b0d17',
				'head_bg'        => '#4f46e5',
				'head_bg2'       => '#0891b2',
				'head_fg'        => '#ffffff',
				'overlay'        => 55,
				'radius'         => 16,
				'duration'       => 340,
				'bbar_bg'        => '#10131f',
				'bbar_fg'        => '#b6bad3',
				'bbar_active'    => '#c4b5fd',
				'bbar_active_bg' => '#231d45',
				'badge_bg'       => '#e11d48',
				'fab_bg'         => '#6366f1',
				'fab_fg'         => '#ffffff',
			),
			'style'     => array(
				'panel'   => 'glass',
				'header'  => 'gradient',
				'items'   => 'pills',
				'icons'   => 'soft',
				'font'    => 'system',
				'active'  => 'pill',
				'overlay' => 'blur',
				'shadow'  => 'strong',
				'motion'  => 'spring',
				'stagger' => true,
			),
			'structure' => array(
				'drawer'     => array( 'submenu_mode' => 'slide', 'close_position' => 'inside', 'side' => 'left' ),
				'bottom_bar' => array( 'shape' => 'floating', 'indicator' => 'pill', 'style' => 'labels', 'blur' => true ),
			),
		),
		'pop'         => array(
			'label'     => 'Pop',
			'hint'      => 'Alegre y redondeado: tarjetas, iconos de colores y rebote. Para jugueterías, dulces, mascotas y marcas juveniles.',
			'tokens'    => array(
				'fg'             => '#1f1147',
				'muted'          => '#5e5677',
				'border'         => '#efe8fb',
				'hover_bg'       => '#f8f4ff',
				'accent'         => '#d6215f',
				'head_bg'        => '#ffd23f',
				'head_bg2'       => '#ff9f1c',
				'head_fg'        => '#1f1147',
				'radius'         => 20,
				'item_height'    => 54,
				'duration'       => 340,
				'bbar_fg'        => '#5e5677',
				'bbar_active'    => '#d6215f',
				'bbar_active_bg' => '#ffe3ee',
				'badge_bg'       => '#d6215f',
				'fab_bg'         => '#1f1147',
			),
			'style'     => array(
				'panel'    => 'rounded',
				'header'   => 'gradient',
				'items'    => 'cards',
				'icons'    => 'color',
				'font'     => 'rounded',
				'weight'   => 'semibold',
				'headings' => 'bold',
				'active'   => 'pill',
				'motion'   => 'spring',
				'stagger'  => true,
			),
			'structure' => array(
				'drawer'     => array( 'submenu_mode' => 'slide', 'close_position' => 'outside', 'side' => 'left' ),
				'bottom_bar' => array( 'shape' => 'floating', 'indicator' => 'pill', 'style' => 'labels' ),
			),
		),
		'app'         => array(
			'label'     => 'App de compras',
			'hint'      => 'Iconos en cuadros de color, cuenta en tarjeta y barra inferior protagonista con acentos vivos.',
			'tokens'    => array(
				'accent'         => '#ea580c',
				'head_bg'        => '#fff7ed',
				'head_bg2'       => '#ffedd5',
				'head_fg'        => '#7c2d12',
				'hover_bg'       => '#fff7ed',
				'border'         => '#f5ebe1',
				'radius'         => 16,
				'bbar_active'    => '#ea580c',
				'bbar_active_bg' => '#ffedd5',
				'fab_bg'         => '#ea580c',
			),
			'style'     => array(
				'header'   => 'card',
				'icons'    => 'tile',
				'font'     => 'system',
				'headings' => 'bold',
				'active'   => 'pill',
				'motion'   => 'snappy',
			),
			'structure' => array(
				'drawer'     => array( 'submenu_mode' => 'slide', 'close_position' => 'inside', 'side' => 'left' ),
				'bottom_bar' => array( 'shape' => 'floating', 'indicator' => 'pill', 'style' => 'labels' ),
			),
		),
		'minimal'     => array(
			'label'     => 'Minimal',
			'hint'      => 'Blanco y negro, tipografía grande y nada que distraiga.',
			'tokens'    => array(
				'accent'         => '#18181b',
				'border'         => '#f1f1f2',
				'radius'         => 6,
				'item_height'    => 56,
				'font_size'      => 17,
				'bbar_fg'        => '#62626b',
				'bbar_active'    => '#18181b',
				'bbar_active_bg' => '#f4f4f5',
				'badge_bg'       => '#18181b',
			),
			'style'     => array(
				'header'  => 'minimal',
				'icons'   => 'none',
				'badge'   => 'outline',
				'search'  => 'underline',
				'shadow'  => 'none',
				'chevron' => 'arrow',
			),
			'structure' => array(
				'drawer'     => array( 'submenu_mode' => 'slide', 'close_position' => 'inside', 'side' => 'right' ),
				'bottom_bar' => array( 'shape' => 'bar', 'indicator' => 'dot', 'style' => 'active_label' ),
			),
		),
		'corporate'   => array(
			'label'     => 'Corporativo',
			'hint'      => 'Sobrio y confiable, con separadores finos. Ideal para servicios con WhatsApp y llamada a la acción.',
			'tokens'    => array(
				'accent'         => '#2563eb',
				'head_bg'        => '#1e3a8a',
				'head_bg2'       => '#2563eb',
				'head_fg'        => '#ffffff',
				'hover_bg'       => '#f3f6fc',
				'border'         => '#e6ebf3',
				'bbar_active'    => '#2563eb',
				'bbar_active_bg' => '#dbeafe',
				'fab_bg'         => '#1e3a8a',
				'badge_bg'       => '#2563eb',
			),
			'style'     => array(
				'header' => 'card',
				'items'  => 'divided',
				'icons'  => 'soft',
				'font'   => 'system',
				'active' => 'bar',
				'badge'  => 'soft',
				'search' => 'outline',
			),
			'structure' => array(
				'drawer'     => array( 'submenu_mode' => 'accordion', 'close_position' => 'inside', 'side' => 'right' ),
				'bottom_bar' => array( 'shape' => 'bar', 'indicator' => 'pill', 'style' => 'labels' ),
			),
		),
		'fresh'       => array(
			'label'     => 'Fresco',
			'hint'      => 'Verde, redondeado y con tarjetas: supermercados, salud, restaurantes y domicilios.',
			'tokens'    => array(
				'accent'         => '#16a34a',
				'head_bg'        => '#15803d',
				'head_bg2'       => '#22c55e',
				'head_fg'        => '#ffffff',
				'hover_bg'       => '#f3faf5',
				'border'         => '#e3f1e7',
				'radius'         => 18,
				'bbar_active'    => '#15803d',
				'bbar_active_bg' => '#dcfce7',
				'fab_bg'         => '#16a34a',
				'badge_bg'       => '#f59e0b',
				'badge_fg'       => '#1c1917',
			),
			'style'     => array(
				'panel'    => 'rounded',
				'header'   => 'gradient',
				'items'    => 'cards',
				'icons'    => 'soft',
				'font'     => 'rounded',
				'weight'   => 'semibold',
				'headings' => 'bold',
				'active'   => 'pill',
				'motion'   => 'spring',
				'stagger'  => true,
			),
			'structure' => array(
				'drawer'     => array( 'submenu_mode' => 'slide', 'close_position' => 'outside', 'side' => 'left' ),
				'bottom_bar' => array( 'shape' => 'floating', 'indicator' => 'pill', 'style' => 'labels' ),
			),
		),
		'dark'        => array(
			'label'     => 'Oscuro premium',
			'hint'      => 'Negro y dorado con serif y líneas finas. Para marcas de lujo, vinos, relojes y perfumes.',
			'tokens'    => array(
				'bg'             => '#0f0f12',
				'fg'             => '#f4f4f5',
				'muted'          => '#a1a1aa',
				'border'         => '#26262c',
				'hover_bg'       => '#1a1a1f',
				'accent'         => '#e4b860',
				'accent_fg'      => '#0f0f12',
				'head_bg'        => '#0f0f12',
				'head_bg2'       => '#1a1a1f',
				'head_fg'        => '#f4f4f5',
				'overlay'        => 65,
				'item_height'    => 56,
				'font_size'      => 17,
				'bbar_bg'        => '#16161a',
				'bbar_fg'        => '#a1a1aa',
				'bbar_active'    => '#e4b860',
				'bbar_active_bg' => '#2a2418',
				'badge_bg'       => '#e4b860',
				'badge_fg'       => '#0f0f12',
				'fab_bg'         => '#e4b860',
				'fab_fg'         => '#0f0f12',
			),
			'style'     => array(
				'header'   => 'minimal',
				'items'    => 'divided',
				'font'     => 'serif',
				'weight'   => 'regular',
				'headings' => 'accent',
				'active'   => 'bar',
				'chevron'  => 'arrow',
				'badge'    => 'outline',
				'search'   => 'underline',
				'overlay'  => 'blur',
				'shadow'   => 'strong',
				'stagger'  => true,
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
		'head_bg2'       => '#27272a',
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
		return array_merge( self::BASE, self::PRESETS[ $preset ]['tokens'] ?? array() );
	}

	/** @return array<string, mixed> */
	public static function style( string $preset ): array {
		return array_merge( self::STYLE, self::PRESETS[ $preset ]['style'] ?? array() );
	}

	/** @return array<string, string|int> */
	public static function dark_tokens(): array {
		return self::DARK;
	}

	/** @return array<string, array<string, mixed>> */
	public static function all(): array {
		$out = array();
		foreach ( self::PRESETS as $key => $preset ) {
			$thumb       = '/assets/presets/' . $key . '.webp';
			$out[ $key ] = array(
				'label'     => $preset['label'],
				'hint'      => $preset['hint'],
				'tokens'    => self::tokens( $key ),
				'style'     => self::style( $key ),
				'structure' => $preset['structure'],
				'thumb'     => defined( 'IMM_DIR' ) && is_file( IMM_DIR . $thumb ) && function_exists( 'plugins_url' ) ? plugins_url( $thumb, IMM_FILE ) . '?ver=' . IMM_VERSION : '',
			);
		}
		return $out;
	}

	/** @return list<string> */
	public static function keys(): array {
		return array_keys( self::PRESETS );
	}

	public static function exists( string $preset ): bool {
		return isset( self::PRESETS[ $preset ] );
	}

	/** Tokens que son colores (para validar como #rrggbb). */
	public static function is_color_token( string $key ): bool {
		return ! in_array( $key, array( 'overlay', 'radius', 'item_height', 'font_size', 'duration' ), true );
	}
}
