export type StreamEvent =
	| { type: 'delta'; text: string }
	| { type: 'form_fields'; fields: Record<string, string> }
	| { type: 'done' }
	| { type: 'error'; message: string };
