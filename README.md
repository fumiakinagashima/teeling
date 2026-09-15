# Teeling

An AI-native request management and approval workflow system.
Users draft requests together with an AI assistant next to the form, the AI reviews the content and flags problems, and it automatically generates decision-making inputs (ROI, payback period, etc.) to shorten the approval cycle.

## Key features

- **Request list / dashboard** (`/`) — status filters (pending / draft / all) and an "assigned to me" toggle
- **AI-assisted request drafting** (`/approvals/new`, edit at `/approvals/[id]/edit`) — chat with an AI assistant next to the form while writing a request; the AI can fill the title and body directly into the form
- **AI analysis** (request detail page) — one-click review, ROI/payback analysis, and what-if simulation of a request's content. Requests that don't need financial judgment show only the AI review
- **Request templates** (`/database/templates`, admin only) — each template defines custom fields (text/number/date/time) and a default approval route; the create/edit screens also have an AI assistant
- **Approval workflow** — step-by-step approve / reject / return; only the current approver in the route can return a request
- **Email notifications** — sent automatically when it's your turn to approve (approval request) and when a request is completed/rejected/returned (result notification)
- **Reminders** — delivered automatically by a Cron Trigger (notification center / email / Slack). There is no admin UI; reminders are created by asking the AI
- **Settings** (`/settings`) — external API integrations (Slack webhooks), email sending configuration, profile and password
- **Auth & permissions** — all routes are guarded; access is controlled by `general` / `admin` permissions

## Tech stack

| Category | Technology |
|---|---|
| Package manager | Bun |
| Frontend | SvelteKit, TypeScript |
| Validation | Zod |
| ORM | DrizzleORM |
| Infrastructure | Cloudflare (Wrangler, D1, R2, KV) |
| AI | Claude API (Anthropic) |
| Protocol | MCP (Model Context Protocol) |
| Testing | Vitest (unit) |

## Getting started

### Prerequisites

- [Bun](https://bun.sh/) v1.x or later
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/) (`npm install -g wrangler`)

### 1. Install dependencies

```sh
bun install
```

### 2. Configure environment variables

Copy `.dev.vars.example` to `.dev.vars` and fill in the values you need:

```sh
cp .dev.vars.example .dev.vars
```

Minimum required configuration:

```sh
ANTHROPIC_API_KEY="sk-ant-..."  # Your Anthropic API key
MOCK_AI="false"                 # Set to "true" to try the app with mocked AI responses, no API key needed
```

To enable email notifications, also set `EMAIL_PROVIDER` and the matching credentials (`resend` / `ses` / `smtp`).

### 3. Run database migrations

```sh
bunx wrangler d1 migrations apply teeling --local --env local
```

`--env local` targets the local-only D1/KV bindings defined under `[env.local]` in `wrangler.toml`. `bun dev` (vite dev) also uses these `env.local` bindings (see `platformProxy.environment` in `svelte.config.js`).

Migrations do **not** create any account, so create one manually first. Generate a password hash (PBKDF2-SHA256):

```sh
bun -e '
import("./src/lib/server/auth/password.ts").then(async (m) => {
  console.log(await m.hashPassword("password"));
});
'
```

Use the printed hash to insert a row into the `accounts` table — either via `bun run db:studio` (Drizzle Studio) or directly against the local D1 sqlite file (`id` should be a UUID, `permission` should be `admin`). Additional accounts can be created afterwards from the admin screen at `/database/accounts`.

### 4. Start the dev server

```sh
bun dev
```

Open `http://localhost:5173` and sign in at `/signin` with the account you created in step 3.

> **Note on sending email (SMTP)**: `bun dev` (Vite on Node.js) doesn't support Cloudflare Sockets, so SMTP won't work locally. Use Resend or AWS SES if you need to test email sending locally.

### Other useful commands

```sh
bun run check          # Type-check (svelte-check)
bun run test:unit      # Unit tests (Vitest)
bun run db:studio      # Inspect the local DB with Drizzle Studio
bun run db:seed:demo   # Seed demo data (useful for trying out AI analysis)
```

## Deployment

```sh
bun run build
bunx wrangler d1 migrations apply teeling --remote  # if there are schema changes
bunx wrangler deploy
```

Before your first deploy, create your own D1 database, KV namespace and R2 bucket, and update the IDs in `wrangler.toml` (the checked-in values are placeholders). Set `ANTHROPIC_API_KEY` as a Worker secret rather than a plain variable:

```sh
bunx wrangler secret put ANTHROPIC_API_KEY
```

## Project layout

