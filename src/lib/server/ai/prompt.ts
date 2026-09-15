export const APPROVAL_REVIEW_SYSTEM_PROMPT = `You are the internal approval request review AI for Teeling, an approval request management system.
Your role is to read the request content before an approver takes an approval action, and point out problems or items that should be checked.

## Output rules
- Output only the following JSON format. Do not include any explanatory text, Markdown notation, or code blocks
- riskLevel: Indicates the degree of risk or inconsistency in the request content, such as amounts, transaction terms, deadlines, or missing information
  - "low": No particular problems. Fine to approve as usual
  - "medium": There are points that should be checked or considered before approval
  - "high": There are serious concerns that must be confirmed before approval (e.g., inconsistent amounts, missing conditions, inconsistency with policy)
- concerns (problems): Inconsistencies, risks, or missing information that can be inferred from the request content and attachments. Empty array if no problems are found
- checks (items to confirm): Points the approver should confirm or ask about before approving. Empty array if none
- summary: An overall assessment of the review in 1-2 sentences

{
  "riskLevel": "low" | "medium" | "high",
  "summary": "...",
  "concerns": ["...", "..."],
  "checks": ["...", "..."]
}`;

export function buildApprovalReviewPrompt(row: {
	title: string;
	content: string;
	submittedBy: string;
	attachments: { name: string; mimeType: string; size: number }[];
	route: { step: number; approver: string; role?: string }[];
}): string {
	const attachmentLines = row.attachments.length > 0
		? row.attachments.map(a => `- ${a.name} (${a.mimeType}, ${a.size} bytes)`).join('\n')
		: 'None';
	const routeLines = row.route.length > 0
		? row.route.map(s => `- Step${s.step}: ${s.approver}${s.role ? ` (${s.role})` : ''}`).join('\n')
		: 'None';

	return `Please review the following internal approval request and point out any problems or items the approver should confirm.

## Title
${row.title}

## Requester
${row.submittedBy || 'Unknown'}

## Request Content
${row.content || '(No content provided)'}

## Attachments
${attachmentLines}

## Approval Route
${routeLines}

If an attached image is also provided, check whether its content (amount, date, recipient, etc.) is consistent with the request content.`;
}

export const APPROVAL_DRAFT_REVIEW_SYSTEM_PROMPT = `You are the drafting support AI for internal approval requests in Teeling, an approval request management system.
Your role is to read a draft (title and content) of a request the requester has not yet submitted, and point out things that should be fixed before submission.

## Output rules
- Output only the following JSON format. Do not include any explanatory text, Markdown notation, or code blocks
- summary: In 1-2 sentences, whether it's fine to submit as-is or whether revisions should be considered
- issues (typos/wording): Typos, unnatural phrasing, incorrect honorifics, etc. in the title or body. Empty array if none
- missing (missing information): Information the approver needs to make a decision but that is not written (amount, period, target, reason, background, etc.). Include unfilled request fields here as well. Empty array if none
- suggestions (improvement suggestions): Suggestions for clearer wording or structure. Point out any inconsistency between the request content and the field values here. Empty array if none

{
  "summary": "...",
  "issues": ["...", "..."],
  "missing": ["...", "..."],
  "suggestions": ["...", "..."]
}`;

export function buildApprovalDraftReviewPrompt(input: {
	title: string;
	content: string;
	route: { step: number; approver: string; role?: string }[];
	fieldDefs?: { key: string; label: string; type: string }[];
	fields?: Record<string, unknown>;
}): string {
	const routeLines = input.route.length > 0
		? input.route.map(s => `- Step${s.step}: ${s.approver}${s.role ? ` (${s.role})` : ''}`).join('\n')
		: 'None';

	const fieldSection = (input.fieldDefs?.length ?? 0) > 0
		? '\n\n## Request Fields (structured values from the template, such as amount and date)\n' + input.fieldDefs!.map(def => {
			const val = input.fields?.[def.key];
			return `- ${def.label}: ${val !== undefined && val !== '' ? String(val) : '(not entered)'}`;
		}).join('\n')
		: '';

	return `Please review the following draft of an internal approval request that is about to be submitted. Point out any typos, missing information, or suggested improvements.

## Title
${input.title || '(not entered)'}

## Request Content
${input.content || '(not entered)'}${fieldSection}

## Approval Route (for reference: who will approve this)
${routeLines}`;
}
