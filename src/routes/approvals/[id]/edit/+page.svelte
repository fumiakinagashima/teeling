<script lang="ts">
	import { goto } from '$app/navigation';
	import ApprovalForm from '$lib/components/dialog/ApprovalForm.svelte';
	import DialogChatSide from '$lib/components/dialog/DialogChatSide.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const chatContextFields = [
		{ key: 'title', label: 'Title' },
		{ key: 'content', label: 'Request Content' }
	];

	let title = $state(data.row.title);
	let content = $state(data.row.content);
</script>

<div class="page">
	<div class="content-side">
		<div class="content-inner">
			<h2 class="page-title">Edit Request</h2>
			<ApprovalForm
				accountOptions={data.accountOptions}
				editRow={data.row}
				bind:title
				bind:content
				onSaved={(id) => goto(`/approvals/${id}`)}
				oncancel={() => goto(`/approvals/${data.row.id}`)}
			/>
		</div>
	</div>
	<DialogChatSide
		dockSide="end"
		contextTitle={data.row.title}
		contextFields={chatContextFields}
		onFormFill={(fields) => {
			if (fields.title !== undefined) title = fields.title;
			if (fields.content !== undefined) content = fields.content;
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
