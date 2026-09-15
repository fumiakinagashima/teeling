import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import Anthropic from '@anthropic-ai/sdk';
import { env } from '$env/dynamic/private';
import { createDb } from '$lib/server/db';
import { getApproval } from '$lib/server/db/approval-service';
import { SIMULATE_SYSTEM_PROMPT, type ApprovalAnalysisAnalyzed } from '$lib/server/ai/approval-analysis';

function sse(data: unknown): string {
	return `data: ${JSON.stringify(data)}\n\n`;
}

export const POST: RequestHandler = async ({ params, request, platform }) => {
	if (!platform?.env?.DB) return json({ error: 'DB not available' }, { status: 500 });
	const apiKey = platform?.env?.ANTHROPIC_API_KEY ?? env.ANTHROPIC_API_KEY ?? '';
	if (!apiKey) return json({ error: 'ANTHROPIC_API_KEY is not configured.' }, { status: 500 });

	const body = await request.json() as {
		message: string;
		analysis: ApprovalAnalysisAnalyzed;
		history: { role: 'user' | 'assistant'; text: string }[];
	};

	const db = createDb(platform.env.DB);
	const row = await getApproval(db, params.id);
	if (!row) return json({ error: 'Request not found' }, { status: 404 });

	const systemContext = `${SIMULATE_SYSTEM_PROMPT}

## Target Request
Title: ${row.title}
Submitted by: ${row.submittedBy}
Request content:
${row.content || '(Not specified)'}

## Initial Analysis Result
Risk: ${body.analysis.riskLevel}
Summary: ${body.analysis.reviewSummary}
${(body.analysis.keyFigures ?? []).length > 0 ? `\nKey figures:\n${(body.analysis.keyFigures ?? []).map((f) => `- ${f.label}: ${f.value} ("${f.quote}")`).join('\n')}` : ''}
${body.analysis.roi ? `ROI: ${body.analysis.roi} (${body.analysis.roiFormula})` : ''}
${body.analysis.paybackPeriod ? `Payback period: ${body.analysis.paybackPeriod} (${body.analysis.paybackFormula})` : ''}`;

	// Cache conversation history: attach cache_control to the last history message
	const historyParams: Anthropic.MessageParam[] = body.history.map((msg) => ({
		role: msg.role,
		content: msg.text
	}));
	let messages: Anthropic.MessageParam[];
	if (historyParams.length > 0) {
		const last = historyParams[historyParams.length - 1];
		const cachedLast: Anthropic.MessageParam = {
			...last,
			content: [{ type: 'text', text: last.content as string, cache_control: { type: 'ephemeral' } }]
		};
		messages = [...historyParams.slice(0, -1), cachedLast, { role: 'user', content: body.message }];
	} else {
		messages = [{ role: 'user', content: body.message }];
	}

	const anthropic = new Anthropic({ apiKey, timeout: 30000 });

	const stream = new ReadableStream({
		async start(controller) {
			const enq = (data: unknown) => controller.enqueue(new TextEncoder().encode(sse(data)));
			try {
				const stream = anthropic.messages.stream({
					model: 'claude-haiku-4-5-20251001',
					max_tokens: 800,
					system: [{ type: 'text', text: systemContext, cache_control: { type: 'ephemeral' } }],
					messages
				});
				for await (const event of stream) {
					if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
						enq({ type: 'delta', text: event.delta.text });
					}
				}
				enq({ type: 'done' });
			} catch (e) {
				enq({ type: 'error', message: e instanceof Error ? e.message : String(e) });
			} finally {
				controller.close();
			}
		}
	});

	return new Response(stream, {
		headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' }
	});
};
