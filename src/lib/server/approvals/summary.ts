import { listApprovals } from '../db/approval-service';
import { listAccounts } from '../db/account-service';
import { createNotification } from '../db/notification-service';
import type { Db } from '../db';

function buildSummaryText(approvals: Awaited<ReturnType<typeof listApprovals>>): string {
	const lines = [`承認待ちの申請が ${approvals.length} 件あります。`];
	for (const a of approvals) {
		const currentApprover = a.route.find((s) => s.status === 'pending')?.approver ?? '—';
		lines.push(`・${a.title}（承認者: ${currentApprover}、申請者: ${a.submittedBy}）`);
	}
	return lines.join('\n');
}

export type SummaryResult = {
	notified: number;
	approvalCount: number;
	summaryTitle: string;
	summaryLines: string[];
};

export async function processApprovalSummary(db: Db): Promise<SummaryResult> {
	const pending = await listApprovals(db, { status: ['pending'] });
	if (pending.length === 0) return { notified: 0, approvalCount: 0, summaryTitle: '', summaryLines: [] };

	const allAccounts = await listAccounts(db);
	const adminIds = new Set(allAccounts.filter((a) => a.permission === 'admin').map((a) => a.id));

	const summaryText = buildSummaryText(pending);
	const title = `承認待ち申請サマリー（${pending.length}件）`;
	const seedContent = [{ type: 'text' as const, text: summaryText }];
	const summaryLines = summaryText.split('\n');

	const notifiedIds = new Set<string>();

	// 管理者全員に全体サマリーを送信
	for (const id of adminIds) {
		await createNotification(db, { type: 'info', title, body: summaryText, seedContent, accountId: id });
		notifiedIds.add(id);
	}

	// 承認担当者（accountId紐付き）に個別通知
	const approverMap = new Map<string, string[]>();
	for (const approval of pending) {
		const step = approval.route.find((s) => s.status === 'pending');
		if (step?.accountId) {
			if (!approverMap.has(step.accountId)) approverMap.set(step.accountId, []);
			approverMap.get(step.accountId)!.push(approval.title);
		}
	}

	for (const [accountId, titles] of approverMap) {
		if (notifiedIds.has(accountId)) continue;
		const body = `あなたの承認待ち申請が ${titles.length} 件あります:\n${titles.map((t) => `・${t}`).join('\n')}`;
		await createNotification(db, {
			type: 'info',
			title: `承認待ち申請（${titles.length}件）`,
			body,
			seedContent: [{ type: 'text', text: body }],
			accountId
		});
		notifiedIds.add(accountId);
	}

	return { notified: notifiedIds.size, approvalCount: pending.length, summaryTitle: title, summaryLines };
}
