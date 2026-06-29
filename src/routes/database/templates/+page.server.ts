import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { createDb } from '$lib/server/db';
import { listTemplates } from '$lib/server/db/template-service';

export const load: PageServerLoad = async ({ locals, platform }) => {
	if (locals.account?.permission !== 'admin') redirect(302, '/database/approvals');
	if (!platform?.env?.DB) return { templates: [] };
	const db = createDb(platform.env.DB);
	return { templates: await listTemplates(db) };
};
