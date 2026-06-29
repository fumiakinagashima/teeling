import { eq } from 'drizzle-orm';
import type { Db } from '.';
import { approvalTemplates } from './schema';
import type { TemplateRow, CustomFieldDef } from '$lib/types/template';

function toRow(r: typeof approvalTemplates.$inferSelect): TemplateRow {
	return {
		id: r.id,
		name: r.name,
		type: r.type,
		description: r.description,
		bodyFormat: r.bodyFormat,
		customFields: JSON.parse(r.customFields) as CustomFieldDef[],
		defaultRoute: JSON.parse(r.defaultRoute),
		createdAt: r.createdAt,
		updatedAt: r.updatedAt
	};
}

export async function listTemplates(db: Db): Promise<TemplateRow[]> {
	const rows = await db.select().from(approvalTemplates).orderBy(approvalTemplates.name);
	return rows.map(toRow);
}

export async function getTemplate(db: Db, id: string): Promise<TemplateRow | null> {
	const rows = await db.select().from(approvalTemplates).where(eq(approvalTemplates.id, id));
	return rows[0] ? toRow(rows[0]) : null;
}

export async function createTemplate(
	db: Db,
	input: Omit<TemplateRow, 'id' | 'createdAt' | 'updatedAt'>
): Promise<TemplateRow> {
	const id = crypto.randomUUID();
	await db.insert(approvalTemplates).values({
		id,
		name: input.name,
		type: input.type,
		description: input.description ?? null,
		bodyFormat: input.bodyFormat,
		customFields: JSON.stringify(input.customFields),
		defaultRoute: JSON.stringify(input.defaultRoute)
	});
	return (await getTemplate(db, id))!;
}

export async function updateTemplate(
	db: Db,
	id: string,
	input: Partial<Omit<TemplateRow, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<TemplateRow> {
	await db.update(approvalTemplates).set({
		...(input.name !== undefined && { name: input.name }),
		...(input.type !== undefined && { type: input.type }),
		...(input.description !== undefined && { description: input.description }),
		...(input.bodyFormat !== undefined && { bodyFormat: input.bodyFormat }),
		...(input.customFields !== undefined && { customFields: JSON.stringify(input.customFields) }),
		...(input.defaultRoute !== undefined && { defaultRoute: JSON.stringify(input.defaultRoute) }),
		updatedAt: new Date()
	}).where(eq(approvalTemplates.id, id));
	return (await getTemplate(db, id))!;
}

export async function deleteTemplate(db: Db, id: string): Promise<void> {
	await db.delete(approvalTemplates).where(eq(approvalTemplates.id, id));
}
