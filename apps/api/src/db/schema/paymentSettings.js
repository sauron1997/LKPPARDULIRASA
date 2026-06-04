import { boolean, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

export const paymentSettings = pgTable('payment_settings', {
  id: text('id').primaryKey(),
  isActive: boolean('is_active').notNull().default(false),
  qrisImageUrl: text('qris_image_url'),
  bankName: text('bank_name'),
  accountNumber: text('account_number'),
  accountHolderName: text('account_holder_name'),
  paymentNotes: text('payment_notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});