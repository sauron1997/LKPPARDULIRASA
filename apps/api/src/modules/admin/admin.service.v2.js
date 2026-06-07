/**
 * Admin Service v2 — thin orchestration layer.
 * Routes delegate to use cases from @lkp-parduli-rasa/domain.
 * The1736-line monolith (admin.service.js) is replaced by this thin wrapper.
 */

import { createBackendContext } from './admin.service.js';
import { createRepoAdapter } from '../../adapters/repository-adapter.js';
import {
  createScheduleUseCases,
  createAttendanceUseCases,
  createCourseUseCases,
  createStudentUseCases,
  createCertificateUseCases,
} from '@lkp-parduli-rasa/domain/use-cases';

export function createAdminServiceV2(options = {}) {
  const context = createBackendContext(options);
  const repos = createRepoAdapter(context);

  const schedule = createScheduleUseCases({
    scheduleSessionRepo: repos.scheduleSessionRepo,
    scheduleAssignmentRepo: repos.scheduleAssignmentRepo,
    enrollmentRepo: repos.enrollmentRepo,
    courseRepo: repos.courseRepo,
  });

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

  return {
    // Dashboard (kept simple — the old buildAdminDashboardPayload still works)
    async getDashboard() {
      // For now, delegate back to legacy dashboard builder which is already self-contained
      const legacy = await import('./admin.service.js');
      const oldService = legacy.createAdminService(options);
      return oldService.getDashboard();
    },

    async getLearningOps() {
      const legacy = await import('./admin.service.js');
      const oldService = legacy.createAdminService(options);
      return oldService.getLearningOps();
    },

    // Schedule
    listCourseSchedules: (courseId) =>
      schedule.listCourseSchedules(courseId),

    createCourseSchedule: (courseId, payload) =>
      schedule.createCourseSchedule(courseId, typeof payload === 'object' ? payload : {}),

    updateCourseSchedule: (courseId, scheduleId, payload) =>
      schedule.updateCourseSchedule(courseId, scheduleId, payload),

    removeCourseSchedule: (courseId, scheduleId) =>
      schedule.removeCourseSchedule(courseId, scheduleId),

    assignEnrollmentsToSchedule: (scheduleId, payload) =>
      schedule.assignEnrollmentsToSchedule(scheduleId, payload),

    // Attendance
    listScheduleAttendance: (scheduleId) =>
      attendance.listScheduleAttendance(scheduleId),

    listSessionAttendance: (scheduleId) =>
      attendance.listScheduleAttendance(scheduleId),

    recordSessionAttendance: (scheduleId, payload) =>
      attendance.recordSessionAttendance(scheduleId, payload),

    updateSessionAttendance: (scheduleId, attendanceId, payload) =>
      attendance.updateSessionAttendance(scheduleId, attendanceId, payload),

    updateScheduleAttendance: (scheduleId, payload) =>
      attendance.updateScheduleAttendance(scheduleId, payload),

    // Students
    listStudents: (filters) =>
      student.listStudents(filters),

    getStudent: (studentId) =>
      student.getStudent(studentId),

    updateStudent: (studentId, payload) =>
      student.updateStudent(studentId, payload),

    updatePaymentStatus: (studentId, payload) =>
      student.updatePaymentStatus(studentId, payload),

    // Certificates
    listCertificates: (filters) =>
      certificate.listCertificates(filters),

    upsertCertificate: (studentId, payload) =>
      certificate.upsertCertificate(studentId, payload),

    deleteCertificate: (certificateId) =>
      certificate.deleteCertificate(certificateId),

    // Public / course overview
    getPublicOverview: () =>
      course.getPublicOverview(),

    // Give access to the raw context for compatibility
    getContext: () => context,
  };
}

export default createAdminServiceV2;