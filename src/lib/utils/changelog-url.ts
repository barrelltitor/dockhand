/**
 * Resolve a changelog / release-notes URL for a container image (#538).
 *
 * Three tiers in priority order:
 *  1. `dockhand.changelog.url` label  — explicit override set by the image
 *     author or at runtime via `--label dockhand.changelog.url=…`. Wins over
 *     everything. Pattern matches the existing dockhand.* label convention.
 *  2. `org.opencontainers.image.source` label — the OCI standard. When it
 *     points at github.com the canonical changelog page is `<source>/releases`.
 *  3. GHCR images — `ghcr.io/<owner>/<repo>` is always the same as
 *     `github.com/<owner>/<repo>`, so the release page is deterministic.
 *
 * No tier 3-style fuzzy match against Docker Hub. Wrong-repo matches are a
 * worse UX than no link, and there is no good answer for unlabelled
 * upstream images like `nginx:latest` (nginx's changelog isn't on GitHub).
 *
 * Pure function: deterministic, no I/O, safe to call from a render loop.
 */

const GITHUB_HOST = 'github.com';
const GHCR_PREFIX = 'ghcr.io/';

function stripTrailingSlash(s: string): string {
	return s.endsWith('/') ? s.slice(0, -1) : s;
}

function stripImageTag(image: string): string {
	// "image@sha256:…" — split on @ first so we don't lose the digest fragment.
	const atIdx = image.indexOf('@');
	const withoutDigest = atIdx >= 0 ? image.slice(0, atIdx) : image;
	const colonIdx = withoutDigest.lastIndexOf(':');
	// A colon before a slash is a port in a registry hostname, not a tag.
	if (colonIdx > withoutDigest.lastIndexOf('/')) {
		return withoutDigest.slice(0, colonIdx);
	}
	return withoutDigest;
}

export function resolveChangelogUrl(
	imageName: string | null | undefined,
	labels?: Record<string, string> | null
): string | null {
	if (!imageName) return null;

	const override = labels?.['dockhand.changelog.url'];
	if (override && override.trim()) return override.trim();

	const source = labels?.['org.opencontainers.image.source'];
	if (source && source.includes(GITHUB_HOST)) {
		return stripTrailingSlash(source) + '/releases';
	}

	if (imageName.startsWith(GHCR_PREFIX)) {
		const repo = stripImageTag(imageName.slice(GHCR_PREFIX.length));
		// Sanity guard: GHCR images are always owner/repo. Single-segment values
		// like `ghcr.io/something` are malformed; skip rather than emit a bad URL.
		if (repo.split('/').length >= 2) {
			return `https://github.com/${repo}/releases`;
		}
	}

	return null;
}
