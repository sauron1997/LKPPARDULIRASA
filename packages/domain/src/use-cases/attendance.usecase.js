/**
 * Attendance Use Cases â€” check-in, record/update attendance, query. */

import { ensure } from './errors.js';
import { parseDateTime } from './schedule-helpers.js';

const LATE_ATTENDANCE_AFTER_MINUTES =15;

/**
 * @param {Object} deps * @param {Object} deps.attendanceRepo - IAttendanceRecordRepository * @param {Object} deps.scheduleSessionRepo - IScheduleSessionRepository * @param {Object} deps.scheduleAssignmentRepo - IScheduleAssignmentRepository * @param {Object} deps.enrollmentRepo - IEnrollmentRepository */
export function createAttendanceUseCases(deps) {
 const { attendanceRepo, scheduleSessionRepo, scheduleAssignmentRepo, enrollmentRepo } = deps;

 const now = () => new Date().toISOString();

 async function listScheduleAttendance(scheduleId) {
 const session = scheduleSessionRepo.getById(scheduleId);
 ensure(session, 'Jadwal tidak ditemukan.',404, 'SCHEDULE_NOT_FOUND');

 const assignments = scheduleAssignmentRepo.listBySessionId(scheduleId);
 const records = attendanceRepo.listBySessionId(scheduleId);
 const recordMap = new Map(records.map((r) => [String(r.enrollmentId), r]));

 const attendance = assignments.map((assignment) => ({
 assignment,
 enrollment: enrollmentRepo.getById(assignment.enrollmentId) || null,
 status: recordMap.get(String(assignment.enrollmentId))?.status || null,
 checkInAt: recordMap.get(String(assignment.enrollmentId))?.checkInAt || null,
 record: recordMap.get(String(assignment.enrollmentId)) || null,
 }));

 return { session, attendance, recordCount: records.length };
 }

 async function recordSessionAttendance(scheduleId, payload = {}) {
 const session = scheduleSessionRepo.getById(scheduleId);
 ensure(session, 'Jadwal tidak ditemukan.',404, 'SCHEDULE_NOT_FOUND');

 const existing = attendanceRepo.listBySessionId(scheduleId) .find(
 (r) => String(r.enrollmentId) === String(payload.enrollmentId)
 );
 ensure(!existing, 'Attendance untuk enrollment dan sesi ini sudah ada.',409, 'ATTENDANCE_DUPLICATE');

 return _upsertRecord(scheduleId, {
 ...payload,
 status: payload.status || 'present',
 }, payload.source || 'admin');
 }

 async function updateSessionAttendance(scheduleId, attendanceId, payload = {}) {
 const record = attendanceRepo.getById(attendanceId);
 ensure(record && String(record.sessionId) === String(scheduleId), 'Attendance tidak ditemukan.',404, 'ATTENDANCE_NOT_FOUND');

 return _upsertRecord(scheduleId, {
 ...record,
 ...payload,
 enrollmentId: record.enrollmentId,
 status: payload.status || record.status,
 }, payload.source || record.source || 'admin');
 }

 async function updateScheduleAttendance(scheduleId, payload = {}) {
 const records = Array.isArray(payload.records) ? payload.records : [payload];
 records.forEach((r) => _upsertRecord(scheduleId, r, 'admin'));
 return await listScheduleAttendance(scheduleId);
 }

 async function checkInStudentSchedule(reference = {}, scheduleId, payload = {}) {
 const session = scheduleSessionRepo.getById(scheduleId);
 ensure(session, 'Jadwal tidak ditemukan.',404, 'SCHEDULE_NOT_FOUND');

 const assignments = scheduleAssignmentRepo.listBySessionId(scheduleId);
 let enrollmentId = null;

 if (reference.enrollmentId) {
 enrollmentId = reference.enrollmentId;
 } else if (reference.studentId) {
 const assignment = assignments.find(
 (a) => String(a.studentId) === String(reference.studentId)
 );
 ensure(assignment, 'Enrollment tidak ditemukan untuk akun ini.',404, 'ENROLLMENT_NOT_FOUND');
 enrollmentId = assignment.enrollmentId;
 }

 const existing = attendanceRepo.listBySessionId(scheduleId) .find(
 (r) => String(r.enrollmentId) === String(enrollmentId)
 );
 ensure(!existing, 'Absensi untuk jadwal ini sudah tercatat.',409, 'ATTENDANCE_ALREADY_RECORDED');

 const nowTime = Date.now();
 const startsAtMs = parseDateTime(session.startAt)?.getTime() ||0;
 const status = nowTime > startsAtMs + (LATE_ATTENDANCE_AFTER_MINUTES *60000) ? 'late' : 'present';

 return _upsertRecord(scheduleId, {
 enrollmentId,
 status: ['present','late'].includes(String(payload.status || '').toLowerCase())
 ? String(payload.status).toLowerCase() : status,
 checkInAt: payload.checkInAt || now(),
 }, payload.source || 'student');
 }

 function _upsertRecord(scheduleId, payload, source = 'admin') {
 const ts = now();
 const existing = payload.id ? attendanceRepo.getById(payload.id) : null;

 const record = {
 id: existing?.id || `att-${scheduleId}-${payload.enrollmentId}-${Date.now()}`,
 sessionId: Number(scheduleId),
 enrollmentId: Number(payload.enrollmentId),
 studentId: Number(payload.studentId ||0),
 status: payload.status || 'present',
 checkInAt: payload.checkInAt || ts,
 notes: payload.notes || '',
 source: source,
 createdAt: existing?.createdAt || ts,
 updatedAt: ts,
 };

 if (existing) { attendanceRepo.update(existing.id, record); } else { attendanceRepo.insert(record); }
 return record;
 }

 async function getStudentAttendance(reference = {}) {
 const enrollmentId = reference.enrollmentId;
 ensure(enrollmentId, 'ID enrollment diperlukan.',400, 'ENROLLMENT_ID_REQUIRED');

 const allAttendance = attendanceRepo.listByEnrollmentId(enrollmentId);
 return {
 enrollmentId,
 attendance: allAttendance,
 totalSession: allAttendance.length,
 presentCount: allAttendance.filter((r) => r.status === 'present').length,
 lateCount: allAttendance.filter((r) => r.status === 'late').length,
 absentCount: allAttendance.filter((r) => r.status === 'absent').length,
 };
 }

 return {
 listScheduleAttendance,
 recordSessionAttendance,
 updateSessionAttendance,
 updateScheduleAttendance,
 checkInStudentSchedule,
 getStudentAttendance,
 };
}
