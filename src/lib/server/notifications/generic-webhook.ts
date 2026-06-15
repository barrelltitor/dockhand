/** Generic JSON webhook. json:// or jsons:// (HTTPS). */
import { drainResponse, type NotificationPayload, type NotificationResult } from './shared';

export async function sendGenericWebhook(appriseUrl: string, payload: NotificationPayload): Promise<NotificationResult> {
	// json://hostname/path or jsons://hostname/path
	const url = appriseUrl.replace(/^jsons?:\/\//, appriseUrl.startsWith('jsons') ? 'https://' : 'http://');

	try {
		const response = await fetch(url, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				title: payload.title,
				message: payload.message,
				type: payload.type || 'info',
				environment: payload.environmentName || null,
				timestamp: new Date().toISOString()
			})
		});

		if (!response.ok) {
			const text = await response.text().catch(() => '');
			return { success: false, error: `Webhook error ${response.status}: ${text || response.statusText}` };
		}
		await drainResponse(response);
		return { success: true };
	} catch (error) {
		return { success: false, error: `Webhook connection failed: ${error instanceof Error ? error.message : String(error)}` };
	}
}
