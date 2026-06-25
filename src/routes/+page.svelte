<script lang="ts">
	import { goto } from '$app/navigation';
	import type { ApprovalListRow } from '$lib/server/db/approval-service';
	import type { PageData } from './$types';
	import * as m from '$lib/paraglide/messages.js';

	let { data }: { data: PageData } = $props();

	const STATUS_LABELS: Record<string, string> = {
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
</script>

<div class="page">
	<header class="page-header">
		<h1>申請一覧</h1>
		<a href="/approvals/new" class="btn-primary">+ 新規申請</a>
	</header>

	<div class="filter-tabs">
		<button class="tab" class:active={filter === 'pending'} onclick={() => (filter = 'pending')}>
			承認待ち
		</button>
		<button class="tab" class:active={filter === 'all'} onclick={() => (filter = 'all')}>
			全件
		</button>
	</div>

	{#if rows.length === 0}
		<div class="empty">
			<p>{filter === 'pending' ? '承認待ちの申請はありません。' : '申請がありません。'}</p>
			{#if filter === 'all'}
				<a href="/approvals/new" class="btn-primary">最初の申請を作成</a>
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
		gap: 12px;
		margin-top: 32px;
		color: var(--color-text-muted);
		font-size: 0.875rem;
	}
</style>
