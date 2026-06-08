/**
 * Student Schedule Service — extracted from admin.service.js (Phase 8 final).
 * Provides getStudentSchedules, getStudentAttendance, checkInStudentSchedule.
 */

import { buildClassroomAccessMeta } from '@lkp-parduli-rasa/domain/domain-relations';
import { createBackendContext } from '../../runtime/backend-context.js';
import { ensure } from '../../runtime/errors.js';
import { getStudentPortal } from './student-portal.js';

const LATE_ATTENDANCE_AFTER_MINUTES = 15;
const VALID_ATTENDANCE_STATUSES = new Set(['present', 'late', 'excused', 'absent']);

function parseDateTime(value) {
  const parsed = new Date(value || 0);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function sortSessionsAsc(left, right) {
  return (parseDateTime(left.startAt)?.getTime() || 0) - (parseDateTime(right.startAt)?.getTime() || 0);
}

function buildAttendanceSummary(records = [], assignments = []) {
  const counts = { present: 0, late: 0, excused: 0, absent: 0, pending: 0 };
  const recordedEnrollmentIds = new Set();

  records.forEach((record) => {
    if (counts[record.status] != null) counts[record.status] += 1;
    recordedEnrollmentIds.add(String(record.enrollmentId));
  });

  assignments.forEach((assignment) => {
    if (!recordedEnrollmentIds.has(String(assignment.enrollmentId))) counts.pending += 1;
  });

  const total = assignments.length || records.length;
  const attended = counts.present + counts.late + counts.excused;

  return { ...counts, total, attended, rate: total ? Math.round((attended / total) * 100) : 0 };
}

function getSessionAssignments(sessionId, context) {
  return context.repositories.scheduleAssignments.raw()
    .filter((item) => String(item.sessionId) === String(sessionId) && item.assignmentStatus !== 'removed');
}

function getSessionAttendance(sessionId, context) {
  return context.repositories.attendanceRecords.raw()
    .filter((item) => String(item.sessionId) === String(sessionId));
}

function decorateSession(session, context) {
  const assignments = getSessionAssignments(session.id, context);
  const attendance = getSessionAttendance(session.id, context);
  return {
    ...session,
    startsAt: session.startAt,
    endsAt: session.endAt,
    location: session.locationLabel || '',
    status: session.status === 'published' || session.status === 'planned' ? 'scheduled' : session.status,
    assignmentCount: assignments.length,
    attendanceSummary: buildAttendanceSummary(attendance, assignments),
  };
}

function canStudentCheckIn(session, portal) {
  const access = buildClassroomAccessMeta(portal.enrollment, portal.course);
  if (!access.canAccess || ['cancelled', 'completed'].includes(String(session.status || '').toLowerCase())) {
    return false;
  }
  return true;
}

async function getStudentScheduleBundle(reference, context) {
  const portal = await getStudentPortal(reference, { context });
  ensure(portal.student, 'Data siswa tidak ditemukan untuk sesi ini.', 404, 'STUDENT_PORTAL_NOT_FOUND');
  ensure(portal.enrollment && portal.course, 'Enrollment siswa tidak ditemukan.', 404, 'ENROLLMENT_NOT_FOUND');

  const access = buildClassroomAccessMeta(portal.enrollment, portal.course);
  ensure(access.canAccess, access.reason, 403, 'CLASSROOM_ACCESS_DENIED', access);

  const enrollmentId = portal.enrollment?.id;
  const assignments = context.repositories.scheduleAssignments.raw()
    .filter((item) => String(item.enrollmentId) === String(enrollmentId) && item.assignmentStatus !== 'removed');
  const assignedSessionIds = new Set(assignments.map((item) => String(item.sessionId)));
  const attendanceBySession = new Map(context.repositories.attendanceRecords.raw()
    .filter((item) => String(item.enrollmentId) === String(enrollmentId))
    .map((item) => [String(item.sessionId), item]));

  const schedules = context.repositories.scheduleSessions.raw()
    .filter((item) => assignedSessionIds.has(String(item.id)) && item.status !== 'cancelled')
    .map((session) => ({
      ...decorateSession(session, context),
      attendance: attendanceBySession.get(String(session.id)) || null,
      canCheckIn: canStudentCheckIn(session, portal),
    }))
    .sort(sortSessionsAsc);

  const upcoming = schedules.filter((s) => (parseDateTime(s.endAt)?.getTime() || 0) >= Date.now());
  const history = schedules.filter((s) => (parseDateTime(s.endAt)?.getTime() || 0) < Date.now());
  const attendanceList = [...attendanceBySession.values()];

  return {
    portal,
    access,
    schedules,
    sessions: schedules,
    upcoming,
    upcomingSessions: upcoming,
    history,
    attendanceHistory: history,
    nextSession: upcoming[0] || null,
    attendance: attendanceList,
    summary: buildAttendanceSummary(attendanceList, assignments),
  };
}

function upsertAttendanceRecord(scheduleId, payload, context, markedBy = 'admin') {
  const session = context.repositories.scheduleSessions.raw()
    .find((item) => String(item.id) === String(scheduleId)) || null;
  ensure(session, 'Jadwal tidak ditemukan.', 404, 'SCHEDULE_NOT_FOUND');
  ensure(session.status !== 'cancelled', 'Jadwal yang dibatalkan tidak bisa menerima absensi.', 400, 'SCHEDULE_CANCELLED');
  ensure(payload.enrollmentId, 'Enrollment wajib diisi.', 400, 'ENROLLMENT_REQUIRED');
  ensure(VALID_ATTENDANCE_STATUSES.has(payload.status), 'Status absensi tidak valid.', 400, 'ATTENDANCE_STATUS_INVALID');

  const assignment = getSessionAssignments(scheduleId, context)
    .find((item) => String(item.enrollmentId) === String(payload.enrollmentId)) || null;
  ensure(assignment, 'Siswa tidak terdaftar pada jadwal ini.', 404, 'SCHEDULE_ASSIGNMENT_NOT_FOUND');

  const now = context.now();
  const existing = context.repositories.attendanceRecords.raw().find((item) => (
    String(item.sessionId) === String(scheduleId) && String(item.enrollmentId) === String(payload.enrollmentId)
  )) || null;
  const nextRecord = {
    id: existing?.id || `att-${scheduleId}-${assignment.enrollmentId}`,
    sessionId: session.id,
    assignmentId: assignment.id,
    enrollmentId: assignment.enrollmentId,
    studentId: Number(assignment.studentId),
    courseId: Number(assignment.courseId),
    status: payload.status,
    checkInAt: payload.checkInAt || existing?.checkInAt || (payload.status === 'present' || payload.status === 'late' ? now : null),
    source: markedBy === 'student' ? 'student' : 'admin',
    recordedBy: payload.recordedBy || markedBy,
    notes: String(payload.notes || payload.note || '').trim(),
    markedAt: now,
    markedBy,
    note: String(payload.note || payload.notes || '').trim(),
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };

  if (existing) {
    context.repositories.attendanceRecords.update(existing.id, () => nextRecord);
  } else {
    context.repositories.attendanceRecords.insert(nextRecord, { prepend: false });
  }

  return nextRecord;
}

export function createStudentScheduleService(options = {}) {
  const context = createBackendContext(options);

  return {
    async getStudentSchedules(reference = {}) {
      const bundle = await getStudentScheduleBundle(reference, context);
      return { access: bundle.access, schedules: bundle.schedules, summary: bundle.summary };
    },

    async getStudentAttendance(reference = {}) {
      const bundle = await getStudentScheduleBundle(reference, context);
      return { access: bundle.access, attendance: bundle.attendance, summary: bundle.summary };
    },

    async checkInStudentSchedule(reference = {}, scheduleId, payload = {}) {
      const bundle = await getStudentScheduleBundle(reference, context);
      const session = bundle.schedules.find((item) => String(item.id) === String(scheduleId)) || null;
      ensure(session, 'Jadwal tidak ditemukan untuk akun ini.', 404, 'STUDENT_SCHEDULE_NOT_FOUND');
      ensure(!session.attendance, 'Absensi untuk jadwal ini sudah tercatat.', 409, 'ATTENDANCE_ALREADY_RECORDED');
      ensure(session.canCheckIn, 'Absensi belum tersedia atau akses kelas belum aktif.', 400, 'CHECK_IN_NOT_AVAILABLE');

      const now = context.now();
      const startsAt = parseDateTime(session.startAt)?.getTime() || 0;
      const status = Date.now() > startsAt + (LATE_ATTENDANCE_AFTER_MINUTES * 60000) ? 'late' : 'present';

      const attendance = upsertAttendanceRecord(scheduleId, {
        enrollmentId: bundle.portal.enrollment?.id,
        status: ['present', 'late'].includes(String(payload.status || '').toLowerCase())
          ? String(payload.status).toLowerCase()
          : status,
        checkInAt: payload.checkInAt || now,
        notes: payload.notes,
      }, context, 'student');

      return {
        attendance,
        schedules: (await getStudentScheduleBundle(reference, context)).schedules,
      };
    },
  };
}

export default createStudentScheduleService;