```
teeling/
├── src/
│   ├── routes/
│   │   ├── +layout.svelte        # Theme switching, notification polling
│   │   ├── +page.svelte          # Request list / dashboard (/)
│   │   ├── signin/               # Sign in, password reset
│   │   ├── approvals/
│   │   │   ├── new/              # Create a request (/approvals/new)
│   │   │   └── [id]/             # Request detail (/approvals/[id]) and edit (/approvals/[id]/edit)
│   │   ├── settings/             # Settings (profile / password / integrations / email / ai)
│   │   ├── database/             # Admin-only screens
│   │   │   ├── accounts/         # Account management (/database/accounts, admin only)
│   │   │   └── templates/        # Request templates (/database/templates, /new, /[id], admin only)
│   │   └── api/
│   │       ├── approvals/        # Request CRUD, approval actions, AI review, AI analysis
│   │       ├── templates/        # Template CRUD
│   │       ├── form-chat/        # AI assistant used next to each form (shared, via DialogChatSide)
│   │       ├── reminders/        # Reminder CRUD and manual delivery trigger
│   │       ├── notifications/    # Notification center
│   │       ├── integrations/     # External API integrations
│   │       ├── email/            # Email sending and settings
│   │       ├── documents/        # Word/Excel/PowerPoint generation
│   │       └── auth/             # Authentication
│   └── lib/
│       ├── components/
│       │   ├── Sidebar.svelte
│       │   ├── ui/               # Design system (Table, Select, Textbox, charts, etc.)
│       │   ├── dialog/           # ApprovalForm/Detail/AnalysisChat, DialogChatSide (AI assistant, resizable)
│       │   ├── database/         # Admin-only screens (TemplateForm, etc.)
│       │   └── icon/             # SVG icons
│       ├── server/
│       │   ├── db/               # DrizzleORM schema and queries
│       │   ├── mcp/              # MCP tool definitions (with Zod schemas)
│       │   ├── ai/               # Claude API integration, system prompts, AI analysis
│       │   ├── approvals/        # Request-specific server logic (email notifications, etc.)
│       │   ├── documents/        # Word/Excel/PowerPoint generation
│       │   └── reminders/        # Reminder delivery logic (invoked from the Cron Trigger)
│       ├── styles/                # Global styles and theming
│       └── types/                 # Shared type definitions
├── drizzle/                       # Migrations (numbered SQL files)
├── worker.ts                      # Cloudflare Workers entry point (adds the Cron Trigger handler)
├── wrangler.toml                  # Production config + local dev config under [env.local]
└── wrangler.build.jsonc           # Adapter config used only at build time
```

See [`documentation/architecture.md`](documentation/architecture.md) for more detail on how the pieces fit together.

## Database schema

| Table | Purpose |
|---|---|
| `accounts` + KV session | Authentication and user management |
| `approval_requests` | Requests (title, type, status, route, body, custom fields, attachments) |
| `approval_templates` | Request templates (name, description, body format, custom fields, default route) |
| `notifications` | Notification center |
| `reminders` | Reminders |
| `integrations` | External API integrations (e.g. Slack webhooks) |
| `email_providers` | Email configuration |
| `ai_settings` | AI model configuration |

`chats`, `chat_messages`, `workflows` and `workflow_runs` were dropped (`drizzle/0001_drop_unused_tables.sql`) when the UI moved from a chat-centric design to the current list-and-page design.

## MCP tools

The AI assistant interacts with the app through MCP tools defined in `src/lib/server/mcp/`:

- **Requests**: `list_approvals`, `get_approval`, `create_approval`, `update_approval_step`, `cancel_approval`, `calculate_approval_metrics` (computes ROI, payback period, and other decision-making inputs)
- **Communication**: `send_email`, `send_notification`, `send_slack_notification`, `create_reminder`, `create_reminders_bulk`, `list_reminders`, `delete_sent_reminders`, `delete_read_notifications`
- **Documents**: `create_word_document`, `create_excel_workbook`, `create_powerpoint_presentation`, `build_handoff_data`
- **Integrations**: `list_integrations`, `call_external_api`
- **Help**: `get_help` (topics: overview / approvals / reminders / documents / email)

`src/lib/server/ai/readonly-tools.ts` exposes a read-only subset (search/lookup tools only) used by the per-form AI assistant (`/api/form-chat`).

## Theme

Dark / light / system (follows the OS setting), switchable from the bottom of the sidebar. Defined with CSS custom properties (`--color-*`) and toggled via the `data-theme` attribute.

## License

[MIT](LICENSE)
