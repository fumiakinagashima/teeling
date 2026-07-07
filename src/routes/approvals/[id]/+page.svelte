<script lang="ts">
	import ApprovalDetail from '$lib/components/dialog/ApprovalDetail.svelte';
	import DialogChatSide from '$lib/components/dialog/DialogChatSide.svelte';
	import type { ApprovalRow } from '$lib/server/db/approval-service';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let row = $state<ApprovalRow>(data.row);

	const APPROVAL_STATUS_LABELS: Record<string, string> = {
		pending: '審査中',
		approved: '承認',
		rejected: '否決',
		cancelled: '取り消し'
	};

	const chatRecordContext = $derived({
		type: 'approvals',
		typeLabel: '申請',
		id: row.id,
		label: row.title,
		data: {
			申請者: row.submittedBy,
			ステータス: APPROVAL_STATUS_LABELS[row.status] ?? row.status,
			内容: row.content
		} as Record<string, unknown>
	});
</script>

<div class="page">
	<div class="content-side">
		<div class="content-inner">
			<ApprovalDetail
				initialRow={row}
				accountId={data.accountId}
				onChanged={(updated) => (row = updated)}
			/>
		</div>
	</div>
	<DialogChatSide
		dockSide="end"
		contextTitle={row.title}
		contextFields={[]}
		recordContext={chatRecordContext}
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
</style>
