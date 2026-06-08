/**
 * Certificates Service — extracted from admin.service.js (Phase 8 final).
 * Provides certificate CRUD operations.
 */

import { findCourseByReference } from '@lkp-parduli-rasa/domain/domain-relations';
import { createBackendContext, rebuildMediaLibrary } from '../../runtime/backend-context.js';
import { ensure } from '../../runtime/errors.js';
import {
  canUseDatabaseStudentPersistence,
  deletePersistedCertificate,
  listPersistedCertificates,
  upsertPersistedCertificate,
} from '../student/student.persistence.js';
import { compareByUpdatedDesc } from '../messages/thread-utils.js';

function toKey(value) {
  return String(value ?? '');
}

function resolveStudentAndAccount(studentId, context) {
  const indexes = context.getIndexes();
  const student = indexes.studentsById.get(toKey(studentId)) || null;
  ensure(student, 'Data siswa tidak ditemukan.', 404, 'STUDENT_NOT_FOUND');
  const account = indexes.accountsByStudentId.get(toKey(student.id))
    || indexes.accountsById.get(toKey(student.accountId))
    || null;
  const enrollment = indexes.enrollmentsByStudentId.get(toKey(student.id))
    || indexes.enrollmentsById.get(toKey(student.enrollmentId))
    || null;

  return { student, account, enrollment };
}

function cloneValue(value) {
  if (value == null) return value;
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

export function createCertificatesService(options = {}) {
  const context = createBackendContext(options);
  const { repositories } = context;

  return {
    async listCertificates(filters = {}) {
      if (canUseDatabaseStudentPersistence()) {
        return listPersistedCertificates(filters);
      }

      const certificates = repositories.certificates.list();
      if (!filters.studentId) {
        return certificates.sort(compareByUpdatedDesc);
      }

      return certificates
        .filter((item) => String(item.studentId) === String(filters.studentId))
        .sort(compareByUpdatedDesc);
    },

    async upsertCertificate(studentId, payload = {}) {
      if (canUseDatabaseStudentPersistence()) {
        return upsertPersistedCertificate(studentId, payload);
      }

      const { student, enrollment } = resolveStudentAndAccount(studentId, context);
      const now = context.now();
      const course = findCourseByReference(repositories.courses.raw(), {
        courseId: enrollment?.courseId ?? student.courseId,
        program: student.program,
      });
      const existing = repositories.certificates.raw().find((item) => (
        String(item.studentId) === String(student.id)
        || String(item.enrollmentId) === String(enrollment?.id)
      )) || null;

      const nextRecord = {
        id: existing?.id || `cert-${new Date().getFullYear()}-${String(student.id).padStart(3, '0')}`,
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
        mimeType: payload.mimeType ?? existing?.mimeType ?? 'application/pdf',
        notes: payload.notes ?? existing?.notes ?? '',
        createdAt: existing?.createdAt || now,
        updatedAt: now,
      };

      if (existing) {
        repositories.certificates.update(existing.id, () => nextRecord);
      } else {
        repositories.certificates.insert(nextRecord);
      }

      rebuildMediaLibrary({ context });
      return cloneValue(nextRecord);
    },

    async deleteCertificate(certificateId) {
      if (canUseDatabaseStudentPersistence()) {
        return deletePersistedCertificate(certificateId);
      }

      return Boolean(repositories.certificates.remove(certificateId));
    },
  };
}

export default createCertificatesService;
