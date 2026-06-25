<script lang="ts">
	import { goto } from '$app/navigation';
	import ApprovalForm from '$lib/components/dialog/ApprovalForm.svelte';
	import DialogChatSide from '$lib/components/dialog/DialogChatSide.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const chatContextFields = [
		{ key: 'title', label: 'タイトル' },
		{ key: 'content', label: '申請内容' },
		{ key: 'route', label: '承認ルート' }
	];
</script>

<div class="page">
	<div class="content-side">
		<div class="content-inner">
			<h2 class="page-title">新規申請</h2>
			<ApprovalForm
				accountOptions={data.accountOptions}
				onCreated={(id) => goto(`/approvals/${id}`)}
				oncancel={() => goto('/')}
			/>
		</div>
	</div>
	<div class="chat-side">
		<DialogChatSide contextTitle="新規申請" contextFields={chatContextFields} />
	</div>
</div>

<style lang="scss">
	.page {
		display: flex;
		flex: 1;
		min-height: 0;
		overflow: hidden;
	}

	.chat-side {
		width: 320px;
		flex-shrink: 0;
		border-left: 1px solid var(--color-border);
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
