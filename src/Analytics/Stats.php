<?php
declare(strict_types=1);

namespace ImaginaMenu\Analytics;

defined( 'ABSPATH' ) || exit;

use ImaginaMenu\Compiler\Storage;
use ImaginaMenu\Repository\SettingsRepository;

/**
 * Analítica propia, sin cookies ni datos personales: solo contadores diarios por ítem y evento.
 *
 * - Cada clic llega a /hit (navigator.sendBeacon) y se añade como una línea a un archivo de cola:
 *   ninguna escritura en la base de datos por visita.
 * - Cada 5 minutos (WP-Cron) la cola se agrega y se suma a la tabla imm_stats.
 * - Se conserva lo que diga «retención» (180 días por defecto).
 */
final class Stats {

	public const EVENTS     = array( 'open', 'click', 'search', 'bbar' );
	public const CRON       = 'imm_flush_hits';
	private const MAX_QUEUE = 2 * MB_IN_BYTES;

	/** Máximo de eventos que cuenta un mismo visitante por día y por ítem + evento (anti-relleno). */
	private const MAX_PER_VISITOR = 60;
	private const MAX_PER_ITEM    = 3;
	/** Por IP (varios visitantes pueden compartirla, p. ej. redes móviles): tope más alto. */
	private const MAX_PER_IP = 400;
	/** Por IP e ítem: aunque cambie de navegador en cada petición, un origen no infla un ítem. */
	private const MAX_PER_IP_ITEM = 50;
	/** Freno por minuto e IP (con APCu). */
	private const MAX_PER_MINUTE = 120;

	/** Cabecera de la cola: si alguien pide el archivo por URL, PHP lo ejecuta y no muestra nada. */
	private const QUEUE_HEADER = "<?php exit; ?>\n";

	public static function table(): string {
		global $wpdb;
		return $wpdb->prefix . 'imm_stats';
	}

