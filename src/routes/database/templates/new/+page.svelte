<script lang="ts">
	import { goto } from '$app/navigation';
	import TemplateForm from '$lib/components/database/TemplateForm.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<div class="page">
	<h1 class="page-title">テンプレートを作成</h1>
	<TemplateForm
		accountOptions={data.accountOptions}
		onSaved={(row) => goto(`/database/templates/${row.id}`)}
		oncancel={() => goto('/database/templates')}
	/>
</div>

<style lang="scss">
	.page {
		padding: 24px;
		max-width: 720px;
	}

	.page-title {
		font-size: 1.125rem;
		font-weight: 600;
		margin: 0 0 24px;
	}
</style>
