<script lang="ts">
	import { goto } from '$app/navigation';
	import type { ApprovalListRow } from '$lib/server/db/approval-service';
	import type { PageData } from './$types';
	import * as m from '$lib/paraglide/messages.js';

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

	let filter = $state<'draft' | 'pending' | 'all'>('pending');

	// The "My items" toggle is remembered in a cookie. Reading it from the load function
	// in +page.server.ts at SSR time avoids the flicker that would occur via localStorage
	// (which only takes effect after hydration)
	const MY_ONLY_COOKIE = 'teeling_top_my_only';

	let myOnly = $state(data.myOnly);

	function setMyOnly(value: boolean) {
		myOnly = value;
		document.cookie = `${MY_ONLY_COOKIE}=${value}; path=/; max-age=31536000; SameSite=Lax`;
	}

	const baseRows = $derived(
		filter === 'all' ? data.rows : data.rows.filter((r) => r.status === filter)
	);
	const rows = $derived(
		myOnly
			? baseRows.filter((r) => {
					if (filter === 'pending') {
						const currentStep = r.route.find((s) => s.status === 'pending');
						return currentStep?.accountId === data.accountId;
					}
					return (
						r.route.some((s) => s.accountId === data.accountId) ||
						r.submittedByAccountId === data.accountId
					);
				})
			: baseRows
	);

	const now = new Date();
	const thisMonth = now.getMonth();
	const thisYear = now.getFullYear();

	const pendingCount = $derived(data.rows.filter((r) => r.status === 'pending').length);
	const draftCount = $derived(data.rows.filter((r) => r.status === 'draft').length);

	const pendingBadge = $derived(
		myOnly
			? data.rows.filter((r) => {
					if (r.status !== 'pending') return false;
					const currentStep = r.route.find((s) => s.status === 'pending');
					return currentStep?.accountId === data.accountId;
				}).length
			: pendingCount
	);
	const draftBadge = $derived(
		myOnly
			? data.rows.filter((r) => {
					if (r.status !== 'draft') return false;
					return (
						r.route.some((s) => s.accountId === data.accountId) ||
						r.submittedByAccountId === data.accountId
					);
				}).length
			: draftCount
	);
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

</script>

