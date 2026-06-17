/**
 * Detect the on-host Docker socket path for a remote daemon (#1076).
 *
 * Used by the vulnerability scanner when it needs to bind-mount the daemon
 * socket into a helper container running on that daemon. Docker daemons use
 * /var/run/docker.sock; Podman uses /run/podman/podman.sock (rootful) or
 * /run/user/UID/podman/podman.sock (rootless). Hardcoding /var/run/docker.sock
 * breaks Podman with a mkdir-permission-denied error.
 *
 * Detection runs against the remote daemon over the same connection
 * Dockhand already uses (socket / direct TCP / Hawser), so no agent change
 * is required.
 *
 * Result is cached per envId for 5 minutes — daemon identity doesn't change
 * during a process lifetime in practice, but the short TTL lets us recover
 * if the user reconfigures an env to point at a different daemon.
 */
import { dockerFetch } from './docker';

const CACHE_TTL_MS = 5 * 60 * 1000;
const cache = new Map<number, { path: string; expires: number }>();

const DEFAULT_DOCKER_SOCKET = '/var/run/docker.sock';
const PODMAN_ROOTFUL_SOCKET = '/run/podman/podman.sock';

export function clearRemoteSocketCache(envId?: number): void {
	if (envId === undefined) cache.clear();
	else cache.delete(envId);
}

/**
 * Returns the absolute path to the daemon's API socket on its own host.
 *
 * Best-effort: any failure falls back to /var/run/docker.sock, which matches
 * the historic behaviour and is correct for stock Docker.
 */
export async function detectRemoteSocketPath(envId: number | undefined): Promise<string> {
	if (envId === undefined) return DEFAULT_DOCKER_SOCKET;

	const cached = cache.get(envId);
	if (cached && cached.expires > Date.now()) return cached.path;

	let path = DEFAULT_DOCKER_SOCKET;
	try {
		const isPodman = await daemonIsPodman(envId);
		if (isPodman) {
			path = (await detectPodmanSocketPath(envId)) ?? PODMAN_ROOTFUL_SOCKET;
		}
	} catch (err) {
		console.warn(
			`[Scanner] detectRemoteSocketPath(env=${envId}) failed, defaulting to ${DEFAULT_DOCKER_SOCKET}:`,
			(err as Error)?.message ?? err
		);
	}

	cache.set(envId, { path, expires: Date.now() + CACHE_TTL_MS });
	return path;
}

/**
 * Returns true when the remote daemon identifies itself as Podman.
 * Used by both the scanner socket-path detection and the env list pill.
 * Any transport / parse failure returns false — callers treat "unknown"
 * as "assume Docker" so a transient network hiccup never breaks the UI.
 */
export async function daemonIsPodman(envId: number): Promise<boolean> {
	try {
		// Docker-compat /version returns Components[].Name. Podman labels
		// itself "Podman Engine"; Docker uses "Engine".
		const res = await dockerFetch('/version', {}, envId);
		if (!res.ok) return false;
		const data = (await res.json()) as { Components?: Array<{ Name?: string }> };
		const components = data.Components ?? [];
		return components.some((c) => typeof c?.Name === 'string' && c.Name.includes('Podman'));
	} catch {
		return false;
	}
}

interface PodmanLibpodInfo {
	host?: {
		security?: { rootless?: boolean };
		idMappings?: { uidmap?: Array<{ host_id?: number }> };
	};
}

async function detectPodmanSocketPath(envId: number): Promise<string | null> {
	// Podman's native /libpod/info exposes rootless flag + uid mapping.
	// Versioned path: /v4.0.0/libpod/info works across all Podman 4.x/5.x.
	const res = await dockerFetch('/v4.0.0/libpod/info', {}, envId);
	if (!res.ok) return null;
	const info = (await res.json()) as PodmanLibpodInfo;

	const isRootless = info.host?.security?.rootless === true;
	if (!isRootless) return PODMAN_ROOTFUL_SOCKET;

	// The first uidmap entry's host_id is the user the daemon runs as.
	// Example uidmap: [{ container_id: 0, host_id: 1000, size: 1 }, ...]
	const uid = info.host?.idMappings?.uidmap?.[0]?.host_id;
	if (typeof uid !== 'number' || !Number.isInteger(uid) || uid < 0) {
		// No usable uid — leave it to the caller's default
		return null;
	}
	return `/run/user/${uid}/podman/podman.sock`;
}
