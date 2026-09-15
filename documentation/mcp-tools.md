# MCP tools reference

Teeling's AI assistant is driven through MCP (Model Context Protocol) tools defined in `src/lib/server/mcp/`, each with a Zod input schema. This is a functional reference; for exact parameter shapes, read the corresponding source file.

Two tool sets are exposed:

- **Full set** — used by the main assistant on the request detail page and other full-context conversations. Can read and write data.
- **Read-only set** (`src/lib/server/ai/readonly-tools.ts`) — a search/lookup-only subset of the full set, used by the per-form assistant (`/api/form-chat`) that sits next to the request and template forms. It cannot create, update, or send anything, only look things up to help the user while they're drafting.

## Requests — `src/lib/server/mcp/approvals.ts`

| Tool | Purpose |
|---|---|
| `list_approvals` | List requests, with filtering (status, assignee, etc.) |
| `get_approval` | Fetch a single request's full detail |
| `create_approval` | Create a new request against a template and route |
| `update_approval_step` | Approve, reject, or return the request at its current step |
| `cancel_approval` | Cancel a request |
| `calculate_approval_metrics` | Compute decision-making inputs (ROI, payback period, etc.) from a request's cost/revenue data |

## Communication — `src/lib/server/mcp/communication.ts`

| Tool | Purpose |
|---|---|
| `send_email` | Send an email |
| `send_notification` | Post to the in-app notification center |
| `send_slack_notification` | Post to Slack via a configured integration |
| `create_reminder` | Create a single reminder |
| `create_reminders_bulk` | Create multiple reminders at once |
| `list_reminders` | List reminders |
| `delete_sent_reminders` | Clean up reminders that have already been sent |
| `delete_read_notifications` | Clean up notifications that have already been read |

## Documents — `src/lib/server/mcp/documents.ts`

| Tool | Purpose |
|---|---|
| `create_word_document` | Generate a `.docx` file |
| `create_excel_workbook` | Generate an `.xlsx` file |
| `create_powerpoint_presentation` | Generate a `.pptx` file |
| `build_handoff_data` | Assemble structured data for handoff into one of the document generators above |

Generated documents are produced by `src/lib/server/documents/` and served through `src/routes/api/documents/`.

## Integrations — `src/lib/server/mcp/integrations.ts`

| Tool | Purpose |
|---|---|
| `list_integrations` | List configured external API integrations |
| `call_external_api` | Call a configured external API (auth handled per the integration's configured type: none / API key header / bearer token / basic auth) |

Integrations are configured under **Settings → Integrations** (`/settings/integrations`, admin only) and stored in the `integrations` table.

## Help — `src/lib/server/mcp/help.ts`

| Tool | Purpose |
|---|---|
| `get_help` | Return help text for a topic: `overview`, `approvals`, `reminders`, `documents`, or `email` |

## Shared plumbing — `src/lib/server/mcp/shared.ts`

Common helpers used across the tool modules above (e.g. building tool results, sharing the request context/env across tool calls).

## System prompts

The system prompts that define how the AI assistant behaves — in the full-context assistant and the per-form assistant — live in `src/lib/server/ai/prompt.ts`. If you're customizing the assistant's tone, scope, or the way it uses `fill_form_fields`, that's the file to start from.
