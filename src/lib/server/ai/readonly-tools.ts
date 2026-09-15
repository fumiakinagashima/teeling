import { tools } from '$lib/server/mcp';

// A set of tool names that only allow information retrieval. Shared by auxiliary chats — such as
// form-input support or workflow-building support — where we don't want to allow creating, updating, or deleting data.
export const READONLY_TOOL_NAMES = new Set([
	'list_integrations',
	'search_customers',
	'search_deals',
	'search_activities',
	'summarize_deals',
	'summarize_customers',
	'summarize_activities',
	'get_customer_detail',
	'get_customer_health_score',
	'get_customer_health_ranking',
	'get_customer_handover_summary',
	'get_customers',
	'get_customer',
	'get_contacts',
	'get_deals',
	'get_activities',
	'list_reminders',
	'list_entity_types',
	'get_entity_fields',
	'get_entities',
	'list_approvals',
	'get_approval',
	'get_help',
	'suggest_customer_followup'
]);

export const readonlyTools = tools.filter((t) => READONLY_TOOL_NAMES.has(t.name));
