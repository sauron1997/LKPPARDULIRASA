import { jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

export const mediaAssets = pgTable('media_assets', {
  id: text('id').primaryKey(),
  visibility: text('visibility').notNull().default('public'),
  storageKey: text('storage_key'),
  publicUrl: text('public_url'),
  originalName: text('original_name'),
  mimeType: text('mime_type'),
  ownerType: text('owner_type'),
  ownerId: text('owner_id'),
  metadata: jsonb('metadata').notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
