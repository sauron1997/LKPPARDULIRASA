import { integer, jsonb, pgEnum, pgTable, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';

export const enrollmentStatusEnum = pgEnum('enrollment_status', ['active', 'completed', 'cancelled']);
export const paymentStatusEnum = pgEnum('payment_status', ['pending', 'verified', 'rejected']);
export const assessmentTypeEnum = pgEnum('assessment_type', ['latihan', 'teori', 'praktik']);
export const assessmentStatusEnum = pgEnum('assessment_status', ['not_started', 'in_progress', 'in_review', 'passed', 'retry']);
export const submissionStatusEnum = pgEnum('submission_status', ['draft', 'submitted', 'in_review', 'passed', 'retry']);
export const scheduleSessionStatusEnum = pgEnum('schedule_session_status', ['scheduled', 'planned', 'published', 'completed', 'cancelled']);
export const scheduleAssignmentStatusEnum = pgEnum('schedule_assignment_status', ['scheduled', 'assigned', 'cancelled', 'removed']);
export const attendanceStatusEnum = pgEnum('attendance_status', ['present', 'late', 'absent', 'excused']);

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

export const scheduleSessions = pgTable('schedule_sessions', {
  id: text('id').primaryKey(),
  courseId: integer('course_id').notNull(),
  moduleId: text('module_id'),
  title: text('title').notNull(),
  description: text('description'),
  instructorName: text('instructor_name'),
  location: text('location'),
  locationLabel: text('location_label'),
  meetingLink: text('meeting_link'),
  mode: text('mode').notNull().default('offline'),
  status: scheduleSessionStatusEnum('status').notNull().default('published'),
  notes: text('notes'),
  startAt: timestamp('start_at', { withTimezone: true }).notNull(),
  endAt: timestamp('end_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const scheduleAssignments = pgTable('schedule_assignments', {
  id: text('id').primaryKey(),
  sessionId: text('session_id').notNull(),
  enrollmentId: text('enrollment_id').notNull(),
  studentId: integer('student_id').notNull(),
  courseId: integer('course_id').notNull(),
  status: scheduleAssignmentStatusEnum('status').notNull().default('scheduled'),
  assignmentStatus: scheduleAssignmentStatusEnum('assignment_status').notNull().default('assigned'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  assignmentIndex: uniqueIndex('schedule_assignment_session_enrollment_unique_idx').on(table.sessionId, table.enrollmentId),
}));

export const attendanceRecords = pgTable('attendance_records', {
  id: text('id').primaryKey(),
  sessionId: text('session_id').notNull(),
  assignmentId: text('assignment_id').notNull(),
  enrollmentId: text('enrollment_id').notNull(),
  studentId: integer('student_id').notNull(),
  courseId: integer('course_id').notNull(),
  status: attendanceStatusEnum('status').notNull().default('present'),
  checkInAt: timestamp('check_in_at', { withTimezone: true }).notNull(),
  source: text('source').notNull().default('admin'),
  recordedBy: text('recorded_by'),
  notes: text('notes'),
  markedAt: timestamp('marked_at', { withTimezone: true }).notNull().defaultNow(),
  markedBy: text('marked_by').notNull().default('system'),
  note: text('note'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  attendanceIndex: uniqueIndex('attendance_session_enrollment_unique_idx').on(table.sessionId, table.enrollmentId),
}));

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
