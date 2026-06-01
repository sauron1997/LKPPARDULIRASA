import { jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

export const auditLogs = pgTable('audit_logs', {
  id: text('id').primaryKey(),
  actorUserId: text('actor_user_id'),
  action: text('action').notNull(),
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id').notNull(),
  beforeState: jsonb('before_state'),
  afterState: jsonb('after_state'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});