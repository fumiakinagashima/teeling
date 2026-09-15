import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import Anthropic from '@anthropic-ai/sdk';
import { env } from '$env/dynamic/private';
import { APPROVAL_DRAFT_REVIEW_SYSTEM_PROMPT, buildApprovalDraftReviewPrompt } from '$lib/server/ai/prompt';

export type ApprovalDraftReviewResult = {
	summary: string;
	issues: string[];
	missing: string[];
	suggestions: string[];
};

export const POST: RequestHandler = async ({ request, platform }) => {
	const apiKey = platform?.env?.ANTHROPIC_API_KEY ?? env.ANTHROPIC_API_KEY ?? '';
	if (!apiKey) return json({ error: 'ANTHROPIC_API_KEY is not configured.' }, { status: 500 });

	const body = await request.json() as {
		title?: string;
		content?: string;
		route?: { step: number; approver: string; role?: string }[];
		fieldDefs?: { key: string; label: string; type: string }[];
		fields?: Record<string, unknown>;
	};
	if (!body.title?.trim() && !body.content?.trim()) {
		return json({ error: 'Please enter a title or request content.' }, { status: 400 });
	}

	const anthropic = new Anthropic({ apiKey, timeout: 30000 });
	let text = '';
	try {
		const message = await anthropic.messages.create({
			model: 'claude-haiku-4-5-20251001',
			max_tokens: 1024,
			system: APPROVAL_DRAFT_REVIEW_SYSTEM_PROMPT,
			messages: [{
				role: 'user',
				content: buildApprovalDraftReviewPrompt({
					title: body.title ?? '',
					content: body.content ?? '',
					route: body.route ?? [],
					fieldDefs: body.fieldDefs,
					fields: body.fields
				})
			}]
		});
		text = message.content[0]?.type === 'text' ? message.content[0].text.trim() : '';
	} catch (e) {
		const msg = e instanceof Error ? e.message : String(e);
		return json({ error: `AI error: ${msg}` }, { status: 500 });
	}

	const jsonMatch = text.match(/\{[\s\S]*\}/);
	if (!jsonMatch) {
		return json({ error: `Failed to parse the review result. (response: ${text.slice(0, 100)})` }, { status: 500 });
	}

	try {
		const result = JSON.parse(jsonMatch[0]) as ApprovalDraftReviewResult;
		return json(result);
	} catch {
		return json({ error: 'Failed to parse the review result.' }, { status: 500 });
	}
};
