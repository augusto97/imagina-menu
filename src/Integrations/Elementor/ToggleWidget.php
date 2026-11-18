<?php
declare(strict_types=1);

namespace ImaginaMenu\Integrations\Elementor;

defined( 'ABSPATH' ) || exit;

use ImaginaMenu\Frontend\Toggle;

/**
 * Widget de Elementor «Botón de Imagina Menu»: el mismo botón del shortcode y del bloque, para
 * ponerlo en la cabecera (por ejemplo «☰ Todo» solo en escritorio). No carga JavaScript propio.
 *
 * Solo se carga cuando Elementor registra sus widgets (ver Integrations\Elementor\Loader).
 */
final class ToggleWidget extends \Elementor\Widget_Base {

	public function get_name(): string {
		return 'imagina-menu-toggle';
	}

	public function get_title(): string {
		return __( 'Botón de Imagina Menu', 'imagina-menu' );
	}

	public function get_icon(): string {
		return 'eicon-menu-bar';
	}

	/** @return list<string> */
	public function get_categories(): array {
		return array( 'general' );
	}

	/** @return list<string> */
	public function get_keywords(): array {
		return array( 'menu', 'menú', 'hamburguesa', 'imagina', 'categorías' );
	}

	protected function register_controls(): void {
		$this->start_controls_section( 'content', array( 'label' => __( 'Botón', 'imagina-menu' ) ) );
		$this->add_control(
			'label',
			array(
				'label'       => __( 'Texto (opcional)', 'imagina-menu' ),
				'type'        => \Elementor\Controls_Manager::TEXT,
				'placeholder' => __( 'Todo', 'imagina-menu' ),
				'description' => __( 'Sin texto se muestra solo el icono; el nombre accesible es «Abrir menú».', 'imagina-menu' ),
			)
		);
		$this->add_control(
			'button_style',
			array(
				'label'   => __( 'Estilo', 'imagina-menu' ),
				'type'    => \Elementor\Controls_Manager::SELECT,
				'default' => '',
				'options' => array(
					''        => __( 'Transparente (color de la cabecera)', 'imagina-menu' ),
					'solid'   => __( 'Relleno con el color de acento', 'imagina-menu' ),
					'outline' => __( 'Con borde', 'imagina-menu' ),
				),
			)
		);
		$this->add_control(
			'only',
			array(
				'label'       => __( 'Mostrar en', 'imagina-menu' ),
				'type'        => \Elementor\Controls_Manager::SELECT,
				'default'     => '',
				'options'     => array(
					''        => __( 'Celular y escritorio', 'imagina-menu' ),
					'desktop' => __( 'Solo escritorio', 'imagina-menu' ),
					'mobile'  => __( 'Solo celular y tablet', 'imagina-menu' ),
				),
				'description' => __( 'El ancho de corte está en Imagina Menu → Ajustes.', 'imagina-menu' ),
			)
		);
		$this->add_control(
			'color',
			array(
				'label'     => __( 'Color', 'imagina-menu' ),
				'type'      => \Elementor\Controls_Manager::COLOR,
				'selectors' => array( '{{WRAPPER}} button.imm-toggle' => 'color: {{VALUE}};' ),
			)
		);
		$this->end_controls_section();
	}

	protected function render(): void {
		$s    = $this->get_settings_for_display();
		$html = Toggle::shortcode(
			array(
				'label' => (string) ( $s['label'] ?? '' ),
				'style' => (string) ( $s['button_style'] ?? '' ),
				'only'  => (string) ( $s['only'] ?? '' ),
			)
		);
		if ( '' === $html && \Elementor\Plugin::$instance->editor->is_edit_mode() ) {
			// En el editor puede no haber perfil cargado: un aviso en lugar de un hueco.
			$html = '<span class="imm-toggle-placeholder">☰ ' . esc_html( '' !== (string) ( $s['label'] ?? '' ) ? (string) $s['label'] : __( 'Botón de Imagina Menu', 'imagina-menu' ) ) . '</span>';
		}
		echo $html; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Toggle::shortcode escapa todo.
	}
}
