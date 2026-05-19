import { integer, jsonb, pgTable, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';

export const courses = pgTable('courses', {
  id: integer('id').primaryKey(),
  slug: text('slug').notNull(),
  title: text('title').notNull(),
  aliases: jsonb('aliases').notNull().default([]),
  description: text('description'),
  icon: text('icon'),
  priceValue: integer('price_value').notNull().default(0),
  priceLabel: text('price_label'),
  duration: text('duration'),
  level: text('level'),
  brochureMediaId: text('brochure_media_id'),
  isPublished: text('is_published').notNull().default('true'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  slugIndex: uniqueIndex('courses_slug_unique_idx').on(table.slug),
}));

export const courseModules = pgTable('course_modules', {
  id: text('id').primaryKey(),
  courseId: integer('course_id').notNull(),
  order: integer('order_index').notNull().default(1),
  title: text('title').notNull(),
  summary: text('summary'),
  durationLabel: text('duration_label'),
  fileMediaId: text('file_media_id'),
  resourceType: text('resource_type').notNull().default('lesson'),
  isPublished: text('is_published').notNull().default('true'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
