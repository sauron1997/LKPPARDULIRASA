/**
 * Certificate Use Cases — CRUD, generation eligibility, issuance.
 */

import { ensure } from './errors.js';
import { compareByUpdatedDesc, cloneValue, findCourseByReference } from './helpers.js';

/**
 * @param {Object} deps
 * @param {Object} deps.certificateRepo - ICertificateRepository
 * @param {Object} deps.studentRepo - IStudentRepository
 * @param {Object} deps.enrollmentRepo - IEnrollmentRepository
 * @param {Object} deps.courseRepo - ICourseRepository
 */
export function createCertificateUseCases(deps) {
  const { certificateRepo, studentRepo, enrollmentRepo, courseRepo } = deps;
  const now = () => new Date().toISOString();

  async function listCertificates(filters = {}) {
    let certificates = await certificateRepo.list();

    if (filters.studentId) {
      certificates = certificates.filter(
        (c) => String(c.studentId) === String(filters.studentId)
      );
    }

    if (filters.courseId) {
      certificates = certificates.filter(
        (c) => String(c.courseId) === String(filters.courseId)
      );
    }

    if (filters.status) {
      certificates = certificates.filter(
        (c) => String(c.status || '').toLowerCase() === String(filters.status).toLowerCase()
      );
    }

    return certificates.sort(compareByUpdatedDesc);
  }

  async function getCertificate(certificateId) {
    const certificate = await certificateRepo.getById(certificateId);
    ensure(certificate, 'Sertifikat tidak ditemukan.', 404, 'CERTIFICATE_NOT_FOUND');
    return certificate;
  }

  async function upsertCertificate(studentId, payload = {}) {
    const student = await studentRepo.getById(studentId);
    ensure(student, 'Data siswa tidak ditemukan.', 404, 'STUDENT_NOT_FOUND');

    const ts = now();
    const [enrollment, allCourses, allCerts] = await Promise.all([
      enrollmentRepo.getByStudentId(studentId),
      courseRepo.list(),
      certificateRepo.list(),
    ]);

    const course = findCourseByReference(allCourses, {
      courseId: enrollment?.courseId ?? student.courseId,
      program: student.program,
    });

    const existing = allCerts.find((c) => (
      String(c.studentId) === String(student.id)
      || String(c.enrollmentId) === String(enrollment?.id)
    )) || null;

    const year = new Date().getFullYear();
    const paddedId = String(student.id).padStart(3, '0');
    const nextRecord = {
      id: existing?.id || `cert-${year}-${paddedId}`,
      studentId: student.id,
      enrollmentId: enrollment?.id || student.enrollmentId || null,
      courseId: course?.id ?? student.courseId ?? null,
      nis: student.nis,
      studentName: student.name,
      program: course?.title || student.program || '',
      issueDate: payload.issueDate || existing?.issueDate || new Date().toISOString().slice(0, 10),
      status: payload.status || existing?.status || 'available',
      fileName: payload.fileName ?? existing?.fileName ?? '',
      fileUrl: payload.fileUrl ?? existing?.fileUrl ?? '',
      mimeType: payload.mimeType ?? (existing?.mimeType || 'application/pdf'),
      notes: payload.notes ?? existing?.notes ?? '',
      createdAt: existing?.createdAt || ts,
      updatedAt: ts,
    };

    if (existing) {
      await certificateRepo.update(existing.id, nextRecord);
    } else {
      await certificateRepo.insert(nextRecord);
    }

    return cloneValue(nextRecord);
  }

  async function deleteCertificate(certificateId) {
    const existing = await certificateRepo.getById(certificateId);
    ensure(existing, 'Sertifikat tidak ditemukan.', 404, 'CERTIFICATE_NOT_FOUND');
    await certificateRepo.remove(existing.id);
    return { id: existing.id };
  }

  async function checkEligibility(studentId) {
    const student = await studentRepo.getById(studentId);
    ensure(student, 'Data siswa tidak ditemukan.', 404, 'STUDENT_NOT_FOUND');

    const [enrollment, allCerts] = await Promise.all([
      enrollmentRepo.getByStudentId(studentId),
      certificateRepo.list(),
    ]);
    const hasValidPayment = String(enrollment?.paymentStatus || student.paymentStatus || '').toLowerCase() === 'verified';

    return {
      studentId,
      eligible: hasValidPayment,
      paymentStatus: enrollment?.paymentStatus || student.paymentStatus || 'pending',
      hasExistingCertificate: allCerts.some(
        (c) => String(c.studentId) === String(studentId)
      ),
    };
  }

  return {
    listCertificates,
    getCertificate,
    upsertCertificate,
    deleteCertificate,
    checkEligibility,
  };
}