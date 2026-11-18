<?php
declare(strict_types=1);

namespace ImaginaMenu\Repository;

defined( 'ABSPATH' ) || exit;

/**
 * Guarda documentos JSON en un CPT no público.
 *
 * - post_content: la versión publicada (la que se compila para los visitantes). Con revisiones.
 * - meta _imm_draft: el borrador del admin (vista previa). Se borra al publicar.
 *
 * Nada de esto se lee en el frontend: el frontend usa la configuración compilada.
 */
abstract class JsonPostRepository {

	private const DRAFT_META = '_imm_draft';

	abstract protected function post_type(): string;

	/**
	 * @param array<mixed> $data
	 * @return array<string, mixed>
	 */
	abstract protected function normalize( array $data ): array;

	/** @return list<array<string, mixed>> */
	public function all( bool $draft = false ): array {
		$posts = get_posts(
			array(
				'post_type'        => $this->post_type(),
				'post_status'      => 'publish',
				'posts_per_page'   => 200,
				'orderby'          => array( 'menu_order' => 'ASC', 'ID' => 'ASC' ),
				'suppress_filters' => true,
				'no_found_rows'    => true,
			)
		);
		$out   = array();
		foreach ( $posts as $post ) {
			$out[] = $this->from_post( $post, $draft );
		}
		return $out;
	}

	/** @return array<string, mixed>|null */
	public function get( int $id, bool $draft = false ): ?array {
		$post = get_post( $id );
		if ( ! $post || $post->post_type !== $this->post_type() || 'publish' !== $post->post_status ) {
			return null;
		}
		return $this->from_post( $post, $draft );
	}

	/**
	 * Crea un documento nuevo (publicado y sin borrador).
	 *
	 * @param array<mixed> $data
	 */
	public function create( array $data ): int {
		$doc = $this->normalize( $data );
		$id  = self::raw(
			fn() => wp_insert_post(
				array(
					'post_type'    => $this->post_type(),
					'post_status'  => 'publish',
					'post_title'   => (string) $doc['title'],
					// wp_insert_post quita una capa de barras: sin wp_slash, «TV 55"» rompe el JSON.
					'post_content' => wp_slash( $this->encode( $doc ) ),
					'menu_order'   => (int) ( $data['menu_order'] ?? 0 ),
				),
				true
			)
		);
		return is_wp_error( $id ) ? 0 : (int) $id;
	}

	/**
	 * Guarda el borrador (sin tocar lo publicado).
	 *
	 * @param array<mixed> $data
	 */
	public function save_draft( int $id, array $data ): bool {
		if ( ! $this->get( $id ) ) {
			return false;
		}
		$doc       = $this->normalize( $data );
		$doc['id'] = $id;
		update_post_meta( $id, self::DRAFT_META, wp_slash( $this->encode( $doc ) ) );
		\ImaginaMenu\Frontend\Preview::bump();
		return true;
	}

	/** Pasa el borrador a publicado (crea una revisión). */
	public function publish( int $id ): bool {
		$draft = get_post_meta( $id, self::DRAFT_META, true );
		if ( ! is_string( $draft ) || '' === $draft ) {
			return true; // Nada pendiente.
		}
		$doc = json_decode( $draft, true );
		if ( ! is_array( $doc ) ) {
			delete_post_meta( $id, self::DRAFT_META );
			return false;
		}
		$doc    = $this->normalize( $doc );
		$result = self::raw(
			fn() => wp_update_post(
				array(
					'ID'           => $id,
					'post_title'   => (string) $doc['title'],
					'post_content' => wp_slash( $this->encode( $doc ) ),
				),
				true
			)
		);
		delete_post_meta( $id, self::DRAFT_META );
		return ! is_wp_error( $result );
	}

	public function has_draft( int $id ): bool {
		return '' !== (string) get_post_meta( $id, self::DRAFT_META, true );
	}

