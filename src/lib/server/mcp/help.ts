import type { Tool } from '@anthropic-ai/sdk/resources/messages';
import { z } from 'zod';

export const tools: Tool[] = [
	{
		name: 'get_help',
		description:
			'Retrieves usage instructions and feature descriptions. Called when the user asks things like "How do I use this?", "What can this do?", "Help", or "How do I use the X feature?" If topic is omitted, returns the overall overview.',
		input_schema: {
			type: 'object',
			properties: {
				topic: {
					type: 'string',
					enum: ['overview', 'approvals', 'reminders', 'documents', 'email'],
					description: 'The topic you want to know about (overall overview if omitted)'
				}
			}
		}
	}
];

const getHelpInputSchema = z.object({
	topic: z.enum(['overview', 'approvals', 'reminders', 'documents', 'email']).optional()
});

const HELP: Record<string, object> = {
	overview: {
		title: 'Teeling User Guide',
		description: 'An approval request management system where you create and review requests in consultation with AI, so approvers can make decisions quickly',
		features: [
			{ name: 'Request creation & review', topic: 'approvals', examples: ['Create a travel expense request', 'What requests are pending approval?', 'Calculate the ROI for this request'] },
			{ name: 'Reminders', topic: 'reminders', examples: ['Remind me about the request deadline at 10am tomorrow'] },
			{ name: 'Document generation (Word/Excel/PowerPoint)', topic: 'documents', examples: ['Put the approved requests together in Excel'] },
			{ name: 'Sending email', topic: 'email', examples: ['Send an email notifying the requester of the result'] }
		],
		tips: [
			'You can simply give instructions in natural language',
			'If the request includes cost and projected revenue, you can ask it to "calculate the ROI"',
			'You can approve or reject requests from the request detail screen'
		],
		relatedPages: [
			{ label: 'Request List', href: '/', description: 'View, approve, and reject requests' },
			{ label: 'Settings', href: '/settings', description: 'Change various app settings' }
		]
	},
	approvals: {
		title: 'Request Management',
		description: 'AI reviews the request content and automatically generates the decision-making inputs approvers need (ROI, risk, etc.)',
		operations: [
			{ action: 'Create a request', examples: ['Create a request for a ¥100,000 travel expense', 'I want to submit an approval request for X'] },
			{ action: 'Have AI review the request content', examples: ['Point out any problems with this request', 'Tell me how to improve this request'] },
			{ action: 'Have decision-making inputs generated', examples: ['Calculate the ROI for this request', 'Analyze the cost-effectiveness', 'Do a risk assessment'] },
			{ action: 'Check the request list and status', examples: ['What requests are pending approval?', 'How many requests were there this month?'] },
			{ action: 'Approve or reject a request', examples: ['Approve the request for X', 'Reject the X request'] },
			{ action: 'Cancel a request', examples: ['Cancel the request for X'] }
		],
		tips: [
			'The approval route supports multiple steps and parallel approval',
			'Including cost, projected revenue, period, etc. in the request data improves the accuracy of the decision-making inputs',
			'AI review can also be run from the request detail screen'
		],
		relatedPages: [
			{ label: 'Request List', href: '/', description: 'View request details and approve or reject requests' }
		]
	},
	reminders: {
		title: 'Reminders',
		description: 'Sends a notification to the notification center, email, or Slack (if configured) at the specified date and time',
		operations: [
			{ action: 'Set a reminder', examples: ['Remind me about the request deadline at 10am tomorrow', 'Notify me about the X request deadline next Monday'] }
		],
		tips: [
			'You can choose the notification destination when submitting the form (notification center, email, or Slack)',
			'Slack notifications require setting up a Webhook URL on the external API integrations screen'
		],
		relatedPages: [
			{ label: 'External API Integrations', href: '/settings/integrations', description: 'Configure the Slack Webhook URL' }
		]
	},
	documents: {
		title: 'Document Generation (Word / Excel / PowerPoint)',
		operations: [
			{ action: 'Create a Word document', description: 'Approval reports, request documents, etc.', examples: ["Put this month's approved requests together in Word"] },
			{ action: 'Create an Excel workbook', description: 'Request lists, summary tables, etc.', examples: ['Export the list of pending requests to Excel'] },
			{ action: 'Create PowerPoint slides', description: 'Meeting materials, etc.', examples: ["Put this month's request count and approval rate together in slides"] }
		],
		tips: [
			'Once generation is complete, a download link is shown automatically'
		]
	},
	email: {
		title: 'Sending Email',
		operations: [
			{ action: 'Create and send an email', examples: ['Send an email notifying the requester of the result', 'Write a reminder email to the approver'] }
		],
		tips: [
			'AI drafts the email, and you review and edit it in the form before sending',
			'The first time you use this, you need to configure the email service on the email settings screen'
		],
		relatedPages: [
			{ label: 'Email Settings', href: '/settings/email', description: 'Configure the email sending service' }
		]
	}
};

export function handleGetHelp(input: unknown) {
	const { topic } = getHelpInputSchema.parse(input ?? {});
	return HELP[topic ?? 'overview'];
}
