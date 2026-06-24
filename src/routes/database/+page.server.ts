import type { PageServerLoad } from './$types';
import { eq, count } from 'drizzle-orm';
import { createDb } from '$lib/server/db';
import { approvalRequests, workflows, accounts, reminders } from '$lib/server/db/schema';

export const load: PageServerLoad = async ({ platform }) => {
	const db = createDb(platform!.env.DB);
	const [[approvalCount], [workflowCount], [accountCount], [reminderCount]] = await Promise.all([
		db.select({ count: count() }).from(approvalRequests),
		db.select({ count: count() }).from(workflows),
		db.select({ count: count() }).from(accounts),
		db.select({ count: count() }).from(reminders).where(eq(reminders.status, 'pending'))
	]);
	return {
		counts: {
			approvals: approvalCount.count,
			workflows: workflowCount.count,
			accounts: accountCount.count,
			reminders: reminderCount.count
		}
	};
};
