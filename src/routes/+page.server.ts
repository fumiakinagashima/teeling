import type { PageServerLoad } from './$types';
import { createDb } from '$lib/server/db';
import { listApprovals } from '$lib/server/db/approval-service';

// 「自分が担当」トグルの状態。cookieで保持しSSR時点で読み取ることで、
// localStorage経由だとhydration後に反映されて起きるチラつきを防ぐ
const MY_ONLY_COOKIE = 'teeling_top_my_only';

export const load: PageServerLoad = async ({ platform, locals, cookies }) => {
	const db = createDb(platform!.env.DB);
	const rows = await listApprovals(db);
	const myOnly = cookies.get(MY_ONLY_COOKIE) !== 'false';
	return { rows, accountId: locals.account?.id, myOnly };
};
