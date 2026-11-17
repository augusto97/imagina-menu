<?php
declare(strict_types=1);

namespace ImaginaMenu\Repository;

use ImaginaMenu\Model\Normalizer;

final class ProfileRepository extends JsonPostRepository {

	public const POST_TYPE = 'imm_profile';

	protected function post_type(): string {
		return self::POST_TYPE;
	}

	protected function normalize( array $data ): array {
		return Normalizer::profile( $data );
	}
}
