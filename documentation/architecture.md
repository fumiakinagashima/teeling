# Architecture

## Product concept

Traditional approval flows put all the work on people: the requester has to think through and write up the request alone, and the approver has to read everything and build context before they can decide. Teeling moves both of those jobs partly onto AI:

- **Drafting**: an AI assistant sits next to the request form. The requester can talk through the request with it, and the AI can write the title and body directly into the form (`fill_form_fields`, enabled only on the approval and template create/edit screens).
- **Pre-review**: before a request reaches an approver, the AI reviews it — including any template-defined custom fields — and flags problems or missing information.
- **Decision-making inputs**: given cost and projected revenue, the AI computes ROI and payback period automatically, so the approver doesn't have to do that math by hand.

## Request lifecycle

1. A requester creates a request (`/approvals/new`), optionally with AI help, against a template that defines the approval route and any custom fields.
2. The AI review and AI analysis (ROI/payback/simulation) can be run on demand from the request detail page. Requests that don't need a financial judgment show only the AI review, not the analysis.
3. The request moves through its approval route step by step. At each step, the current approver can approve, reject, or return the request. Only the current approver may return it.
4. Email notifications go out automatically: an "approval requested" email when it becomes someone's turn, and a "result" email when the request is completed, rejected, or returned.
5. Reminders (created by asking the AI, not through a UI) are delivered on a schedule via the notification center, email, or Slack.

## Server-side layout

- `src/lib/server/db/` — DrizzleORM schema and `*-service.ts` query modules, one per domain (accounts, approvals, integrations, reminders).
- `src/lib/server/mcp/` — MCP tool definitions with Zod schemas; see [mcp-tools.md](mcp-tools.md).
- `src/lib/server/ai/` — Claude API integration: system prompts (`prompt.ts`), the AI review/analysis pipeline (`approval-analysis.ts`, `approval-metrics.ts`), and the read-only tool subset used by the per-form assistant (`readonly-tools.ts`).
- `src/lib/server/approvals/` — request-specific server logic such as email notifications.
- `src/lib/server/reminders/` — reminder delivery logic, invoked from the Cron Trigger in `worker.ts`.
- `src/lib/server/documents/` — Word/Excel/PowerPoint generation used by the `create_*_document`/`create_*_workbook`/`create_*_presentation` MCP tools.

## Frontend layout

The UI is list-and-page based (an earlier chat-centric UI, including the `chats`/`chat_messages`/`workflows`/`workflow_runs` tables, was removed — see `drizzle/0001_drop_unused_tables.sql`).

- `/` — request list/dashboard with status filter tabs and an "assigned to me" toggle. The toggle's state is restored from a cookie (`teeling_top_my_only`) at SSR time to avoid a flash of the wrong state on reload.
- `/approvals/[id]` — request detail (`ApprovalDetail.svelte`); `/approvals/new` and `/approvals/[id]/edit` — create/edit (`ApprovalForm.svelte`).
- `/database/templates/*` — request template create/edit, admin only.
- All of the above are a two-column layout: a centered form with an AI assistant panel (`DialogChatSide.svelte`) alongside it. The panel talks to `/api/form-chat` over a streaming connection, is resizable (persisted to `localStorage` under `teeling_dialog_chat_width`), and can be docked to either side via the `dockSide` prop.
- The "simulation" chat on the AI analysis results (re-computing ROI etc. with different parameters) is a separate component, `ApprovalAnalysisChat.svelte`.

## Notable implementation details

- **Timezone**: all date/time handling assumes JST (Japan Standard Time), since that's the operating context this app was built for. `datetime-local` inputs go through `parseJstDatetime`; plain `date` inputs get `T00:00:00+09:00` appended before being parsed with `new Date()`. If you deploy for a different timezone, search for these helpers in `src/lib/datetime.ts` and adjust them.
- **Multi-row writes**: use `db.batch([...])` for multi-table writes, not `db.transaction()` — the latter isn't supported against production D1.
- **Reminders**: delivered by a Cloudflare Cron Trigger that runs every minute (`worker.ts` → `processDueReminders`). There's no admin UI for creating them; the AI creates and manages them via the `create_reminder`/`create_reminders_bulk`/`list_reminders` MCP tools. `channels: "email"` uses the system email configuration from environment variables; `channels: "slack:<id>"` uses the matching row in the `integrations` table.
- **Auth**: PBKDF2-SHA256 password hashing, KV-backed sessions (7-day TTL), and a route guard in `src/hooks.server.ts`. Public paths are `/signin`, `/signin/forgot-password`, `/signin/reset-password`, and `/api/auth/*`. A number of admin-only paths are guarded centrally in `hooks.server.ts`; the `/database/templates*` routes are guarded individually in their own `+page.server.ts` `load` functions instead.
