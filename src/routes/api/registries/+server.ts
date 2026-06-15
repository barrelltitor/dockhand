import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getRegistries, createRegistry, setDefaultRegistry } from '$lib/server/db';
import { authorize } from '$lib/server/authorize';
import { auditRegistry } from '$lib/server/audit';
import { parseRegistryUrl, DOCKER_HUB_HOSTS } from '$lib/server/docker';

export const GET: RequestHandler = async ({ cookies }) => {
	const auth = await authorize(cookies);
	if (auth.authEnabled && !await auth.can('registries', 'view')) {
		return json({ error: 'Permission denied' }, { status: 403 });
	}

	try {
		const registries = await getRegistries();
		// Don't expose passwords in the response
		const safeRegistries = registries.map(({ password, ...rest }) => ({
			...rest,
			hasCredentials: !!password
		}));
		return json(safeRegistries);
	} catch (error) {
		console.error('Error fetching registries:', error);
		return json({ error: 'Failed to fetch registries' }, { status: 500 });
	}
};

export const POST: RequestHandler = async (event) => {
	const { request, cookies } = event;
	const auth = await authorize(cookies);
	if (auth.authEnabled && !await auth.can('registries', 'create')) {
		return json({ error: 'Permission denied' }, { status: 403 });
	}

	try {
		const data = await request.json();

		if (!data.name || !data.url) {
			return json({ error: 'Name and URL are required' }, { status: 400 });
		}

		// Trim username/password to prevent stray whitespace from copy-paste corrupting
		// the X-Registry-Auth / Authorization headers (#1105).
		const trimmedUsername = typeof data.username === 'string' ? data.username.trim() : undefined;
		const trimmedPassword = typeof data.password === 'string' ? data.password.trim() : undefined;

		// Diagnostic logging (#1105) — never logs the plaintext credential
		const { host: normalizedHost } = parseRegistryUrl(data.url);
		const hubTag = DOCKER_HUB_HOSTS.has(normalizedHost) ? ' (docker-hub)' : '';
		console.log(`[Registry] create: url=${data.url} normalized=${normalizedHost}${hubTag} user(len=${trimmedUsername?.length ?? 0}) pw(len=${trimmedPassword?.length ?? 0})`);

		const registry = await createRegistry({
			name: data.name,
			url: data.url,
			username: trimmedUsername || undefined,
			password: trimmedPassword || undefined,
			isDefault: data.isDefault || false
		});

		// If this registry should be default, set it
		if (data.isDefault) {
			await setDefaultRegistry(registry.id);
		}

		// Audit log
		await auditRegistry(event, 'create', registry.id, registry.name);

		// Don't expose password in response
		const { password, ...safeRegistry } = registry;
		return json({ ...safeRegistry, hasCredentials: !!password }, { status: 201 });
	} catch (error: any) {
		console.error('Error creating registry:', error);
		if (error.message?.includes('UNIQUE constraint failed')) {
			return json({ error: 'A registry with this name already exists' }, { status: 400 });
		}
		return json({ error: 'Failed to create registry' }, { status: 500 });
	}
};
