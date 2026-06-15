/**
 * Shared types + helpers used by every notification provider.
 *
 * Imported by the router (./index.ts) and by every per-provider file
 * (discord.ts, slack.ts, …). Keeps the providers free of cross-imports —
 * each provider only depends on this module.
 */

export interface NotificationPayload {
	title: string;
	message: string;
	type?: 'info' | 'success' | 'warning' | 'error';
	environmentId?: number;
	environmentName?: string;
}

export interface NotificationResult {
	success: boolean;
	error?: string;
}

/** Drain a response body to release the underlying socket/TLS connection. */
export async function drainResponse(response: Response): Promise<void> {
	if (!response.bodyUsed) {
		try { await response.arrayBuffer(); } catch {}
	}
}

/** Append `[env name]` to a title when present. Used by every provider. */
export function titleWithEnv(payload: NotificationPayload): string {
	return payload.environmentName ? `${payload.title} [${payload.environmentName}]` : payload.title;
}
