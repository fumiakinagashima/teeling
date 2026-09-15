# Deployment (Cloudflare)

Teeling runs on Cloudflare Workers, with D1 (SQL), KV (sessions), and R2 (file attachments/generated documents).

## 1. Create your Cloudflare resources

```sh
bunx wrangler d1 create teeling
bunx wrangler kv namespace create teeling-sessions
bunx wrangler r2 bucket create teeling
```

Take the `database_id` and KV `id` printed by these commands and put them into the top-level `[[d1_databases]]` / `[[kv_namespaces]]` blocks in `wrangler.toml` (the checked-in values are placeholders — `wrangler deploy` will fail against them). The `[env.local.*]` blocks further down are for local development only and don't need real IDs.

## 2. Apply migrations

```sh
bunx wrangler d1 migrations apply teeling --remote
```

Re-run this after pulling any change that adds a new file under `drizzle/`.

## 3. Set secrets

Anything sensitive should be a Worker secret, not a `[vars]` entry (a plain `[vars]` value is visible in `wrangler.toml` and, for `ANTHROPIC_API_KEY` specifically, defining it there would overwrite the real secret with an empty string on deploy):

```sh
bunx wrangler secret put ANTHROPIC_API_KEY
```

If you're using email, also set whichever provider's credentials you need (e.g. `RESEND_API_KEY`, or the SES/SMTP equivalents — see `.dev.vars.example` for the full list of variable names) as secrets or `[vars]` as appropriate for your setup.

## 4. Build and deploy

```sh
bun run build
bunx wrangler deploy
```

`wrangler.toml`'s `main` points at the repo-root `worker.ts`, a thin wrapper around the SvelteKit-generated Worker that adds the `scheduled` handler for reminder delivery. `wrangler.build.jsonc` is a separate adapter config used only during the SvelteKit build step, so the build doesn't overwrite `worker.ts`.

## Cron Trigger

`wrangler.toml` schedules `worker.ts`'s `scheduled` handler to run every minute (`crons = ["* * * * *"]`), which checks for and delivers any due reminders (`processDueReminders`). There is no per-user configuration needed for this; it runs automatically once deployed.

## Bootstrapping the first account

Migrations don't seed any accounts. See the "Run database migrations" step in the main [README](../README.md#3-run-database-migrations) for how to hash a password and insert the first `admin` account — the same approach works against a remote D1 database via `wrangler d1 execute teeling --remote --command "..."` if you'd rather not use Drizzle Studio.

## Local development vs. production

Local development (`bun dev`) never talks to your real Cloudflare resources. `svelte.config.js` sets `platformProxy.environment` to `"local"`, which makes Vite's dev server use the `[env.local.*]` bindings in `wrangler.toml` instead of the top-level (production) ones. Local D1/KV data lives under `.wrangler/state/` and is fully separate from anything deployed.
