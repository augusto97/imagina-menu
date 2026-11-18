<?php
// Firmas mínimas de los plugins con los que se integra (solo para PHPStan; no se cargan nunca).
// phpcs:ignoreFile

namespace Elementor {
	abstract class Widget_Base {
		/** @return array<string, mixed> */
		public function get_settings_for_display() { return array(); }
		/** @param array<string, mixed> $args */
		public function start_controls_section( string $id, array $args = array() ): void {}
		public function end_controls_section(): void {}
		/** @param array<string, mixed> $args */
		public function add_control( string $id, array $args = array() ): void {}
	}
	class Controls_Manager {
		const TEXT   = 'text';
		const SELECT = 'select';
		const COLOR  = 'color';
	}
	class Editor {
		public function is_edit_mode(): bool { return false; }
	}
	class Plugin {
		/** @var Plugin */
		public static $instance;
		/** @var Editor */
		public $editor;
	}
}

namespace {
	class WSS_Frontend {
		/** @param array<string, mixed> $atts */
		public function get_search_widget_html( $atts = array() ): string { return ''; }
	}
	class YITH_WCWL {
		public static function get_instance(): self { return new self(); }
		public function get_wishlist_url( string $action = '' ): string { return ''; }
	}
	function yith_wcwl_count_all_products(): int { return 0; }
	class TInvWL_Public_WishlistCounter {
		public static function instance( string $plugin_name = '' ): self { return new self(); }
		public function counter(): int { return 0; }
	}
	function tinv_url_wishlist_default(): string { return ''; }
}

namespace {
	// Polylang (solo las funciones que usa Integrations\Languages).
	function pll_default_language( string $field = 'slug' ): string|false { return ''; }
	/** @param array<string, mixed> $args @return list<mixed> */
	function pll_languages_list( array $args = array() ): array { return array(); }
	function pll_current_language( string $field = 'slug' ): string|false { return ''; }
	function pll_get_post( int $id, string $lang = '' ): int|false|null { return 0; }
	function pll_get_term( int $id, string $lang = '' ): int|false|null { return 0; }
}
