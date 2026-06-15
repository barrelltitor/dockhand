/** Mattermost incoming webhook. mmost:// or mmosts:// (HTTPS). */
import { drainResponse, type NotificationPayload, type NotificationResult } from './shared';

export async function sendMattermost(appriseUrl: string, payload: NotificationPayload): Promise<NotificationResult> {
	// mmost://[botname@]hostname[:port][/path]/token or mmosts://...
	const isSecure = appriseUrl.startsWith('mmosts');
	const protocol = isSecure ? 'https' : 'http';

	let urlPart = appriseUrl.replace(/^mmosts?:\/\//, '');

	// Check for botname (username@hostname format)
	let username: string | undefined;
	const atIndex = urlPart.indexOf('@');
	if (atIndex !== -1) {
		username = urlPart.substring(0, atIndex);
		urlPart = urlPart.substring(atIndex + 1);
	}

	// The token is the last segment, everything else is hostname[:port][/path]
	const lastSlashIndex = urlPart.lastIndexOf('/');
	if (lastSlashIndex === -1) {
		return { success: false, error: 'Invalid Mattermost URL format. Expected: mmost://[botname@]hostname[:port][/path]/token' };
	}

	const token = urlPart.substring(lastSlashIndex + 1);
	const hostAndPath = urlPart.substring(0, lastSlashIndex);

	const url = `${protocol}://${hostAndPath}/hooks/${token}`;

	const envTag = payload.environmentName ? ` \`${payload.environmentName}\`` : '';
	const body: Record<string, string> = {
		text: `*${payload.title}*${envTag}\n${payload.message}`
	};

	if (username) {
		body.username = username;
	}

	try {
		const response = await fetch(url, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body)
		});

		if (!response.ok) {
			const text = await response.text().catch(() => '');
			return { success: false, error: `Mattermost error ${response.status}: ${text || response.statusText}` };
		}
		await drainResponse(response);
		return { success: true };
	} catch (error) {
		return { success: false, error: `Mattermost connection failed: ${error instanceof Error ? error.message : String(error)}` };
	}
}
