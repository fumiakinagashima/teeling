import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createDb } from '$lib/server/db';
import { processApprovalSummary } from '$lib/server/approvals/summary';

export const POST: RequestHandler = async ({ platform, locals }) => {
	if (!platform?.env?.DB) return json({ error: 'DB not available' }, { status: 500 });
	if (locals.account?.permission !== 'admin') return json({ error: '権限がありません' }, { status: 403 });

	const db = createDb(platform.env.DB);
	const result = await processApprovalSummary(db);
	return json(result);
};
