import { integer, jsonb, pgTable, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';

export const siteProfile = pgTable('site_profile', {
  id: text('id').primaryKey().default('site'),
  name: text('name').notNull(),
  tagline: text('tagline'),
  logo: text('logo'),
  description: text('description'),
  vision: text('vision'),
  mission: jsonb('mission').notNull().default([]),
  history: text('history'),
  address: text('address'),
  phone: text('phone'),
  email: text('email'),
  foundedYear: integer('founded_year'),
  teacherCount: integer('teacher_count'),
  alumniCount: integer('alumni_count'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const socialLinks = pgTable('social_links', {
  id: text('id').primaryKey(),
  platform: text('platform').notNull(),
  url: text('url'),
  enabled: text('enabled').notNull().default('false'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  platformIndex: uniqueIndex('social_links_platform_unique_idx').on(table.platform),
}));

export const blogPosts = pgTable('blog_posts', {
  id: integer('id').primaryKey(),
  slug: text('slug').notNull(),
  title: text('title').notNull(),
  summary: text('summary'),
  contentHtml: text('content_html'),
  authorName: text('author_name'),
  category: text('category'),
  status: text('status').notNull().default('draft'),
  coverMediaId: text('cover_media_id'),
  tags: jsonb('tags').notNull().default([]),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  slugIndex: uniqueIndex('blog_posts_slug_unique_idx').on(table.slug),
}));

export const galleryItems = pgTable('gallery_items', {
  id: integer('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  tags: jsonb('tags').notNull().default([]),
  coverId: text('cover_id'),
  type: text('type').notNull().default('photo'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const galleryMedia = pgTable('gallery_media', {
  id: text('id').primaryKey(),
  galleryItemId: integer('gallery_item_id').notNull(),
  name: text('name'),
  type: text('type').notNull().default('photo'),
  url: text('url'),
  mimeType: text('mime_type'),
  isObjectUrl: text('is_object_url').notNull().default('false'),
});

export const accreditations = pgTable('accreditations', {
  id: integer('id').primaryKey(),
  title: text('title').notNull(),
  certificateNumber: text('certificate_number'),
  description: text('description'),
  expiryDate: text('expiry_date'),
  year: text('year'),
  status: text('status').notNull().default('Aktif'),
  documentMediaId: text('document_media_id'),
  documentName: text('document_name'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
