import { integer, pgEnum, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

export const messageChannelEnum = pgEnum('message_channel', ['public', 'student']);
export const messageThreadStatusEnum = pgEnum('message_thread_status', ['unread', 'replied', 'closed']);

export const messageThreads = pgTable('message_threads', {
  id: text('id').primaryKey(),
  channel: messageChannelEnum('channel').notNull(),
  studentId: integer('student_id'),
  enrollmentId: text('enrollment_id'),
  courseId: integer('course_id'),
  senderName: text('sender_name'),
  senderEmail: text('sender_email'),
  senderAddress: text('sender_address'),
  subject: text('subject'),
  status: messageThreadStatusEnum('status').notNull().default('unread'),
  draft: text('draft'),
  lastMessageAt: timestamp('last_message_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const threadMessages = pgTable('thread_messages', {
  id: text('id').primaryKey(),
  threadId: text('thread_id').notNull(),
  authorUserId: text('author_user_id'),
  authorRole: text('author_role').notNull(),
  authorName: text('author_name'),
  body: text('body').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});