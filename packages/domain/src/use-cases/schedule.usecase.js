/**
 * Schedule Use Cases - All schedule CRUD, assignment, and query logic.
 * Pure domain logic â€” depends on repository interfaces only.
 */

import {
 VALID_SESSION_STATUSES,
 sortSessionsAsc,
 parseDateTime,
 isEnrollmentAssignable,
 normalizeSessionPayload,
 decorateSession,
 getSessionAssignments,
 getSessionAttendance,
 createAssignmentsForSession,
} from './schedule-helpers.js';

import { ensure } from './errors.js';

/**
 * @param {Object} deps * @param {Object} deps.scheduleSessionRepo - IScheduleSessionRepository * @param {Object} deps.scheduleAssignmentRepo - IScheduleAssignmentRepository * @param {Object} deps.enrollmentRepo - IEnrollmentRepository * @param {Object} deps.courseRepo - ICourseRepository */
export function createScheduleUseCases(deps) {
 const { scheduleSessionRepo, scheduleAssignmentRepo, enrollmentRepo, courseRepo } = deps;
 const now = () => new Date().toISOString();

 async function listCourseSchedules(courseId) {
 const course = courseRepo.getById(courseId);
 ensure(course, 'Program kursus tidak ditemukan.',404, 'COURSE_NOT_FOUND');

 const sessions = scheduleSessionRepo .listByCourseId(courseId)
 .map((session) => decorateSession(session, scheduleAssignmentRepo))
 .sort(sortSessionsAsc);

 return { sessions };
 }

 async function createCourseSchedule(courseId, payload = {}) {
 const ts = now();
 const course = courseRepo.getById(courseId);
 ensure(course, 'Program kursus tidak ditemukan.',404, 'COURSE_NOT_FOUND');

 const record = normalizeSessionPayload(payload, courseId, ts);
 record.id = payload.id || `session-${courseId}-${Date.now()}`;
 record.createdAt = ts;

 scheduleSessionRepo.insert(record);

 const explicitEnrollmentIds =
 Array.isArray(payload.enrollmentIds)
 ? payload.enrollmentIds : payload.enrollmentId ? [payload.enrollmentId]
 : null;

 if (explicitEnrollmentIds) {
 const existingKeys = new Set(
 scheduleAssignmentRepo.listAll().map((a) => `${a.sessionId}:${a.enrollmentId}`)
 );
 explicitEnrollmentIds.forEach((enrollmentId) => {
 const enrollment = enrollmentRepo.getById(enrollmentId);
 ensure(enrollment, 'Enrollment tidak ditemukan.',404, 'ENROLLMENT_NOT_FOUND');
 ensure(
 String(enrollment.courseId) === String(course.id),
 'Enrollment tidak sesuai dengan jadwal kursus.',
400,
 'ENROLLMENT_COURSE_MISMATCH'
 );
 const key = `${record.id}:${enrollment.id}`;
 if (existingKeys.has(key)) return;
 scheduleAssignmentRepo.insert({
 id: `assign-${record.id}-${enrollment.id}`,
 sessionId: record.id,
 enrollmentId: enrollment.id,
 studentId: Number(enrollment.studentId),
 courseId: Number(enrollment.courseId),
 status: 'scheduled',
 assignmentStatus: 'assigned',
 createdAt: ts,
 updatedAt: ts,
 });
 });
 } else {
 createAssignmentsForSession(record, scheduleAssignmentRepo, enrollmentRepo);
 }

 return decorateSession(record, scheduleAssignmentRepo);
 }

 async function updateCourseSchedule(courseId, scheduleId, payload = {}) {
 const existing = scheduleSessionRepo.getById(scheduleId);
 ensure(existing && String(existing.courseId) === String(courseId), 'Jadwal tidak ditemukan.',404, 'SCHEDULE_NOT_FOUND');

 const ts = now();
 const nextRecord = {
 ...existing,
 ...normalizeSessionPayload({ ...existing, ...payload }, courseId, ts),
 id: existing.id,
 createdAt: existing.createdAt,
 };

 scheduleSessionRepo.update(existing.id, nextRecord);
 createAssignmentsForSession(nextRecord, scheduleAssignmentRepo, enrollmentRepo);
 return decorateSession(nextRecord, scheduleAssignmentRepo);
 }

 async function removeCourseSchedule(courseId, scheduleId) {
 const existing = scheduleSessionRepo.getById(scheduleId);
 ensure(existing && String(existing.courseId) === String(courseId), 'Jadwal tidak ditemukan.',404, 'SCHEDULE_NOT_FOUND');

 scheduleSessionRepo.remove(existing.id);
 scheduleAssignmentRepo.removeBySessionId(existing.id);
 return { id: existing.id };
 }

 async function assignEnrollmentsToSchedule(scheduleId, payload = {}) {
 const session = scheduleSessionRepo.getById(scheduleId);
 ensure(session, 'Jadwal tidak ditemukan.',404, 'SCHEDULE_NOT_FOUND');

 const enrollmentIds = Array.isArray(payload.enrollmentIds)
 ? payload.enrollmentIds : payload.enrollmentId ? [payload.enrollmentId]
 : [];
 ensure(enrollmentIds.length, 'Minimal satu enrollment wajib dipilih.',400, 'ENROLLMENT_REQUIRED');

 const existingKeys = new Set(
 scheduleAssignmentRepo.listAll().map((a) => `${a.sessionId}:${a.enrollmentId}`)
 );
 const ts = now();

 enrollmentIds.forEach((enrollmentId) => {
 const enrollment = enrollmentRepo.getById(enrollmentId);
 ensure(enrollment, 'Enrollment tidak ditemukan.',404, 'ENROLLMENT_NOT_FOUND');
 ensure(
 String(enrollment.courseId) === String(session.courseId),
 'Enrollment tidak sesuai dengan jadwal kursus.',
400,
 'ENROLLMENT_COURSE_MISMATCH'
 );
 const key = `${session.id}:${enrollment.id}`;
 if (existingKeys.has(key)) return;
 scheduleAssignmentRepo.insert({
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

 return { sessionId: session.id };
 }

 async function listSchedules(filters = {}) {
 let sessions = filters.courseId ? scheduleSessionRepo.listByCourseId(filters.courseId)
 : scheduleSessionRepo.listAll();

 sessions = sessions.map((s) => decorateSession(s, scheduleAssignmentRepo));

 if (filters.enrollmentId) {
 const sessionIds = new Set(
 scheduleAssignmentRepo .listAll()
 .filter((a) => String(a.enrollmentId) === String(filters.enrollmentId))
 .map((a) => String(a.sessionId))
 );
 sessions = sessions.filter((s) => sessionIds.has(String(s.id)));
 }

 if (filters.status) {
 sessions = sessions.filter(
 (s) => String(s.status || '').toLowerCase() === String(filters.status).toLowerCase()
 );
 }

 if (filters.from) {
 const from = parseDateTime(filters.from);
 ensure(from, 'Tanggal awal tidak valid.',400, 'FROM_INVALID');
 sessions = sessions.filter(
 (s) => (parseDateTime(s.startAt)?.getTime() ||0) >= from.getTime()
 );
 }

 if (filters.to) {
 const to = parseDateTime(filters.to);
 ensure(to, 'Tanggal akhir tidak valid.',400, 'TO_INVALID');
 sessions = sessions.filter(
 (s) => (parseDateTime(s.startAt)?.getTime() ||0) <= to.getTime()
 );
 }

 return { sessions: sessions.sort(sortSessionsAsc) };
 }

 return {
 listCourseSchedules,
 createCourseSchedule,
 updateCourseSchedule,
 removeCourseSchedule,
 assignEnrollmentsToSchedule,
 listSchedules,
 };
}
