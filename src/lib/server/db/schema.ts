import { sql } from 'drizzle-orm';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const integrations = sqliteTable('integrations', {
	id: text('id').primaryKey(),
	name: text('name').notNull(),
	description: text('description'),
	baseUrl: text('base_url').notNull(),
	authType: text('auth_type', { enum: ['none', 'api_key', 'bearer', 'basic'] })
		.notNull()
		.default('none'),
	authConfig: text('auth_config').notNull().default('{}'),
	createdAt: integer('created_at', { mode: 'timestamp' })
		.notNull()
		.default(sql`(unixepoch())`),
	updatedAt: integer('updated_at', { mode: 'timestamp' })
		.notNull()
		.default(sql`(unixepoch())`)
});

export const emailProviders = sqliteTable('email_providers', {
	id: text('id').primaryKey(),
	provider: text('provider', { enum: ['resend', 'ses', 'smtp'] })
		.notNull()
		.default('resend'),
	config: text('config').notNull().default('{}'),
	fromAddress: text('from_address').notNull().default(''),
	fromName: text('from_name'),
	signature: text('signature'),
	createdAt: integer('created_at', { mode: 'timestamp' })
		.notNull()
		.default(sql`(unixepoch())`),
	updatedAt: integer('updated_at', { mode: 'timestamp' })
		.notNull()
		.default(sql`(unixepoch())`)
});

export const aiSettings = sqliteTable('ai_settings', {
	id: text('id').primaryKey(),
	model: text('model').notNull().default('claude-haiku-4-5-20251001'),
	updatedAt: integer('updated_at', { mode: 'timestamp' })
		.notNull()
		.default(sql`(unixepoch())`)
});

export const accounts = sqliteTable('accounts', {
	id: text('id').primaryKey(),
	name: text('name').notNull(),
	email: text('email'),
	role: text('role'),
	permission: text('permission', { enum: ['general', 'admin'] }).notNull().default('general'),
	passwordHash: text('password_hash'),
	createdAt: integer('created_at', { mode: 'timestamp' })
		.notNull()
		.default(sql`(unixepoch())`),
	updatedAt: integer('updated_at', { mode: 'timestamp' })
		.notNull()
		.default(sql`(unixepoch())`)
});

export const approvalRequests = sqliteTable('approval_requests', {
	id: text('id').primaryKey(),
	title: text('title').notNull(),
	type: text('type').notNull(),
	entityType: text('entity_type'),
	entityId: text('entity_id'),
	status: text('status', { enum: ['draft', 'pending', 'approved', 'rejected', 'cancelled'] })
		.notNull()
		.default('pending'),
	submittedBy: text('submitted_by').notNull().default(''),
	data: text('data').notNull().default('{}'),
	route: text('route').notNull().default('[]'),
	attachments: text('attachments').notNull().default('[]'),
	createdAt: integer('created_at', { mode: 'timestamp' })
		.notNull()
		.default(sql`(unixepoch())`),
	updatedAt: integer('updated_at', { mode: 'timestamp' })
		.notNull()
		.default(sql`(unixepoch())`)
});

export const notifications = sqliteTable('notifications', {
	id: text('id').primaryKey(),
	type: text('type').notNull().default('generic'),
	title: text('title').notNull(),
	body: text('body').notNull().default(''),
	seedContent: text('seed_content').notNull().default('[]'),
	accountId: text('account_id').notNull(),
	isRead: integer('is_read', { mode: 'boolean' }).notNull().default(false),
	createdAt: integer('created_at', { mode: 'timestamp' })
		.notNull()
		.default(sql`(unixepoch())`)
});

export const reminders = sqliteTable('reminders', {
	id: text('id').primaryKey(),
	remindAt: integer('remind_at', { mode: 'timestamp' }).notNull(),
	content: text('content').notNull(),
	channels: text('channels').notNull().default('[]'),
	status: text('status', { enum: ['pending', 'sent', 'failed'] }).notNull().default('pending'),
	accountId: text('account_id'),
	createdAt: integer('created_at', { mode: 'timestamp' })
		.notNull()
		.default(sql`(unixepoch())`)
});


export const approvalTemplates = sqliteTable('approval_templates', {
	id: text('id').primaryKey(),
	name: text('name').notNull(),
	type: text('type').notNull(),
	description: text('description'),
	bodyFormat: text('body_format').notNull().default(''),
	customFields: text('custom_fields').notNull().default('[]'),
	defaultRoute: text('default_route').notNull().default('[]'),
	createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
	updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
});

export type ApprovalTemplate = typeof approvalTemplates.$inferSelect;
export type NewApprovalTemplate = typeof approvalTemplates.$inferInsert;

export type EmailProviderSettings = typeof emailProviders.$inferSelect;
export type NewEmailProviderSettings = typeof emailProviders.$inferInsert;
export type AiSettings = typeof aiSettings.$inferSelect;
export type Account = typeof accounts.$inferSelect;
export type Integration = typeof integrations.$inferSelect;
export type NewIntegration = typeof integrations.$inferInsert;
export type ApprovalRequest = typeof approvalRequests.$inferSelect;
export type NewApprovalRequest = typeof approvalRequests.$inferInsert;
export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;
export type Reminder = typeof reminders.$inferSelect;
export type NewReminder = typeof reminders.$inferInsert;
