/**
 * Pangolin label → public URL extraction (#2 follow-up).
 *
 * Pangolin Blueprints (https://docs.pangolin.net/manage/blueprints) annotates
 * a container with one or more proxy resources. The relevant labels for URL
 * extraction are:
 *
 *   pangolin.proxy-resources.<name>.name         human-friendly label
 *   pangolin.proxy-resources.<name>.full-domain  public hostname (mandatory)
 *   pangolin.proxy-resources.<name>.protocol     http | https (defaults to https)
 *
 * The `targets[N].port` family is intentionally ignored — Pangolin terminates
 * the public connection at full-domain; the internal target port is not part
 * of the URL a user sees.
 *
 * Returns one URL per resource that declares a full-domain. Multiple
 * resources on the same container yield multiple URLs. Identical URLs across
 * different resources are deduped.
 *
 * dockhand.url labels override this — Pangolin extraction is a fallback,
 * never a winner over an explicit user-provided URL.
 */
export interface PangolinUrl {
	url: string;
	/** The Pangolin resource key (the `<name>` in the label key). */
	resource: string;
	/** Optional human-friendly name from the `.name` label, if set. */
	displayName?: string;
}

const RESOURCE_KEY_RE =
	/^pangolin\.proxy-resources\.([^.]+)\.(full-domain|protocol|name)$/;

export function extractPangolinUrls(
	labels: Record<string, string> | undefined | null
): PangolinUrl[] {
	if (!labels) return [];

	// Group label values by resource key.
	const byResource = new Map<
		string,
		{ fullDomain?: string; protocol?: string; name?: string }
	>();

	for (const [key, value] of Object.entries(labels)) {
		const m = key.match(RESOURCE_KEY_RE);
		if (!m) continue;
		const [, resource, field] = m;
		let entry = byResource.get(resource);
		if (!entry) {
			entry = {};
			byResource.set(resource, entry);
		}
		const v = (value ?? '').trim();
		if (!v) continue;
		if (field === 'full-domain') entry.fullDomain = v;
		else if (field === 'protocol') entry.protocol = v.toLowerCase();
		else if (field === 'name') entry.name = v;
	}

	const out: PangolinUrl[] = [];
	const seen = new Set<string>();

	for (const [resource, entry] of byResource) {
		if (!entry.fullDomain) continue;

		const proto =
			entry.protocol === 'http' || entry.protocol === 'https'
				? entry.protocol
				: 'https';

		const url = `${proto}://${entry.fullDomain}`;
		if (seen.has(url)) continue;
		seen.add(url);

		out.push({
			url,
			resource,
			displayName: entry.name
		});
	}

	return out;
}
