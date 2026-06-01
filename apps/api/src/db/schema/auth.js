import { boolean, index, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

export const authUsers = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: text('image'),
  username: text('username').unique(),
  displayUsername: text('display_username'),
  role: text('role').notNull().default('student'),
  studentId: text('student_id'),
  nis: text('nis'),
  accountId: text('account_id'),
  courseId: text('course_id'),
  enrollmentId: text('enrollment_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  emailIndex: index('auth_user_email_idx').on(table.email),
  usernameIndex: index('auth_user_username_idx').on(table.username),
}));

export const authSessions = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id').notNull(),
}, (table) => ({
  tokenIndex: index('auth_session_token_idx').on(table.token),
  userIndex: index('auth_session_user_idx').on(table.userId),
}));

export const authAccounts = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id').notNull(),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at', { withTimezone: true }),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at', { withTimezone: true }),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  providerIndex: index('auth_account_provider_idx').on(table.providerId, table.accountId),
  userIndex: index('auth_account_user_idx').on(table.userId),
}));

export const authVerifications = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  identifierIndex: index('auth_verification_identifier_idx').on(table.identifier),
}));