import type { PageServerLoad } from './$types';
import { createDb } from '$lib/server/db';
import { getApproval } from '$lib/server/db/approval-service';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ platform, params, locals }) => {
	const db = createDb(platform!.env.DB);
	const row = await getApproval(db, params.id);
	if (!row) throw error(404, '申請が見つかりません');
	return { row, accountId: locals.account?.id };
};
