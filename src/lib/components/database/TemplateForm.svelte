<script lang="ts">
	import type { TemplateRow, CustomFieldDef } from '$lib/types/template';
	import type { AccountRow } from '$lib/server/db/account-service';

	type Props = {
		editRow?: TemplateRow;
		accountOptions: AccountRow[];
		name?: string;
		description?: string;
		bodyFormat?: string;
		onSaved?: (row: TemplateRow) => void;
		onDeleted?: () => void;
		oncancel?: () => void;
	};

	let {
		editRow,
		accountOptions,
		name = $bindable(editRow?.name ?? ''),
		description = $bindable(editRow?.description ?? ''),
		bodyFormat = $bindable(editRow?.bodyFormat ?? ''),
		onSaved,
		onDeleted,
		oncancel
	}: Props = $props();

	type RouteEntry = {
		step: number;
		accountId: string;
		approver: string;
		role: string;
		email: string;
	};

	let customFields = $state<CustomFieldDef[]>(editRow?.customFields.map(f => ({ ...f })) ?? []);
	let routeEntries = $state<RouteEntry[]>(
		editRow && editRow.defaultRoute.length > 0
			? editRow.defaultRoute.map(r => ({
				step: r.step,
				accountId: r.accountId ?? '',
				approver: r.approver,
				role: r.role ?? '',
				email: r.email ?? ''
			}))
			: [{ step: 1, accountId: '', approver: '', role: '', email: '' }]
	);

	function selectAccount(entry: RouteEntry, id: string) {
		entry.accountId = id;
		if (id) {
			const acc = accountOptions.find(a => a.id === id);
			if (acc) {
				entry.approver = acc.name;
				entry.email = acc.email ?? '';
				entry.role = acc.role ?? '';
			}
		} else {
			entry.approver = '';
			entry.email = '';
			entry.role = '';
		}
		routeEntries = [...routeEntries]; // trigger reactivity
	}

	function addStep() {
		const maxStep = Math.max(...routeEntries.map(r => r.step), 0);
		routeEntries = [...routeEntries, { step: maxStep + 1, accountId: '', approver: '', role: '', email: '' }];
	}

	function removeStep(i: number) {
		routeEntries = routeEntries.filter((_, idx) => idx !== i);
	}

	function addField() {
		customFields = [
			...customFields,
			{ key: 'f_' + crypto.randomUUID().slice(0, 8), label: '', type: 'text', required: false }
		];
	}

	function removeField(i: number) {
		customFields = customFields.filter((_, idx) => idx !== i);
	}

	let saving = $state(false);
	let deleting = $state(false);
	let error = $state('');

	async function save() {
		if (!name.trim()) { error = 'Template name is required.'; return; }
		saving = true;
		error = '';
		try {
			const payload = {
				name: name.trim(),
				description: description.trim() || null,
				bodyFormat,
				customFields: customFields.filter(f => f.label.trim()),
				defaultRoute: routeEntries
					.filter(r => r.accountId)
					.map(r => ({ step: r.step, accountId: r.accountId, approver: r.approver, role: r.role.trim() || undefined, email: r.email.trim() || undefined }))
			};
			const res = editRow
				? await fetch(`/api/templates/${editRow.id}`, {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(payload)
				})
				: await fetch('/api/templates', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(payload)
				});
			if (!res.ok) { const e = await res.json() as { error: string }; error = e.error; return; }
			const row = await res.json() as TemplateRow;
			onSaved?.(row);
		} finally {
			saving = false;
		}
	}

	async function deleteTemplate() {
		if (!editRow) return;
		if (!confirm('Delete this template?')) return;
		deleting = true;
		try {
			const res = await fetch(`/api/templates/${editRow.id}`, { method: 'DELETE' });
			if (res.ok) onDeleted?.();
		} finally {
			deleting = false;
		}
	}

	const FIELD_TYPE_LABELS: Record<string, string> = {
		text: 'Text',
		number: 'Number',
		date: 'Date',
		time: 'Time'
	};
</script>

