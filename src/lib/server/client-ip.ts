/**
 * Resolve the client IP for rate limiting, logging, and audit.
 *
 * Defaults to the socket-level IP via getClientAddress(). X-Forwarded-For
 * is consulted only when TRUST_FORWARDED_HEADERS=true is set explicitly —
 * intended for deployments behind a reverse proxy (Traefik, nginx, Caddy)
 * that controls XFF. In that mode the right-most XFF entry (closest to the
 * trusted proxy) is returned; earlier entries in the chain are ignored.
 */

type IpEventLike = {
	request: Request;
	getClientAddress?: () => string;
};

function normalize(ip: string | null | undefined): string {
	if (!ip) return 'unknown';
	if (ip === '::1' || ip === '::ffff:127.0.0.1') return '127.0.0.1';
	if (ip.startsWith('::ffff:')) return ip.substring(7);
	return ip;
}

export function getClientIp(event: IpEventLike): string {
	if (process.env.TRUST_FORWARDED_HEADERS === 'true') {
		const xff = event.request.headers.get('x-forwarded-for');
		if (xff) {
			const parts = xff.split(',').map((p) => p.trim()).filter(Boolean);
			if (parts.length > 0) return normalize(parts[parts.length - 1]);
		}
		const realIp = event.request.headers.get('x-real-ip');
		if (realIp) return normalize(realIp.trim());
	}

	try {
		const addr = event.getClientAddress?.();
		if (addr) return normalize(addr);
	} catch {
		// getClientAddress may throw if unavailable (test contexts, raw upgrades)
	}
	return 'unknown';
}
