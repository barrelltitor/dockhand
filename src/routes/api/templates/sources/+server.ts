import type { RequestHandler } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';
import { authorize } from '$lib/server/authorize';
import { getTemplateSources, updateTemplateSource, addTemplateSource, deleteTemplateSource } from '$lib/server/templates';

export const GET: RequestHandler = async ({ cookies }) => {
	const auth = await authorize(cookies);
	if (auth.authEnabled && !await auth.can('templates', 'view')) {
		return json({ error: 'Permission denied' }, { status: 403 });
	}

	const sources = await getTemplateSources();
	return json(sources);
};

// Toggle enabled or update a source
export const PUT: RequestHandler = async ({ request, cookies }) => {
	const auth = await authorize(cookies);
	if (auth.authEnabled && !await auth.can('templates', 'manage')) {
		return json({ error: 'Permission denied' }, { status: 403 });
	}

	const { id, enabled, name, url } = await request.json();
	if (!id) return json({ error: 'Missing id' }, { status: 400 });

	const updates: any = {};
	if (enabled !== undefined) updates.enabled = enabled;
	if (name !== undefined) updates.name = name;
	if (url !== undefined) updates.url = url;

	await updateTemplateSource(id, updates);
	return json({ ok: true });
};

// Add a custom source
export const POST: RequestHandler = async ({ request, cookies }) => {
	const auth = await authorize(cookies);
	if (auth.authEnabled && !await auth.can('templates', 'manage')) {
		return json({ error: 'Permission denied' }, { status: 403 });
	}

	const { name, url } = await request.json();
	if (!name?.trim() || !url?.trim()) {
		return json({ error: 'Name and URL are required' }, { status: 400 });
	}

	const source = await addTemplateSource({ name: name.trim(), url: url.trim() });
	return json(source);
};

// Delete a custom source
export const DELETE: RequestHandler = async ({ url, cookies }) => {
	const auth = await authorize(cookies);
	if (auth.authEnabled && !await auth.can('templates', 'manage')) {
		return json({ error: 'Permission denied' }, { status: 403 });
	}

	const id = url.searchParams.get('id');
	if (!id) return json({ error: 'Missing id' }, { status: 400 });

	await deleteTemplateSource(parseInt(id));
	return json({ ok: true });
};
