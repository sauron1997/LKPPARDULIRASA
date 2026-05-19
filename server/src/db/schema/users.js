import { integer, jsonb, pgTable, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';

export const userProfiles = pgTable('user_profiles', {
  authUserId: text('auth_user_id').primaryKey(),
  role: text('role').notNull().default('student'),
  status: text('status').notNull().default('active'),
  studentId: integer('student_id'),
  displayName: text('display_name'),
  permissions: jsonb('permissions').notNull().default([]),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const loginIdentifiers = pgTable('login_identifiers', {
  id: text('id').primaryKey(),
  authUserId: text('auth_user_id'),
  identifier: text('identifier').notNull(),
  type: text('type').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  identifierIndex: uniqueIndex('login_identifier_unique_idx').on(table.identifier),
}));

export const students = pgTable('students', {
  id: integer('id').primaryKey(),
  authUserId: text('auth_user_id'),
  accountId: text('account_id'),
  nis: text('nis').notNull(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  phone: text('phone'),
  address: text('address'),
  status: text('status').notNull().default('Aktif'),
  identityMediaId: text('identity_media_id'),
  registrationDate: text('registration_date'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  nisIndex: uniqueIndex('students_nis_unique_idx').on(table.nis),
  emailIndex: uniqueIndex('students_email_unique_idx').on(table.email),
}));
