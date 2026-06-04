import { integer, pgEnum, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

export const paymentTransactionStatusEnum = pgEnum('payment_transaction_status', ['pending', 'paid', 'expired', 'failed']);

export const payments = pgTable('payments', {
  id: text('id').primaryKey(),
  enrollmentId: text('enrollment_id').notNull(),
  studentId: integer('student_id').notNull(),
  amount: integer('amount').notNull(),
  publicAccessToken: text('public_access_token').notNull(),
  transactionId: text('transaction_id'),
  redirectUrl: text('redirect_url'),
  status: paymentTransactionStatusEnum('status').notNull().default('pending'),
  paymentChannel: text('payment_channel').notNull().default('midtrans'),
  paymentMethod: text('payment_method'),
  manualProofMediaId: text('manual_proof_media_id'),
  manualProofUrl: text('manual_proof_url'),
  manualSubmittedAt: text('manual_submitted_at'),
  manualReferenceNote: text('manual_reference_note'),
  manualReviewNote: text('manual_review_note'),
  manualReviewedAt: text('manual_reviewed_at'),
  paidAt: text('paid_at'),
  expiryAt: text('expiry_at'),
  rawResponse: text('raw_response'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
