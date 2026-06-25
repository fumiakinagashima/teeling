import { eq, desc } from 'drizzle-orm';
import { approvalRequests } from './schema';
import type { Db } from '.';

export type ApprovalStep = {
	step: number;
	accountId?: string;
	approver: string;
	email?: string;
	role?: string;
	status: 'pending' | 'approved' | 'rejected';
	comment: string | null;
	acted_at: string | null;
};

export type Attachment = {
	name: string;
	mimeType: string;
	size: number;
	data?: string; // legacy: base64 inline (deprecated, use key instead)
	key?: string;  // R2 object id (UUID)
};

export type AttachmentMeta = Omit<Attachment, 'data'>;

export type ApprovalRow = {
	id: string;
	title: string;
	status: 'draft' | 'pending' | 'approved' | 'rejected' | 'cancelled';
	submittedBy: string;
	content: string;
	returnComment?: string;
	route: ApprovalStep[];
	attachments: Attachment[];
	createdAt: Date;
	updatedAt: Date;
};

export type ApprovalListRow = Omit<ApprovalRow, 'attachments'> & {
	attachments: AttachmentMeta[];
};

function parseJson<T>(raw: string, fallback: T): T {
	try { return JSON.parse(raw) ?? fallback; } catch { return fallback; }
}

function toRow(r: typeof approvalRequests.$inferSelect): ApprovalRow {
	const data = parseJson<Record<string, unknown>>(r.data, {});
	const row: ApprovalRow = {
		id: r.id,
		title: r.title,
		status: r.status as ApprovalRow['status'],
		submittedBy: r.submittedBy,
		content: String(data.content ?? ''),
		route: parseJson<ApprovalStep[]>(r.route, []),
		attachments: parseJson<Attachment[]>(r.attachments, []),
		createdAt: r.createdAt,
		updatedAt: r.updatedAt
	};
	if (data.returnComment) row.returnComment = String(data.returnComment);
	return row;
}

function toListRow(r: typeof approvalRequests.$inferSelect): ApprovalListRow {
	const full = toRow(r);
	return {
		...full,
		attachments: full.attachments.map(({ data: _data, ...meta }) => meta)
	};
}

function computeStatus(route: ApprovalStep[]): ApprovalRow['status'] {
	if (route.length === 0) return 'pending';
	if (route.some(s => s.status === 'rejected')) return 'rejected';
	if (route.every(s => s.status === 'approved')) return 'approved';
	return 'pending';
}

export async function listApprovals(
	db: Db,
	filters?: { status?: string[] }
): Promise<ApprovalListRow[]> {
	const rows = await db
		.select()
		.from(approvalRequests)
		.orderBy(desc(approvalRequests.createdAt));

	return rows
		.filter(r => {
			if (filters?.status?.length && !filters.status.includes(r.status)) return false;
			return true;
		})
		.map(toListRow);
}

export async function getApproval(db: Db, id: string): Promise<ApprovalRow | null> {
	const [r] = await db
		.select()
		.from(approvalRequests)
		.where(eq(approvalRequests.id, id));
	return r ? toRow(r) : null;
}

export type CreateApprovalInput = {
	title: string;
	submittedBy?: string;
	content?: string;
	status?: 'draft' | 'pending';
	route: Array<{ step: number; accountId?: string; approver: string; email?: string; role?: string }>;
	attachments?: Attachment[];
};

export async function createApproval(db: Db, input: CreateApprovalInput): Promise<ApprovalRow> {
	const id = crypto.randomUUID();
	const now = new Date();
	const route: ApprovalStep[] = input.route
		.map(s => ({
			step: s.step,
			accountId: s.accountId,
			approver: s.approver,
			email: s.email,
			role: s.role,
			status: 'pending' as const,
			comment: null,
			acted_at: null
		}))
		.sort((a, b) => a.step - b.step);

	await db.insert(approvalRequests).values({
		id,
		title: input.title,
		type: '申請',
		submittedBy: input.submittedBy ?? '',
		entityType: null,
		entityId: null,
		data: JSON.stringify({ content: input.content ?? '' }),
		route: JSON.stringify(route),
		attachments: JSON.stringify(input.attachments ?? []),
		status: input.status ?? 'pending',
		createdAt: now,
		updatedAt: now
	});

	return (await getApproval(db, id))!;
}

