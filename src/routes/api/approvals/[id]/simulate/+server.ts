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
	if (!apiKey) return json({ error: 'ANTHROPIC_API_KEY が設定されていません。' }, { status: 500 });

	const body = await request.json() as {
		message: string;
		analysis: ApprovalAnalysisAnalyzed;
		history: { role: 'user' | 'assistant'; text: string }[];
	};

	const db = createDb(platform.env.DB);
	const row = await getApproval(db, params.id);
	if (!row) return json({ error: '申請が見つかりません' }, { status: 404 });

	const systemContext = `${SIMULATE_SYSTEM_PROMPT}

## 対象申請
タイトル: ${row.title}
申請者: ${row.submittedBy}
申請内容:
${row.content || '（記載なし）'}

## 初期分析結果
リスク: ${body.analysis.riskLevel}
総評: ${body.analysis.reviewSummary}
${(body.analysis.keyFigures ?? []).length > 0 ? `\n主要数値:\n${(body.analysis.keyFigures ?? []).map((f) => `- ${f.label}: ${f.value}（「${f.quote}」）`).join('\n')}` : ''}
${body.analysis.roi ? `ROI: ${body.analysis.roi}（${body.analysis.roiFormula}）` : ''}
${body.analysis.paybackPeriod ? `回収期間: ${body.analysis.paybackPeriod}（${body.analysis.paybackFormula}）` : ''}`;

	const messages: Anthropic.MessageParam[] = body.history.flatMap((msg) => [
		{ role: msg.role, content: msg.text } as Anthropic.MessageParam
	]);
	messages.push({ role: 'user', content: body.message });

	const anthropic = new Anthropic({ apiKey, timeout: 30000 });

	const stream = new ReadableStream({
		async start(controller) {
			const enq = (data: unknown) => controller.enqueue(new TextEncoder().encode(sse(data)));
			try {
				const stream = anthropic.messages.stream({
					model: 'claude-haiku-4-5-20251001',
					max_tokens: 800,
					system: systemContext,
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