<div class="form">
	<!-- Basic information -->
	<section class="section">
		<h3 class="section-title">Basic information</h3>
		<div class="field">
			<label>Template name <span class="req">*</span></label>
			<input type="text" bind:value={name} placeholder="e.g. Business trip request template" autofocus />
		</div>
		<div class="field">
			<label>Description</label>
			<textarea rows="2" bind:value={description} placeholder="Purpose and description of this template"></textarea>
		</div>
	</section>

	<!-- Body template -->
	<section class="section">
		<h3 class="section-title">Body template</h3>
		<div class="field">
			<textarea
				class="body-format"
				rows="6"
				bind:value={bodyFormat}
				placeholder="Enter a template for the request content (Markdown supported)&#10;&#10;Example:&#10;## Purpose of trip&#10;&#10;## Schedule&#10;&#10;## Cost breakdown"
			></textarea>
		</div>
	</section>

	<!-- Custom fields -->
	<section class="section">
		<div class="section-head">
			<h3 class="section-title">Custom fields</h3>
			<button type="button" class="btn-add" onclick={addField}>+ Add</button>
		</div>
		{#if customFields.length === 0}
			<p class="empty-hint">Adding a field will show an input on the request form.</p>
		{:else}
			<div class="field-list">
				{#each customFields as field, i}
					<div class="field-row">
						<input
							type="text"
							class="field-label-input"
							bind:value={field.label}
							placeholder="Field name (e.g. Amount)"
						/>
						<select bind:value={field.type} class="field-type-select">
							{#each Object.entries(FIELD_TYPE_LABELS) as [value, label]}
								<option {value}>{label}</option>
							{/each}
						</select>
						<label class="required-check">
							<input type="checkbox" bind:checked={field.required} />
							Required
						</label>
						<button type="button" class="btn-remove" onclick={() => removeField(i)}>✕</button>
					</div>
				{/each}
			</div>
		{/if}
	</section>

	<!-- Default approval route (same UX as the request form: Step is free-form input, same number = parallel approval) -->
	<section class="section">
		<div class="field-header">
			<label>Default approval route</label>
			<button type="button" class="btn-add-step" onclick={addStep}>+ Add approver</button>
		</div>
		<div class="route-list">
			{#each routeEntries as entry, i}
				<div class="route-entry">
					<div class="step-num-wrap">
						<span class="step-label">Step</span>
						<input type="number" class="step-num-input" bind:value={entry.step} min="1" />
					</div>
					<div class="sub-field sub-field-wide">
						<label>Approver</label>
						<select
							class="account-select"
							value={entry.accountId}
							onchange={(e) => selectAccount(entry, (e.target as HTMLSelectElement).value)}
						>
							<option value="">— Select an approver —</option>
							{#each accountOptions as acc}
								<option value={acc.id}>{acc.name}{acc.role ? ` (${acc.role})` : ''}</option>
							{/each}
						</select>
					</div>
					{#if routeEntries.length > 1}
						<button type="button" class="btn-remove" onclick={() => removeStep(i)}>✕</button>
					{/if}
				</div>
			{/each}
		</div>
		<p class="hint">Using the same Step number makes it a parallel approval (AND). This is filled in automatically when a request is created.</p>
	</section>

	{#if error}
		<p class="error-msg">{error}</p>
	{/if}

	<div class="form-actions">
		{#if editRow}
			<button type="button" class="btn-delete" onclick={deleteTemplate} disabled={deleting}>
				{deleting ? 'Deleting...' : 'Delete'}
			</button>
		{/if}
		<div class="actions-right">
			<button type="button" class="btn-cancel" onclick={() => oncancel?.()}>Cancel</button>
			<button type="button" class="btn-save" onclick={save} disabled={saving}>
				{saving ? 'Saving...' : 'Save'}
			</button>
		</div>
	</div>
</div>

<style lang="scss">
	.form {
		display: flex;
		flex-direction: column;
		gap: 24px;
	}

	.section { display: flex; flex-direction: column; gap: 10px; }

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

	.field { display: flex; flex-direction: column; gap: 5px; }

	.field-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	label {
		font-size: 0.8125rem;
		font-weight: 500;
		color: var(--color-text-muted);
	}

	.req { color: var(--color-danger, var(--color-error)); }

	input[type="text"], input[type="email"], textarea, select {
		padding: 9px 11px;
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

	.btn-add, .btn-add-step {
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

	.field-list { display: flex; flex-direction: column; gap: 6px; }

	.field-row {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.field-label-input { flex: 1; }

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

	/* Route builder (same style as the request form) */
	.route-list { display: flex; flex-direction: column; gap: 8px; }

	.route-entry {
		display: flex;
		align-items: flex-end;
		gap: 8px;
		padding: 12px 14px;
		border: 1px solid var(--color-border);
		border-radius: 8px;
		background: var(--color-surface);
	}

	.step-num-wrap {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 4px;
		flex-shrink: 0;
	}
	.step-label { font-size: 0.75rem; font-weight: 500; color: var(--color-text-muted); }
	.step-num-input {
		width: 52px;
		padding: 8px 6px;
		border: 1px solid var(--color-border);
		border-radius: 6px;
		background: var(--color-background);
		color: var(--color-text);
		font-size: 0.9375rem;
		text-align: center;
		font-family: inherit;
	}
	.step-num-input:focus { outline: none; border-color: var(--color-primary); }

	.sub-field { flex: 1; display: flex; flex-direction: column; gap: 4px; min-width: 0; }
	.sub-field-wide { flex: 2; }

	.account-select {
		padding: 8px 10px;
		border: 1px solid var(--color-border);
		border-radius: 6px;
		background: var(--color-background);
		color: var(--color-text);
		font-size: 0.9375rem;
		font-family: inherit;
		cursor: pointer;
	}
	.account-select:focus { outline: none; border-color: var(--color-primary); }

	.hint { font-size: 0.8125rem; color: var(--color-text-muted); margin: 0; }

	.error-msg {
		padding: 10px 14px;
		background: color-mix(in srgb, var(--color-error) 10%, transparent);
		border: 1px solid var(--color-error);
		border-radius: 6px;
		color: var(--color-error);
		font-size: 0.875rem;
	}

	.form-actions {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
		padding-top: 4px;
	}

	.actions-right {
		display: flex;
		gap: 10px;
		margin-left: auto;
	}

	.btn-cancel {
		padding: 8px 18px;
		background: none;
		border: 1px solid var(--color-border);
		border-radius: 6px;
		color: var(--color-text-muted);
		font-size: 0.9375rem;
		font-family: inherit;
		cursor: pointer;
		&:hover { border-color: var(--color-text-muted); color: var(--color-text); }
	}

	.btn-save {
		padding: 8px 22px;
		background: var(--color-primary);
		color: #fff;
		border: none;
		border-radius: 6px;
		font-size: 0.9375rem;
		font-family: inherit;
		cursor: pointer;
		&:disabled { opacity: 0.4; cursor: not-allowed; }
	}

	.btn-delete {
		padding: 8px 16px;
		background: none;
		border: 1px solid var(--color-error);
		border-radius: 6px;
		color: var(--color-error);
		font-size: 0.9375rem;
		font-family: inherit;
		cursor: pointer;
		&:hover { background: color-mix(in srgb, var(--color-error) 8%, transparent); }
		&:disabled { opacity: 0.4; cursor: not-allowed; }
	}
</style>
