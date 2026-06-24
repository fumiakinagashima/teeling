import type { Db } from '.';

export type CustomFieldType = 'text' | 'number' | 'select' | 'date' | 'email' | 'tel' | 'textarea';

export type FieldDef = {
	key: string;
	label: string;
	type: CustomFieldType | 'recordSelect' | 'datetime-local';
	required?: boolean;
	options?: { label: string; value: string }[];
	formOptions?: { label: string; value: string }[];
	listable?: boolean;
	isCustom?: boolean;
	refTable?: string;
};

export type TableInfo = {
	id: string;
	label: string;
	icon: string;
	isCore: boolean;
	fields: FieldDef[];
};

export type RecordRow = Record<string, string | number | null>;

export type EditableField = Omit<FieldDef, 'listable' | 'isCustom'> & { _id: string };

export type EntityTypeForWorkflow = {
	id: string;
	label: string;
	fields: { key: string; label: string }[];
};

// Teeling has no custom tables; return empty list for workflow editor
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function listEntityTypesForWorkflow(_db: Db): Promise<EntityTypeForWorkflow[]> {
	return [];
}
