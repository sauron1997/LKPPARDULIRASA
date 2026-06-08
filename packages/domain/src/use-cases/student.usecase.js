/**
 * Student Use Cases — CRUD, registration flow, and student portal logic.
 */

import { ensure } from './errors.js';
import { normalizeLoginIdentifier, getAccountIdentifiers, findCourseByReference, findEnrollmentByReference, buildSessionUser, cloneValue } from './helpers.js';

/**
 * @param {Object} deps
 * @param {Object} deps.studentRepo - IStudentRepository
 * @param {Object} deps.accountRepo - IAccountRepository (user_profiles / login_identifiers)
 * @param {Object} deps.enrollmentRepo - IEnrollmentRepository
 * @param {Object} deps.courseRepo - ICourseRepository
 */
export function createStudentUseCases(deps) {
  const { studentRepo, accountRepo, enrollmentRepo, courseRepo } = deps;
  const now = () => new Date().toISOString();

  async function listStudents(filters = {}) {
    let students = await studentRepo.list();

    if (filters.search) {
      const q = String(filters.search).trim().toLowerCase();
      students = students.filter((s) => {
        const haystack = `${s.name} ${s.nis} ${s.email} ${s.program || ''}`.toLowerCase();
        return haystack.includes(q);
      });
    }

    if (filters.status) {
      students = students.filter(
        (s) => String(s.status || '').toLowerCase() === String(filters.status).toLowerCase()
      );
    }

    if (filters.paymentStatus) {
      students = students.filter(
        (s) => String(s.paymentStatus || '').toLowerCase() === String(filters.paymentStatus).toLowerCase()
      );
    }

    return students;
  }

  async function getStudent(studentId) {
    const student = await studentRepo.getById(studentId);
    ensure(student, 'Data siswa tidak ditemukan.', 404, 'STUDENT_NOT_FOUND');

    const [account, enrollment] = await Promise.all([
      accountRepo.getByStudentId(studentId),
      enrollmentRepo.getByStudentId(studentId),
    ]);
    const course = enrollment ? await courseRepo.getById(enrollment.courseId) : null;

    return {
      ...student,
      account: account || null,
      enrollment: enrollment || null,
      course: course || null,
    };
  }

  async function updateStudent(studentId, payload = {}) {
    const student = await studentRepo.getById(studentId);
    ensure(student, 'Data siswa tidak ditemukan.', 404, 'STUDENT_NOT_FOUND');

    const ts = now();
    const [allCourses, enrollment] = await Promise.all([
      courseRepo.list(),
      enrollmentRepo.getByStudentId(studentId),
    ]);

    const currentCourse = findCourseByReference(allCourses, {
      courseId: payload.courseId ?? student.courseId ?? null,
      program: payload.program ?? student.program ?? null,
    });

    const relationFields = {
      courseId: currentCourse?.id ?? student.courseId ?? enrollment?.courseId ?? null,
      enrollmentId: enrollment?.id ?? student.enrollmentId ?? null,
      program: currentCourse?.title || enrollment?.program || student.program || '',
    };

    if (payload.email) {
      const normalizedEmail = normalizeLoginIdentifier(payload.email);
      const allAccounts = await accountRepo.list();
      const duplicate = allAccounts.find((a) => (
        String(a.id) !== String(student.accountId)
        && normalizeLoginIdentifier(a.email) === normalizedEmail
      ));
      ensure(!duplicate, 'Email sudah dipakai akun lain.', 409, 'EMAIL_ALREADY_USED');
    }

    const updatedStudent = await studentRepo.update(studentId, (prev) => ({
      ...prev,
      name: payload.name ?? prev.name,
      email: payload.email ? normalizeLoginIdentifier(payload.email) : prev.email,
      phone: payload.phone ?? prev.phone,
      address: payload.address ?? prev.address,
      notes: payload.notes ?? prev.notes,
      status: payload.status ?? prev.status,
      paymentStatus: payload.paymentStatus ?? prev.paymentStatus,
      paymentDate: payload.paymentDate ?? prev.paymentDate,
      ...relationFields,
      updatedAt: ts,
    }));

    const account = await accountRepo.getByStudentId(studentId);
    if (account) {
      await accountRepo.update(account.id, (prev) => ({
        ...prev,
        name: payload.name ?? prev.name,
        displayName: payload.name ?? prev.displayName,
        email: payload.email ? normalizeLoginIdentifier(payload.email) : prev.email,
        courseId: relationFields.courseId,
        enrollmentId: relationFields.enrollmentId,
        updatedAt: ts,
      }));
    }

    if (enrollment) {
      await enrollmentRepo.update(enrollment.id, (prev) => ({
        ...prev,
        courseId: relationFields.courseId,
        program: relationFields.program,
        status: payload.enrollmentStatus ?? payload.status ?? prev.status,
        paymentStatus: payload.paymentStatus ?? prev.paymentStatus,
        paymentDate: payload.paymentDate ?? prev.paymentDate,
        updatedAt: ts,
      }));
    }

    return updatedStudent;
  }

  async function updatePaymentStatus(studentId, payload = {}) {
    ensure(payload.paymentStatus, 'Status pembayaran wajib diisi.', 400, 'PAYMENT_STATUS_REQUIRED');
    return await updateStudent(studentId, {
      paymentStatus: payload.paymentStatus,
      paymentDate: payload.paymentStatus === 'verified'
        ? payload.paymentDate || new Date().toISOString().slice(0, 10)
        : payload.paymentDate ?? null,
      notes: payload.notes,
    });
  }

  async function findAccountByIdentifier(identifier) {
    const normalizedIdentifier = normalizeLoginIdentifier(identifier);
    const [students, accounts] = await Promise.all([
      studentRepo.list(),
      accountRepo.list(),
    ]);

    return accounts.find((account) => {
      if (String(account.status || 'active').toLowerCase() !== 'active') {
        return false;
      }
      const student = students.find((s) => String(s.id) === String(account.studentId)) || null;
      const identifiers = getAccountIdentifiers(account, student);
      return identifiers.includes(normalizedIdentifier);
    }) || null;
  }

  async function buildSessionUserFromAccount(account) {
    if (!account) return null;

    const [allStudents, allEnrollments, allCourses] = await Promise.all([
      studentRepo.list(),
      enrollmentRepo.list(),
      courseRepo.list(),
    ]);

    const student = allStudents.find((s) => (
      String(s.id) === String(account.studentId)
      || String(s.accountId) === String(account.id)
    )) || null;

    const enrollment = findEnrollmentByReference(allEnrollments, {
      enrollmentId: account.enrollmentId || student?.enrollmentId,
      studentId: account.studentId || student?.id,
      courseId: account.courseId || student?.courseId,
      program: student?.program,
    }, allCourses);

    const course = findCourseByReference(allCourses, {
      courseId: enrollment?.courseId || account.courseId || student?.courseId,
      program: student?.program,
    });

    return buildSessionUser({ account, student, enrollment, course });
  }

  return {
    listStudents,
    getStudent,
    updateStudent,
    updatePaymentStatus,
    findAccountByIdentifier,
    buildSessionUser: buildSessionUserFromAccount,
  };
}