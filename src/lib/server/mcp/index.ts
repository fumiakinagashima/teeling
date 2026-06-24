import type { Tool } from '@anthropic-ai/sdk/resources/messages';
import type { Db } from '../db';
import * as integrations from './integrations';
import * as communication from './communication';
import * as documents from './documents';
import * as approvals from './approvals';
import * as help from './help';
import * as workflows from './workflows';

export type { ToolEnv } from './shared';

export type ToolName =
	| 'list_integrations'
	| 'call_external_api'
	| 'build_handoff_data'
	| 'create_word_document'
	| 'create_excel_workbook'
	| 'create_powerpoint_presentation'
	| 'delete_sent_reminders'
	| 'delete_read_notifications'
	| 'list_reminders'
	| 'send_email'
	| 'send_notification'
	| 'send_slack_notification'
	| 'create_reminder'
	| 'create_reminders_bulk'
	| 'list_approvals'
	| 'get_approval'
	| 'create_approval'
	| 'update_approval_step'
	| 'cancel_approval'
	| 'get_help'
	| 'save_workflow'
	| 'list_workflows'
	| 'get_workflow';

export const tools: Tool[] = [
	...integrations.tools,
	...communication.tools,
	...documents.tools,
	...approvals.tools,
	...help.tools,
	...workflows.tools
];

export async function dispatchTool(
	db: Db,
	name: ToolName,
	input: unknown,
	env?: import('./shared').ToolEnv,
	ctx?: ExecutionContext
) {
	switch (name) {
		case 'list_integrations':              return integrations.handleListIntegrations(db);
		case 'call_external_api':              return integrations.handleCallExternalApi(db, input);
		case 'build_handoff_data':             return documents.handleBuildHandoffData(input, env);
		case 'create_word_document':           return documents.handleCreateWordDocument(db, input, env, ctx);
		case 'create_excel_workbook':          return documents.handleCreateExcelWorkbook(db, input, env, ctx);
		case 'create_powerpoint_presentation': return documents.handleCreatePowerpointPresentation(db, input, env, ctx);
		case 'delete_sent_reminders':          return communication.handleDeleteSentReminders(db, input, env);
		case 'delete_read_notifications':      return communication.handleDeleteReadNotifications(db, input, env);
		case 'list_reminders':                 return communication.handleListReminders(db, input, env);
		case 'send_email':                     return communication.handleSendEmail(db, input, env);
		case 'send_notification':              return communication.handleSendNotification(db, input, env);
		case 'send_slack_notification':        return communication.handleSendSlackNotification(db, input, env);
		case 'create_reminder':                return communication.handleCreateReminder(db, input, env);
		case 'create_reminders_bulk':          return communication.handleCreateRemindersBulk(db, input, env);
		case 'list_approvals':                 return approvals.handleListApprovals(db, input);
		case 'get_approval':                   return approvals.handleGetApproval(db, input);
		case 'create_approval':                return approvals.handleCreateApproval(db, input, env);
		case 'update_approval_step':           return approvals.handleUpdateApprovalStep(db, input, env);
		case 'cancel_approval':                return approvals.handleCancelApproval(db, input);
		case 'get_help':                       return help.handleGetHelp(input);
		case 'save_workflow':                  return workflows.handleSaveWorkflow(db, input, env);
		case 'list_workflows':                 return workflows.handleListWorkflows(db, env);
		case 'get_workflow':                   return workflows.handleGetWorkflow(db, input, env);
		default:
			throw new Error(`Unknown tool: ${name}`);
	}
}
