import type { Db } from '../db';
import { dispatchTool, type ToolEnv } from '../mcp';
import { getReminderChannelOptions } from '../db/reminder-service';
import type { MessageContent } from '$lib/types/chat';
import type { QuickActionId } from '$lib/quick-actions/catalog';

const APPROVAL_STATUS_LABEL: Record<string, string> = {
	pending: '審査中',
	approved: '承認済',
	rejected: '否決',
	cancelled: '取消'
};

type ToolQuickActionHandler = {
	tool: import('../mcp').ToolName;
	input?: Record<string, unknown>;
	format: (result: unknown) => MessageContent[];
};

type StaticQuickActionHandler = {
	contents: MessageContent[];
};

type DynamicQuickActionHandler = {
	build: (db: Db, env?: ToolEnv) => Promise<MessageContent[]>;
};

type QuickActionHandler = ToolQuickActionHandler | StaticQuickActionHandler | DynamicQuickActionHandler;

function isToolHandler(h: QuickActionHandler): h is ToolQuickActionHandler {
	return 'tool' in h;
}

function isDynamicHandler(h: QuickActionHandler): h is DynamicQuickActionHandler {
	return 'build' in h;
}

const handlers: Record<QuickActionId, QuickActionHandler> = {
	list_approvals: {
		tool: 'list_approvals',
		input: {},
		format: (result) => {
			const r = result as { approvals: { id: string; title: string; type: string; status: string; submittedBy: string; createdAt: string }[] };
			return [{
				type: 'table',
				entity: 'approvals',
				columns: [
					{ key: 'title', label: '件名' },
					{ key: 'type', label: '種別' },
					{ key: 'status', label: 'ステータス' },
					{ key: 'submittedBy', label: '申請者' }
				],
				rows: r.approvals.map((a) => ({
					id: a.id,
					title: a.title,
					type: a.type,
					status: APPROVAL_STATUS_LABEL[a.status] ?? a.status,
					submittedBy: a.submittedBy
				}))
			}];
		}
	},

	list_approvals_pending: {
		tool: 'list_approvals',
		input: { status: 'pending' },
		format: (result) => {
			const r = result as { approvals: { id: string; title: string; type: string; status: string; submittedBy: string; createdAt: string }[] };
			return [{
				type: 'table',
				entity: 'approvals',
				columns: [
					{ key: 'title', label: '件名' },
					{ key: 'type', label: '種別' },
					{ key: 'submittedBy', label: '申請者' }
				],
				rows: r.approvals.map((a) => ({
					id: a.id,
					title: a.title,
					type: a.type,
					submittedBy: a.submittedBy
				}))
			}];
		}
	},

	create_approval: {
		contents: [{
			type: 'form',
			title: '申請を作成',
			tool: 'create_approval',
			fields: [
				{ key: 'title', label: '件名', type: 'text', required: true },
				{ key: 'type', label: '種別', type: 'text', required: true },
				{ key: 'data', label: '内容', type: 'textarea', required: false }
			]
		}]
	},

	create_reminder: {
		build: async (db, env) => {
			const options = await getReminderChannelOptions(db, env);
			return [{
				type: 'form',
				title: 'リマインダー設定',
				tool: 'create_reminder',
				fields: [
					{ key: 'remind_at', label: '日時', type: 'datetime-local', required: true },
					{
						key: 'channels',
						label: '通知先',
						type: 'multiselect',
						required: true,
						value: 'notification',
						options
					},
					{ key: 'content', label: '内容', type: 'textarea', required: true }
				]
			}];
		}
	}
};

export async function runQuickAction(db: Db, id: QuickActionId, env?: ToolEnv): Promise<MessageContent[]> {
	const handler = handlers[id];
	if (isDynamicHandler(handler)) return handler.build(db, env);
	if (!isToolHandler(handler)) return handler.contents;
	const result = await dispatchTool(db, handler.tool, handler.input ?? {});
	return handler.format(result);
}
