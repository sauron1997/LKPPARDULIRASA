/**
 * Attendance Entity - Pure domain logic, no framework/DB dependencies.
 */

export const ATTENDANCE_STATUSES = ['present', 'late', 'absent', 'excused'];

export function createAttendanceRecord(data = {}) {
 return {
 id: data.id ?? null,
 sessionId: data.sessionId ?? null,
 assignmentId: data.assignmentId ?? null,
 enrollmentId: data.enrollmentId ?? null,
 studentId: data.studentId ?? null,
 courseId: data.courseId ?? null,
 status: data.status ?? 'pending',
 checkInAt: data.checkInAt ?? null,
 source: data.source ?? 'admin',
 recordedBy: data.recordedBy ?? null,
 notes: String(data.notes ?? ''),
 note: String(data.note ?? ''),
 markedAt: data.markedAt ?? null,
 markedBy: data.markedBy ?? null,
 createdAt: data.createdAt ?? new Date().toISOString(),
 updatedAt: data.updatedAt ?? new Date().toISOString(),
 };
}

export function isValidAttendanceStatus(status) {
 return ATTENDANCE_STATUSES.includes(status);
}

export function buildAttendanceSummary(records = [], assignments = []) {
 const counts = { present:0, late:0, excused:0, absent:0, pending:0 };
 const recordedEnrollmentIds = new Set();

 records.forEach((record) => {
 if (counts[record.status] != null) {
 counts[record.status] +=1;
 }
 recordedEnrollmentIds.add(String(record.enrollmentId));
 });

 assignments.forEach((assignment) => {
 if (!recordedEnrollmentIds.has(String(assignment.enrollmentId))) {
 counts.pending +=1;
 }
 });

 const total = assignments.length || records.length;
 const attended = counts.present + counts.late + counts.excused;

 return {
 ...counts,
 total,
 attended,
 rate: total ? Math.round((attended / total) *100) :0,
 };
}