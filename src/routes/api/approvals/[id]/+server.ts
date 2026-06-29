import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createDb } from '$lib/server/db';
import {
	getApproval,
	updateApprovalStep,
	cancelApproval,
	deleteApproval,
	returnApproval,
	saveDraftApproval,
	updateApprovalContent
} from '$lib/server/db/approval-service';

export const GET: RequestHandler = async ({ params, platform }) => {
	if (!platform?.env?.DB) return json({ error: 'DB not available' }, { status: 500 });
	const db = createDb(platform.env.DB);
	const row = await getApproval(db, params.id);
	if (!row) return json({ error: 'Not found' }, { status: 404 });
	return json(row);
};

export const PATCH: RequestHandler = async ({ params, request, platform, locals }) => {
	if (!platform?.env?.DB) return json({ error: 'DB not available' }, { status: 500 });
	const db = createDb(platform.env.DB);
	try {
		type RouteEntry = { step: number; accountId?: string; approver: string; email?: string; role?: string };
		const body = await request.json() as {
			action?: 'approve_step' | 'reject_step' | 'cancel' | 'return' | 'save_draft' | 'resubmit';
			step?: number;
			comment?: string;
			title?: string;
			content?: string;
			route?: RouteEntry[];
		};
		const account = locals.account!;
		let row;
		if (body.action === 'approve_step' || body.action === 'reject_step') {
			if (body.step == null) return json({ error: 'step is required' }, { status: 400 });
			row = await updateApprovalStep(
				db, params.id, body.step,
				body.action === 'approve_step' ? 'approve' : 'reject',
				account.id,
				body.comment
			);
		} else if (body.action === 'cancel') {
			const existing = await getApproval(db, params.id);
			if (!existing) return json({ error: '申請が見つかりません' }, { status: 404 });
			if (account.permission !== 'admin' && existing.submittedByAccountId !== account.id) {
				return json({ error: '権限がありません' }, { status: 403 });
			}
			row = await cancelApproval(db, params.id);
		} else if (body.action === 'return') {
			if (account.permission !== 'admin') return json({ error: '権限がありません' }, { status: 403 });
			row = await returnApproval(db, params.id, body.comment);
		} else if (body.action === 'save_draft') {
			const existing = await getApproval(db, params.id);
			if (!existing) return json({ error: '申請が見つかりません' }, { status: 404 });
			if (account.permission !== 'admin' && existing.submittedByAccountId !== account.id) {
				return json({ error: '権限がありません' }, { status: 403 });
			}
			row = await saveDraftApproval(db, params.id, { title: body.title, content: body.content, route: body.route });
		} else if (body.action === 'resubmit') {
			const existing = await getApproval(db, params.id);
			if (!existing) return json({ error: '申請が見つかりません' }, { status: 404 });
			if (account.permission !== 'admin' && existing.submittedByAccountId !== account.id) {
				return json({ error: '権限がありません' }, { status: 403 });
			}
			row = await updateApprovalContent(db, params.id, { title: body.title, content: body.content, route: body.route });
		} else {
			return json({ error: 'Invalid action' }, { status: 400 });
		}
		return json(row);
	} catch (e) {
		return json({ error: e instanceof Error ? e.message : String(e) }, { status: 400 });
	}
};

export const DELETE: RequestHandler = async ({ params, platform, locals }) => {
	if (!platform?.env?.DB) return json({ error: 'DB not available' }, { status: 500 });
	if (locals.account?.permission !== 'admin') return json({ error: '権限がありません' }, { status: 403 });
	const db = createDb(platform.env.DB);
	await deleteApproval(db, params.id);
	return new Response(null, { status: 204 });
};
