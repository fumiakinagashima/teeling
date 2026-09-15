import type { PageServerLoad } from './$types';
import { createDb } from '$lib/server/db';
import { getApproval } from '$lib/server/db/approval-service';
import { listAccounts } from '$lib/server/db/account-service';
import { error, redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ platform, params }) => {
	const db = createDb(platform!.env.DB);
	const [row, accountOptions] = await Promise.all([
		getApproval(db, params.id),
		listAccounts(db)
	]);
	if (!row) throw error(404, 'Request not found');
	if (row.status !== 'draft') throw redirect(302, `/approvals/${params.id}`);
	return { row, accountOptions };
};
