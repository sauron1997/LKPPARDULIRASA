/**
 * Admin Service v2 — thin orchestration layer.
 * Routes delegate to use cases from @lkp-parduli-rasa/domain.
 *
 * Repository resolution is centralized via createRepositories().
 * In dev/demo mode (no DATABASE_URL) → in-memory repos.
 * In production (DATABASE_URL set) → Drizzle/PostgreSQL repos.
 */

import { createBackendContext } from '../../runtime/backend-context.js';
import { createRepositories } from '../../repositories/index.js';
import {
  createScheduleUseCases,
  createAttendanceUseCases,
  createCourseUseCases,
  createStudentUseCases,
  createCertificateUseCases,
  createDashboardQuery,
} from '@lkp-parduli-rasa/domain/use-cases';

export function createAdminServiceV2(options = {}) {
  const context = createBackendContext(options);

  // Repository factory — auto-selects memory or Drizzle based on config.
  // Use cases are fully async-compatible (Phase 7).
  // Factory will use Drizzle repos if DATABASE_URL is set,
  // otherwise falls back to in-memory repos (dev/demo mode).
  const { type: repoType, repos } = createRepositories({
    backendContext: context,
  });

  const schedule = createScheduleUseCases({
    scheduleSessionRepo: repos.scheduleSessionRepo,
    scheduleAssignmentRepo: repos.scheduleAssignmentRepo,
    enrollmentRepo: repos.enrollmentRepo,
    courseRepo: repos.courseRepo,});

  const attendance = createAttendanceUseCases({
    attendanceRepo: repos.attendanceRepo,
    scheduleSessionRepo: repos.scheduleSessionRepo,
    scheduleAssignmentRepo: repos.scheduleAssignmentRepo,
    enrollmentRepo: repos.enrollmentRepo,
  });

  const course = createCourseUseCases({
    courseRepo: repos.courseRepo,
    blogRepo: repos.blogRepo,
    galleryRepo: repos.galleryRepo,
    profileRepo: repos.profileRepo,
    accreditationRepo: repos.accreditationRepo,
    paymentSettingsRepo: repos.paymentSettingsRepo,
  });

  const student = createStudentUseCases({
    studentRepo: repos.studentRepo,
    accountRepo: repos.accountRepo,
    enrollmentRepo: repos.enrollmentRepo,
    courseRepo: repos.courseRepo,
  });

  const certificate = createCertificateUseCases({
    certificateRepo: repos.certificateRepo,
    studentRepo: repos.studentRepo,
    enrollmentRepo: repos.enrollmentRepo,
    courseRepo: repos.courseRepo,
  });

  const dashboard = createDashboardQuery({
    studentRepo: repos.studentRepo,
    courseRepo: repos.courseRepo,
    enrollmentRepo: repos.enrollmentRepo,
    scheduleSessionRepo: repos.scheduleSessionRepo,
    scheduleAssignmentRepo: repos.scheduleAssignmentRepo,
    attendanceRepo: repos.attendanceRepo,
    certificateRepo: repos.certificateRepo,
    assessmentRepo: repos.assessmentRepo,
    messageRepo: repos.messageRepo,
    blogRepo: repos.blogRepo,});

  return {
    // Metadata
    getRepoType: () => repoType,

    // Dashboard
    getDashboard: () => dashboard.buildDashboard(),
    getLearningOps: () => dashboard.buildLearningOps(),

    // Schedule
    listCourseSchedules: (courseId) => schedule.listCourseSchedules(courseId),
    createCourseSchedule: (courseId, payload) =>
      schedule.createCourseSchedule(courseId, typeof payload === 'object' ? payload : {}),
    updateCourseSchedule: (courseId, scheduleId, payload) =>
      schedule.updateCourseSchedule(courseId, scheduleId, payload),
    removeCourseSchedule: (courseId, scheduleId) =>
      schedule.removeCourseSchedule(courseId, scheduleId),
    assignEnrollmentsToSchedule: (scheduleId, payload) =>
      schedule.assignEnrollmentsToSchedule(scheduleId, payload),

    // Attendance
    listScheduleAttendance: (scheduleId) => attendance.listScheduleAttendance(scheduleId),
    listSessionAttendance: (scheduleId) => attendance.listScheduleAttendance(scheduleId),
    recordSessionAttendance: (scheduleId, payload) =>
      attendance.recordSessionAttendance(scheduleId, payload),
    updateSessionAttendance: (scheduleId, attendanceId, payload) =>
      attendance.updateSessionAttendance(scheduleId, attendanceId, payload),
    updateScheduleAttendance: (scheduleId, payload) =>
      attendance.updateScheduleAttendance(scheduleId, payload),

    // Students
    listStudents: (filters) => student.listStudents(filters),
    getStudent: (studentId) => student.getStudent(studentId),
    updateStudent: (studentId, payload) => student.updateStudent(studentId, payload),
    updatePaymentStatus: (studentId, payload) => student.updatePaymentStatus(studentId, payload),

    // Certificates
    listCertificates: (filters) => certificate.listCertificates(filters),
    upsertCertificate: (studentId, payload) => certificate.upsertCertificate(studentId, payload),
    deleteCertificate: (certificateId) => certificate.deleteCertificate(certificateId),

    // Public / course overview
    getPublicOverview: () => course.getPublicOverview(),

    // Compatibility: raw context access (for legacy code paths still using context)
    getContext: () => context,
  };
}

export default createAdminServiceV2;