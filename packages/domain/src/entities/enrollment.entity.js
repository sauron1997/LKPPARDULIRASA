/**
 * Enrollment Entity - Pure domain logic, no framework/DB dependencies.
 */

export const ENROLLMENT_STATUSES = ['active', 'completed', 'cancelled'];
export const ENROLLMENT_PAYMENT_STATUSES = ['pending', 'verified', 'rejected'];

export function createEnrollment(data = {}) {
 return {
 id: data.id ?? null,
 studentId: data.studentId ?? null,
 courseId: data.courseId ?? null,
 status: data.status ?? 'active',
 paymentStatus: data.paymentStatus ?? 'pending',
 progressPercent: Number(data.progressPercent ??0),
 programSnapshot: String(data.programSnapshot ?? ''),
 startDate: data.startDate ?? null,
 endDate: data.endDate ?? null,
 paymentDueDate: data.paymentDueDate ?? null,
 paymentAmount: Number(data.paymentAmount ??0),
 paymentMethod: String(data.paymentMethod ?? ''),
 paymentDate: data.paymentDate ?? null,
 paymentProofMediaId: data.paymentProofMediaId ?? null,
 notes: String(data.notes ?? ''),
 createdAt: data.createdAt ?? new Date().toISOString(),
 updatedAt: data.updatedAt ?? new Date().toISOString(),
 };
}

export function isActiveEnrollment(enrollment) {
 return String(enrollment?.status ?? '').toLowerCase() === 'active';
}

export function isPaymentVerified(enrollment) {
 return String(enrollment?.paymentStatus ?? '').toLowerCase() === 'verified';
}

export function isEnrollmentAssignable(enrollment) {
 return isActiveEnrollment(enrollment) && isPaymentVerified(enrollment);
}
