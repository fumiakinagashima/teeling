<script lang="ts">
	import { page } from '$app/state';
	import * as m from '$lib/paraglide/messages.js';
	import { notificationCenter } from '$lib/stores/notifications.svelte';
	import NotificationDrawer from '$lib/components/ui/NotificationDrawer.svelte';
	import Bell from '$lib/components/icon/Bell.svelte';
	import ClipboardCheck from '$lib/components/icon/ClipboardCheck.svelte';
	import Users from '$lib/components/icon/Users.svelte';
	import Workflow from '$lib/components/icon/Workflow.svelte';
	import Settings from '$lib/components/icon/Settings.svelte';
	import LogOut from '$lib/components/icon/LogOut.svelte';
	import type { AccountRow } from '$lib/server/db/account-service';

	type Props = { account: AccountRow };
	let { account }: Props = $props();

	let notificationDrawerOpen = $state(false);

	function toggleNotificationDrawer() {
		notificationDrawerOpen = !notificationDrawerOpen;
		if (notificationDrawerOpen) notificationCenter.loadItems();
	}

	function formatBadgeCount(count: number): string {
		return count > 99 ? '99+' : String(count);
	}

	async function handleSignout() {
		if (!confirm(m.signout_confirm())) return;
		await fetch('/api/auth/signout', { method: 'POST' });
		window.location.href = '/signin';
	}

	function isActive(path: string) {
		return page.url.pathname === path || page.url.pathname.startsWith(path + '/');
	}
</script>

<aside class="sidebar">
	<div class="sidebar-header">
		<a href="/" class="logo">TEELING</a>
	</div>

	<nav class="nav">
		<a href="/" class="nav-item" class:active={page.url.pathname === '/'}>
			<ClipboardCheck size={15} />
			申請一覧
		</a>
		<a href="/database/workflows" class="nav-item" class:active={isActive('/database/workflows')}>
			<Workflow size={15} />
			ワークフロー
		</a>
		{#if account.permission === 'admin'}
			<a href="/database/accounts" class="nav-item" class:active={isActive('/database/accounts')}>
				<Users size={15} />
				アカウント
			</a>
		{/if}
	</nav>

	<div class="sidebar-footer">
		<button class="footer-item notification-toggle" onclick={toggleNotificationDrawer}>
			<Bell size={15} />
			{m.notifications()}
			{#if notificationCenter.unreadCount > 0}
				<span class="notification-badge">{formatBadgeCount(notificationCenter.unreadCount)}</span>
			{/if}
		</button>

		<a href="/settings" class="footer-item" class:active={isActive('/settings')}>
			<Settings size={15} />
			{m.settings()}
		</a>

		<div class="account-row">
			<span class="account-name">{account.name}</span>
			<button class="signout-btn" onclick={handleSignout} title={m.signout()} aria-label={m.signout()}>
				<LogOut size={15} />
			</button>
		</div>
	</div>
</aside>

<NotificationDrawer open={notificationDrawerOpen} onclose={() => (notificationDrawerOpen = false)} />

<style lang="scss">
	.sidebar {
		display: flex;
		flex-direction: column;
		background: var(--sidebar-bg);
		overflow: hidden;
	}

	.sidebar-header {
		padding: 14px 16px 10px;
	}

	.logo {
		font-size: 1rem;
		font-weight: 700;
		color: var(--color-primary);
		text-decoration: none;
		letter-spacing: -0.01em;
		font-family: Georgia, 'Times New Roman', Times, serif;
	}

	.nav {
		flex: 1;
		overflow-y: auto;
		padding: 8px;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.nav-item {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 8px 10px;
		border-radius: 8px;
		font-size: 0.875rem;
		color: var(--sidebar-text-muted);
		text-decoration: none;
		transition: background 0.15s, color 0.15s;

		&:hover {
			background: var(--sidebar-hover);
			color: var(--sidebar-text);
		}

		&.active {
			background: var(--sidebar-hover);
			color: var(--color-text);
			font-weight: 500;
		}
	}

	.sidebar-footer {
		padding: 8px;
		border-top: 1px solid var(--sidebar-border);
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.footer-item {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 8px 10px;
		border-radius: 8px;
		font-size: 0.875rem;
		color: var(--sidebar-text-muted);
		text-decoration: none;
		transition: background 0.15s, color 0.15s;

		&:hover {
			background: var(--sidebar-hover);
			color: var(--sidebar-text);
		}

		&.active {
			color: var(--color-text);
		}
	}

	button.footer-item {
		width: 100%;
		border: none;
		background: transparent;
		font: inherit;
		text-align: left;
		cursor: pointer;
	}

	.notification-badge {
		margin-left: auto;
		min-width: 18px;
		padding: 1px 5px;
		border-radius: 999px;
		background: var(--color-primary);
		color: #fff;
		font-size: 0.6875rem;
		font-weight: 700;
		line-height: 1.4;
		text-align: center;
	}

	.account-row {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 8px 10px;
		margin-top: 4px;
		border-top: 1px solid var(--sidebar-border);
	}

	.account-name {
		flex: 1;
		min-width: 0;
		font-size: 0.8125rem;
		color: var(--sidebar-text-muted);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.signout-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 26px;
		height: 26px;
		flex-shrink: 0;
		border: none;
		border-radius: 6px;
		background: transparent;
		color: var(--sidebar-text-muted);
		cursor: pointer;
		transition: background 0.15s, color 0.15s;

		&:hover {
			background: var(--sidebar-hover);
			color: var(--sidebar-text);
		}
	}
</style>
