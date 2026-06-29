<script lang="ts">
	import type { PageData } from './$types';
	import type { TemplateRow, CustomFieldDef } from '$lib/types/template';

	let { data }: { data: PageData } = $props();

	let templates = $state<TemplateRow[]>(data.templates);

	// Dialog state
	let dialogOpen = $state(false);
	let isNew = $state(false);
	let saving = $state(false);
	let saveError = $state('');

	// Editable form fields
	let editId = $state('');
	let editName = $state('');
	let editType = $state('');
	let editDescription = $state('');
	let editBodyFormat = $state('');
	let editCustomFields = $state<CustomFieldDef[]>([]);
	let editDefaultRoute = $state<{ step: number; approver: string; role: string; email: string }[]>([]);

	function openNew() {
		isNew = true;
		editId = '';
		editName = '';
		editType = '';
		editDescription = '';
		editBodyFormat = '';
		editCustomFields = [];
		editDefaultRoute = [];
		saveError = '';
		dialogOpen = true;
	}

	function openEdit(t: TemplateRow) {
		isNew = false;
		editId = t.id;
		editName = t.name;
		editType = t.type;
		editDescription = t.description ?? '';
		editBodyFormat = t.bodyFormat;
		editCustomFields = t.customFields.map(f => ({ ...f }));
		editDefaultRoute = t.defaultRoute.map(r => ({
			step: r.step,
			approver: r.approver,
			role: r.role ?? '',
			email: r.email ?? ''
		}));
		saveError = '';
		dialogOpen = true;
	}

	function closeDialog() {
		dialogOpen = false;
	}

	function addField() {
		editCustomFields = [
			...editCustomFields,
			{ key: 'f_' + crypto.randomUUID().slice(0, 8), label: '', type: 'text', required: false }
		];
	}

	function removeField(i: number) {
		editCustomFields = editCustomFields.filter((_, idx) => idx !== i);
	}

	function addRouteStep() {
		const maxStep = editDefaultRoute.length > 0 ? Math.max(...editDefaultRoute.map(r => r.step)) : 0;
		editDefaultRoute = [...editDefaultRoute, { step: maxStep + 1, approver: '', role: '', email: '' }];
	}

	function removeRouteStep(i: number) {
		editDefaultRoute = editDefaultRoute.filter((_, idx) => idx !== i);
	}

	async function save() {
		if (!editName.trim()) { saveError = 'テンプレート名は必須です。'; return; }
		if (!editType.trim()) { saveError = '申請種別は必須です。'; return; }
		saving = true;
		saveError = '';
		try {
			const payload = {
				name: editName.trim(),
				type: editType.trim(),
				description: editDescription.trim() || null,
				bodyFormat: editBodyFormat,
				customFields: editCustomFields.filter(f => f.label.trim()),
				defaultRoute: editDefaultRoute
					.filter(r => r.approver.trim())
					.map(r => ({ step: r.step, approver: r.approver.trim(), role: r.role.trim() || undefined, email: r.email.trim() || undefined }))
			};
			if (isNew) {
				const res = await fetch('/api/templates', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(payload)
				});
				if (!res.ok) { const e = await res.json() as { error: string }; saveError = e.error; return; }
				const row = await res.json() as TemplateRow;
				templates = [...templates, row].sort((a, b) => a.name.localeCompare(b.name, 'ja'));
			} else {
				const res = await fetch(`/api/templates/${editId}`, {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(payload)
				});
				if (!res.ok) { const e = await res.json() as { error: string }; saveError = e.error; return; }
				const row = await res.json() as TemplateRow;
				templates = templates.map(t => t.id === editId ? row : t);
			}
			closeDialog();
		} finally {
			saving = false;
		}
	}

	async function deleteTemplate() {
		if (!editId) return;
		const res = await fetch(`/api/templates/${editId}`, { method: 'DELETE' });
		if (res.ok) {
			templates = templates.filter(t => t.id !== editId);
			closeDialog();
		}
	}

	const FIELD_TYPE_LABELS: Record<string, string> = {
		text: 'テキスト',
		number: '数値',
		date: '日付',
		time: '時間'
	};
</script>