<div class="page">
	<header class="page-header">
		<h1>Requests</h1>
		<div class="header-actions">
				<a href="/approvals/new" class="btn-primary">+ New Request</a>
		</div>
	</header>

	<div class="stats-row">
		<div class="stat-card stat-pending">
			<span class="stat-value">{pendingCount}</span>
			<span class="stat-label">Pending</span>
		</div>
		<div class="stat-card stat-approved">
			<span class="stat-value">{approvedThisMonth}</span>
			<span class="stat-label">Approved this month</span>
		</div>
		<div class="stat-card stat-rejected">
			<span class="stat-value">{rejectedThisMonth}</span>
			<span class="stat-label">Rejected this month</span>
		</div>
		<div class="stat-card stat-total">
			<span class="stat-value">{data.rows.length}</span>
			<span class="stat-label">Total</span>
		</div>
	</div>

	<div class="filter-tabs">
		<div class="tabs-left">
			<button class="tab" class:active={filter === 'pending'} onclick={() => (filter = 'pending')}>
				Pending
				{#if pendingBadge > 0}<span class="tab-badge">{pendingBadge}</span>{/if}
			</button>
			<button class="tab" class:active={filter === 'draft'} onclick={() => (filter = 'draft')}>
				Draft
				{#if draftBadge > 0}<span class="tab-badge tab-badge-draft">{draftBadge}</span>{/if}
			</button>
			<button class="tab" class:active={filter === 'all'} onclick={() => (filter = 'all')}>
				All
			</button>
		</div>
		<label class="toggle-label">
			<span class="toggle-text">My items</span>
			<span class="toggle-switch" class:on={myOnly}>
				<input
					type="checkbox"
					checked={myOnly}
					onchange={(e) => setMyOnly((e.target as HTMLInputElement).checked)}
					class="toggle-input"
				/>
				<span class="toggle-thumb"></span>
			</span>
		</label>
	</div>

	{#if data.rows.length === 0}
		<div class="welcome-guide">
			<h2 class="welcome-title">Welcome to Teeling</h2>
			<p class="welcome-desc">Create requests together with AI and shorten your approval cycle.</p>
			<div class="flow-steps">
				<div class="flow-step">
					<div class="flow-icon">💬</div>
					<div class="flow-step-body">
						<h3>Create a request while consulting the AI</h3>
						<p>Just say "create a business trip request." The AI organizes the details and drafts the request for you.</p>
					</div>
				</div>
				<div class="flow-arrow">→</div>
				<div class="flow-step">
					<div class="flow-icon">🔍</div>
					<div class="flow-step-body">
						<h3>AI reviews the request</h3>
						<p>The AI points out issues and areas for improvement, so you can polish the content before it reaches the approver.</p>
					</div>
				</div>
				<div class="flow-arrow">→</div>
				<div class="flow-step">
					<div class="flow-icon">📊</div>
					<div class="flow-step-body">
						<h3>Decision-making data is generated automatically</h3>
						<p>The AI calculates financial decision-making data such as ROI and payback period, so the approver can decide right away.</p>
					</div>
				</div>
				<div class="flow-arrow">→</div>
				<div class="flow-step">
					<div class="flow-icon">✅</div>
					<div class="flow-step-body">
						<h3>Approve and complete</h3>
						<p>The approver reviews and approves it, and the result is instantly sent to the requester.</p>
					</div>
				</div>
			</div>
			<a href="/approvals/new" class="btn-primary">+ Create your first request</a>
		</div>
	{:else if rows.length === 0}
		<div class="empty">
			{#if filter === 'pending'}
				<p class="empty-title">No requests are pending approval</p>
				<p class="empty-desc">All requests have been processed.</p>
			{:else if filter === 'draft'}
				<p class="empty-title">No draft requests</p>
				<p class="empty-desc">Requests saved as drafts will appear here.</p>
			{:else}
				<p class="empty-title">No requests assigned to you</p>
				<p class="empty-desc">Try changing the filter or creating a new request.</p>
			{/if}
		</div>
	{:else}
		<div class="table-wrap">
			<table>
				<thead>
					<tr>
						<th>Title</th>
						<th>Status</th>
						<th>Current Approver</th>
						<th>Requester</th>
						<th>Date</th>
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

	.stats-row {
		display: flex;
		gap: 10px;
		margin-bottom: 24px;
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

		&.tab-badge-draft { background: var(--color-neutral); }
	}

	.filter-tabs {
		display: flex;
		align-items: center;
		justify-content: space-between;
		border-bottom: 1px solid var(--color-border);
	}

	.tabs-left {
		display: flex;
		gap: 0;
	}

	.toggle-label {
		display: flex;
		align-items: center;
		gap: 8px;
		padding-bottom: 1px;
		cursor: pointer;
		user-select: none;
	}
	.toggle-text {
		font-size: 0.8125rem;
		color: var(--color-text-muted);
	}
	.toggle-input { display: none; }
	.toggle-switch {
		position: relative;
		width: 32px;
		height: 18px;
		border-radius: 999px;
		background: var(--color-border);
		transition: background 0.2s;
		flex-shrink: 0;

		&.on { background: var(--color-primary); }
	}
	.toggle-thumb {
		position: absolute;
		top: 2px;
		left: 2px;
		width: 14px;
		height: 14px;
		border-radius: 50%;
		background: #fff;
		transition: transform 0.2s;
		box-shadow: 0 1px 3px rgba(0,0,0,0.2);

		.on & { transform: translateX(14px); }
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

	.welcome-guide {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 24px;
		margin-top: 16px;
		padding: 32px;
		border: 1px solid var(--color-border);
		border-radius: 12px;
		background: var(--color-surface);
	}
	.welcome-title {
		font-size: 1.125rem;
		font-weight: 700;
		margin: 0;
	}
	.welcome-desc {
		font-size: 0.9375rem;
		color: var(--color-text-muted);
		margin: -16px 0 0;
		line-height: 1.6;
	}
	.flow-steps {
		display: flex;
		align-items: flex-start;
		gap: 8px;
		flex-wrap: wrap;
	}
	.flow-step {
		display: flex;
		align-items: flex-start;
		gap: 12px;
		padding: 16px;
		border: 1px solid var(--color-border);
		border-radius: 10px;
		background: var(--color-background);
		width: 200px;
		flex-shrink: 0;
	}
	.flow-icon {
		font-size: 1.5rem;
		line-height: 1;
		flex-shrink: 0;
	}
	.flow-step-body {
		display: flex;
		flex-direction: column;
		gap: 4px;

		h3 {
			font-size: 0.8125rem;
			font-weight: 600;
			margin: 0;
			line-height: 1.4;
		}
		p {
			font-size: 0.8125rem;
			color: var(--color-text-muted);
			margin: 0;
			line-height: 1.5;
		}
	}
	.flow-arrow {
		font-size: 1.25rem;
		color: var(--color-text-muted);
		padding-top: 20px;
		flex-shrink: 0;
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
