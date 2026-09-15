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
		description: 'Retrieves the list of requests. Can be filtered by status or type.',
		input_schema: {
			type: 'object',
			properties: {
				status: {
					type: 'array',
					items: { type: 'string', enum: ['pending', 'approved', 'rejected', 'cancelled'] },
					description: 'Filter by status (multiple values allowed)'
				},
				type: { type: 'string', description: 'Filter by request type (e.g., "Discount Request")' }
			},
			required: []
		}
	},
	{
		name: 'get_approval',
		description: 'Retrieves the details of a request (including the approval route and the status of each step).',
		input_schema: {
			type: 'object',
			properties: { id: { type: 'string', description: 'Request ID' } },
			required: ['id']
		}
	},
	{
		name: 'create_approval',
		description: 'Creates a new request. Specify the approval route as an array of steps.',
		input_schema: {
			type: 'object',
			properties: {
				title: { type: 'string', description: 'Request title' },
				submitted_by: { type: 'string', description: 'Requester name (optional)' },
				content: { type: 'string', description: 'Request content (text)' },
				route: {
					type: 'array',
					description: 'Approval route. Steps with the same number are approved in parallel',
					items: {
						type: 'object',
						properties: {
							step: { type: 'number', description: 'Step number (starting from 1; the same number means parallel approval)' },
							approver: { type: 'string', description: 'Approver name' },
							email: { type: 'string', description: 'Approver email (optional)' },
							role: { type: 'string', description: 'Role/title (optional)' }
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
			'Approves or rejects a specific step of the request. step is the index (starting from 0) into the route array.',
		input_schema: {
			type: 'object',
			properties: {
				id: { type: 'string', description: 'Request ID' },
				step: { type: 'number', description: 'Index into route (starting from 0)' },
				action: { type: 'string', enum: ['approve', 'reject'], description: 'Action' },
				comment: { type: 'string', description: 'Comment (optional)' }
			},
			required: ['id', 'step', 'action']
		}
	},
	{
		name: 'cancel_approval',
		description: 'Cancels a request.',
		input_schema: {
			type: 'object',
			properties: { id: { type: 'string', description: 'Request ID' } },
			required: ['id']
		}
	},
	{
		name: 'calculate_approval_metrics',
		description:
			'Calculates and generates financial decision-making inputs such as ROI, payback period, and cost-effectiveness from the request content. Used for requests like "Calculate the ROI," "Analyze the cost-effectiveness," or "Give me decision-making inputs."',
		input_schema: {
			type: 'object',
			properties: { id: { type: 'string', description: 'Request ID' } },
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
	if (!row) throw new Error(`Request not found: ${id}`);
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
	if (!row) throw new Error(`Request not found: ${id}`);

	const apiKey = env?.ANTHROPIC_API_KEY;
	if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set');

	const anthropic = new Anthropic({ apiKey, timeout: 30000 });
	const message = await anthropic.messages.create({
		model: 'claude-haiku-4-5-20251001',
		max_tokens: 1024,
		system: METRICS_SYSTEM_PROMPT,
		messages: [{ role: 'user', content: buildMetricsPrompt(row) }]
	});
	const text = message.content[0]?.type === 'text' ? message.content[0].text.trim() : '';
	const jsonMatch = text.match(/\{[\s\S]*\}/);
	if (!jsonMatch) throw new Error('Failed to generate decision-making inputs');
	return JSON.parse(jsonMatch[0]);
}
