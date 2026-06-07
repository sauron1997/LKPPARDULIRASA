/**
 * Payment Entity - Pure domain logic, no framework/DB dependencies.
 */

export function createPayment(data = {}) {
 return {
 id: data.id ?? null,
 studentId: data.studentId ?? null,
 enrollmentId: data.enrollmentId ?? null,
 courseId: data.courseId ?? null,
 amount: Number(data.amount ??0),
 method: String(data.method ?? ''),
 status: data.status ?? 'pending',
 reference: String(data.reference ?? ''),
 note: String(data.note ?? ''),
 createdAt: data.createdAt ?? new Date().toISOString(),
 updatedAt: data.updatedAt ?? new Date().toISOString(),
 };
}
