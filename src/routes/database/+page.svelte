<script lang="ts">
	import type { PageData } from './$types';
	import Clipboard from '$lib/components/icon/Clipboard.svelte';
	import Workflow from '$lib/components/icon/Workflow.svelte';
	import User from '$lib/components/icon/User.svelte';
	import Bell from '$lib/components/icon/Bell.svelte';

	let { data }: { data: PageData } = $props();
</script>

<div class="page">
	<header class="page-header">
		<h1>データ管理</h1>
	</header>

	<div class="grid">
		<a href="/database/approvals" class="card">
			<span class="card-icon"><Clipboard size={28} /></span>
			<span class="card-label">申請管理</span>
			<span class="card-count">{data.counts.approvals} 件</span>
		</a>
		<a href="/database/workflows" class="card">
			<span class="card-icon"><Workflow size={28} /></span>
			<span class="card-label">ワークフロー</span>
			<span class="card-count">{data.counts.workflows} 件</span>
		</a>
		<a href="/database/reminders" class="card">
			<span class="card-icon"><Bell size={28} /></span>
			<span class="card-label">リマインダー</span>
			<span class="card-count">{data.counts.reminders} 件 (保留中)</span>
		</a>
		<a href="/database/accounts" class="card">
			<span class="card-icon"><User size={28} /></span>
			<span class="card-label">アカウント</span>
			<span class="card-count">{data.counts.accounts} 件</span>
		</a>
	</div>
</div>

<style lang="scss">
	.page {
		padding: 32px;
	}

	.page-header {
		margin-bottom: 32px;
	}

	h1 {
		font-size: 1.375rem;
		font-weight: 700;
		margin: 0;
	}

	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
		gap: 16px;
	}

	.card {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 8px;
		padding: 24px 16px;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: 8px;
		text-decoration: none;
		color: var(--color-text);
		transition: border-color 0.15s, background 0.15s;

		&:hover {
			border-color: var(--color-primary);
			background: var(--color-surface-hover);
		}
	}

	.card-icon {
		color: var(--color-primary);
	}

	.card-label {
		font-weight: 600;
		font-size: 0.9rem;
	}

	.card-count {
		font-size: 0.8rem;
		color: var(--color-text-secondary);
	}
</style>
