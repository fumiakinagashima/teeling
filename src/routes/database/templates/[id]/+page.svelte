<script lang="ts">
	import { goto } from '$app/navigation';
	import TemplateForm from '$lib/components/database/TemplateForm.svelte';
	import DialogChatSide from '$lib/components/dialog/DialogChatSide.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const chatContextFields = [
		{ key: 'name', label: 'Template name' },
		{ key: 'description', label: 'Description' },
		{ key: 'bodyFormat', label: 'Body template' }
	];

	let name = $state(data.row.name);
	let description = $state(data.row.description ?? '');
	let bodyFormat = $state(data.row.bodyFormat);
</script>

<div class="page">
	<div class="content-side">
		<div class="content-inner">
			<h1 class="page-title">Edit Template</h1>
			<TemplateForm
				editRow={data.row}
				accountOptions={data.accountOptions}
				bind:name
				bind:description
				bind:bodyFormat
				onSaved={() => goto('/database/templates')}
				onDeleted={() => goto('/database/templates')}
				oncancel={() => goto('/database/templates')}
			/>
		</div>
	</div>
	<DialogChatSide
		dockSide="end"
		contextTitle={data.row.name}
		contextFields={chatContextFields}
		onFormFill={(fields) => {
			if (fields.name !== undefined) name = fields.name;
			if (fields.description !== undefined) description = fields.description;
			if (fields.bodyFormat !== undefined) bodyFormat = fields.bodyFormat;
		}}
	/>
</div>

<style lang="scss">
	.page {
		display: flex;
		flex: 1;
		min-height: 0;
		overflow: hidden;
	}

	.content-side {
		flex: 1;
		min-width: 0;
		overflow-y: auto;
		padding: 28px 32px;
	}

	.content-inner {
		max-width: 720px;
		margin: 0 auto;
	}

	.page-title {
		font-size: 1.125rem;
		font-weight: 600;
		margin: 0 0 24px;
	}
</style>
