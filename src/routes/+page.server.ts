import type { PageServerLoad } from './$types';
import { createDb } from '$lib/server/db';
import { listApprovals } from '$lib/server/db/approval-service';

// State of the "My items" toggle. Keeping it in a cookie and reading it at SSR time
// avoids the flicker that would occur with localStorage, which only applies after hydration
const MY_ONLY_COOKIE = 'teeling_top_my_only';

export const load: PageServerLoad = async ({ platform, locals, cookies }) => {
	const db = createDb(platform!.env.DB);
	const rows = await listApprovals(db);
	const myOnly = cookies.get(MY_ONLY_COOKIE) !== 'false';
	return { rows, accountId: locals.account?.id, myOnly };
};
