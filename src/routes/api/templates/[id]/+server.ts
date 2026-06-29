import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createDb } from '$lib/server/db';
import { getTemplate, updateTemplate, deleteTemplate } from '$lib/server/db/template-service';

export const GET: RequestHandler = async ({ params, platform }) => {
	if (!platform?.env?.DB) return json({ error: 'DB not available' }, { status: 500 });
	const db = createDb(platform.env.DB);
	const row = await getTemplate(db, params.id);
	if (!row) return json({ error: 'Not found' }, { status: 404 });
	return json(row);
};

export const PUT: RequestHandler = async ({ params, request, platform, locals }) => {
	if (!platform?.env?.DB) return json({ error: 'DB not available' }, { status: 500 });
	if (locals.account?.permission !== 'admin') return json({ error: '権限がありません' }, { status: 403 });
	const db = createDb(platform.env.DB);
	const body = await request.json() as Parameters<typeof updateTemplate>[2];
	const row = await updateTemplate(db, params.id, body);
	return json(row);
};

export const DELETE: RequestHandler = async ({ params, platform, locals }) => {
	if (!platform?.env?.DB) return json({ error: 'DB not available' }, { status: 500 });
	if (locals.account?.permission !== 'admin') return json({ error: '権限がありません' }, { status: 403 });
	const db = createDb(platform.env.DB);
	await deleteTemplate(db, params.id);
	return new Response(null, { status: 204 });
};
