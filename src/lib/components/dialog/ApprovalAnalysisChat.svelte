<script lang="ts">
	import { tick } from 'svelte';
	import { marked } from 'marked';
	import { filterXSS } from 'xss';
	import ArrowUp from '$lib/components/icon/ArrowUp.svelte';
	import type { ApprovalAnalysisAnalyzed } from '$lib/server/ai/approval-analysis';

	type Props = {
		approvalId: string;
		analysis: ApprovalAnalysisAnalyzed;
	};

	let { approvalId, analysis }: Props = $props();

	type Msg = { role: 'user' | 'assistant'; text: string };

	let messages = $state<Msg[]>([]);
	let input = $state('');
	let loading = $state(false);
	let listEl = $state<HTMLElement | null>(null);

	$effect(() => {
		void messages.length;
		tick().then(() => {
			if (listEl) listEl.scrollTop = listEl.scrollHeight;
		});
	});

	function renderMd(text: string): string {
		return filterXSS(marked.parse(text, { async: false }) as string);
	}

	async function send() {
		const text = input.trim();
		if (!text || loading) return;
		input = '';
		const history = messages.map((m) => ({ role: m.role, text: m.text }));
		messages = [...messages, { role: 'user', text }];
		loading = true;

		let assistantText = '';
		messages = [...messages, { role: 'assistant', text: '' }];
		const idx = messages.length - 1;

		try {
			const res = await fetch(`/api/approvals/${approvalId}/simulate`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ message: text, analysis, history })
			});
			if (!res.body) throw new Error('no body');
			const reader = res.body.getReader();
			const dec = new TextDecoder();
			let buf = '';
			while (true) {
				const { done, value } = await reader.read();
				if (done) break;
				buf += dec.decode(value, { stream: true });
				const lines = buf.split('\n');
				buf = lines.pop() ?? '';
				for (const line of lines) {
					if (!line.startsWith('data: ')) continue;
					try {
						const event = JSON.parse(line.slice(6));
						if (event.type === 'delta') {
							assistantText += event.text;
							messages = messages.map((m, i) => i === idx ? { ...m, text: assistantText } : m);
						}
					} catch { /* ignore */ }
				}
			}
		} catch (e) {
			messages = messages.map((m, i) =>
				i === idx ? { ...m, text: e instanceof Error ? e.message : String(e) } : m
			);
		} finally {
			loading = false;
		}
	}

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
			e.preventDefault();
			send();
		}
	}
</script>

<div class="sim-chat">
	<p class="sim-hint">
		You can run simulations by changing parameters (e.g. "What if the revenue growth rate is 25%?")
	</p>

	{#if messages.length > 0}
		<div class="msg-list" bind:this={listEl}>
			{#each messages as msg}
				<div class="msg msg-{msg.role}">
					{#if msg.role === 'assistant'}
						{#if msg.text}
							<!-- eslint-disable-next-line svelte/no-at-html-tags -->
							{@html renderMd(msg.text)}
						{:else}
							<span class="thinking">Calculating...</span>
						{/if}
					{:else}
						{msg.text}
					{/if}
				</div>
			{/each}
		</div>
	{/if}

	<div class="input-row">
		<textarea
			class="sim-input"
			placeholder="Try different numbers (press Enter to send)"
			rows="5"
			bind:value={input}
			onkeydown={onKeydown}
			disabled={loading}
		></textarea>
		<button class="send-btn" onclick={send} disabled={loading || !input.trim()} aria-label="Send">
			<ArrowUp size={16} />
		</button>
	</div>
</div>

<style lang="scss">
	.sim-chat {
		display: flex;
		flex-direction: column;
		gap: 10px;
		padding-top: 12px;
		border-top: 1px dashed var(--color-border);
		margin-top: 4px;
	}

	.sim-hint {
		font-size: 0.8125rem;
		color: var(--color-text-muted);
		margin: 0;
	}

	.msg-list {
		display: flex;
		flex-direction: column;
		gap: 8px;
		max-height: 320px;
		overflow-y: auto;
	}

	.msg {
		font-size: 0.875rem;
		line-height: 1.65;
		border-radius: 8px;
		padding: 8px 12px;

		&.msg-user {
			background: var(--color-background);
			border: 1px solid var(--color-border);
			align-self: flex-end;
			max-width: 90%;
			white-space: pre-wrap;
		}

		&.msg-assistant {
			background: color-mix(in srgb, var(--color-primary) 5%, var(--color-surface));
			align-self: flex-start;
			max-width: 100%;

			:global(p) { margin: 0 0 6px; }
			:global(p:last-child) { margin-bottom: 0; }
			:global(ul), :global(ol) { margin: 4px 0; padding-left: 1.4em; }
			:global(code) {
				font-family: monospace;
				font-size: 0.85em;
				background: var(--color-background);
				padding: 1px 4px;
				border-radius: 3px;
			}
		}
	}

	.thinking {
		color: var(--color-text-muted);
		font-style: italic;
	}

	.input-row {
		display: flex;
		gap: 8px;
		align-items: flex-end;
	}

	.sim-input {
		flex: 1;
		padding: 8px 10px;
		border: 1px solid var(--color-border);
		border-radius: 8px;
		background: var(--color-background);
		color: var(--color-text);
		font-size: 0.875rem;
		font-family: inherit;
		resize: none;
		line-height: 1.5;

		&:focus {
			outline: none;
			border-color: var(--color-primary);
		}

		&:disabled { opacity: 0.5; }
	}

	.send-btn {
		width: 36px;
		height: 36px;
		flex-shrink: 0;
		border: none;
		border-radius: 8px;
		background: var(--color-primary);
		color: #fff;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: opacity 0.15s;

		&:disabled { opacity: 0.4; cursor: not-allowed; }
	}
</style>
