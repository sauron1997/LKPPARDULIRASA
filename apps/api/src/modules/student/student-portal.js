/**
 * Student Portal — extracted from admin.service.js (Phase 8 final).
 * Provides getStudentPortal() as a standalone module with zero coupling to admin.service.js.
 */

import {
  buildStudentClassPortal,
  normalizeLoginIdentifier,
} from '@lkp-parduli-rasa/domain/domain-relations';
import { createBackendContext } from '../../runtime/backend-context.js';
import {
  canUseDatabaseStudentPersistence,
  getPersistedStudentPortal,
} from './student.persistence.js';

function toKey(value) {
  return String(value ?? '');
}

function sanitizeAccount(account) {
  if (!account) return account;
  const { password: _password, ...rest } = account;
  return rest;
}

function sanitizePortal(portal) {
  if (!portal) return portal;
  return {
    ...portal,
    account: sanitizeAccount(portal.account),
  };
}

function buildPortalInput({ context, user = null, studentReference = {}, accountReference = {} }) {
  const collections = context.getCollections();
  const indexes = context.getIndexes();
  let student = null;

  if (studentReference.studentId != null) {
    student = indexes.studentsById.get(toKey(studentReference.studentId)) || null;
  } else if (studentReference.email) {
    student = indexes.studentsByEmail.get(normalizeLoginIdentifier(studentReference.email)) || null;
  } else if (studentReference.nis) {
    student = indexes.studentsByNis.get(toKey(studentReference.nis)) || null;
  }

  if (!student && user?.studentId != null) {
    student = indexes.studentsById.get(toKey(user.studentId)) || null;
  }

  const account = accountReference.accountId != null
    ? indexes.accountsById.get(toKey(accountReference.accountId)) || null
    : student
      ? indexes.accountsByStudentId.get(toKey(student.id)) || null
      : null;

  const enrollment = studentReference.enrollmentId != null
    ? indexes.enrollmentsById.get(toKey(studentReference.enrollmentId)) || null
    : student
      ? indexes.enrollmentsByStudentId.get(toKey(student.id)) || null
      : null;

  const courseId = studentReference.courseId ?? enrollment?.courseId ?? student?.courseId ?? null;
  const course = courseId != null
    ? indexes.coursesById.get(toKey(courseId)) || null
    : null;

  function getGroupedItems(index, key) {
    return index.get(toKey(key)) || [];
  }

  const certificates = [...new Map([
    ...(student ? getGroupedItems(indexes.certificatesByStudentId, student.id) : []),
    ...(enrollment ? getGroupedItems(indexes.certificatesByEnrollmentId, enrollment.id) : []),
    ...((student?.nis || studentReference.nis) ? getGroupedItems(indexes.certificatesByNis, student?.nis || studentReference.nis) : []),
  ].map((item) => [toKey(item.id), item])).values()];

  return {
    user,
    accountReference,
    studentReference,
    accounts: account ? [account] : [],
    students: student ? [student] : collections.students,
    courses: course ? [course] : collections.courses,
    enrollments: enrollment ? [enrollment] : collections.enrollments,
    modules: course ? getGroupedItems(indexes.modulesByCourseId, course.id) : [],
    assessmentProgress: enrollment
      ? getGroupedItems(indexes.progressByEnrollmentId, enrollment.id)
      : student
        ? getGroupedItems(indexes.progressByStudentId, student.id)
        : [],
    assessmentDefinitions: course ? getGroupedItems(indexes.definitionsByCourseId, course.id) : [],
    assessmentSubmissions: enrollment
      ? getGroupedItems(indexes.submissionsByEnrollmentId, enrollment.id)
      : student
        ? getGroupedItems(indexes.submissionsByStudentId, student.id)
        : [],
    certificates,
    messages: student ? getGroupedItems(indexes.threadsByStudentId, student.id) : [],
  };
}

/**
 * Get a student's portal — DB-first with in-memory fallback.
 * @param {object} reference - { studentId, enrollmentId, email, nis, authUserId, user, actor }
 * @param {object} options - { context, state, repositories }
 * @returns {Promise<object>} sanitized portal
 */
export async function getStudentPortal(reference = {}, options = {}) {
  if (
    canUseDatabaseStudentPersistence()
    && (reference?.authUserId || reference?.studentId || reference?.email || reference?.nis || reference?.user || reference?.actor)
  ) {
    const persistedPortal = await getPersistedStudentPortal(reference).catch(() => null);
    if (persistedPortal?.student) {
      return sanitizePortal(persistedPortal);
    }
  }

  const context = createBackendContext(options);
  const user = reference.user || reference.actor || null;
  const studentReference = {
    studentId: reference.studentId || user?.studentId,
    enrollmentId: reference.enrollmentId || user?.enrollmentId,
    courseId: reference.courseId || user?.courseId,
    email: reference.email || user?.email,
    nis: reference.nis || user?.nis,
  };
  const accountReference = {
    accountId: reference.accountId || user?.accountId,
  };

  return sanitizePortal(buildStudentClassPortal(buildPortalInput({
    context,
    user,
    studentReference,
    accountReference,
  })));
}