	public function discard_draft( int $id ): void {
		delete_post_meta( $id, self::DRAFT_META );
		\ImaginaMenu\Frontend\Preview::bump();
	}

	public function set_order( int $id, int $order ): void {
		self::raw(
			fn() => wp_update_post(
				array(
					'ID'         => $id,
					'menu_order' => $order,
				)
			)
		);
	}

	public function delete( int $id ): bool {
		$post = get_post( $id );
		if ( ! $post || $post->post_type !== $this->post_type() ) {
			return false;
		}
		return (bool) self::raw( fn() => wp_delete_post( $id, true ) );
	}

	/** Tipos de contenido del plugin. */
	public const TYPES = array( 'imm_menu', 'imm_profile' );

	/** true mientras escribe este repositorio (la única vía permitida). */
	private static bool $writing = false;

	/**
	 * Defensa en profundidad: los menús y perfiles solo se escriben desde aquí, donde pasan por el
	 * Normalizer y por las comprobaciones de permisos de la API (CSS solo con edit_css, etc.).
	 * Cualquier otra vía (XML-RPC, edición rápida, otros plugins) se aborta.
	 */
	public static function boot(): void {
		add_filter( 'wp_insert_post_empty_content', array( self::class, 'block_insert' ), 99, 2 );
		add_filter( 'pre_delete_post', array( self::class, 'block_delete' ), 99, 2 );
		add_filter( 'pre_trash_post', array( self::class, 'block_delete' ), 99, 2 );
	}

	/**
	 * @param bool         $empty
	 * @param array<mixed> $postarr
	 */
	public static function block_insert( $empty, $postarr ): bool {
		if ( self::$writing || ! is_array( $postarr ) ) {
			return (bool) $empty;
		}
		$type = (string) ( $postarr['post_type'] ?? '' );
		if ( ! empty( $postarr['ID'] ) ) {
			$type = (string) get_post_type( (int) $postarr['ID'] );
		}
		return in_array( $type, self::TYPES, true ) ? true : (bool) $empty;
	}

	/**
	 * @param mixed $check
	 * @param mixed $post
	 * @return mixed
	 */
	public static function block_delete( $check, $post ) {
		if ( ! self::$writing && $post instanceof \WP_Post && in_array( $post->post_type, self::TYPES, true ) ) {
			return false;
		}
		return $check;
	}

	/** Para la desinstalación (borra todo sin pasar por los repositorios). */
	public static function allow_writes( bool $allow ): void {
		self::$writing = $allow;
	}

	/**
	 * El contenido es JSON ya validado por el Normalizer (lista blanca), no HTML: los filtros kses
	 * de WordPress (activos para usuarios sin unfiltered_html) lo alterarían (& → &amp;). Se quitan
	 * solo durante la escritura y solo si estaban activos.
	 *
	 * @template T
	 * @param callable(): T $write
	 * @return T
	 */
	private static function raw( callable $write ) {
		$kses = false !== has_filter( 'content_save_pre', 'wp_filter_post_kses' );
		if ( $kses ) {
			kses_remove_filters();
		}
		$was           = self::$writing;
		self::$writing = true;
		try {
			return $write();
		} finally {
			self::$writing = $was;
			if ( $kses ) {
				kses_init_filters();
			}
		}
	}

	/** @return array<string, mixed> */
	private function from_post( \WP_Post $post, bool $draft ): array {
		$raw = $post->post_content;
		if ( $draft ) {
			$pending = get_post_meta( $post->ID, self::DRAFT_META, true );
			if ( is_string( $pending ) && '' !== $pending ) {
				$raw = $pending;
			}
		}
		$data       = json_decode( $raw, true );
		$doc        = $this->normalize( is_array( $data ) ? $data : array( 'title' => $post->post_title ) );
		$doc['id']  = (int) $post->ID;
		return $doc;
	}

	/** @param array<string, mixed> $doc */
	private function encode( array $doc ): string {
		return (string) wp_json_encode( $doc, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES );
	}
}
