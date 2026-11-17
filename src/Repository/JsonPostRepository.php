<?php
declare(strict_types=1);

namespace ImaginaMenu\Repository;

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
		$id  = wp_insert_post(
			array(
				'post_type'    => $this->post_type(),
				'post_status'  => 'publish',
				'post_title'   => (string) $doc['title'],
				'post_content' => $this->encode( $doc ),
				'menu_order'   => (int) ( $data['menu_order'] ?? 0 ),
			),
			true
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
		$result = wp_update_post(
			array(
				'ID'           => $id,
				'post_title'   => (string) $doc['title'],
				'post_content' => wp_slash( $this->encode( $doc ) ),
			),
			true
		);
		delete_post_meta( $id, self::DRAFT_META );
		return ! is_wp_error( $result );
	}

	public function has_draft( int $id ): bool {
		return '' !== (string) get_post_meta( $id, self::DRAFT_META, true );
	}

	public function discard_draft( int $id ): void {
		delete_post_meta( $id, self::DRAFT_META );
	}

	public function set_order( int $id, int $order ): void {
		wp_update_post(
			array(
				'ID'         => $id,
				'menu_order' => $order,
			)
		);
	}

	public function delete( int $id ): bool {
		$post = get_post( $id );
		if ( ! $post || $post->post_type !== $this->post_type() ) {
			return false;
		}
		return (bool) wp_delete_post( $id, true );
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
