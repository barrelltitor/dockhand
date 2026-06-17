/**
 * Traefik label → public URL extraction (#2).
 *
 * Parses standard Traefik v2/v3 router labels on a container:
 *   traefik.http.routers.<name>.rule         e.g. Host(`app.example.com`)
 *   traefik.http.routers.<name>.entrypoints  e.g. websecure
 *   traefik.http.routers.<name>.tls          e.g. true
 *
 * Returns one URL per router whose rule contains at least one Host() match.
 * Multiple Host() entries on the same router yield multiple URLs. Path
 * prefixes (e.g. `Host(`x`) && PathPrefix(`/api`)`) are appended so the link
 * lands on the actual served path.
 *
 * Scheme inference (in order):
 *   1. explicit `tls=true` → https
 *   2. entrypoints contains "websecure" → https
 *   3. entrypoints contains "web" (and no secure variant) → http
 *   4. default → https (the overwhelmingly common production setup)
 *
 * dockhand.url labels override this — Traefik extraction is a fallback,
 * never a winner over an explicit user-provided URL.
 */
export interface TraefikUrl {
	url: string;
	router: string;
}

const ROUTER_RULE_RE = /^traefik\.http\.routers\.([^.]+)\.rule$/;
// Host(`a.b.c`) or Host("a.b.c") or Host('a.b.c') — Traefik accepts all three quotings.
const HOST_RE = /Host\(\s*[`"']([^`"']+)[`"']\s*\)/g;
// PathPrefix(`/api`) — same quoting variations.
const PATH_PREFIX_RE = /PathPrefix\(\s*[`"']([^`"']+)[`"']\s*\)/;

export function extractTraefikUrls(
	labels: Record<string, string> | undefined | null
): TraefikUrl[] {
	if (!labels) return [];

	const out: TraefikUrl[] = [];
	const seen = new Set<string>();

	for (const [key, rule] of Object.entries(labels)) {
		const m = key.match(ROUTER_RULE_RE);
		if (!m) continue;
		const router = m[1];

		const hosts: string[] = [];
		let hostMatch: RegExpExecArray | null;
		HOST_RE.lastIndex = 0;
		while ((hostMatch = HOST_RE.exec(rule)) !== null) {
			hosts.push(hostMatch[1]);
		}
		if (hosts.length === 0) continue;

		const pathMatch = rule.match(PATH_PREFIX_RE);
		const path = pathMatch ? pathMatch[1] : '';

		const scheme = inferScheme(labels, router);

		for (const host of hosts) {
			const url = `${scheme}://${host}${path}`;
			if (seen.has(url)) continue;
			seen.add(url);
			out.push({ url, router });
		}
	}

	return out;
}

function inferScheme(labels: Record<string, string>, router: string): 'http' | 'https' {
	const tls = labels[`traefik.http.routers.${router}.tls`];
	if (tls && /^true$/i.test(tls.trim())) return 'https';

	const entrypoints = labels[`traefik.http.routers.${router}.entrypoints`] || '';
	const eps = entrypoints
		.split(',')
		.map((s) => s.trim().toLowerCase())
		.filter(Boolean);

	if (eps.includes('websecure') || eps.includes('https')) return 'https';
	if (eps.length > 0 && (eps.includes('web') || eps.includes('http'))) return 'http';

	return 'https';
}
