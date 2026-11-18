<?php
declare(strict_types=1);

namespace ImaginaMenu\Frontend;

defined( 'ABSPATH' ) || exit;

/**
 * Botón para abrir el panel desde el tema: shortcode [imagina_menu_toggle], bloque de Gutenberg y
 * función imagina_menu_toggle(). Funciona sin JS (popovertarget).
 */
final class Toggle {

	/** @param array<string, string>|string $atts */
	public static function shortcode( $atts = array() ): string {
		$atts = shortcode_atts(
			array(
				'label' => '',
				'class' => '',
			),
			is_array( $atts ) ? $atts : array(),
			'imagina_menu_toggle'
		);
		$profile = Frontend::profile();
		if ( ! $profile || '' === $profile['parts']['drawer_guest'] ) {
			return '';
		}
		$label = sanitize_text_field( $atts['label'] );
		$class = trim( 'imm-toggle ' . implode( ' ', array_map( 'sanitize_html_class', explode( ' ', $atts['class'] ) ) ) );
		return '<button type="button" class="' . esc_attr( $class ) . '" popovertarget="imm-drawer" aria-controls="imm-drawer" aria-expanded="false" aria-label="' . esc_attr( '' !== $label ? $label : __( 'Abrir menú', 'imagina-menu' ) ) . '" data-imm-open>'
			. '<svg class="imm-i" aria-hidden="true" focusable="false"><use href="#imm-i-' . esc_attr( $profile['trigger']['icon'] ?? 'menu' ) . '"/></svg>'
			. ( '' !== $label ? '<span>' . esc_html( $label ) . '</span>' : '' )
			. '</button>';
	}
}
