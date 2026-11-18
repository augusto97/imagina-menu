<?php
declare(strict_types=1);

namespace ImaginaMenu\Compiler;

defined( 'ABSPATH' ) || exit;

use ImaginaMenu\Integrations\Languages;

/**
 * Traduce los textos escritos por el usuario (etiquetas, descripciones, insignias y textos del perfil)
 * con WPML o Polylang, y recoge esas cadenas para registrarlas en su pantalla de traducción.
 *
 * Los ítems generados por fuentes dinámicas no pasan por aquí: llegan ya traducidos desde WordPress.
 */
final class Translator {

	/** @var array<string, string> Cadenas encontradas (nombre => texto original). */
	private array $strings = array();

	public function __construct( private string $lang ) {}

	/** @return array<string, string> */
	public function strings(): array {
		return $this->strings;
	}

	/**
	 * @param list<array<string, mixed>> $items
	 * @return list<array<string, mixed>>
	 */
	public function items( array $items, int $menu_id ): array {
		foreach ( $items as &$item ) {
			if ( in_array( $item['type'], array( 'link', 'heading' ), true ) ) {
				$base                  = 'menu' . $menu_id . '_' . $item['id'];
				$item['label']         = $this->t( $base . '_label', (string) $item['label'] );
				$item['description']   = $this->t( $base . '_desc', (string) $item['description'] );
				$item['badge']['text'] = $this->t( $base . '_badge', (string) $item['badge']['text'] );
			}
			$item['children'] = $this->items( $item['children'] ?? array(), $menu_id );
		}
		unset( $item );
		return $items;
	}

	/**
	 * @param array<string, mixed> $p
	 * @return array<string, mixed>
	 */
	public function profile( array $p ): array {
		$b                                = 'profile' . (int) $p['id'] . '_';
		$p['trigger']['label']            = $this->t( $b . 'trigger', (string) $p['trigger']['label'] );
		$p['drawer']['title']             = $this->t( $b . 'title', (string) $p['drawer']['title'] );
		$p['drawer']['back_label']        = $this->t( $b . 'back', (string) $p['drawer']['back_label'] );
		$p['drawer']['view_all_label']    = $this->t( $b . 'view_all', (string) $p['drawer']['view_all_label'] );
		$p['drawer']['whatsapp']['label'] = $this->t( $b . 'wa_label', (string) $p['drawer']['whatsapp']['label'] );
		$p['drawer']['whatsapp']['message'] = $this->t( $b . 'wa_message', (string) $p['drawer']['whatsapp']['message'] );
		$p['drawer']['cta']['label']      = $this->t( $b . 'cta', (string) $p['drawer']['cta']['label'] );
		foreach ( $p['drawer']['footer_links'] as $i => $link ) {
			$p['drawer']['footer_links'][ $i ]['label'] = $this->t( $b . 'link' . $i, (string) $link['label'] );
		}
		foreach ( $p['bottom_bar']['items'] as $i => $item ) {
			$p['bottom_bar']['items'][ $i ]['label'] = $this->t( $b . 'bar_' . $item['id'], (string) $item['label'] );
		}
		$p['search']['placeholder'] = $this->t( $b . 'search', (string) $p['search']['placeholder'] );
		foreach ( $p['search']['popular'] as $i => $term ) {
			$p['search']['popular'][ $i ] = $this->t( $b . 'popular' . $i, (string) $term );
		}
		return $p;
	}

	/**
	 * Textos propios del menú («Hola, inicia sesión», «Cerrar menú»…) en el idioma que se compila.
	 *
	 * @param array<string, string> $defaults texto fuente => texto con la traducción de WordPress
	 * @return array<string, string>
	 */
	public function ui( array $defaults ): array {
		$out = array();
		foreach ( $defaults as $source => $text ) {
			$out[ $source ] = $this->t( 'ui: ' . $source, $text );
		}
		return $out;
	}

	private function t( string $name, string $value ): string {
		if ( '' === $value ) {
			return '';
		}
		$this->strings[ $name ] = $value;
		return Languages::translate( $name, $value, $this->lang );
	}
}