export async function updateApprovalStep(
	db: Db,
	id: string,
	stepIndex: number,
	action: 'approve' | 'reject',
	accountId?: string,
	comment?: string
): Promise<ApprovalRow> {
	const existing = await getApproval(db, id);
	if (!existing) throw new Error(`申請が見つかりません: ${id}`);
	if (existing.status === 'cancelled') throw new Error('取り消し済みの申請は操作できません');

	const route = [...existing.route];
	if (stepIndex < 0 || stepIndex >= route.length) throw new Error(`ステップが存在しません: ${stepIndex}`);

	const step = route[stepIndex];
	if (step.accountId && step.accountId !== accountId) {
		throw new Error('このステップを操作する権限がありません');
	}

	const priorSteps = route.filter(s => s.step < step.step);
	if (priorSteps.some(s => s.status !== 'approved')) {
		throw new Error('前のステップが承認されていないため、このステップを操作できません');
	}

	route[stepIndex] = {
		...step,
		status: action === 'approve' ? 'approved' : 'rejected',
		comment: comment ?? null,
		acted_at: new Date().toISOString()
	};

	const newStatus = computeStatus(route);

	await db
		.update(approvalRequests)
		.set({ route: JSON.stringify(route), status: newStatus, updatedAt: new Date() })
		.where(eq(approvalRequests.id, id));

	return (await getApproval(db, id))!;
}

export async function cancelApproval(db: Db, id: string): Promise<ApprovalRow> {
	const existing = await getApproval(db, id);
	if (!existing) throw new Error(`申請が見つかりません: ${id}`);

	await db
		.update(approvalRequests)
		.set({ status: 'cancelled', updatedAt: new Date() })
		.where(eq(approvalRequests.id, id));

	return (await getApproval(db, id))!;
}

export async function deleteApproval(db: Db, id: string): Promise<void> {
	await db.delete(approvalRequests).where(eq(approvalRequests.id, id));
}

export async function returnApproval(db: Db, id: string, comment?: string): Promise<ApprovalRow> {
	const existing = await getApproval(db, id);
	if (!existing) throw new Error(`申請が見つかりません: ${id}`);
	if (existing.status === 'cancelled') throw new Error('取り消し済みの申請は操作できません');

	const route = existing.route.map(s => ({
		...s,
		status: 'pending' as const,
		comment: null,
		acted_at: null
	}));
	const data = { content: existing.content, ...(comment ? { returnComment: comment } : {}) };

	await db
		.update(approvalRequests)
		.set({ route: JSON.stringify(route), status: 'draft', data: JSON.stringify(data), updatedAt: new Date() })
		.where(eq(approvalRequests.id, id));

	return (await getApproval(db, id))!;
}

type ContentInput = {
	title?: string;
	content?: string;
	route?: Array<{ step: number; accountId?: string; approver: string; email?: string; role?: string }>;
};

export async function saveDraftApproval(db: Db, id: string, input: ContentInput): Promise<ApprovalRow> {
	const existing = await getApproval(db, id);
	if (!existing) throw new Error(`申請が見つかりません: ${id}`);
	if (existing.status !== 'draft') throw new Error('作成中の申請のみ編集できます');

	const newTitle = input.title ?? existing.title;
	const newContent = input.content ?? existing.content;
	const route = input.route != null
		? input.route.map(s => ({
			step: s.step, accountId: s.accountId, approver: s.approver,
			email: s.email, role: s.role, status: 'pending' as const, comment: null, acted_at: null
		})).sort((a, b) => a.step - b.step)
		: existing.route;

	await db
		.update(approvalRequests)
		.set({
			title: newTitle,
			data: JSON.stringify({ content: newContent }),
			route: JSON.stringify(route),
			status: 'draft',
			updatedAt: new Date()
		})
		.where(eq(approvalRequests.id, id));

	return (await getApproval(db, id))!;
}

export async function updateApprovalContent(db: Db, id: string, input: ContentInput): Promise<ApprovalRow> {
	const existing = await getApproval(db, id);
	if (!existing) throw new Error(`申請が見つかりません: ${id}`);
	if (existing.status !== 'draft') throw new Error('作成中の申請のみ再提出できます');

	const newTitle = input.title ?? existing.title;
	const newContent = input.content ?? existing.content;
	const route = input.route != null
		? input.route.map(s => ({
			step: s.step, accountId: s.accountId, approver: s.approver,
			email: s.email, role: s.role, status: 'pending' as const, comment: null, acted_at: null
		})).sort((a, b) => a.step - b.step)
		: existing.route;

	await db
		.update(approvalRequests)
		.set({
			title: newTitle,
			data: JSON.stringify({ content: newContent }),
			route: JSON.stringify(route),
			status: 'pending',
			updatedAt: new Date()
		})
		.where(eq(approvalRequests.id, id));

	return (await getApproval(db, id))!;
}
