<?php
declare(strict_types=1);

namespace ImaginaMenu\Repository;

use ImaginaMenu\Model\Normalizer;

final class MenuRepository extends JsonPostRepository {

	public const POST_TYPE = 'imm_menu';

	protected function post_type(): string {
		return self::POST_TYPE;
	}

	protected function normalize( array $data ): array {
		return Normalizer::menu( $data );
	}
}
