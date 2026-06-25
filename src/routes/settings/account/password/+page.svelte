<script lang="ts">
	import Textbox from '$lib/components/ui/Textbox.svelte';
	import * as m from '$lib/paraglide/messages.js';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let current = $state('');
	let next = $state('');
	let confirm = $state('');

	let saving = $state(false);
	let saved = $state(false);
	let error = $state('');

	async function changePassword() {
		if (next !== confirm) {
			error = '新しいパスワードが一致しません';
			return;
		}
		if (next.length < 8) {
			error = 'パスワードは8文字以上で入力してください';
			return;
		}
		saving = true;
		saved = false;
		error = '';
		try {
			const res = await fetch('/api/account/password', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ currentPassword: current, newPassword: next })
			});
			if (!res.ok) {
				const body = (await res.json()) as { error?: string };
				error = body.error ?? m.chat_error();
				return;
			}
			current = '';
			next = '';
			confirm = '';
			saved = true;
			setTimeout(() => (saved = false), 2000);
		} finally {
			saving = false;
		}
	}
</script>

<div class="page">
	<h1>設定</h1>
	<nav class="subnav">
		<a href="/settings">一般</a>
		{#if data.account.permission === 'admin'}
			<a href="/settings/integrations">{m.integrations()}</a>
			<a href="/settings/email">{m.email_settings()}</a>
			<a href="/settings/ai">{m.ai_settings()}</a>
		{/if}
		<a href="/settings/account">プロフィール</a>
		<a href="/settings/account/password" class="active">パスワード変更</a>
	</nav>

	<section>
		<div class="fields">
			<Textbox label="現在のパスワード" type="password" bind:value={current} required />
			<Textbox label="新しいパスワード" type="password" bind:value={next} required />
			<Textbox label="新しいパスワード（確認）" type="password" bind:value={confirm} required />
		</div>
		<div class="actions">
			<button
				class="save-btn"
				onclick={changePassword}
				disabled={saving || !current || !next || !confirm}
			>パスワードを変更</button>
			{#if saved}<span class="saved">変更しました</span>{/if}
			{#if error}<span class="error">{error}</span>{/if}
		</div>
	</section>
</div>

<style lang="scss">
	.page { padding: 40px 48px; max-width: 640px; }
	h1 { font-size: 1.25rem; font-weight: 600; margin-bottom: 32px; }
	section { margin-bottom: 40px; }

	.subnav {
		display: flex;
		gap: 4px;
		margin-bottom: 32px;
		border-bottom: 1px solid var(--color-border);
	}
	.subnav a {
		padding: 8px 14px;
		font-size: 0.875rem;
		color: var(--color-text-muted);
		text-decoration: none;
		border-bottom: 2px solid transparent;
		margin-bottom: -1px;
		transition: color 0.15s;
	}
	.subnav a:hover { color: var(--color-text); }
	.subnav a.active { color: var(--color-text); border-bottom-color: var(--color-primary); font-weight: 500; }

	.fields { display: flex; flex-direction: column; gap: 16px; }
	.actions { display: flex; align-items: center; gap: 12px; margin-top: 20px; }
	.save-btn {
		padding: 8px 20px;
		background: var(--color-primary);
		color: #fff;
		border: none;
		border-radius: 6px;
		font-size: 0.875rem;
		cursor: pointer;
	}
	.save-btn:disabled { opacity: 0.4; cursor: not-allowed; }
	.save-btn:not(:disabled):hover { opacity: 0.85; }
	.saved { font-size: 0.8125rem; color: var(--color-text-muted); }
	.error { font-size: 0.8125rem; color: var(--color-danger); }
</style>
