import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { createDb } from '$lib/server/db';
import { listAccounts } from '$lib/server/db/account-service';

export const load: PageServerLoad = async ({ locals, platform }) => {
	if (locals.account?.permission !== 'admin') redirect(302, '/database/templates');
	const db = createDb(platform!.env.DB);
	const accountOptions = await listAccounts(db);
	return { accountOptions };
};
