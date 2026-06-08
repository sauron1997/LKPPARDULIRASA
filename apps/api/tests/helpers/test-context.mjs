/**
 * Test context helpers for API tests (Phase 9).
 * Provides in-memory backend context bootstrapped with optional seed overrides.
 */

import { createBackendContext, resetBackendState } from '../../src/runtime/backend-context.js';

/**
 * Create a fresh isolated backend context for each test.
 * Optionally inject seed overrides to set up specific state.
 */
export function createTestContext(seedOverrides = {}) {
  const state = resetBackendState(seedOverrides);
  return createBackendContext({ state });
}

/**
 * Create a minimal student, enrollment, and course in in-memory state.
 * Returns { context, student, enrollment, course, account }.
 */
export function buildStudentFixture(options = {}) {
  const context = createTestContext();
  const { repositories } = context;
  const now = new Date().toISOString();

  const course = {
    id: options.courseId ?? 'course-test-1',
    title: options.courseTitle ?? 'Test Course',
    status: 'active',
    price: '1000000',
    createdAt: now,
    updatedAt: now,
  };

  const student = {
    id: options.studentId ?? 1001,
    nis: options.nis ?? 'PRK-2024-001',
    name: options.name ?? 'Test Student',
    email: options.email ?? 'student@test.com',
    phone: '08123456789',
    address: 'Test Address',
    parentName: 'Parent Name',
    courseId: course.id,
    enrollmentId: options.enrollmentId ?? 'enr-2024-001',
    photoMediaId: null,
    ijazahMediaId: null,
    status: 'Aktif',
    createdAt: now,
    updatedAt: now,
  };

  const enrollment = {
    id: options.enrollmentId ?? 'enr-2024-001',
    studentId: student.id,
    courseId: course.id,
    program: course.title,
    status: 'active',
    paymentStatus: 'verified',
    registrationDate: now.slice(0, 10),
    paymentDate: now.slice(0, 10),
    startedAt: now.slice(0, 10),
    currentModuleId: null,
    progressPercent: 0,
    createdAt: now,
    updatedAt: now,
  };

  const account = {
    id: `acc-student-${student.id}`,
    username: student.email,
    loginId: student.email,
    password: 'hashed-password',
    role: 'student',
    name: student.name,
    displayName: student.name,
    email: student.email,
    studentId: student.id,
    nis: student.nis,
    courseId: course.id,
    enrollmentId: enrollment.id,
    status: 'active',
    createdAt: now,
    updatedAt: now,
  };

  repositories.courses.insert(course);
  repositories.students.insert(student);
  repositories.enrollments.insert(enrollment);
  repositories.accounts.insert(account);

  return { context, student, enrollment, course, account };
}

/**
 * Build a schedule session + assignment for a given enrollment in a context.
 */
export function buildScheduleFixture(context, enrollment, options = {}) {
  const { repositories } = context;
  const now = new Date().toISOString();
  const startAt = options.startAt ?? new Date(Date.now() + 3600000).toISOString(); // 1h from now
  const endAt = options.endAt ?? new Date(Date.now() + 7200000).toISOString();   // 2h from now

  const session = {
    id: options.sessionId ?? `session-${enrollment.courseId}-1`,
    courseId: enrollment.courseId,
    moduleId: null,
    title: options.title ?? 'Test Session',
    startAt,
    endAt,
    status: options.status ?? 'scheduled',
    locationLabel: '',
    meetingLink: '',
    instructorName: '',
    notes: '',
    createdAt: now,
    updatedAt: now,
  };

  const assignment = {
    id: `assign-${session.id}-${enrollment.id}`,
    sessionId: session.id,
    enrollmentId: enrollment.id,
    studentId: Number(enrollment.studentId),
    courseId: Number(enrollment.courseId),
    status: 'scheduled',
    assignmentStatus: 'assigned',
    createdAt: now,
    updatedAt: now,
  };

  repositories.scheduleSessions.insert(session, { prepend: false });
  repositories.scheduleAssignments.insert(assignment, { prepend: false });

  return { session, assignment };
}
