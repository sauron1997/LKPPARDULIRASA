import { integer, jsonb, pgEnum, pgTable, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';

export const enrollmentStatusEnum = pgEnum('enrollment_status', ['active', 'completed', 'cancelled']);
export const paymentStatusEnum = pgEnum('payment_status', ['pending', 'verified', 'rejected']);
export const assessmentTypeEnum = pgEnum('assessment_type', ['latihan', 'teori', 'praktik']);
export const assessmentStatusEnum = pgEnum('assessment_status', ['not_started', 'in_progress', 'in_review', 'passed', 'retry']);
export const submissionStatusEnum = pgEnum('submission_status', ['draft', 'submitted', 'in_review', 'passed', 'retry']);

export const enrollments = pgTable('enrollments', {
  id: text('id').primaryKey(),
  studentId: integer('student_id').notNull(),
  courseId: integer('course_id').notNull(),
  programSnapshot: text('program_snapshot'),
  status: enrollmentStatusEnum('status').notNull().default('active'),
  paymentStatus: paymentStatusEnum('payment_status').notNull().default('pending'),
  paymentDate: text('payment_date'),
  registrationDate: text('registration_date'),
  startedAt: text('started_at'),
  completedAt: text('completed_at'),
  currentModuleId: text('current_module_id'),
  progressPercent: integer('progress_percent').notNull().default(0),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const assessmentDefinitions = pgTable('assessment_definitions', {
  id: text('id').primaryKey(),
  courseId: integer('course_id').notNull(),
  type: assessmentTypeEnum('type').notNull(),
  title: text('title').notNull(),
  summary: text('summary'),
  instructions: text('instructions'),
  durationMinutes: integer('duration_minutes').notNull().default(60),
  passingScore: integer('passing_score').notNull().default(75),
  maxScore: integer('max_score').notNull().default(100),
  maxAttempts: integer('max_attempts').notNull().default(1),
  allowRetry: text('allow_retry').notNull().default('true'),
  submissionMode: text('submission_mode').notNull().default('online_quiz'),
  allowedExtensions: jsonb('allowed_extensions').notNull().default([]),
  isPublished: text('is_published').notNull().default('true'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  definitionIndex: uniqueIndex('assessment_definition_course_type_unique_idx').on(table.courseId, table.type),
}));

export const assessmentQuestions = pgTable('assessment_questions', {
  id: text('id').primaryKey(),
  definitionId: text('definition_id').notNull(),
  order: integer('order_index').notNull().default(1),
  kind: text('kind').notNull().default('essay'),
  prompt: text('prompt').notNull(),
  options: jsonb('options').notNull().default([]),
  answer: text('answer'),
  weight: integer('weight').notNull().default(1),
});

export const assessmentProgress = pgTable('assessment_progress', {
  id: text('id').primaryKey(),
  enrollmentId: text('enrollment_id').notNull(),
  studentId: integer('student_id').notNull(),
  courseId: integer('course_id').notNull(),
  type: assessmentTypeEnum('type').notNull(),
  assessmentTitle: text('assessment_title'),
  status: assessmentStatusEnum('status').notNull().default('not_started'),
  score: integer('score'),
  maxScore: integer('max_score').notNull().default(100),
  submittedAt: timestamp('submitted_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  feedback: text('feedback'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  progressIndex: uniqueIndex('assessment_progress_enrollment_type_unique_idx').on(table.enrollmentId, table.type),
}));

export const assessmentSubmissions = pgTable('assessment_submissions', {
  id: text('id').primaryKey(),
  definitionId: text('definition_id').notNull(),
  enrollmentId: text('enrollment_id').notNull(),
  studentId: integer('student_id').notNull(),
  courseId: integer('course_id').notNull(),
  type: assessmentTypeEnum('type').notNull(),
  title: text('title'),
  attempt: integer('attempt').notNull().default(1),
  status: submissionStatusEnum('status').notNull().default('draft'),
  score: integer('score'),
  maxScore: integer('max_score').notNull().default(100),
  feedback: text('feedback'),
  reviewerName: text('reviewer_name'),
  submittedAt: timestamp('submitted_at', { withTimezone: true }),
  reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const submissionAnswers = pgTable('submission_answers', {
  id: text('id').primaryKey(),
  submissionId: text('submission_id').notNull(),
  questionId: text('question_id').notNull(),
  value: jsonb('value').notNull().default(''),
});

export const submissionAttachments = pgTable('submission_attachments', {
  id: text('id').primaryKey(),
  submissionId: text('submission_id').notNull(),
  mediaId: text('media_id').notNull(),
});

export const certificates = pgTable('certificates', {
  id: text('id').primaryKey(),
  studentId: integer('student_id').notNull(),
  enrollmentId: text('enrollment_id').notNull(),
  courseId: integer('course_id').notNull(),
  nis: text('nis').notNull(),
  studentName: text('student_name').notNull(),
  program: text('program'),
  issueDate: text('issue_date'),
  status: text('status').notNull().default('available'),
  fileMediaId: text('file_media_id'),
  eligibilitySnapshot: jsonb('eligibility_snapshot').notNull().default({}),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  enrollmentIndex: uniqueIndex('certificates_enrollment_unique_idx').on(table.enrollmentId),
}));
