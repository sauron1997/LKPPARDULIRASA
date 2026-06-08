/**
 * Use Cases barrel export. All use cases follow the same pattern:
 * createXUseCases(deps) -> { methods }
 * Dependencies (repositories) are injected — no direct DB imports.
 */

export { createScheduleUseCases } from './schedule.usecase.js';
export { createAttendanceUseCases } from './attendance.usecase.js';
export { createCourseUseCases } from './course.usecase.js';
export { createStudentUseCases } from './student.usecase.js';
export { createCertificateUseCases } from './certificate.usecase.js';
export { createDashboardQuery } from './dashboard.query.js';
export { createServiceError, ensure } from './errors.js';
export {
  VALID_SESSION_STATUSES,
  LATE_ATTENDANCE_AFTER_MINUTES,
  sortSessionsAsc,
  parseDateTime,
  normalizeSessionPayload,
  decorateSession,
  getSessionAssignments,
  getSessionAttendance,
  createAssignmentsForSession,
} from './schedule-helpers.js';
export {
  cloneValue,
  compareByUpdatedDesc,
  slugify,
  formatCurrency,
  getLatestNumber,
  parseNumericSuffix,
  toIsoTimestamp,
  getDaysSince,
  formatQueueAge,
  normalizeLoginIdentifier,
  getAccountIdentifiers,
  buildSessionUser,
  findCourseByReference,
  findEnrollmentByReference,
} from './helpers.js';