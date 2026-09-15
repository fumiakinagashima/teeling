<script lang="ts">
	import { tick } from 'svelte';
	import ArrowUp from '$lib/components/icon/ArrowUp.svelte';
	import { marked } from 'marked';
	import { filterXSS } from 'xss';

	type DialogMessage = { role: 'user' | 'assistant'; text: string };

	type RecordContext = {
		type: string;
		typeLabel: string;
		id: string;
		label: string;
		data?: Record<string, unknown>;
	};

	type Props = {
		contextTitle: string;
		contextFields: { key: string; label: string }[];
		// The record currently being viewed in detail. Lets the AI resolve references like "this customer"
		recordContext?: RecordContext | null;
		// When set, the AI can fill the corresponding fields (title/content) directly into the form
		onFormFill?: (fields: Record<string, string>) => void;
		// Whether this panel sits to the left (start) or right (end) of the content.
		// Determines where the resize handle is shown and the sign of the drag direction
		dockSide?: 'start' | 'end';
	};

	let {
		contextTitle,
		contextFields,
		recordContext = null,
		onFormFill,
		dockSide = 'start'
	}: Props = $props();

	let chatMessages = $state<DialogMessage[]>([]);
	let chatInput = $state('');
	let chatLoading = $state(false);
	let chatListEl = $state<HTMLElement | null>(null);

	// Width of the AI assistant panel (resizable by dragging; remembered in localStorage)
	const CHAT_WIDTH_STORAGE_KEY = 'teeling_dialog_chat_width';
	const CHAT_WIDTH_MIN = 260;
	const CHAT_WIDTH_MAX = 560;
	const CHAT_WIDTH_DEFAULT = 300;
	const CHAT_WIDTH_KEY_STEP = 20;

	function clampChatWidth(w: number): number {
		return Math.min(CHAT_WIDTH_MAX, Math.max(CHAT_WIDTH_MIN, w));
	}

	function loadChatWidth(): number {
		if (typeof localStorage === 'undefined') return CHAT_WIDTH_DEFAULT;
		const raw = Number(localStorage.getItem(CHAT_WIDTH_STORAGE_KEY));
		return Number.isFinite(raw) && raw > 0 ? clampChatWidth(raw) : CHAT_WIDTH_DEFAULT;
	}

	let chatWidth = $state(loadChatWidth());
	let resizing = $state(false);

	// Order chat-side and the handle correctly around the parent's content side (unspecified order = 0)
	const chatOrder = $derived(dockSide === 'end' ? 2 : -1);
	const handleOrder = $derived(dockSide === 'end' ? 1 : 0);

	function startResize(e: PointerEvent) {
		e.preventDefault();
		resizing = true;
		const startX = e.clientX;
		const startWidth = chatWidth;
		// When docked on the left, dragging right widens it; when docked on the right, dragging left widens it
		const sign = dockSide === 'end' ? -1 : 1;

		function onMove(ev: PointerEvent) {
			chatWidth = clampChatWidth(startWidth + sign * (ev.clientX - startX));
		}
		function onUp() {
			resizing = false;
			window.removeEventListener('pointermove', onMove);
			window.removeEventListener('pointerup', onUp);
			localStorage.setItem(CHAT_WIDTH_STORAGE_KEY, String(chatWidth));
		}
		window.addEventListener('pointermove', onMove);
		window.addEventListener('pointerup', onUp);
	}

	function handleResizeKey(e: KeyboardEvent) {
		if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
		e.preventDefault();
		const widenKey = dockSide === 'end' ? 'ArrowLeft' : 'ArrowRight';
		const delta = e.key === widenKey ? CHAT_WIDTH_KEY_STEP : -CHAT_WIDTH_KEY_STEP;
		chatWidth = clampChatWidth(chatWidth + delta);
		localStorage.setItem(CHAT_WIDTH_STORAGE_KEY, String(chatWidth));
	}

	$effect(() => {
		void chatMessages.length;
		tick().then(() => {
			if (chatListEl) chatListEl.scrollTop = chatListEl.scrollHeight;
		});
	});

	function renderMarkdown(text: string): string {
		return filterXSS(marked.parse(text, { async: false }) as string);
	}

	async function sendChat() {
		const text = chatInput.trim();
		if (!text || chatLoading) return;
		chatInput = '';
		chatMessages = [...chatMessages, { role: 'user', text }];
		chatLoading = true;

		let assistantText = '';
		chatMessages = [...chatMessages, { role: 'assistant', text: '' }];

		try {
			const res = await fetch('/api/form-chat', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					message: text,
					formTitle: contextTitle,
					formFields: contextFields,
					recordContext,
					enableFormFill: !!onFormFill,
					history: chatMessages.slice(0, -2)
				})
			});

			if (!res.ok || !res.body) {
				chatMessages = [
					...chatMessages.slice(0, -1),
					{ role: 'assistant', text: 'An error occurred.' }
				];
				return;
			}

			const reader = res.body.getReader();
			const decoder = new TextDecoder();
			let buf = '';

			while (true) {
				const { done, value } = await reader.read();
				if (done) break;
				buf += decoder.decode(value, { stream: true });
				const parts = buf.split('\n\n');
				buf = parts.pop() ?? '';
				for (const part of parts) {
					if (!part.startsWith('data: ')) continue;
					try {
						const event = JSON.parse(part.slice(6)) as {
							type: string;
							text?: string;
							fields?: Record<string, string>;
						};
						if (event.type === 'delta' && event.text) {
							assistantText += event.text;
							chatMessages = [
								...chatMessages.slice(0, -1),
								{ role: 'assistant', text: assistantText }
							];
						} else if (event.type === 'form_fields' && event.fields) {
							onFormFill?.(event.fields);
						}
					} catch {
						// ignore parse error
					}
				}
			}
		} finally {
			chatLoading = false;
		}
	}

	function handleChatKey(e: KeyboardEvent) {
		if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
			e.preventDefault();
			sendChat();
		}
	}
