import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { createDb } from '$lib/server/db';
import { getTemplate } from '$lib/server/db/template-service';
import { listAccounts } from '$lib/server/db/account-service';

export const load: PageServerLoad = async ({ locals, platform, params }) => {
	if (locals.account?.permission !== 'admin') redirect(302, '/database/templates');
	const db = createDb(platform!.env.DB);
	const [row, accountOptions] = await Promise.all([
		getTemplate(db, params.id),
		listAccounts(db)
	]);
	if (!row) error(404, 'Template not found');
	return { row, accountOptions };
};
