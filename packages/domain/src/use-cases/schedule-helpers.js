/**
 * Schedule helpers — pure functions extracted from admin.service.js * No repository or infrastructure dependencies.
 */

export const VALID_SESSION_STATUSES = ['scheduled','in_progress','completed','cancelled'];
export const LATE_ATTENDANCE_AFTER_MINUTES =15;

export function sortSessionsAsc(left, right) {
 const la = new Date(left.startAt||0).getTime();
 const ra = new Date(right.startAt||0).getTime();
 return la - ra;
}

export function parseDateTime(value) {
 if (!value) return null;
 const d = new Date(value);
 return Number.isNaN(d.getTime()) ? null : d;
}

export function normalizeSessionPayload(payload, courseId, timestamp) {
 const startsAt = payload.startAt || payload.startsAt || payload.start || timestamp;
 const endAt = payload.endAt || payload.endsAt || payload.end || timestamp;
 return {
 courseId: Number(courseId),
 title: String(payload.title || payload.topic || ''),
 topic: String(payload.topic || payload.title || ''),
 description: String(payload.description || payload.desc || payload.notes || ''),
 platform: String(payload.platform || payload.meetingPlatform || 'offline'),
 meetingLink: String(payload.meetingLink || payload.link || ''),
 meetingId: String(payload.meetingId || ''),
 passcode: String(payload.passcode || ''),
 startAt: startsAt,
 endAt: endAt,
 status: VALID_SESSION_STATUSES.includes(String(payload.status || '').toLowerCase())
 ? String(payload.status).toLowerCase() : 'scheduled',
 updatedAt: timestamp,
 };
}

/**
 * @param {Object} session * @param {Object} assignmentRepo */
export function decorateSession(session, assignmentRepo) {
 const assignments = assignmentRepo ? assignmentRepo.listBySessionId(session.id) : [];
 const assignedCount = assignments.filter((a) => a.assignmentStatus !== 'cancelled').length;
 const attendedCount = assignments.filter((a) => a.assignmentStatus === 'attended').length;
 return { ...session, assignedCount, attendedCount, assignmentCount: assignments.length };
}

export function getSessionAssignments(sessionId, assignmentRepo) {
 return assignmentRepo ? assignmentRepo.listBySessionId(sessionId) : [];
}

export function getSessionAttendance(sessionId, attendanceRepo) {
 return attendanceRepo ? attendanceRepo.listBySessionId(sessionId) : [];
}

export function isEnrollmentAssignable(enrollment, session, assignmentRepo) {
 if (!enrollment || !session) return false;
 if (String(enrollment.courseId) !== String(session.courseId)) return false;
 const assignments = assignmentRepo ? assignmentRepo.listBySessionId(session.id) : [];
 return !assignments.some((a) => String(a.enrollmentId) === String(enrollment.id));
}

/**
 * Auto-assign active enrollments to a session. */
export function createAssignmentsForSession(session, assignmentRepo, enrollmentRepo) {
 const existing = new Set(
 (assignmentRepo.listBySessionId(session.id) || []).map((a) => String(a.enrollmentId))
 );
 const enrollments = enrollmentRepo.listByCourseId(session.courseId);
 const ts = new Date().toISOString();

 enrollments.forEach((enrollment) => {
 if (String(enrollment.status || 'active') !== 'active') return;
 if (existing.has(String(enrollment.id))) return;
 assignmentRepo.insert({
 id: `assign-${session.id}-${enrollment.id}`,
 sessionId: session.id,
 enrollmentId: enrollment.id,
 studentId: Number(enrollment.studentId),
 courseId: Number(enrollment.courseId),
 status: 'scheduled',
 assignmentStatus: 'assigned',
 createdAt: ts,
 updatedAt: ts,
 });
 });
}