</script>

<div class="chat-side" style:width="{chatWidth}px" style:order={chatOrder}>
	<div class="chat-header">AI Assistant</div>
	<div class="chat-messages" bind:this={chatListEl}>
		{#if chatMessages.length === 0}
			<p class="chat-empty">
				{#if recordContext}
					You can ask questions about "{recordContext.label}" (e.g. related deal or activity summaries).
				{:else}
					Feel free to ask a question or share what's on your mind.
				{/if}
			</p>
		{/if}
		{#each chatMessages as msg}
			<div class="chat-msg {msg.role}">
				{#if msg.role === 'assistant'}
					{#if msg.text}
						<div class="msg-text">{@html renderMarkdown(msg.text)}</div>
					{:else}
						<div class="typing-dots"><span></span><span></span><span></span></div>
					{/if}
				{:else}
					<div class="msg-text">{msg.text}</div>
				{/if}
			</div>
		{/each}
	</div>
	<div class="chat-input-row">
		<textarea
			bind:value={chatInput}
			onkeydown={handleChatKey}
			placeholder="Ask a question..."
			rows="2"
			disabled={chatLoading}
		></textarea>
		<button
			class="chat-send"
			onclick={sendChat}
			disabled={chatLoading || !chatInput.trim()}
			aria-label="Send"
		>
			<ArrowUp size={14} />
		</button>
	</div>
</div>
<!-- ARIA Window Splitter pattern (https://www.w3.org/WAI/ARIA/apg/patterns/windowsplitter/):
     role="separator" + tabindex + keyboard handling is a correct combination that a11y lint rules for
     non-interactive elements can't detect -->
<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div
	class="chat-resize-handle"
	class:active={resizing}
	style:order={handleOrder}
	role="separator"
	aria-orientation="vertical"
	aria-label="Adjust AI assistant panel width"
	aria-valuenow={chatWidth}
	aria-valuemin={CHAT_WIDTH_MIN}
	aria-valuemax={CHAT_WIDTH_MAX}
	tabindex="0"
	onpointerdown={startResize}
	onkeydown={handleResizeKey}
></div>

<style lang="scss">
	.chat-side {
		flex-shrink: 0;
		height: 100%;
		display: flex;
		flex-direction: column;
		overflow: hidden;

		@media (max-width: 640px) {
			display: none;
		}
	}

	.chat-resize-handle {
		flex-shrink: 0;
		width: 5px;
		cursor: col-resize;
		position: relative;
		background: transparent;

		&::after {
			content: '';
			position: absolute;
			top: 0;
			bottom: 0;
			left: 2px;
			width: 2px;
			background: var(--color-border);
		}

		&:hover::after, &.active::after {
			left: 1px;
			width: 3px;
			background: var(--color-primary);
		}

		&:focus-visible {
			outline: 2px solid var(--color-primary);
			outline-offset: -2px;
		}

		@media (max-width: 640px) {
			display: none;
		}
	}

	.chat-header {
		padding: 10px 14px;
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--color-text-muted);
		text-transform: uppercase;
		letter-spacing: 0.04em;
		border-bottom: 1px solid var(--color-border);
		flex-shrink: 0;
	}

	.chat-messages {
		flex: 1;
		min-height: 0;
		overflow-y: auto;
		padding: 12px 14px;
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.chat-empty {
		font-size: 0.8125rem;
		color: var(--color-text-muted);
		margin: 0;
		line-height: 1.6;
	}

	.chat-msg {
		display: flex;
		flex-direction: column;

		&.user {
			align-items: flex-end;

			.msg-text {
				background: var(--color-surface);
				border: 1px solid var(--color-border);
				border-radius: 12px;
				border-bottom-right-radius: 3px;
				padding: 7px 12px;
				font-size: 0.8125rem;
				max-width: 90%;
				word-break: break-word;
				white-space: pre-wrap;
			}
		}

		&.assistant {
			align-items: flex-start;

			.msg-text {
				font-size: 0.8125rem;
				line-height: 1.65;
				color: var(--color-text);

				:global(p) {
					margin: 0 0 0.4em;
					&:last-child { margin-bottom: 0; }
				}
				:global(ul), :global(ol) {
					padding-left: 1.2em;
					margin: 0.2em 0;
				}
				:global(code) {
					font-size: 0.85em;
					background: var(--color-border);
					padding: 0.1em 0.3em;
					border-radius: 3px;
				}
			}
		}
	}

	.typing-dots {
		display: flex;
		gap: 4px;
		padding: 6px 0;

		span {
			width: 6px;
			height: 6px;
			border-radius: 50%;
			background: var(--color-text-muted);
			animation: bounce 1.2s infinite;

			&:nth-child(2) { animation-delay: 0.2s; }
			&:nth-child(3) { animation-delay: 0.4s; }
		}
	}

	.chat-input-row {
		display: flex;
		align-items: flex-end;
		gap: 6px;
		padding: 10px 14px;
		border-top: 1px solid var(--color-border);
		flex-shrink: 0;

		textarea {
			flex: 1;
			resize: none;
			border: 1px solid var(--color-border);
			border-radius: 10px;
			padding: 7px 10px;
			font-size: 0.8125rem;
			font-family: inherit;
			line-height: 1.5;
			background: var(--color-surface);
			color: var(--color-text);
			outline: none;
			transition: border-color 0.15s;
			max-height: 100px;
			overflow-y: auto;

			&:focus { border-color: var(--color-primary); }
			&::placeholder { color: var(--color-text-muted); }
			&:disabled { opacity: 0.5; }
		}
	}

	.chat-send {
		flex-shrink: 0;
		width: 30px;
		height: 30px;
		border-radius: 50%;
		border: none;
		background: var(--color-primary);
		color: #fff;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition: opacity 0.15s;
		margin-bottom: 1px;

		&:disabled { opacity: 0.35; cursor: not-allowed; }
		&:not(:disabled):hover { opacity: 0.85; }
	}

	@keyframes bounce {
		0%, 80%, 100% { transform: scale(0.8); opacity: 0.4; }
		40% { transform: scale(1); opacity: 1; }
	}
</style>