	public static function install(): void {
		global $wpdb;
		require_once ABSPATH . 'wp-admin/includes/upgrade.php';
		$charset = $wpdb->get_charset_collate();
		dbDelta(
			'CREATE TABLE ' . self::table() . " (
				day date NOT NULL,
				profile_id bigint(20) unsigned NOT NULL DEFAULT 0,
				item_id varchar(24) NOT NULL DEFAULT '',
				event varchar(10) NOT NULL,
				count int(10) unsigned NOT NULL DEFAULT 0,
				PRIMARY KEY  (day,profile_id,item_id,event)
			) $charset;"
		);
	}

	public static function boot(): void {
		add_filter( 'cron_schedules', array( self::class, 'schedules' ) ); // phpcs:ignore WordPress.WP.CronInterval.CronSchedulesInterval -- cada 5 minutos a propósito.
		add_action( self::CRON, array( self::class, 'flush' ) );
	}

	/**
	 * @param array<string, array{interval: int, display: string}> $schedules
	 * @return array<string, array{interval: int, display: string}>
	 */
	public static function schedules( array $schedules ): array {
		$schedules['imm_5min'] = array(
			'interval' => 5 * MINUTE_IN_SECONDS,
			'display'  => 'Imagina Menu: cada 5 minutos',
		);
		return $schedules;
	}

	/** Programa o quita el vaciado de la cola según los ajustes (se llama al publicar). */
	public static function sync_schedule( bool $enabled ): void {
		$next = wp_next_scheduled( self::CRON );
		if ( $enabled && ! $next ) {
			wp_schedule_event( time() + 5 * MINUTE_IN_SECONDS, 'imm_5min', self::CRON );
		} elseif ( ! $enabled && $next ) {
			wp_clear_scheduled_hook( self::CRON );
		}
	}

	/**
	 * Cola de eventos. Es un .php con «exit» al principio y un nombre impredecible: no se puede
	 * descargar aunque el servidor ignore .htaccess (nginx, OpenLiteSpeed).
	 */
	private static function queue_file(): string {
		return Storage::config_dir() . '/hits-' . substr( wp_hash( 'imm-hits-queue' ), 0, 16 ) . '.php';
	}

	/** Rangos oficiales de Cloudflare (https://www.cloudflare.com/ips/). */
	private const CLOUDFLARE = array(
		'173.245.48.0/20', '103.21.244.0/22', '103.22.200.0/22', '103.31.4.0/22', '141.101.64.0/18', '108.162.192.0/18',
		'190.93.240.0/20', '188.114.96.0/20', '197.234.240.0/22', '198.41.128.0/17', '162.158.0.0/15', '104.16.0.0/13',
		'104.24.0.0/14', '172.64.0.0/13', '131.0.72.0/22', '2400:cb00::/32', '2606:4700::/32', '2803:f800::/32',
		'2405:b500::/32', '2405:8100::/32', '2a06:98c0::/29', '2c0f:f248::/32',
	);

	/**
	 * IP del visitante. CF-Connecting-IP solo se cree si la conexión viene de Cloudflare: si no,
	 * cualquiera podría inventar una IP distinta en cada petición.
	 */
	public static function client_ip(): string {
		$remote = isset( $_SERVER['REMOTE_ADDR'] ) ? (string) $_SERVER['REMOTE_ADDR'] : ''; // phpcs:ignore WordPress.Security.ValidatedSanitizedInput -- se valida abajo.
		$remote = false !== filter_var( $remote, FILTER_VALIDATE_IP ) ? $remote : '';
		$cf     = isset( $_SERVER['HTTP_CF_CONNECTING_IP'] ) ? (string) $_SERVER['HTTP_CF_CONNECTING_IP'] : ''; // phpcs:ignore WordPress.Security.ValidatedSanitizedInput
		if ( '' !== $remote && false !== filter_var( $cf, FILTER_VALIDATE_IP ) && self::in_ranges( $remote, self::CLOUDFLARE ) ) {
			return $cf;
		}
		return $remote;
	}

	/** @param list<string> $ranges */
	public static function in_ranges( string $ip, array $ranges ): bool {
		$bin = @inet_pton( $ip ); // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged
		if ( false === $bin ) {
			return false;
		}
		foreach ( $ranges as $range ) {
			[ $net, $bits ] = explode( '/', $range );
			$net_bin        = @inet_pton( $net ); // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged
			if ( false === $net_bin || strlen( $net_bin ) !== strlen( $bin ) ) {
				continue;
			}
			$bits  = (int) $bits;
			$bytes = intdiv( $bits, 8 );
			if ( substr( $bin, 0, $bytes ) !== substr( $net_bin, 0, $bytes ) ) {
				continue;
			}
			$rest = $bits % 8;
			if ( 0 === $rest || ( ( ord( $bin[ $bytes ] ) ^ ord( $net_bin[ $bytes ] ) ) & ( 0xFF << ( 8 - $rest ) ) & 0xFF ) === 0 ) {
				return true;
			}
		}
		return false;
	}

	/**
	 * Identificadores anónimos (no reversibles, cambian cada día): solo sirven para que un mismo
	 * origen no pueda inflar las cifras. No se guarda la IP.
	 *
	 * @return array{visitor: string, ip: string} visitor = IP + navegador; ip = solo la IP.
	 */
	public static function visitor(): array {
		$ip   = self::client_ip();
		$ua   = isset( $_SERVER['HTTP_USER_AGENT'] ) ? substr( (string) $_SERVER['HTTP_USER_AGENT'], 0, 200 ) : ''; // phpcs:ignore WordPress.Security.ValidatedSanitizedInput -- solo dentro de un hash.
		$salt = wp_salt( 'nonce' ) . gmdate( 'Y-m-d' );
		return array(
			'visitor' => substr( hash_hmac( 'sha256', $ip . '|' . $ua, $salt ), 0, 12 ),
			'ip'      => substr( hash_hmac( 'sha256', $ip, $salt ), 0, 12 ),
		);
	}

	/** Freno inmediato por IP (solo si hay APCu: sin escribir en la base de datos). */
	public static function throttled( string $ip_key ): bool {
		if ( ! function_exists( 'apcu_inc' ) || ! apcu_enabled() ) {
			return false;
		}
		$key = 'imm_hit_' . $ip_key . '_' . intdiv( time(), 60 );
		$n   = apcu_inc( $key, 1, $ok, 120 );
		return is_int( $n ) && $n > self::MAX_PER_MINUTE;
	}

	/**
	 * Añade un evento a la cola. Con la cola casi llena se registra una muestra (1 de cada 4) en
	 * vez de descartar todo; llena, se descarta.
	 *
	 * @param array{visitor: string, ip: string} $who
	 */
	public static function record( int $profile, string $event, string $item, array $who ): bool {
		$file = self::queue_file();
		if ( ! is_dir( Storage::config_dir() ) ) {
			return false; // Sin compilación previa no hay dónde escribir (y no se crea nada aquí).
		}
		clearstatcache( true, $file );
		$size = is_file( $file ) ? (int) filesize( $file ) : 0;
		if ( $size > self::MAX_QUEUE || ( $size > self::MAX_QUEUE * 0.75 && wp_rand( 1, 4 ) > 1 ) ) {
			return false;
		}
		$clean = static fn( string $v ): string => preg_replace( '/[^a-f0-9]/', '', $v ) ?? '';
		$line  = gmdate( 'Y-m-d' ) . "\t" . $profile . "\t" . $event . "\t" . $item . "\t" . $clean( $who['visitor'] ) . "\t" . $clean( $who['ip'] ) . "\n";
		$fh    = @fopen( $file, 'ab' ); // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged, WordPress.WP.AlternativeFunctions.file_system_operations_fopen
		if ( ! $fh ) {
			return false;
		}
		flock( $fh, LOCK_EX );
		// La cabecera se escribe bajo el cerrojo si el archivo está vacío: aunque flush() lo haya
		// renombrado justo antes, el nuevo archivo nunca queda sin «exit».
		$stat = fstat( $fh );
		if ( ! $stat || 0 === (int) $stat['size'] ) {
			fwrite( $fh, self::QUEUE_HEADER ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_fwrite
		}
		$ok = false !== fwrite( $fh, $line ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_fwrite
		flock( $fh, LOCK_UN );
		fclose( $fh ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_fclose
		return $ok;
	}

	/** Agrega la cola en la tabla y limpia lo antiguo. */
	public static function flush(): void {
		global $wpdb;
		$file = self::queue_file();
		// Cola de versiones anteriores (texto plano): se descarta.
		if ( is_file( Storage::config_dir() . '/hits.log' ) ) {
			wp_delete_file( Storage::config_dir() . '/hits.log' );
		}
		if ( is_file( $file ) ) {
			$work = $file . '.' . wp_generate_password( 12, false ) . '.php';
			if ( @rename( $file, $work ) ) { // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged, WordPress.WP.AlternativeFunctions.rename_rename
				$counts      = array();
				$per_visitor = array();
				$per_item    = array();
				$per_ip      = array();
				$per_ip_item = array();
				foreach ( (array) file( $work, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES ) as $line ) {
					$parts = explode( "\t", (string) $line );
					if ( 6 !== count( $parts ) || ! preg_match( '/^\d{4}-\d{2}-\d{2}$/', $parts[0] ) || ! ctype_digit( $parts[1] ) || ! in_array( $parts[2], self::EVENTS, true ) || ! preg_match( '/^[a-z0-9_]{0,24}$/', $parts[3] ) ) {
						continue; // Incluye la línea de cabecera de la cola.
					}
					[ $day, $profile, $event, $item, $visitor, $ip ] = $parts;
					$pkey                 = $day . $ip;
					$pikey                = $pkey . "\t" . $event . "\t" . $item;
					$per_ip[ $pkey ]      = ( $per_ip[ $pkey ] ?? 0 ) + 1;
					$per_ip_item[ $pikey ] = ( $per_ip_item[ $pikey ] ?? 0 ) + 1;
					if ( '' === $ip || $per_ip[ $pkey ] > self::MAX_PER_IP || $per_ip_item[ $pikey ] > self::MAX_PER_IP_ITEM ) {
						continue;
					}
					// Un mismo visitante no puede inflar las cifras: tope diario y por ítem.
					$vkey = $day . $visitor;
					$ikey = $vkey . "\t" . $event . "\t" . $item;
					$per_visitor[ $vkey ] = ( $per_visitor[ $vkey ] ?? 0 ) + 1;
					$per_item[ $ikey ]    = ( $per_item[ $ikey ] ?? 0 ) + 1;
					if ( '' === $visitor || $per_visitor[ $vkey ] > self::MAX_PER_VISITOR || $per_item[ $ikey ] > self::MAX_PER_ITEM ) {
						continue;
					}
					$key            = $day . "\t" . $profile . "\t" . $event . "\t" . $item;
					$counts[ $key ] = ( $counts[ $key ] ?? 0 ) + 1;
				}
				$table = self::table();
				foreach ( $counts as $key => $n ) {
					[ $day, $profile, $event, $item ] = explode( "\t", $key );
					// phpcs:disable WordPress.DB.PreparedSQL.InterpolatedNotPrepared, WordPress.DB.DirectDatabaseQuery
					$updated = $wpdb->query( $wpdb->prepare( "UPDATE $table SET count = count + %d WHERE day = %s AND profile_id = %d AND item_id = %s AND event = %s", $n, $day, (int) $profile, $item, $event ) );
					if ( ! $updated ) {
						$wpdb->insert(
							$table,
							array(
								'day'        => $day,
								'profile_id' => (int) $profile,
								'item_id'    => $item,
								'event'      => $event,
								'count'      => $n,
							),
							array( '%s', '%d', '%s', '%s', '%d' )
						);
					}
					// phpcs:enable
				}
				wp_delete_file( $work );
			}
		}
		$retention = (int) ( new SettingsRepository() )->get()['analytics']['retention'];
		$wpdb->query( $wpdb->prepare( 'DELETE FROM ' . self::table() . ' WHERE day < %s', gmdate( 'Y-m-d', time() - $retention * DAY_IN_SECONDS ) ) ); // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.DirectDatabaseQuery
	}

	/**
	 * Resumen para el admin.
	 *
	 * @return array<string, mixed>
	 */
	public static function summary( int $days, int $profile ): array {
		global $wpdb;
		self::flush(); // Que el admin vea lo último.
		$from  = gmdate( 'Y-m-d', time() - ( $days - 1 ) * DAY_IN_SECONDS );
		$table = self::table();
		$where = $profile > 0 ? $wpdb->prepare( ' AND profile_id = %d', $profile ) : '';

		// phpcs:disable WordPress.DB.PreparedSQL.InterpolatedNotPrepared, WordPress.DB.DirectDatabaseQuery
		$rows = (array) $wpdb->get_results( $wpdb->prepare( "SELECT day, event, SUM(count) AS n FROM $table WHERE day >= %s $where GROUP BY day, event", $from ), ARRAY_A );
		$top  = (array) $wpdb->get_results( $wpdb->prepare( "SELECT profile_id, item_id, SUM(count) AS n FROM $table WHERE day >= %s AND event IN ('click','bbar') AND item_id <> '' $where GROUP BY profile_id, item_id ORDER BY n DESC LIMIT 200", $from ), ARRAY_A );
		// phpcs:enable

		$series = array();
		for ( $i = $days - 1; $i >= 0; $i-- ) {
			$day            = gmdate( 'Y-m-d', time() - $i * DAY_IN_SECONDS );
			$series[ $day ] = array_fill_keys( self::EVENTS, 0 ) + array( 'day' => $day );
		}
		$totals = array_fill_keys( self::EVENTS, 0 );
		foreach ( $rows as $row ) {
			if ( isset( $series[ $row['day'] ] ) && in_array( $row['event'], self::EVENTS, true ) ) {
				$series[ $row['day'] ][ $row['event'] ] += (int) $row['n'];
				$totals[ $row['event'] ]                += (int) $row['n'];
			}
		}

		$labels  = get_option( 'imm_labels', array() );
		$labels  = is_array( $labels ) ? $labels : array();
		$clicked = array();
		$top_out = array();
		foreach ( $top as $row ) {
			$label                       = $labels[ (int) $row['profile_id'] ][ $row['item_id'] ] ?? '';
			$clicked[ $row['item_id'] ] = true;
			if ( count( $top_out ) < 25 ) {
				$top_out[] = array(
					'id'    => $row['item_id'],
					'label' => '' !== $label ? $label : $row['item_id'],
					'count' => (int) $row['n'],
				);
			}
		}
		$unused = array();
		foreach ( $labels as $pid => $map ) {
			if ( $profile > 0 && (int) $pid !== $profile ) {
				continue;
			}
			foreach ( (array) $map as $id => $label ) {
				if ( ! isset( $clicked[ $id ] ) ) {
					$unused[ $id ] = array(
						'id'    => (string) $id,
						'label' => (string) $label,
					);
				}
			}
		}

		$settings = ( new SettingsRepository() )->get()['analytics'];
		return array(
			'days'    => array_values( $series ),
			'totals'  => $totals,
			'top'     => $top_out,
			'unused'  => array_values( array_slice( $unused, 0, 100 ) ),
			'enabled' => (bool) $settings['enabled'],
			'ga4'     => (bool) $settings['ga4'],
		);
	}
}
