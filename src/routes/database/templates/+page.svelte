<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<div class="page">
	<div class="page-head">
		<h1 class="page-title">申請テンプレート</h1>
		<a class="btn-primary" href="/database/templates/new">+ 新規作成</a>
	</div>

	{#if data.templates.length === 0}
		<div class="empty">
			<p>テンプレートはまだありません。</p>
		</div>
	{:else}
		<div class="card-grid">
			{#each data.templates as t}
				<a class="template-card" href="/database/templates/{t.id}">
					<span class="card-name">{t.name}</span>
					{#if t.description}
						<p class="card-desc">{t.description}</p>
					{/if}
					<div class="card-meta">
						{#if t.customFields.length > 0}
							<span class="card-chip">フィールド {t.customFields.length}件</span>
						{/if}
						{#if t.defaultRoute.length > 0}
							<span class="card-chip">承認ルート {t.defaultRoute.length}ステップ</span>
						{/if}
					</div>
				</a>
			{/each}
		</div>
	{/if}
</div>

<style lang="scss">
	.page {
		padding: 24px;
		max-width: 900px;
	}

	.page-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 24px;
	}

	.page-title {
		font-size: 1.125rem;
		font-weight: 600;
		margin: 0;
	}

	.btn-primary {
		padding: 8px 16px;
		background: var(--color-primary);
		color: #fff;
		border: none;
		border-radius: 6px;
		font-size: 0.875rem;
		text-decoration: none;
		cursor: pointer;
		&:hover { opacity: 0.9; }
	}

	.empty {
		color: var(--color-text-muted);
		font-size: 0.875rem;
		padding: 40px 0;
		text-align: center;
	}

	.card-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
		gap: 12px;
	}

	.template-card {
		display: flex;
		flex-direction: column;
		gap: 8px;
		padding: 16px;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: 10px;
		text-align: left;
		text-decoration: none;
		color: inherit;
		cursor: pointer;
		transition: border-color 0.15s, box-shadow 0.15s;
		font: inherit;
		&:hover {
			border-color: var(--color-primary);
			box-shadow: 0 2px 8px color-mix(in srgb, var(--color-primary) 12%, transparent);
		}
	}

	.card-name {
		font-size: 0.9375rem;
		font-weight: 600;
	}

	.card-desc {
		margin: 0;
		font-size: 0.8125rem;
		color: var(--color-text-muted);
		line-height: 1.5;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.card-meta {
		display: flex;
		gap: 6px;
		flex-wrap: wrap;
	}

	.card-chip {
		font-size: 0.75rem;
		color: var(--color-text-muted);
		background: var(--color-background);
		border: 1px solid var(--color-border);
		border-radius: 4px;
		padding: 2px 7px;
	}
</style>
