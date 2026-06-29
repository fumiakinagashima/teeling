import type { Db } from '../db';
import { getAccount } from '../db/account-service';
import type { ApprovalRow, ApprovalStep } from '../db/approval-service';
import { sendEmail, type EmailSetup } from '../email';

function activeApprovers(route: ApprovalStep[]): ApprovalStep[] {
	const pending = route.filter((s) => s.status === 'pending');
	if (pending.length === 0) return [];
	const minStep = Math.min(...pending.map((s) => s.step));
	return pending.filter((s) => s.step === minStep);
}

function approvalUrl(baseUrl: string, id: string): string {
	return `${baseUrl}/approvals/${id}`;
}

export async function notifyApproversOnCreate(
	setup: EmailSetup,
	approval: ApprovalRow,
	baseUrl: string
): Promise<void> {
	if (approval.status !== 'pending') return;
	const targets = activeApprovers(approval.route).filter((s) => s.email);
	await Promise.allSettled(
		targets.map((s) =>
			sendEmail(setup.providerConfig, {
				from: setup.from,
				fromName: setup.fromName,
				to: s.email!,
				subject: `【承認依頼】${approval.title}`,
				text: buildApproverBody(s.approver, approval, baseUrl)
			})
		)
	);
}

export async function notifyAfterStepAction(
	db: Db,
	setup: EmailSetup,
	prevRoute: ApprovalStep[],
	updatedApproval: ApprovalRow,
	baseUrl: string
): Promise<void> {
	const { status } = updatedApproval;

	if (status === 'approved' || status === 'rejected') {
		// 申請者にメール
		const applicantEmail = await getApplicantEmail(db, updatedApproval.submittedByAccountId);
		if (applicantEmail) {
			await sendEmail(setup.providerConfig, {
				from: setup.from,
				fromName: setup.fromName,
				to: applicantEmail,
				subject: `【${statusLabel(status)}】${updatedApproval.title}`,
				text: buildApplicantBody(updatedApproval.submittedBy, updatedApproval, status, undefined, baseUrl)
			}).catch(() => {});
		}
		return;
	}

	// まだ pending → 新たに担当になった承認者を特定して通知
	const prevActive = new Set(activeApprovers(prevRoute).map((s) => s.accountId ?? s.email ?? s.approver));
	const newActive = activeApprovers(updatedApproval.route).filter(
		(s) => !prevActive.has(s.accountId ?? s.email ?? s.approver) && s.email
	);

	await Promise.allSettled(
		newActive.map((s) =>
			sendEmail(setup.providerConfig, {
				from: setup.from,
				fromName: setup.fromName,
				to: s.email!,
				subject: `【承認依頼】${updatedApproval.title}`,
				text: buildApproverBody(s.approver, updatedApproval, baseUrl)
			})
		)
	);
}

export async function notifyApplicantOnReturn(
	db: Db,
	setup: EmailSetup,
	approval: ApprovalRow,
	comment: string | undefined,
	baseUrl: string
): Promise<void> {
	const applicantEmail = await getApplicantEmail(db, approval.submittedByAccountId);
	if (!applicantEmail) return;
	await sendEmail(setup.providerConfig, {
		from: setup.from,
		fromName: setup.fromName,
		to: applicantEmail,
		subject: `【差し戻し】${approval.title}`,
		text: buildApplicantBody(approval.submittedBy, approval, 'returned', comment, baseUrl)
	}).catch(() => {});
}

async function getApplicantEmail(db: Db, accountId: string): Promise<string | null> {
	if (!accountId) return null;
	const account = await getAccount(db, accountId);
	return account?.email ?? null;
}

function statusLabel(status: string): string {
	if (status === 'approved') return '承認完了';
	if (status === 'rejected') return '否決';
	return '差し戻し';
}

function buildApproverBody(approverName: string, approval: ApprovalRow, baseUrl: string): string {
	return `${approverName} 様

承認依頼が届いています。内容をご確認のうえ、承認または差し戻しをお願いします。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
申請名: ${approval.title}
申請者: ${approval.submittedBy}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

以下のリンクから申請内容を確認できます:
${approvalUrl(baseUrl, approval.id)}

このメールはシステムから自動送信されています。
`.trim();
}

function buildApplicantBody(
	applicantName: string,
	approval: ApprovalRow,
	event: 'approved' | 'rejected' | 'returned',
	comment: string | undefined,
	baseUrl: string
): string {
	const label = statusLabel(event);
	const commentLine = comment ? `\nコメント: ${comment}` : '';
	return `${applicantName} 様

申請の状況が更新されました。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
申請名: ${approval.title}
ステータス: ${label}${commentLine}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

以下のリンクから申請内容を確認できます:
${approvalUrl(baseUrl, approval.id)}

このメールはシステムから自動送信されています。
`.trim();
}
