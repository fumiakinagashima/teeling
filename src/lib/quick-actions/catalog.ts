export type QuickActionId =
	| 'list_approvals'
	| 'list_approvals_pending'
	| 'create_approval'
	| 'create_reminder';

export type QuickActionDef = {
	id: QuickActionId;
	label: string;
	description: string;
	icon: string;
};

export const quickActionCatalog: QuickActionDef[] = [
	{
		id: 'list_approvals',
		label: '申請一覧',
		description: 'すべての申請を表示します',
		icon: 'clipboard'
	},
	{
		id: 'list_approvals_pending',
		label: '承認待ち一覧',
		description: '承認待ちの申請を表示します',
		icon: 'clock'
	},
	{
		id: 'create_approval',
		label: '申請を作成',
		description: '新しい申請を作成します',
		icon: 'plus'
	},
	{
		id: 'create_reminder',
		label: 'リマインダー設定',
		description: 'リマインダーを設定します',
		icon: 'bell'
	}
];

export const DEFAULT_QUICK_ACTION_IDS: QuickActionId[] = [
	'list_approvals_pending',
	'create_approval',
	'create_reminder'
];

export const MAX_QUICK_ACTIONS = 5;

export const QUICK_ACTIONS_STORAGE_KEY = 'quickActionIds';

export function isQuickActionId(id: string): id is QuickActionId {
	return quickActionCatalog.some((a) => a.id === id);
}
