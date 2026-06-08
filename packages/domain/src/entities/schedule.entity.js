/**
 * Schedule Entity - Pure domain logic, no framework/DB dependencies.
 */

export const SCHEDULE_STATUSES = ['scheduled', 'planned', 'published', 'completed', 'cancelled'];
export const ASSIGNMENT_STATUSES = ['scheduled', 'assigned', 'cancelled', 'removed'];

export function createScheduleSession(data = {}) {
 return {
 id: data.id ?? null,
 courseId: data.courseId ?? null,
 moduleId: data.moduleId ?? null,
 title: String(data.title ?? ''),
 startAt: data.startAt ?? null,
 endAt: data.endAt ?? null,
 status: data.status ?? 'scheduled',
 locationLabel: String(data.locationLabel ?? ''),
 meetingLink: String(data.meetingLink ?? ''),
 instructorName: String(data.instructorName ?? ''),
 notes: String(data.notes ?? ''),
 createdAt: data.createdAt ?? new Date().toISOString(),
 updatedAt: data.updatedAt ?? new Date().toISOString(),
 };
}

export function createScheduleAssignment(data = {}) {
 return {
 id: data.id ?? null,
 sessionId: data.sessionId ?? null,
 enrollmentId: data.enrollmentId ?? null,
 studentId: data.studentId ?? null,
 courseId: data.courseId ?? null,
 status: data.status ?? 'scheduled',
 assignmentStatus: data.assignmentStatus ?? 'assigned',
 createdAt: data.createdAt ?? new Date().toISOString(),
 updatedAt: data.updatedAt ?? new Date().toISOString(),
 };
}

export function isValidSessionStatus(status) {
 return SCHEDULE_STATUSES.includes(status);
}

export function parseDateTime(value) {
 const parsed = new Date(value ||0);
 return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function sortSessionsAsc(left, right) {
 return (parseDateTime(left?.startAt)?.getTime() ||0) - (parseDateTime(right?.startAt)?.getTime() ||0);
}
