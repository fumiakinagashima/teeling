import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import Anthropic from '@anthropic-ai/sdk';
import { env } from '$env/dynamic/private';
import { createDb } from '$lib/server/db';
import { getApproval } from '$lib/server/db/approval-service';
import { METRICS_SYSTEM_PROMPT, buildMetricsPrompt } from '$lib/server/ai/approval-metrics';

export type ApprovalMetricsResult = {
	summary: string;
	keyFigures: { label: string; value: string; quote?: string }[];
	roi: string | null;
	roiFormula: string | null;
	paybackPeriod: string | null;
	paybackFormula: string | null;
	riskPoints: string[];
	dataQuality: 'low' | 'medium' | 'high';
	missingData: string[];
};

export const POST: RequestHandler = async ({ params, platform }) => {
	if (!platform?.env?.DB) return json({ error: 'DB not available' }, { status: 500 });
	const apiKey = platform?.env?.ANTHROPIC_API_KEY ?? env.ANTHROPIC_API_KEY ?? '';
	if (!apiKey) return json({ error: 'ANTHROPIC_API_KEY is not configured.' }, { status: 500 });

	const db = createDb(platform.env.DB);
	const row = await getApproval(db, params.id);
	if (!row) return json({ error: 'Request not found' }, { status: 404 });

	const anthropic = new Anthropic({ apiKey, timeout: 30000 });
	let text = '';
	try {
		const message = await anthropic.messages.create({
			model: 'claude-haiku-4-5-20251001',
			max_tokens: 1024,
			system: [{ type: 'text', text: METRICS_SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
			messages: [{ role: 'user', content: buildMetricsPrompt(row) }]
		});
		text = message.content[0]?.type === 'text' ? message.content[0].text.trim() : '';
	} catch (e) {
		const msg = e instanceof Error ? e.message : String(e);
		return json({ error: `AI error: ${msg}` }, { status: 500 });
	}

	const jsonMatch = text.match(/\{[\s\S]*\}/);
	if (!jsonMatch) {
		return json({ error: `Analysis failed. (response: ${text.slice(0, 100)})` }, { status: 500 });
	}

	try {
		const result = JSON.parse(jsonMatch[0]) as ApprovalMetricsResult;
		return json(result);
	} catch {
		return json({ error: 'Analysis failed.' }, { status: 500 });
	}
};
