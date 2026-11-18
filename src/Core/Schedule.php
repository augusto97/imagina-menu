<?php
declare(strict_types=1);

namespace ImaginaMenu\Core;

defined( 'ABSPATH' ) || exit;

use ImaginaMenu\Integrations\CachePurge;

/**
 * Campañas programadas: perfiles (regla «fechas»), ítems y banners con inicio y fin.
 *
 * El HTML del menú se compila una vez y las páginas viven en la caché (LiteSpeed, WP Rocket,
 * Cloudflare), así que «ahora» no se evalúa en cada visita: al publicar se agenda un evento de
 * WP-Cron en el próximo límite (inicio o fin de algo). Ese evento vuelve a compilar (los ítems y
 * banners entran o salen del HTML) y vacía la caché del sitio (los perfiles por fecha cambian de
 * página sin que cambie el HTML compilado). Luego agenda el siguiente límite.
 *
 * Las fechas se escriben en la hora del sitio (Ajustes → Generales → Zona horaria) con el formato
 * de <input type="datetime-local">: «2026-11-27T00:00».
 */
final class Schedule {

	public const HOOK = 'imm_schedule_tick';

	private const FORMAT = '/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/';

	public static function boot(): void {
		add_action( self::HOOK, array( self::class, 'tick' ) );
	}

	/** Fecha válida («2026-11-27T00:00») o ''. */
	public static function clean( mixed $value ): string {
		$value = substr( trim( (string) $value ), 0, 16 );
		return 1 === preg_match( self::FORMAT, $value ) && 0 !== self::ts( $value ) ? $value : '';
	}

	/** Marca de tiempo de una fecha en la hora del sitio (0 si está vacía o no es válida). */
	public static function ts( string $local ): int {
		if ( '' === $local || 1 !== preg_match( self::FORMAT, $local ) ) {
			return 0;
		}
		$zone = function_exists( 'wp_timezone' ) ? wp_timezone() : new \DateTimeZone( 'UTC' );
		$date = \DateTimeImmutable::createFromFormat( '!Y-m-d\TH:i', $local, $zone );
		// PHP desborda las fechas imposibles (mes 13 → enero siguiente): solo vale si vuelve igual.
		return $date && $date->format( 'Y-m-d\TH:i' ) === $local ? $date->getTimestamp() : 0;
	}

	/**
	 * ¿Está vigente? Sin fechas, siempre. El fin no se incluye (hasta las 23:59 → «…T23:59»).
	 *
	 * @param array{from?: string, to?: string} $window
	 */
	public static function active( array $window, int $now ): bool {
		$from = self::ts( (string) ( $window['from'] ?? '' ) );
		$to   = self::ts( (string) ( $window['to'] ?? '' ) );
		return ( 0 === $from || $now >= $from ) && ( 0 === $to || $now < $to );
	}

	/**
	 * Límites (inicio y fin) de una ventana.
	 *
	 * @param array{from?: string, to?: string} $window
	 * @return list<int>
	 */
	public static function bounds( array $window ): array {
		return array_values( array_filter( array( self::ts( (string) ( $window['from'] ?? '' ) ), self::ts( (string) ( $window['to'] ?? '' ) ) ) ) );
	}

	/**
	 * Agenda el próximo límite futuro (o ninguno).
	 *
	 * @param list<int> $bounds
	 */
	public static function sync( array $bounds, ?int $now = null ): int {
		$now    = $now ?? time();
		$future = array_filter( $bounds, static fn( $t ) => $t > $now );
		$next   = $future ? min( $future ) : 0;
		$queued = (int) wp_next_scheduled( self::HOOK );
		if ( $queued && $queued !== $next + 1 ) {
			wp_clear_scheduled_hook( self::HOOK );
			$queued = 0;
		}
		if ( $next && ! $queued ) {
			// Un segundo después del límite: la comparación del fin es estricta.
			wp_schedule_single_event( $next + 1, self::HOOK );
		}
		return $next;
	}

	/** Llegó un límite: compilar de nuevo y vaciar la caché (la compilación agenda el siguiente). */
	public static function tick(): void {
		$state = Plugin::compiler()->publish( false );
		if ( ! empty( $state['ok'] ) ) {
			CachePurge::purge_all();
		}
	}
}
