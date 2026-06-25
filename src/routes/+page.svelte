<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import type { ApprovalListRow } from '$lib/server/db/approval-service';
	import type { PageData } from './$types';
	import * as m from '$lib/paraglide/messages.js';
	import { toast } from '$lib/stores/toast.svelte';

	let { data }: { data: PageData } = $props();

	const STATUS_LABELS: Record<string, string> = {
		draft: m.approval_status_draft(),
		pending: m.approval_status_pending(),
		approved: m.approval_status_approved(),
		rejected: m.approval_status_rejected(),
		cancelled: m.approval_status_cancelled()
	};

	function fmtDate(d: string | Date): string {
		const dt = new Date(d);
		return `${dt.getFullYear()}/${String(dt.getMonth() + 1).padStart(2, '0')}/${String(dt.getDate()).padStart(2, '0')}`;
	}

	function currentApprover(row: ApprovalListRow): string {
		const pending = row.route.find((s) => s.status === 'pending');
		return pending?.approver ?? '—';
	}

	let filter = $state<'pending' | 'all'>('pending');
	let rows = $derived(
		filter === 'pending' ? data.rows.filter((r) => r.status === 'pending') : data.rows
	);

	const now = new Date();
	const thisMonth = now.getMonth();
	const thisYear = now.getFullYear();

	const pendingCount = $derived(data.rows.filter((r) => r.status === 'pending').length);
	const approvedThisMonth = $derived(
		data.rows.filter((r) => {
			if (r.status !== 'approved') return false;
			const d = new Date(r.updatedAt);
			return d.getFullYear() === thisYear && d.getMonth() === thisMonth;
		}).length
	);
	const rejectedThisMonth = $derived(
		data.rows.filter((r) => {
			if (r.status !== 'rejected') return false;
			const d = new Date(r.updatedAt);
			return d.getFullYear() === thisYear && d.getMonth() === thisMonth;
		}).length
	);

	let summarySending = $state(false);
	async function sendSummary() {
		if (summarySending) return;
		summarySending = true;
		try {
			const res = await fetch('/api/approvals/pending-summary', { method: 'POST' });
			const result = await res.json() as { notified?: number; error?: string };
			if (!res.ok) {
				toast.error(result.error ?? 'サマリーの配信に失敗しました');
			} else {
				toast.success(`${result.notified ?? 0}名に承認待ちサマリーを配信しました`);
				await invalidateAll();
			}
		} finally {
			summarySending = false;
		}
	}
</script>

