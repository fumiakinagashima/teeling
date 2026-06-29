<script lang="ts">
	import { untrack } from 'svelte';
	import type { ApprovalRow } from '$lib/server/db/approval-service';
	import type { ApprovalAnalysisResult, ApprovalAnalysisAnalyzed } from '$lib/server/ai/approval-analysis';
	import ApprovalAnalysisChat from './ApprovalAnalysisChat.svelte';
	import * as m from '$lib/paraglide/messages.js';

	type Props = {
		initialRow: ApprovalRow | null;
		accountId?: string;
		onChanged?: (row: ApprovalRow) => void;
	};

	let { initialRow, accountId, onChanged }: Props = $props();

	let row = $state<ApprovalRow | null>(untrack(() => initialRow));
	$effect(() => {
		row = initialRow;
	});

	let actionLoading = $state(false);
	let comments = $state<Record<number, string>>({});

	const STATUS_LABELS: Record<string, string> = {
		draft: m.approval_status_draft(), pending: m.approval_status_pending(),
		approved: m.approval_status_approved(), rejected: m.approval_status_rejected(),
		cancelled: m.approval_status_cancelled()
	};
	const STEP_ICONS: Record<string, string> = {
		pending: '○', approved: '✓', rejected: '✗'
	};
	const RISK_LABELS: Record<string, string> = { low: '低', medium: '中', high: '高' };

	let returnLoading = $state(false);

	async function returnApproval(stepIndex: number) {
		if (!row || returnLoading) return;
		returnLoading = true;
		try {
			const res = await fetch(`/api/approvals/${row.id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ action: 'return', comment: comments[stepIndex] ?? '' })
			});
			if (res.ok) {
				row = await res.json() as ApprovalRow;
				if (row) onChanged?.(row);
			}
		} finally {
			returnLoading = false;
		}
	}

	let analysis = $state<ApprovalAnalysisResult | null>(null);
	let analysisLoading = $state(false);
	let analysisError = $state('');

		async function runAnalysis() {
		if (!row || analysisLoading) return;
		analysisLoading = true;
		analysisError = '';
		analysis = null;
		try {
			const res = await fetch(`/api/approvals/${row.id}/analyze`, { method: 'POST' });
			const result = await res.json() as ApprovalAnalysisResult & { error?: string };
			if (!res.ok) {
				analysisError = (result as { error?: string }).error ?? 'AI分析に失敗しました。';
				return;
			}
			analysis = result;
		} catch (e) {
			analysisError = e instanceof Error ? e.message : String(e);
		} finally {
			analysisLoading = false;
		}
	}

	async function act(stepIndex: number, action: 'approve_step' | 'reject_step') {
		if (!row || actionLoading) return;
		actionLoading = true;
		try {
			const res = await fetch(`/api/approvals/${row.id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ action, step: stepIndex, comment: comments[stepIndex] ?? '' })
			});
			if (res.ok) {
				row = await res.json() as ApprovalRow;
				if (row) onChanged?.(row);
			}
		} finally {
			actionLoading = false;
		}
	}

	async function cancel() {
		if (!row || !confirm('この申請を取り消しますか？')) return;
		const res = await fetch(`/api/approvals/${row.id}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ action: 'cancel' })
		});
		if (res.ok) {
			row = await res.json() as ApprovalRow;
			if (row) onChanged?.(row);
		}
	}

	function fmtDate(d: string | Date | null | undefined): string {
		if (!d) return '—';
		const dt = new Date(d);
		return `${dt.getFullYear()}/${String(dt.getMonth() + 1).padStart(2, '0')}/${String(dt.getDate()).padStart(2, '0')}`;
	}

	function fmtSize(bytes: number): string {
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
		return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
	}

	import type { Attachment } from '$lib/server/db/approval-service';

	function downloadHref(att: Attachment): string {
		if (att.key) return `/api/attachments/${att.key}?filename=${encodeURIComponent(att.name)}`;
		return `data:${att.mimeType};base64,${att.data}`;
	}
</script>

<div class="page">
	{#if !row}
		<p class="status">申請が見つかりません。</p>
	{:else}
		{#if row.status === 'pending' || row.status === 'draft'}
			<header class="page-header">
				{#if row.status === 'draft'}
					<a class="btn-edit" href="/approvals/{row.id}/edit">編集</a>
				{/if}
				<button class="btn-danger-outline" onclick={cancel} disabled={actionLoading}>取り消し</button>
			</header>
		{/if}

		<!-- Header card -->
		<div class="summary-card">
			<div class="summary-head">
				<h1 class="title">{row.title}</h1>
				<span class="status-badge status-{row.status}">
					{STATUS_LABELS[row.status] ?? row.status}
				</span>
			</div>
			<div class="meta-row">
				{#if row.submittedBy}
					<span class="meta-item"><span class="meta-label">申請者</span>{row.submittedBy}</span>
				{/if}
				<span class="meta-item"><span class="meta-label">申請日</span>{fmtDate(row.createdAt)}</span>
				<span class="meta-item"><span class="meta-label">更新日</span>{fmtDate(row.updatedAt)}</span>
			</div>
		</div>

		<!-- Content -->
		{#if row.content}
			<section class="section">
				<h2 class="section-title">申請内容</h2>
				<div class="content-box">{row.content}</div>
			</section>
		{/if}

		<!-- 差し戻しコメント -->
		{#if row.status === 'draft' && row.returnComment}
			<div class="return-banner">
				<span class="return-label">差し戻しコメント</span>
				<p class="return-comment">{row.returnComment}</p>
			</div>
		{/if}

		<!-- AI分析 -->
		{#if row.status === 'pending'}
			<section class="section">
				<div class="section-head">
					<h2 class="section-title">AI分析</h2>
					<button class="btn-ai-review" onclick={runAnalysis} disabled={analysisLoading}>
						{#if analysisLoading}分析中...{:else if analysis}↻ 再分析{:else}✨ AI分析を実行{/if}
					</button>
				</div>
				{#if analysisError}
					<p class="ai-review-error">{analysisError}</p>
				{/if}
				{#if analysis}
					{#if analysis.status === 'insufficient'}
						<div class="insufficient-box">
							<p class="insufficient-reason">{analysis.reason}</p>
							{#if analysis.suggestions.length > 0}
								<div class="ai-review-group">
									<h3 class="ai-review-group-title">追記すると分析できます</h3>
									<ul class="ai-review-list ai-review-checks">
										{#each analysis.suggestions as item}<li>{item}</li>{/each}
									</ul>
								</div>
							{/if}
						</div>
					{:else}
						<!-- Block 1: 申請レビュー -->
						<div class="analysis-block">
							<h3 class="block-title">申請レビュー</h3>
							<div class="analysis-review">
								<span class="risk-badge risk-{analysis.riskLevel}">
									リスク: {RISK_LABELS[analysis.riskLevel] ?? analysis.riskLevel}
								</span>
								<p class="ai-review-summary">{analysis.reviewSummary}</p>
								{#if analysis.concerns.length > 0}
									<div class="ai-review-group">
										<h3 class="ai-review-group-title">問題点</h3>
										<ul class="ai-review-list ai-review-concerns">
											{#each analysis.concerns as item}<li>{item}</li>{/each}
										</ul>
									</div>
								{/if}
								{#if analysis.suggestions?.length > 0}
									<div class="ai-review-group">
										<h3 class="ai-review-group-title">改善提案</h3>
										<ul class="ai-review-list ai-review-suggestions">
											{#each analysis.suggestions as item}<li>{item}</li>{/each}
										</ul>
									</div>
								{/if}
								{#if analysis.checks.length > 0}
									<div class="ai-review-group">
										<h3 class="ai-review-group-title">確認事項</h3>
										<ul class="ai-review-list ai-review-checks">
											{#each analysis.checks as item}<li>{item}</li>{/each}
										</ul>
									</div>
								{/if}
							</div>
						</div>

						{#if analysis.financialApplicable}
							<!-- Block 2: 効果分析 -->
							<div class="analysis-block">
								<h3 class="block-title">効果分析</h3>
								<div class="analysis-metrics">
									{#if analysis.financialSummary}
										<p class="ai-review-summary">{analysis.financialSummary}</p>
									{/if}
									<div class="metrics-badges">
										<span class="data-quality-badge dq-{analysis.dataQuality}">
											データ充足度: {analysis.dataQuality === 'high' ? '高' : analysis.dataQuality === 'medium' ? '中' : '低'}
										</span>
										{#if analysis.roi}<span class="kpi-pill">ROI {analysis.roi}</span>{/if}
										{#if analysis.paybackPeriod}<span class="kpi-pill">回収期間 {analysis.paybackPeriod}</span>{/if}
									</div>
									{#if analysis.keyFigures && analysis.keyFigures.length > 0}
										<div class="kpi-cards">
											{#each analysis.keyFigures as fig}
												<div class="kpi-card">
													<span class="kpi-label">{fig.label}</span>
													<span class="kpi-value">{fig.value}</span>
													{#if fig.quote}<span class="kpi-desc">「{fig.quote}」</span>{/if}
												</div>
											{/each}
										</div>
									{/if}
									{#if analysis.roiFormula || analysis.paybackFormula}
										<div class="ai-review-group">
											<h3 class="ai-review-group-title">計算式</h3>
											<ul class="formula-list">
												{#if analysis.roiFormula}<li>ROI: {analysis.roiFormula}</li>{/if}
												{#if analysis.paybackFormula}<li>回収期間: {analysis.paybackFormula}</li>{/if}
											</ul>
										</div>
									{/if}
									{#if analysis.riskPoints && analysis.riskPoints.length > 0}
										<div class="ai-review-group">
											<h3 class="ai-review-group-title">リスクポイント</h3>
											<ul class="ai-review-list ai-review-concerns">
												{#each analysis.riskPoints as item}<li>{item}</li>{/each}
											</ul>
										</div>
									{/if}
									{#if analysis.missingData && analysis.missingData.length > 0}
										<div class="ai-review-group">
											<h3 class="ai-review-group-title">精度向上に必要な情報</h3>
											<ul class="ai-review-list ai-review-checks">
												{#each analysis.missingData as item}<li>{item}</li>{/each}
											</ul>
										</div>
									{/if}
								</div>
							</div>

							<!-- Block 3: シミュレーション -->
							<ApprovalAnalysisChat
								approvalId={row.id}
								analysis={analysis as ApprovalAnalysisAnalyzed}
							/>
						{/if}
					{/if}
				{/if}
			</section>
		{/if}

		<!-- Attachments -->
		{#if row.attachments.length > 0}
			<section class="section">
				<h2 class="section-title">添付ファイル</h2>
				<ul class="att-list">
					{#each row.attachments as att}
						<li class="att-item">
							<svg class="att-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
								<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
								<polyline points="14 2 14 8 20 8"/>
							</svg>
							<span class="att-name">{att.name}</span>
							<span class="att-size">{fmtSize(att.size)}</span>
							<a class="att-download" href={downloadHref(att)} download={att.name}>
								<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
									<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
									<polyline points="7 10 12 15 17 10"/>
									<line x1="12" y1="15" x2="12" y2="3"/>
								</svg>
								ダウンロード
							</a>
						</li>
					{/each}
				</ul>
			</section>
		{/if}

		<!-- Approval route -->
		<section class="section">
			<h2 class="section-title">承認ルート</h2>
			{#if row.route.length === 0}
				<p class="empty-hint">承認ステップが設定されていません。</p>
			{:else}
				<div class="route-list">
					{#each row.route as step, i}
						{@const priorApproved = row.route.filter(s => s.step < step.step).every(s => s.status === 'approved')}
						{@const isActive = step.status === 'pending' && row.status === 'pending' && priorApproved}
						<div class="step-card" class:step-active={isActive}>
							<div class="step-icon step-icon-{step.status}">
								{STEP_ICONS[step.status] ?? '○'}
							</div>
							<div class="step-body">
								<div class="step-head">
									<span class="step-num">Step {step.step}</span>
									<span class="step-approver">{step.approver}</span>
									{#if step.role}<span class="step-meta">{step.role}</span>{/if}
									{#if step.email}<span class="step-meta">{step.email}</span>{/if}
									<span class="step-status step-status-{step.status}">{STATUS_LABELS[step.status] ?? step.status}</span>
								</div>
								{#if step.comment}
									<p class="step-comment">"{step.comment}"</p>
								{/if}
								{#if step.acted_at}
									<p class="step-date">{fmtDate(step.acted_at)}</p>
								{/if}
								{#if isActive && (!step.accountId || step.accountId === accountId)}
									<div class="step-actions">
										<textarea
											class="comment-input"
											placeholder="コメント（任意）"
											bind:value={comments[i]}
											rows="6"
										></textarea>
										<div class="action-btns">
											<button class="btn-approve" onclick={() => act(i, 'approve_step')} disabled={actionLoading || returnLoading}>承認</button>
											<button class="btn-reject" onclick={() => act(i, 'reject_step')} disabled={actionLoading || returnLoading}>棄却</button>
											<button class="btn-return" onclick={() => returnApproval(i)} disabled={actionLoading || returnLoading}>差し戻し</button>
										</div>
									</div>
								{/if}
							</div>
						</div>
						{#if i < row.route.length - 1}
							<div class="step-connector"></div>
						{/if}
					{/each}
				</div>
			{/if}
		</section>
	{/if}
</div>

<style lang="scss">
	.page {
		display: flex;
		flex-direction: column;
		gap: 20px;
	}

	.page-header {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 16px;
	}

	.breadcrumb { display: flex; align-items: center; gap: 8px; font-size: 0.9375rem; }
	.breadcrumb a { color: var(--color-primary); text-decoration: none; }
	.breadcrumb a:hover { text-decoration: underline; }
	.sep { color: var(--color-text-muted); }
	.breadcrumb span:last-child { font-weight: 600; }

	.btn-edit {
		padding: 6px 14px;
		background: none;
		border: 1px solid var(--color-border);
		border-radius: 6px;
		color: var(--color-text-muted);
		font-size: 0.875rem;
		text-decoration: none;
		cursor: pointer;
	}
	.btn-edit:hover { border-color: var(--color-primary); color: var(--color-primary); }

	.btn-danger-outline {
		padding: 6px 12px;
		background: none;
		border: 1px solid var(--color-danger, var(--color-error));
		color: var(--color-danger, var(--color-error));
		border-radius: 6px;
		font-size: 0.875rem;
		cursor: pointer;
	}
	.btn-danger-outline:hover { background: color-mix(in srgb, var(--color-error) 10%, transparent); }
	.btn-danger-outline:disabled { opacity: 0.4; cursor: not-allowed; }

	.summary-card {
		border: 1px solid var(--color-border);
		border-radius: 10px;
		padding: 18px 20px;
		background: var(--color-surface);
		display: flex;
		flex-direction: column;
		gap: 10px;
	}
	.summary-head { display: flex; align-items: center; gap: 12px; }
	.title { font-size: 1.125rem; font-weight: 600; margin: 0; }
	.status-badge {
		font-size: 0.75rem;
		padding: 3px 10px;
		border-radius: 20px;
		border: 1px solid;
		font-weight: 600;
		white-space: nowrap;

		&.status-draft { color: var(--color-neutral); border-color: var(--color-neutral); }
		&.status-pending { color: var(--color-warning); border-color: var(--color-warning); }
		&.status-approved { color: var(--color-success); border-color: var(--color-success); }
		&.status-rejected { color: var(--color-error); border-color: var(--color-error); }
		&.status-cancelled { color: var(--color-neutral); border-color: var(--color-neutral); }
	}
	.meta-row { display: flex; flex-wrap: wrap; gap: 16px; }
	.meta-item { display: flex; align-items: center; gap: 6px; font-size: 0.875rem; color: var(--color-text-muted); }
	.meta-label { font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; opacity: 0.7; }

	.section { display: flex; flex-direction: column; gap: 10px; }
	.section-title {
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--color-text-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin: 0;
	}
	.section-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; }

	/* AI分析 */
	.btn-ai-review {
		padding: 6px 14px;
		background: none;
		border: 1px solid var(--color-primary);
		color: var(--color-primary);
		border-radius: 6px;
		font-size: 0.8125rem;
		cursor: pointer;
		white-space: nowrap;
	}
	.btn-ai-review:hover { background: color-mix(in srgb, var(--color-primary) 10%, transparent); }
	.btn-ai-review:disabled { opacity: 0.5; cursor: not-allowed; }

	.ai-review-error {
		margin: 0;
		padding: 10px 14px;
		background: color-mix(in srgb, var(--color-error) 10%, transparent);
		border: 1px solid var(--color-error);
		border-radius: 6px;
		color: var(--color-error);
		font-size: 0.875rem;
	}

	.insufficient-box {
		display: flex;
		flex-direction: column;
		gap: 10px;
		padding: 14px 16px;
		border: 1px solid var(--color-border);
		border-radius: 8px;
		background: color-mix(in srgb, var(--color-neutral) 6%, var(--color-surface));
	}
	.insufficient-reason {
		margin: 0;
		font-size: 0.9375rem;
		color: var(--color-text-muted);
	}

	.analysis-block {
		display: flex;
		flex-direction: column;
		gap: 0;
		border: 1px solid var(--color-border);
		border-radius: 8px;
		overflow: hidden;
		background: color-mix(in srgb, var(--color-primary) 3%, var(--color-surface));
	}
	.block-title {
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--color-text-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin: 0;
		padding: 10px 16px;
		border-bottom: 1px solid var(--color-border);
		background: color-mix(in srgb, var(--color-primary) 5%, var(--color-surface));
	}
	.analysis-review {
		display: flex;
		flex-direction: column;
		gap: 10px;
		padding: 14px 16px;
	}
	.analysis-metrics {
		display: flex;
		flex-direction: column;
		gap: 12px;
		padding: 14px 16px;
	}

	.risk-badge {
		display: inline-flex;
		align-self: flex-start;
		font-size: 0.75rem;
		padding: 2px 10px;
		border-radius: 20px;
		border: 1px solid;
		font-weight: 600;
		white-space: nowrap;
		&.risk-low { color: var(--color-success); border-color: var(--color-success); }
		&.risk-medium { color: var(--color-warning); border-color: var(--color-warning); }
		&.risk-high { color: var(--color-error); border-color: var(--color-error); }
	}
	.ai-review-summary { margin: 0; font-size: 0.9375rem; line-height: 1.7; }
	.ai-review-group { display: flex; flex-direction: column; gap: 6px; }
	.ai-review-group-title {
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--color-text-muted);
		margin: 0;
	}
	.ai-review-list { margin: 0; padding-left: 1.4em; font-size: 0.875rem; line-height: 1.7; display: flex; flex-direction: column; gap: 4px; }
	.ai-review-concerns li::marker { color: var(--color-error); }
	.ai-review-suggestions li::marker { color: var(--color-info, var(--color-primary)); }
	.ai-review-checks li::marker { color: var(--color-warning); }

	.metrics-badges { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
	.data-quality-badge {
		font-size: 0.75rem;
		padding: 2px 10px;
		border-radius: 20px;
		border: 1px solid;
		font-weight: 600;
		white-space: nowrap;
		&.dq-high { color: var(--color-success); border-color: var(--color-success); }
		&.dq-medium { color: var(--color-warning); border-color: var(--color-warning); }
		&.dq-low { color: var(--color-neutral); border-color: var(--color-neutral); }
	}
	.kpi-pill {
		font-size: 0.75rem;
		padding: 2px 10px;
		border-radius: 20px;
		background: var(--color-primary);
		color: #fff;
		font-weight: 600;
	}
	.kpi-cards {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
		gap: 8px;
	}
	.kpi-card {
		display: flex;
		flex-direction: column;
		gap: 2px;
		padding: 10px 12px;
		border: 1px solid var(--color-border);
		border-radius: 8px;
		background: var(--color-surface);
	}
	.kpi-label { font-size: 0.75rem; color: var(--color-text-muted); font-weight: 500; }
	.kpi-value { font-size: 1rem; font-weight: 700; color: var(--color-text); }
	.kpi-desc { font-size: 0.72rem; color: var(--color-text-muted); font-style: italic; }
	.formula-list {
		margin: 0;
		padding-left: 1.4em;
		font-size: 0.8125rem;
		color: var(--color-text-muted);
		font-family: monospace;
		line-height: 1.8;
	}

	.content-box {
		padding: 14px 16px;
		border: 1px solid var(--color-border);
		border-radius: 8px;
		background: var(--color-surface);
		font-size: 0.9375rem;
		line-height: 1.7;
		white-space: pre-wrap;
	}

	/* Attachments */
	.att-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 6px; }
	.att-item {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 9px 12px;
		border: 1px solid var(--color-border);
		border-radius: 7px;
		background: var(--color-surface);
		font-size: 0.875rem;
	}
	.att-icon { flex-shrink: 0; color: var(--color-text-muted); }
	.att-name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
	.att-size { flex-shrink: 0; font-size: 0.8125rem; color: var(--color-text-muted); }
	.att-download {
		display: flex;
		align-items: center;
		gap: 4px;
		color: var(--color-primary);
		text-decoration: none;
		font-size: 0.8125rem;
		flex-shrink: 0;
	}
	.att-download:hover { text-decoration: underline; }

	/* Route */
	.route-list { display: flex; flex-direction: column; }
	.step-card {
		display: flex;
		gap: 14px;
		padding: 14px 16px;
		border: 1px solid var(--color-border);
		border-radius: 10px;
		background: var(--color-surface);
	}
	.step-card.step-active {
		border-color: var(--color-primary);
		background: color-mix(in srgb, var(--color-primary) 4%, var(--color-surface));
	}
	.step-connector { width: 2px; height: 12px; background: var(--color-border); margin-left: 23px; }
	.step-icon {
		width: 28px;
		height: 28px;
		border: 2px solid;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.875rem;
		font-weight: 700;
		flex-shrink: 0;
		margin-top: 2px;

		&.step-icon-pending { color: var(--color-warning); border-color: var(--color-warning); }
		&.step-icon-approved { color: var(--color-success); border-color: var(--color-success); }
		&.step-icon-rejected { color: var(--color-error); border-color: var(--color-error); }
	}

	.step-status {
		font-size: 0.8125rem;
		font-weight: 600;
		margin-left: auto;

		&.step-status-pending { color: var(--color-warning); }
		&.step-status-approved { color: var(--color-success); }
		&.step-status-rejected { color: var(--color-error); }
		&.step-status-cancelled { color: var(--color-neutral); }
	}
	.step-body { flex: 1; display: flex; flex-direction: column; gap: 6px; }
	.step-head { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; }
	.step-num { font-size: 0.75rem; color: var(--color-text-muted); }
	.step-approver { font-weight: 600; font-size: 0.9375rem; }
	.step-meta { font-size: 0.8125rem; color: var(--color-text-muted); }
	.step-comment { font-size: 0.875rem; color: var(--color-text-muted); font-style: italic; margin: 0; }
	.step-date { font-size: 0.8125rem; color: var(--color-text-muted); margin: 0; }

	.step-actions { display: flex; flex-direction: column; gap: 8px; margin-top: 6px; }
	.comment-input {
		width: 100%;
		padding: 8px 10px;
		border: 1px solid var(--color-border);
		border-radius: 6px;
		background: var(--color-background);
		color: var(--color-text);
		font-size: 0.875rem;
		resize: vertical;
		font-family: inherit;
		box-sizing: border-box;
	}
	.comment-input:focus { outline: none; border-color: var(--color-primary); }
	.action-btns { display: flex; gap: 8px; }
	.btn-approve {
		padding: 7px 18px;
		background: var(--color-success); color: #fff;
		border: none; border-radius: 6px;
		font-size: 0.875rem; cursor: pointer;
	}
	.btn-approve:hover { background: var(--color-success-hover); }
	.btn-approve:disabled { opacity: 0.4; cursor: not-allowed; }
	.btn-reject {
		padding: 7px 18px;
		background: none; color: var(--color-error);
		border: 1px solid var(--color-error); border-radius: 6px;
		font-size: 0.875rem; cursor: pointer;
	}
	.btn-reject:hover { background: color-mix(in srgb, var(--color-error) 10%, transparent); }
	.btn-reject:disabled { opacity: 0.4; cursor: not-allowed; }

	.btn-return {
		padding: 7px 18px;
		background: none; color: var(--color-warning);
		border: 1px solid var(--color-warning); border-radius: 6px;
		font-size: 0.875rem; cursor: pointer;
	}
	.btn-return:hover { background: color-mix(in srgb, var(--color-warning) 10%, transparent); }
	.btn-return:disabled { opacity: 0.4; cursor: not-allowed; }

	.return-banner {
		display: flex;
		flex-direction: column;
		gap: 6px;
		padding: 12px 16px;
		border: 1px solid var(--color-warning);
		border-radius: 8px;
		background: color-mix(in srgb, var(--color-warning) 8%, var(--color-surface));
	}
	.return-label {
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--color-warning);
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}
	.return-comment { margin: 0; font-size: 0.9375rem; line-height: 1.6; }

	.empty-hint { color: var(--color-text-muted); font-size: 0.875rem; }
	.status { color: var(--color-text-muted); font-size: 0.875rem; }
</style>
