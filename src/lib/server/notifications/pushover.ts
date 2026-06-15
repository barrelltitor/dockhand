/** Pushover. pushover://user_key/api_token. */
import { drainResponse, type NotificationPayload, type NotificationResult } from './shared';

export async function sendPushover(appriseUrl: string, payload: NotificationPayload): Promise<NotificationResult> {
	const match = appriseUrl.match(/^pushover:\/\/([^/]+)\/(.+)/);
	if (!match) {
		return { success: false, error: 'Invalid Pushover URL format. Expected: pushover://user_key/api_token' };
	}

	const [, userKey, apiToken] = match;
	const url = 'https://api.pushover.net/1/messages.json';
	const titleWithEnv = payload.environmentName ? `${payload.title} [${payload.environmentName}]` : payload.title;

	try {
		const response = await fetch(url, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				token: apiToken,
				user: userKey,
				title: titleWithEnv,
				message: payload.message,
				priority: payload.type === 'error' ? 1 : 0
			})
		});

		if (!response.ok) {
			const text = await response.text().catch(() => '');
			return { success: false, error: `Pushover error ${response.status}: ${text || response.statusText}` };
		}
		await drainResponse(response);
		return { success: true };
	} catch (error) {
		return { success: false, error: `Pushover connection failed: ${error instanceof Error ? error.message : String(error)}` };
	}
}
