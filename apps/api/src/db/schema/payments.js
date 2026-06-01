import { integer, pgEnum, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

export const paymentTransactionStatusEnum = pgEnum('payment_transaction_status', ['pending', 'paid', 'expired', 'failed']);

export const payments = pgTable('payments', {
  id: text('id').primaryKey(),
  enrollmentId: text('enrollment_id').notNull(),
  studentId: integer('student_id').notNull(),
  amount: integer('amount').notNull(),
  transactionId: text('transaction_id'),
  redirectUrl: text('redirect_url'),
  status: paymentTransactionStatusEnum('status').notNull().default('pending'),
  paymentMethod: text('payment_method'),
  paidAt: text('paid_at'),
  expiryAt: text('expiry_at'),
  rawResponse: text('raw_response'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
