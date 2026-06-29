import { z } from 'zod';
import type { Tool } from '@anthropic-ai/sdk/resources/messages';
import Anthropic from '@anthropic-ai/sdk';
import type { Db } from '../db';
import {
	listApprovals,
	getApproval,
	createApproval,
	updateApprovalStep,
	cancelApproval
} from '../db/approval-service';
import type { ToolEnv } from './shared';
import { METRICS_SYSTEM_PROMPT, buildMetricsPrompt } from '../ai/approval-metrics';

export const tools: Tool[] = [
	{
		name: 'list_approvals',
		description: '申請一覧を取得する。ステータスや種別で絞り込み可能。',
		input_schema: {
			type: 'object',
			properties: {
				status: {
					type: 'array',
					items: { type: 'string', enum: ['pending', 'approved', 'rejected', 'cancelled'] },
					description: 'ステータスで絞り込む（複数指定可）'
				},
				type: { type: 'string', description: '申請種別で絞り込む（例: 値引き申請）' }
			},
			required: []
		}
	},
	{
		name: 'get_approval',
		description: '申請の詳細（承認ルート・各ステップの状況を含む）を取得する。',
		input_schema: {
			type: 'object',
			properties: { id: { type: 'string', description: '申請ID' } },
			required: ['id']
		}
	},
	{
		name: 'create_approval',
		description: '新しい申請を作成する。承認ルートをステップの配列で指定する。',
		input_schema: {
			type: 'object',
			properties: {
				title: { type: 'string', description: '申請タイトル' },
				submitted_by: { type: 'string', description: '申請者名（任意）' },
				content: { type: 'string', description: '申請内容（テキスト）' },
				route: {
					type: 'array',
					description: '承認ルート。step が同じ番号は並列承認',
					items: {
						type: 'object',
						properties: {
							step: { type: 'number', description: 'ステップ番号（1始まり、同番号は並列）' },
							approver: { type: 'string', description: '承認者名' },
							email: { type: 'string', description: '承認者メール（任意）' },
							role: { type: 'string', description: '役職（任意）' }
						},
						required: ['step', 'approver']
					}
				}
			},
			required: ['title', 'route']
		}
	},
	{
		name: 'update_approval_step',
		description:
			'申請の特定ステップを承認または否決する。step は route 配列のインデックス（0始まり）。',
		input_schema: {
			type: 'object',
			properties: {
				id: { type: 'string', description: '申請ID' },
				step: { type: 'number', description: 'routeのインデックス（0始まり）' },
				action: { type: 'string', enum: ['approve', 'reject'], description: '操作' },
				comment: { type: 'string', description: 'コメント（任意）' }
			},
			required: ['id', 'step', 'action']
		}
	},
	{
		name: 'cancel_approval',
		description: '申請を取り消す。',
		input_schema: {
			type: 'object',
			properties: { id: { type: 'string', description: '申請ID' } },
			required: ['id']
		}
	},
	{
		name: 'calculate_approval_metrics',
		description:
			'申請内容からROI・回収期間・費用対効果などの財務的な判断材料を計算・生成する。「ROIを計算して」「費用対効果を分析して」「判断材料を出して」などの依頼に使う。',
		input_schema: {
			type: 'object',
			properties: { id: { type: 'string', description: '申請ID' } },
			required: ['id']
		}
	}
];

const listApprovalsSchema = z.object({
	status: z.array(z.string()).optional(),
	type: z.string().optional()
});

const getApprovalSchema = z.object({ id: z.string() });

const createApprovalSchema = z.object({
	title: z.string(),
	submitted_by: z.string().optional(),
	content: z.string().optional(),
	route: z.array(
		z.object({
			step: z.number(),
			approver: z.string(),
			email: z.string().optional(),
			role: z.string().optional()
		})
	)
});

const updateApprovalStepSchema = z.object({
	id: z.string(),
	step: z.number(),
	action: z.enum(['approve', 'reject']),
	comment: z.string().optional()
});

const cancelApprovalSchema = z.object({ id: z.string() });

export async function handleListApprovals(db: Db, input: unknown) {
	const p = listApprovalsSchema.parse(input ?? {});
	return listApprovals(db, { status: p.status });
}

export async function handleGetApproval(db: Db, input: unknown) {
	const { id } = getApprovalSchema.parse(input);
	const row = await getApproval(db, id);
	if (!row) throw new Error(`申請が見つかりません: ${id}`);
	return row;
}

export async function handleCreateApproval(db: Db, input: unknown, env?: ToolEnv) {
	const p = createApprovalSchema.parse(input);
	return createApproval(db, {
		title: p.title,
		submittedByAccountId: env?.accountId ?? '',
		content: p.content,
		route: p.route
	});
}

export async function handleUpdateApprovalStep(db: Db, input: unknown, env?: ToolEnv) {
	const p = updateApprovalStepSchema.parse(input);
	return updateApprovalStep(db, p.id, p.step, p.action, env?.accountId, p.comment);
}

export async function handleCancelApproval(db: Db, input: unknown) {
	const { id } = cancelApprovalSchema.parse(input);
	return cancelApproval(db, id);
}

export async function handleCalculateApprovalMetrics(db: Db, input: unknown, env?: ToolEnv) {
	const { id } = z.object({ id: z.string() }).parse(input);
	const row = await getApproval(db, id);
	if (!row) throw new Error(`申請が見つかりません: ${id}`);

	const apiKey = env?.ANTHROPIC_API_KEY;
	if (!apiKey) throw new Error('ANTHROPIC_API_KEY が設定されていません');

	const anthropic = new Anthropic({ apiKey, timeout: 30000 });
	const message = await anthropic.messages.create({
		model: 'claude-haiku-4-5-20251001',
		max_tokens: 1024,
		system: METRICS_SYSTEM_PROMPT,
		messages: [{ role: 'user', content: buildMetricsPrompt(row) }]
	});
	const text = message.content[0]?.type === 'text' ? message.content[0].text.trim() : '';
	const jsonMatch = text.match(/\{[\s\S]*\}/);
	if (!jsonMatch) throw new Error('判断材料の生成に失敗しました');
	return JSON.parse(jsonMatch[0]);
}
