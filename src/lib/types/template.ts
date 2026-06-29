export type CustomFieldType = 'text' | 'number' | 'date' | 'time';

export type CustomFieldDef = {
	key: string;
	label: string;
	type: CustomFieldType;
	required: boolean;
};

export type TemplateRow = {
	id: string;
	name: string;
	type: string;
	description: string | null;
	bodyFormat: string;
	customFields: CustomFieldDef[];
	defaultRoute: { step: number; approver: string; role?: string; email?: string }[];
	createdAt: Date;
	updatedAt: Date;
};
