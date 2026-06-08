/**
 * Shared utility functions — extracted from admin.service.js helpers. */

export function cloneValue(value) {
 return JSON.parse(JSON.stringify(value));
}

export function compareByUpdatedDesc(a, b) {
 return new Date(b.updatedAt||0).getTime() - new Date(a.updatedAt||0).getTime();
}

export function slugify(text) {
 return String(text).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
}

export function formatCurrency(value) {
 return new Intl.NumberFormat('id-ID',{ style:'currency', currency:'IDR', minimumFractionDigits:0 }).format(value||0);
}

export function getLatestNumber(items, key = 'id') {
 const nums = (items||[]).map((i) => parseInt(String(i[key]||'').split('-').pop(),10)).filter((n) => !Number.isNaN(n));
 return nums.length ? Math.max(...nums) :0;
}

export function parseNumericSuffix(value) {
 const n = parseInt(String(value||'').split('-').pop(),10);
 return Number.isNaN(n) ? null : n;
}

export function toIsoTimestamp(value) {
 if (!value) return new Date().toISOString();
 const d = new Date(value);
 return Number.isNaN(d.getTime()) ? value : d.toISOString();
}

export function getDaysSince(dateStr) {
 if (!dateStr) return null;
 const d = new Date(dateStr);
 if (Number.isNaN(d.getTime())) return null;
 return Math.floor((Date.now() - d.getTime()) /86400000);
}

export function formatQueueAge(dateStr) {
 const days = getDaysSince(dateStr);
 if (days === null) return '-';
 if (days ===0) return 'Hari ini';
 if (days ===1) return '1 hari lalu';
 return `${days} hari lalu`;
}

export function normalizeLoginIdentifier(value) {
 return String(value||'').trim().toLowerCase();
}

export function getAccountIdentifiers(account, student) {
 const ids = [];
 if (account.email) ids.push(normalizeLoginIdentifier(account.email));
 if (account.username) ids.push(normalizeLoginIdentifier(account.username));
 if (student?.nis) ids.push(normalizeLoginIdentifier(student.nis));
 if (student?.email) ids.push(normalizeLoginIdentifier(student.email));
 if (student?.phone) ids.push(normalizeLoginIdentifier(student.phone));
 return [...new Set(ids)].filter(Boolean);
}

export function buildSessionUser({ account, student, enrollment, course }) {
 if (!account) return null;
 return {
 id: account.id,
 name: account.name || student?.name || account.email || account.username,
 email: account.email || student?.email || '',
 displayName: account.displayName || student?.name || account.name || '',
 studentId: student?.id || account.studentId || null,
 enrollmentId: enrollment?.id || account.enrollmentId || null,
 courseId: course?.id || enrollment?.courseId || account.courseId || null,
 role: account.role || 'student',
 status: account.status || 'active',
 };
}

export function findCourseByReference(courses, ref = {}) {
 if (ref.courseId) return courses.find((c) => String(c.id) === String(ref.courseId)) || null;
 if (ref.program) return courses.find((c) => c.title?.toLowerCase() === String(ref.program).toLowerCase()) || null;
 return null;
}

export function findEnrollmentByReference(enrollments, ref = {}, courses = []) {
 if (ref.enrollmentId) return enrollments.find((e) => String(e.id) === String(ref.enrollmentId)) || null;
 if (ref.studentId && ref.courseId) return enrollments.find((e) => String(e.studentId) === String(ref.studentId) && String(e.courseId) === String(ref.courseId)) || null;
 if (ref.studentId) return enrollments.find((e) => String(e.studentId) === String(ref.studentId)) || null;
 if (ref.program) {
   const course = courses.find((c) => c.title?.toLowerCase() === String(ref.program).toLowerCase());
   if (course) return enrollments.find((e) => String(e.courseId) === String(course.id)) || null;
 }
 return null;
}