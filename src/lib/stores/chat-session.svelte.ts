// Signal used to reset the chat screen's state when "New chat" is clicked.
// +page.svelte holds client-side in-memory state, and navigating to the same "/" route
// causes SvelteKit to reuse the component instance, so it doesn't reset automatically.
class ChatSessionStore {
	resetToken = $state(0);

	startNew() {
		this.resetToken++;
	}
}

export const chatSession = new ChatSessionStore();
