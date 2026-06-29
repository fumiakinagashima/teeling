import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createDb } from '$lib/server/db';
import { listTemplates, createTemplate } from '$lib/server/db/template-service';

export const GET: RequestHandler = async ({ platform }) => {
	if (!platform?.env?.DB) return json({ error: 'DB not available' }, { status: 500 });
	const db = createDb(platform.env.DB);
	const rows = await listTemplates(db);
	return json({ rows });
};

export const POST: RequestHandler = async ({ request, platform, locals }) => {
	if (!platform?.env?.DB) return json({ error: 'DB not available' }, { status: 500 });
	if (locals.account?.permission !== 'admin') return json({ error: '権限がありません' }, { status: 403 });
	const db = createDb(platform.env.DB);
	const body = await request.json() as Parameters<typeof createTemplate>[1];
	const row = await createTemplate(db, body);
	return json(row, { status: 201 });
};
