import { createRouteFamilyClient } from './routeClient';

const adminClient = createRouteFamilyClient('/api/v1/admin');

const ATTENDANCE_STATUSES = new Set(['present', 'late', 'excused', 'absent', 'unmarked', 'pending']);

function normalizeAttendanceSummary(summary = {}) {
  return {
    total: Number(summary.total ?? summary.rosterCount ?? 0),
    present: Number(summary.present ?? 0),
    late: Number(summary.late ?? 0),
    excused: Number(summary.excused ?? 0),
    absent: Number(summary.absent ?? 0),
    unmarked: Number(summary.unmarked ?? summary.pending ?? 0),
  };
}

function normalizeAttendanceStatus(status) {
  const normalizedStatus = String(status || 'unmarked').toLowerCase();

  if (normalizedStatus === 'pending') {
    return 'unmarked';
  }

  return ATTENDANCE_STATUSES.has(normalizedStatus) ? normalizedStatus : 'unmarked';
}

function normalizeScheduleSession(session = {}) {
  return {
    ...session,
    id: session.id,
    courseId: session.courseId,
    title: session.title || session.name || 'Sesi kelas',
    startsAt: session.startsAt || session.startAt || session.scheduledAt || null,
    endsAt: session.endsAt || session.endAt || null,
    location: session.location || session.locationLabel || session.room || '',
    instructorName: session.instructorName || session.instructor || 'Admin LKP',
    status: session.status === 'published' || session.status === 'planned' ? 'scheduled' : session.status || 'scheduled',
    notes: session.notes || session.description || '',
    attendanceSummary: normalizeAttendanceSummary(session.attendanceSummary || session.summary || {}),
  };
}

function normalizeSchedulePayload(payload = {}) {
  const sessions = Array.isArray(payload) ? payload : payload.sessions || payload.schedules || [];

  return {
    ...payload,
    sessions: sessions
      .map(normalizeScheduleSession)
      .sort((left, right) => new Date(left.startsAt || 0) - new Date(right.startsAt || 0)),
  };
}

function normalizeAttendanceEntry(entry = {}) {
  const student = entry.student || {};
  const attendance = entry.attendance || {};

  return {
    ...entry,
    id: attendance.id || entry.id || entry.attendanceId || entry.studentId || student.id,
    sessionId: entry.sessionId || attendance.sessionId || null,
    studentId: entry.studentId || attendance.studentId || student.id || null,
    enrollmentId: entry.enrollmentId || attendance.enrollmentId || entry.enrollment?.id || null,
    student: {
      id: student.id || entry.studentId || attendance.studentId || null,
      name: student.name || entry.studentName || 'Siswa',
      nis: student.nis || entry.nis || '',
      email: student.email || entry.email || '',
    },
    status: normalizeAttendanceStatus(attendance.status || entry.status),
    note: attendance.note || attendance.notes || entry.note || entry.notes || '',
    updatedAt: attendance.updatedAt || entry.updatedAt || null,
  };
}

function normalizeAttendancePayload(payload = {}) {
  const roster = Array.isArray(payload) ? payload : payload.roster || payload.rows || payload.attendance || [];

  return {
    ...payload,
    roster: roster.map(normalizeAttendanceEntry),
    summary: normalizeAttendanceSummary(payload.summary || payload.attendanceSummary || {}),
  };
}

export async function fetchAdminCourseSchedules(courseId) {
  return normalizeSchedulePayload(await adminClient.request(['courses', courseId, 'schedules']));
}

export const fetchAdminCourseSchedule = fetchAdminCourseSchedules;

export async function createAdminCourseSchedule(courseId, payload) {
  return normalizeScheduleSession(await adminClient.request(['courses', courseId, 'schedules'], {
    method: 'POST',
    body: payload,
  }));
}

export const createAdminScheduleSession = createAdminCourseSchedule;

export async function updateAdminCourseSchedule(courseId, scheduleId, payload) {
  return normalizeScheduleSession(await adminClient.request(['courses', courseId, 'schedules', scheduleId], {
    method: 'PATCH',
    body: payload,
  }));
}

export const updateAdminScheduleSession = updateAdminCourseSchedule;

export function deleteAdminCourseSchedule(courseId, scheduleId) {
  return adminClient.request(['courses', courseId, 'schedules', scheduleId], {
    method: 'DELETE',
  });
}

export const deleteAdminScheduleSession = deleteAdminCourseSchedule;

export async function fetchAdminScheduleAttendance(_courseId, scheduleId) {
  const resolvedScheduleId = scheduleId || _courseId;
  return normalizeAttendancePayload(await adminClient.request(['schedules', resolvedScheduleId, 'attendance']));
}

export async function updateAdminScheduleAttendance(_courseId, scheduleId, _attendanceId, payload) {
  const resolvedScheduleId = scheduleId || _courseId;
  const records = Array.isArray(payload) ? payload : [payload];
  return normalizeAttendancePayload(await adminClient.request(['schedules', resolvedScheduleId, 'attendance'], {
    method: 'PUT',
    body: { records },
  }));
}
