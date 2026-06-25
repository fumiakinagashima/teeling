// Custom Worker entry point (wrangler.toml `main`).
//
// Wraps the SvelteKit-generated worker (built to .svelte-kit/cloudflare/_worker.js via
// wrangler.build.jsonc, see svelte.config.js) and adds a `scheduled` handler for the
// reminder delivery Cron Trigger. Kept outside src/ so svelte-check doesn't try to
// type-check the generated bundle that doesn't exist until `vite build` runs.
import { createDb } from './src/lib/server/db';
import { processDueReminders } from './src/lib/server/reminders/delivery';
import { processApprovalSummary } from './src/lib/server/approvals/summary';
import sveltekitWorker from './.svelte-kit/cloudflare/_worker.js';

export default {
	fetch: sveltekitWorker.fetch,
	async scheduled(controller, env, ctx) {
		const db = createDb(env.DB);
		ctx.waitUntil(processDueReminders(db, env));
		// 毎週月曜 9:00 JST (0:00 UTC) に承認待ちサマリーを配信
		if (controller.cron === '0 0 * * 1') {
			ctx.waitUntil(processApprovalSummary(db));
		}
	}
};
