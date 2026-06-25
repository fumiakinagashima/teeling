import type { LayoutServerLoad } from './$types';
import { createDb } from '$lib/server/db';
import { countUnreadNotifications } from '$lib/server/db/notification-service';

export const load: LayoutServerLoad = async ({ platform, locals, url }) => {
	if (!locals.account || url.pathname === '/signin' || !platform?.env?.DB) {
		return { account: locals.account, unreadNotificationCount: 0 };
	}
	const db = createDb(platform.env.DB);
	const unreadNotificationCount = await countUnreadNotifications(db, locals.account.id);
	return { account: locals.account, unreadNotificationCount };
};