<div class="page">
	<div class="page-head">
		<h1 class="page-title">申請テンプレート</h1>
		<button class="btn-primary" onclick={openNew}>+ 新規作成</button>
	</div>

	{#if templates.length === 0}
		<div class="empty">
			<p>テンプレートはまだありません。</p>
		</div>
	{:else}
		<div class="card-grid">
			{#each templates as t}
				<button class="template-card" onclick={() => openEdit(t)}>
					<div class="card-head">
						<span class="card-name">{t.name}</span>
						<span class="card-type">{t.type}</span>
					</div>
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
				</button>
			{/each}
		</div>
	{/if}
</div>

{#if dialogOpen}
	<div class="overlay" role="dialog" aria-modal="true">
		<div class="dialog">
			<div class="dialog-head">
				<h2 class="dialog-title">{isNew ? 'テンプレートを作成' : 'テンプレートを編集'}</h2>
				<button class="btn-close" onclick={closeDialog}>✕</button>
			</div>

			<div class="dialog-body">
				<!-- 基本情報 -->
				<section class="section">
					<h3 class="section-title">基本情報</h3>
					<div class="field">
						<label>テンプレート名 <span class="req">*</span></label>
						<input type="text" bind:value={editName} placeholder="例: 出張申請テンプレート" />
					</div>
					<div class="field">
						<label>申請種別 <span class="req">*</span></label>
						<input type="text" bind:value={editType} placeholder="例: 出張申請" />
					</div>
					<div class="field">
						<label>説明</label>
						<textarea rows="2" bind:value={editDescription} placeholder="このテンプレートの用途・説明"></textarea>
					</div>
				</section>

				<!-- 本文ひな形 -->
				<section class="section">
					<h3 class="section-title">本文ひな形</h3>
					<div class="field">
						<textarea
							class="body-format"
							rows="6"
							bind:value={editBodyFormat}
							placeholder="申請内容のひな形を入力（Markdown使用可）&#10;&#10;例:&#10;## 出張目的&#10;&#10;## 日程&#10;&#10;## 費用内訳"
						></textarea>
					</div>
				</section>

				<!-- カスタムフィールド -->
				<section class="section">
					<div class="section-head">
						<h3 class="section-title">カスタムフィールド</h3>
						<button type="button" class="btn-add" onclick={addField}>+ 追加</button>
					</div>
					{#if editCustomFields.length === 0}
						<p class="empty-hint">フィールドを追加すると、申請フォームに入力欄が表示されます。</p>
					{:else}
						<div class="field-list">
							{#each editCustomFields as field, i}
								<div class="field-row">
									<input
										type="text"
										class="field-label-input"
										bind:value={field.label}
										placeholder="項目名（例: 金額）"
									/>
									<select bind:value={field.type} class="field-type-select">
										<option value="text">テキスト</option>
										<option value="number">数値</option>
										<option value="date">日付</option>
										<option value="time">時間</option>
									</select>
									<label class="required-check">
										<input type="checkbox" bind:checked={field.required} />
										必須
									</label>
									<button type="button" class="btn-remove" onclick={() => removeField(i)}>✕</button>
								</div>
							{/each}
						</div>
					{/if}
				</section>

				<!-- デフォルト承認ルート -->
				<section class="section">
					<div class="section-head">
						<h3 class="section-title">デフォルト承認ルート</h3>
						<button type="button" class="btn-add" onclick={addRouteStep}>+ 追加</button>
					</div>
					{#if editDefaultRoute.length === 0}
						<p class="empty-hint">承認ルートを設定しておくと、申請作成時に自動で入力されます。</p>
					{:else}
						<div class="route-list">
							{#each editDefaultRoute as entry, i}
								<div class="route-row">
									<span class="step-badge">Step {entry.step}</span>
									<input type="text" bind:value={entry.approver} placeholder="承認者名 *" class="route-input" />
									<input type="text" bind:value={entry.role} placeholder="役職（任意）" class="route-input route-input-sm" />
									<input type="email" bind:value={entry.email} placeholder="メール（任意）" class="route-input route-input-sm" />
									<button type="button" class="btn-remove" onclick={() => removeRouteStep(i)}>✕</button>
								</div>
							{/each}
						</div>
					{/if}
				</section>

				{#if saveError}
					<p class="save-error">{saveError}</p>
				{/if}
			</div>

			<div class="dialog-foot">
				{#if !isNew}
					<button class="btn-delete" onclick={deleteTemplate}>削除</button>
				{/if}
				<div class="foot-right">
					<button class="btn-cancel" onclick={closeDialog}>キャンセル</button>
					<button class="btn-save" onclick={save} disabled={saving}>
						{saving ? '保存中...' : '保存'}
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}

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
		cursor: pointer;
		transition: border-color 0.15s, box-shadow 0.15s;
		font: inherit;
		&:hover {
			border-color: var(--color-primary);
			box-shadow: 0 2px 8px color-mix(in srgb, var(--color-primary) 12%, transparent);
		}
	}

	.card-head {
		display: flex;
		align-items: baseline;
		gap: 8px;
	}

	.card-name {
		font-size: 0.9375rem;
		font-weight: 600;
	}

	.card-type {
		font-size: 0.75rem;
		color: var(--color-text-muted);
		background: var(--color-background);
		border: 1px solid var(--color-border);
		border-radius: 4px;
		padding: 1px 6px;
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

	/* Dialog */
	.overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.45);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 200;
		padding: 20px;
	}

	.dialog {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: 12px;
		width: min(620px, 100%);
		max-height: 90vh;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.dialog-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 16px 20px;
		border-bottom: 1px solid var(--color-border);
		flex-shrink: 0;
	}

	.dialog-title {
		font-size: 1rem;
		font-weight: 600;
		margin: 0;
	}

	.btn-close {
		background: none;
		border: none;
		font-size: 1rem;
		color: var(--color-text-muted);
		cursor: pointer;
		padding: 2px 6px;
		&:hover { color: var(--color-text); }
	}

	.dialog-body {
		overflow-y: auto;
		padding: 20px;
		display: flex;
		flex-direction: column;
		gap: 24px;
	}

	.section {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.section-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.section-title {
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--color-text-muted);
		margin: 0;
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 5px;
	}

	label {
		font-size: 0.8125rem;
		font-weight: 500;
		color: var(--color-text-muted);
	}

	.req { color: var(--color-error); }

	input[type="text"], input[type="email"], textarea, select {
		padding: 8px 10px;
		border: 1px solid var(--color-border);
		border-radius: 6px;
		background: var(--color-background);
		color: var(--color-text);
		font-size: 0.9375rem;
		font-family: inherit;
		&:focus { outline: none; border-color: var(--color-primary); }
	}

	textarea { resize: vertical; line-height: 1.6; }
	.body-format { font-family: monospace; font-size: 0.875rem; }

	.btn-add {
		padding: 4px 10px;
		background: none;
		border: 1px solid var(--color-border);
		border-radius: 6px;
		font-size: 0.8125rem;
		color: var(--color-text-muted);
		cursor: pointer;
		&:hover { border-color: var(--color-primary); color: var(--color-primary); }
	}

	.empty-hint {
		font-size: 0.8125rem;
		color: var(--color-text-muted);
		margin: 0;
	}

	.field-list {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.field-row {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.field-label-input {
		flex: 1;
	}

	.field-type-select {
		width: 90px;
		flex-shrink: 0;
		cursor: pointer;
	}

	.required-check {
		display: flex;
		align-items: center;
		gap: 4px;
		font-size: 0.8125rem;
		color: var(--color-text-muted);
		white-space: nowrap;
		cursor: pointer;
		input { width: auto; }
	}

	.btn-remove {
		background: none;
		border: none;
		color: var(--color-text-muted);
		cursor: pointer;
		padding: 4px;
		font-size: 0.875rem;
		flex-shrink: 0;
		&:hover { color: var(--color-error); }
	}

	.route-list {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.route-row {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.step-badge {
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--color-text-muted);
		white-space: nowrap;
		min-width: 44px;
	}

	.route-input {
		flex: 1;
	}

	.route-input-sm {
		flex: 0.7;
	}

	.save-error {
		margin: 0;
		padding: 10px 14px;
		background: color-mix(in srgb, var(--color-error) 10%, transparent);
		border: 1px solid var(--color-error);
		border-radius: 6px;
		color: var(--color-error);
		font-size: 0.875rem;
	}

	.dialog-foot {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 14px 20px;
		border-top: 1px solid var(--color-border);
		flex-shrink: 0;
	}

	.foot-right {
		display: flex;
		gap: 8px;
		margin-left: auto;
	}

	.btn-cancel {
		padding: 8px 16px;
		background: none;
		border: 1px solid var(--color-border);
		border-radius: 6px;
		color: var(--color-text-muted);
		font-size: 0.875rem;
		cursor: pointer;
		font: inherit;
		&:hover { border-color: var(--color-text-muted); color: var(--color-text); }
	}

	.btn-save {
		padding: 8px 20px;
		background: var(--color-primary);
		color: #fff;
		border: none;
		border-radius: 6px;
		font-size: 0.875rem;
		cursor: pointer;
		font: inherit;
		&:disabled { opacity: 0.4; cursor: not-allowed; }
	}

	.btn-delete {
		padding: 8px 16px;
		background: none;
		border: 1px solid var(--color-error);
		border-radius: 6px;
		color: var(--color-error);
		font-size: 0.875rem;
		cursor: pointer;
		font: inherit;
		&:hover { background: color-mix(in srgb, var(--color-error) 8%, transparent); }
	}
</style>
