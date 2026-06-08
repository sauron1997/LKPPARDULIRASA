/**
 * Student Entity * Pure domain logic — no framework/DB dependencies.
 */

/**
 * Creates a new Student entity with defaults applied.
 */
export function createStudent(data = {}) {
 return {
 id: data.id ?? null,
 authUserId: data.authUserId ?? null,
 accountId: data.accountId ?? null,
 nis: String(data.nis ?? ''),
 name: String(data.name ?? ''),
 email: String(data.email ?? ''),
 phone: String(data.phone ?? ''),
 address: String(data.address ?? ''),
 status: data.status ?? 'Aktif',
 parentName: String(data.parentName ?? ''),
 photoMediaId: data.photoMediaId ?? null,
 ijazahMediaId: data.ijazahMediaId ?? null,
 identityMediaId: data.identityMediaId ?? null,
 registrationDate: data.registrationDate ?? null,
 notes: String(data.notes ?? ''),
 createdAt: data.createdAt ?? new Date().toISOString(),
 updatedAt: data.updatedAt ?? new Date().toISOString(),
 };
}

/**
 * Returns true if the student status is active.
 */
export function isActiveStudent(student) {
 return String(student?.status ?? '').toLowerCase() === 'aktif';
}

/**
 * Creates a sanitized student record (no sensitive fields).
 */
export function sanitizeStudent(student) {
 if (!student) return null;
 const { password, ...safe } = student;
 return safe;
}