<div class="page">
	<header class="page-header">
		<h1>申請一覧</h1>
		<div class="header-actions">
			{#if data.account?.permission === 'admin'}
				<button class="btn-secondary" onclick={sendSummary} disabled={summarySending}>
					{summarySending ? '配信中...' : '📨 サマリーを配信'}
				</button>
			{/if}
			<a href="/approvals/new" class="btn-primary">+ 新規申請</a>
		</div>
	</header>

	<div class="stats-row">
		<div class="stat-card stat-pending">
			<span class="stat-value">{pendingCount}</span>
			<span class="stat-label">承認待ち</span>
		</div>
		<div class="stat-card stat-approved">
			<span class="stat-value">{approvedThisMonth}</span>
			<span class="stat-label">今月承認済</span>
		</div>
		{#if rejectedThisMonth > 0}
			<div class="stat-card stat-rejected">
				<span class="stat-value">{rejectedThisMonth}</span>
				<span class="stat-label">今月否決</span>
			</div>
		{/if}
		<div class="stat-card stat-total">
			<span class="stat-value">{data.rows.length}</span>
			<span class="stat-label">総件数</span>
		</div>
	</div>

	<div class="filter-tabs">
		<button class="tab" class:active={filter === 'pending'} onclick={() => (filter = 'pending')}>
			承認待ち
			{#if pendingCount > 0}<span class="tab-badge">{pendingCount}</span>{/if}
		</button>
		<button class="tab" class:active={filter === 'all'} onclick={() => (filter = 'all')}>
			全件
		</button>
	</div>

	{#if rows.length === 0}
		<div class="empty">
			{#if filter === 'pending'}
				<p class="empty-title">承認待ちの申請はありません</p>
				<p class="empty-desc">すべての申請が処理済みです。</p>
			{:else}
				<p class="empty-title">申請がまだありません</p>
				<p class="empty-desc">「新規申請」から最初の申請を作成してみましょう。<br>AIに相談しながら申請書を作成できます。</p>
				<a href="/approvals/new" class="btn-primary">+ 最初の申請を作成</a>
			{/if}
		</div>
	{:else}
		<div class="table-wrap">
			<table>
				<thead>
					<tr>
						<th>タイトル</th>
						<th>ステータス</th>
						<th>現在の承認者</th>
						<th>申請者</th>
						<th>申請日</th>
					</tr>
				</thead>
				<tbody>
					{#each rows as row}
						<tr onclick={() => goto(`/approvals/${row.id}`)} class="clickable-row">
							<td class="title-cell">{row.title}</td>
							<td>
								<span class="status-badge status-{row.status}">
									{STATUS_LABELS[row.status] ?? row.status}
								</span>
							</td>
							<td>{currentApprover(row)}</td>
							<td>{row.submittedBy}</td>
							<td>{fmtDate(row.createdAt)}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>

<style lang="scss">
	.page {
		padding: 24px 32px;
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.page-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	h1 {
		font-size: 1.25rem;
		font-weight: 700;
		margin: 0;
	}

	.header-actions {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.btn-primary {
		padding: 7px 14px;
		background: var(--color-primary);
		color: #fff;
		border: none;
		border-radius: 6px;
		font-size: 0.875rem;
		text-decoration: none;
		cursor: pointer;
		white-space: nowrap;
	}

	.btn-secondary {
		padding: 7px 14px;
		background: none;
		border: 1px solid var(--color-border);
		color: var(--color-text);
		border-radius: 6px;
		font-size: 0.875rem;
		cursor: pointer;
		white-space: nowrap;
		transition: background 0.15s;
		&:hover { background: var(--color-surface); }
		&:disabled { opacity: 0.5; cursor: not-allowed; }
	}

	.stats-row {
		display: flex;
		gap: 10px;
	}

	.stat-card {
		display: flex;
		flex-direction: column;
		gap: 2px;
		padding: 12px 16px;
		border: 1px solid var(--color-border);
		border-radius: 8px;
		background: var(--color-surface);
		min-width: 90px;
	}
	.stat-value {
		font-size: 1.5rem;
		font-weight: 700;
		line-height: 1;
	}
	.stat-label {
		font-size: 0.75rem;
		color: var(--color-text-muted);
	}
	.stat-pending .stat-value { color: var(--color-warning); }
	.stat-approved .stat-value { color: var(--color-success); }
	.stat-rejected .stat-value { color: var(--color-error); }
	.stat-total .stat-value { color: var(--color-text); }

	.tab-badge {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 18px;
		height: 18px;
		padding: 0 5px;
		border-radius: 999px;
		background: var(--color-warning);
		color: #fff;
		font-size: 0.6875rem;
		font-weight: 700;
		line-height: 1;
		margin-left: 4px;
	}

	.filter-tabs {
		display: flex;
		gap: 0;
		border-bottom: 1px solid var(--color-border);
	}

	.tab {
		padding: 8px 16px;
		border: none;
		background: transparent;
		font-size: 0.875rem;
		font-family: inherit;
		color: var(--color-text-muted);
		cursor: pointer;
		border-bottom: 2px solid transparent;
		margin-bottom: -1px;
		transition:
			color 0.15s,
			border-color 0.15s;

		&.active {
			color: var(--color-primary);
			border-bottom-color: var(--color-primary);
			font-weight: 500;
		}

		&:hover:not(.active) {
			color: var(--color-text);
		}
	}

	.table-wrap {
		border: 1px solid var(--color-border);
		border-radius: 8px;
		overflow: hidden;
	}

	table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.9375rem;
	}

	thead {
		background: var(--color-surface);
	}

	th {
		padding: 9px 14px;
		text-align: left;
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--color-text-muted);
		border-bottom: 1px solid var(--color-border);
		white-space: nowrap;
	}

	td {
		padding: 10px 14px;
		border-bottom: 1px solid var(--color-border);
		max-width: 220px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	tbody tr:last-child td {
		border-bottom: none;
	}

	.clickable-row {
		cursor: pointer;
		transition: background 0.1s;
		&:hover {
			background: var(--color-surface);
		}
	}

	.title-cell {
		font-weight: 500;
	}

	.status-badge {
		font-size: 0.75rem;
		padding: 2px 8px;
		border-radius: 20px;
		border: 1px solid;
		font-weight: 500;
		white-space: nowrap;

		&.status-draft {
			color: var(--color-neutral);
			border-color: var(--color-neutral);
		}
		&.status-pending {
			color: var(--color-warning);
			border-color: var(--color-warning);
		}
		&.status-approved {
			color: var(--color-success);
			border-color: var(--color-success);
		}
		&.status-rejected {
			color: var(--color-error);
			border-color: var(--color-error);
		}
		&.status-cancelled {
			color: var(--color-neutral);
			border-color: var(--color-neutral);
		}
	}

	.empty {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 8px;
		margin-top: 32px;
	}
	.empty-title {
		font-size: 1rem;
		font-weight: 600;
		margin: 0;
		color: var(--color-text);
	}
	.empty-desc {
		font-size: 0.875rem;
		color: var(--color-text-muted);
		margin: 0 0 4px;
		line-height: 1.6;
	}
</style>
