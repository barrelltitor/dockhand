import { db } from './db/drizzle';
import { asc } from 'drizzle-orm';

// Dynamic schema import (same pattern as db.ts)
const isPostgres = !!process.env.DATABASE_URL;
const schema = isPostgres
	? await import('./db/schema/pg-schema.js')
	: await import('./db/schema/index.js');

const { templateSources } = schema;

export interface TemplateSource {
	id: number;
	sourceId: string;
	name: string;
	url: string;
	enabled: boolean;
	builtin: boolean;
	sortOrder: number;
}

export const DEFAULT_TEMPLATE_SOURCES: Omit<TemplateSource, 'id'>[] = [
	// Large collections
	{ sourceId: 'portainer-lissy93', name: 'Portainer templates (Lissy93)', url: 'https://raw.githubusercontent.com/Lissy93/portainer-templates/main/templates.json', enabled: true, builtin: true, sortOrder: 0 },
	{ sourceId: 'ntv-one', name: 'NTV-One (consolidated)', url: 'https://raw.githubusercontent.com/ntv-one/portainer/main/template.json', enabled: false, builtin: true, sortOrder: 1 },
	{ sourceId: 'mlva', name: 'MLVA (TheLustriVA)', url: 'https://raw.githubusercontent.com/TheLustriVA/portainer-templates-Nov-2022-collection/main/templates_2_2_rc_2_2.json', enabled: false, builtin: true, sortOrder: 2 },
	{ sourceId: 'selfhostedpro', name: 'SelfHostedPro', url: 'https://raw.githubusercontent.com/SelfhostedPro/selfhosted_templates/master/Template/portainer-v2.json', enabled: false, builtin: true, sortOrder: 3 },
	// Homelab / self-hosted
	{ sourceId: 'portainer-qballjos', name: 'Qballjos (homelab)', url: 'https://raw.githubusercontent.com/Qballjos/portainer_templates/master/Template/template.json', enabled: false, builtin: true, sortOrder: 4 },
	{ sourceId: 'lsio-technorabilia', name: 'LinuxServer.io (Technorabilia)', url: 'https://raw.githubusercontent.com/technorabilia/portainer-templates/main/lsio/templates/templates.json', enabled: true, builtin: true, sortOrder: 5 },
	{ sourceId: 'mikestraney', name: 'MikeStraney', url: 'https://raw.githubusercontent.com/mikestraney/portainer-templates/master/templates.json', enabled: false, builtin: true, sortOrder: 6 },
	// ARM / Raspberry Pi
	{ sourceId: 'pi-hosted-amd64', name: 'Pi-Hosted (amd64)', url: 'https://raw.githubusercontent.com/pi-hosted/pi-hosted/master/template/portainer-v2-amd64.json', enabled: false, builtin: true, sortOrder: 7 },
	{ sourceId: 'pi-hosted-arm64', name: 'Pi-Hosted (arm64)', url: 'https://raw.githubusercontent.com/pi-hosted/pi-hosted/master/template/portainer-v2-arm64.json', enabled: false, builtin: true, sortOrder: 8 },
];

/**
 * Seed default sources into the library_sources table if empty.
 */
export async function seedTemplateSources(): Promise<void> {
	const existing = await db.select().from(templateSources);
	if (existing.length > 0) return;

	for (const source of DEFAULT_TEMPLATE_SOURCES) {
		await db.insert(templateSources).values({
			sourceId: source.sourceId,
			name: source.name,
			url: source.url,
			enabled: source.enabled,
			builtin: source.builtin,
			sortOrder: source.sortOrder,
		});
	}
}

export async function getTemplateSources(): Promise<TemplateSource[]> {
	const rows = await db.select().from(templateSources).orderBy(asc(templateSources.sortOrder));
	return rows.map(r => ({
		id: r.id,
		sourceId: r.sourceId,
		name: r.name,
		url: r.url,
		enabled: r.enabled ?? true,
		builtin: r.builtin ?? false,
		sortOrder: r.sortOrder ?? 0,
	}));
}

export async function updateTemplateSource(id: number, updates: { enabled?: boolean; name?: string; url?: string }): Promise<void> {
	const { eq } = await import('drizzle-orm');
	await db.update(templateSources)
		.set({ ...updates, updatedAt: new Date().toISOString() })
		.where(eq(templateSources.id, id));
}

export async function addTemplateSource(source: { name: string; url: string }): Promise<TemplateSource> {
	const sourceId = `custom-${Date.now()}`;
	const maxOrder = await db.select().from(templateSources).orderBy(asc(templateSources.sortOrder));
	const nextOrder = maxOrder.length > 0 ? (maxOrder[maxOrder.length - 1].sortOrder ?? 0) + 1 : 0;

	const result = await db.insert(templateSources).values({
		sourceId,
		name: source.name,
		url: source.url,
		enabled: true,
		builtin: false,
		sortOrder: nextOrder,
	}).returning();

	const r = result[0];
	return {
		id: r.id,
		sourceId: r.sourceId,
		name: r.name,
		url: r.url,
		enabled: r.enabled ?? true,
		builtin: r.builtin ?? false,
		sortOrder: r.sortOrder ?? 0,
	};
}

export async function deleteTemplateSource(id: number): Promise<void> {
	const { eq } = await import('drizzle-orm');
	await db.delete(templateSources).where(eq(templateSources.id, id));
}
