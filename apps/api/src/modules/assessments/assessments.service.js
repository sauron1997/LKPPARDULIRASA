import { createAdminService, ensure, getStudentPortal } from '../admin/admin.service.js';
import {
  canUseDatabaseAssessmentDefinitions,
  createPersistedAssessmentDefinition,
  getPersistedAssessmentDefinition,
  listPersistedAssessmentDefinitions,
  updatePersistedAssessmentDefinition,
} from './assessments.persistence.js';
import {
  canUseDatabaseStudentPersistence,
  listPersistedAssessmentProgress,
  listPersistedAssessmentSubmissions,
  reviewPersistedAssessment,
  submitPersistedAssessment,
} from '../student/student.persistence.js';

function requireAssessmentType(type) {
  return String(type || '').trim().toLowerCase();
}

function selectAssessmentCollection(filters = {}, collections = {}, indexes = {}, kind = 'progress') {
  const source = kind === 'submissions'
    ? collections.assessmentSubmissions || []
    : collections.assessmentProgress || [];
  const byEnrollmentId = kind === 'submissions'
    ? indexes.submissionsByEnrollmentId
    : indexes.progressByEnrollmentId;
  const byStudentId = kind === 'submissions'
    ? indexes.submissionsByStudentId
    : indexes.progressByStudentId;

  let records = source;

  if (filters.enrollmentId) {
    records = byEnrollmentId ? byEnrollmentId.get(String(filters.enrollmentId)) || [] : [];
  } else if (filters.studentId) {
    records = byStudentId ? byStudentId.get(String(filters.studentId)) || [] : [];
  }

  return records.filter((item) => {
    if (filters.studentId && String(item.studentId) !== String(filters.studentId)) return false;
    if (filters.enrollmentId && String(item.enrollmentId) !== String(filters.enrollmentId)) return false;
    if (filters.courseId && String(item.courseId) !== String(filters.courseId)) return false;
    return !(filters.status && String(item.status) !== String(filters.status));
  });
}

function normalizeSubmissionAttachment(payload = {}, existingSubmission = null) {
  const uploadedFile = payload.uploadedFile || null;
  const attachment = Array.isArray(payload.attachments) ? payload.attachments[0] : null;
  const fileName = payload.fileName
    ?? uploadedFile?.fileName
    ?? attachment?.name
    ?? existingSubmission?.fileName
    ?? '';
  const fileUrl = payload.fileUrl
    ?? payload.assetUrl
    ?? uploadedFile?.assetUrl
    ?? attachment?.url
    ?? existingSubmission?.fileUrl
    ?? '';
  const mimeType = payload.mimeType
    ?? uploadedFile?.mimeType
    ?? attachment?.mimeType
    ?? existingSubmission?.mimeType
    ?? '';
  const fileSizeLabel = payload.fileSizeLabel
    ?? uploadedFile?.fileSizeLabel
    ?? attachment?.sizeLabel
    ?? existingSubmission?.fileSizeLabel
    ?? '';
  const attachments = fileName || fileUrl
    ? [{
      id: uploadedFile?.id || existingSubmission?.attachments?.[0]?.id || null,
      name: fileName,
      url: fileUrl,
      mimeType,
      sizeLabel: fileSizeLabel,
    }]
    : existingSubmission?.attachments || [];

  return {
    fileName,
    fileUrl,
    mimeType,
    fileSizeLabel,
    attachments,
  };
}

export function createAssessmentsService(options = {}) {
  const adminService = createAdminService(options);
  const context = adminService.getContext();
  const { repositories } = context;

  return {
    async listDefinitions(filters = {}) {
      if (canUseDatabaseAssessmentDefinitions()) {
        return listPersistedAssessmentDefinitions(filters);
      }

      const courseId = filters.courseId;

      return repositories.assessmentDefinitions.raw()
        .filter((item) => (courseId ? String(item.courseId) === String(courseId) : true))
        .map((item) => ({ ...item }));
    },

    async getDefinition(definitionId) {
      if (canUseDatabaseAssessmentDefinitions()) {
        const definition = await getPersistedAssessmentDefinition(definitionId);
        ensure(definition, 'Definition assessment tidak ditemukan.', 404, 'ASSESSMENT_DEFINITION_NOT_FOUND');
        return definition;
      }

      const definition = repositories.assessmentDefinitions.raw().find((item) => String(item.id) === String(definitionId)) || null;
      ensure(definition, 'Definition assessment tidak ditemukan.', 404, 'ASSESSMENT_DEFINITION_NOT_FOUND');
      return definition;
    },

    async createDefinition(payload = {}) {
      ensure(payload.courseId, 'Program kursus wajib dipilih.', 400, 'COURSE_REQUIRED');
      ensure(payload.type, 'Tipe assessment wajib diisi.', 400, 'TYPE_REQUIRED');

      if (canUseDatabaseAssessmentDefinitions()) {
        return createPersistedAssessmentDefinition(payload);
      }

      const definition = {
        id: payload.id || `definition-${payload.courseId}-${requireAssessmentType(payload.type)}`,
        courseId: payload.courseId,
        type: requireAssessmentType(payload.type),
        title: payload.title || payload.type,
        description: payload.description || '',
        summary: payload.summary || payload.description || '',
        instructions: payload.instructions || '',
        passingScore: Number(payload.passingScore || 75),
        maxScore: Number(payload.maxScore || 100),
        maxAttempts: Number(payload.maxAttempts || 1),
        allowRetry: payload.allowRetry ?? true,
        allowedExtensions: Array.isArray(payload.allowedExtensions) ? payload.allowedExtensions : [],
        questions: Array.isArray(payload.questions) ? payload.questions : [],
        isPublished: payload.isPublished ?? true,
        createdAt: context.now(),
        updatedAt: context.now(),
      };

      repositories.assessmentDefinitions.insert(definition);
      return definition;
    },

    async updateDefinition(definitionId, payload = {}) {
      if (canUseDatabaseAssessmentDefinitions()) {
        const definition = await updatePersistedAssessmentDefinition(definitionId, payload);
        ensure(definition, 'Definition assessment tidak ditemukan.', 404, 'ASSESSMENT_DEFINITION_NOT_FOUND');
        return definition;
      }

      await this.getDefinition(definitionId);
      return repositories.assessmentDefinitions.update(definitionId, (current) => ({
        ...current,
        title: payload.title ?? current.title,
        description: payload.description ?? current.description,
        summary: payload.summary ?? current.summary,
        instructions: payload.instructions ?? current.instructions,
        passingScore: payload.passingScore != null ? Number(payload.passingScore) : current.passingScore,
        maxScore: payload.maxScore != null ? Number(payload.maxScore) : current.maxScore,
        maxAttempts: payload.maxAttempts != null ? Number(payload.maxAttempts) : current.maxAttempts,
        allowRetry: payload.allowRetry ?? current.allowRetry,
        allowedExtensions: Array.isArray(payload.allowedExtensions) ? payload.allowedExtensions : current.allowedExtensions,
        questions: Array.isArray(payload.questions) ? payload.questions : current.questions,
        isPublished: payload.isPublished ?? current.isPublished,
        updatedAt: context.now(),
      }));
    },

    async listProgress(filters = {}) {
      if (canUseDatabaseStudentPersistence()) {
        return listPersistedAssessmentProgress(filters);
      }

      return selectAssessmentCollection(filters, context.getCollections(), context.getIndexes(), 'progress');
    },

    async listSubmissions(filters = {}) {
      if (canUseDatabaseStudentPersistence()) {
        return listPersistedAssessmentSubmissions(filters);
      }

      return selectAssessmentCollection(filters, context.getCollections(), context.getIndexes(), 'submissions');
    },

    async submitAssessment(reference = {}, payload = {}) {
      if (canUseDatabaseStudentPersistence()) {
        const persistedResult = await submitPersistedAssessment(reference, payload);
        ensure(persistedResult?.submission && persistedResult?.progress, 'Portal siswa belum siap untuk submission.', 404, 'STUDENT_PORTAL_NOT_FOUND');
        return persistedResult;
      }

      const portal = await getStudentPortal(reference, { context });
      ensure(portal.student && portal.enrollment && portal.course, 'Portal siswa belum siap untuk submission.', 404, 'STUDENT_PORTAL_NOT_FOUND');
      ensure(payload.type, 'Tipe assessment wajib diisi.', 400, 'TYPE_REQUIRED');

      const type = requireAssessmentType(payload.type);
      const indexes = context.getIndexes();
      const definition = indexes.definitionsByCourseType.get(`${String(portal.course.id)}:${type}`) || null;

      ensure(definition, 'Definition assessment belum tersedia.', 404, 'ASSESSMENT_DEFINITION_NOT_FOUND');

      const now = context.now();
      const existingSubmission = selectAssessmentCollection(
        { studentId: portal.student.id, enrollmentId: portal.enrollment.id },
        context.getCollections(),
        indexes,
        'submissions',
      ).find((item) => requireAssessmentType(item.type) === type) || null;
      const attachmentFields = normalizeSubmissionAttachment(payload, existingSubmission);

      const submission = {
        id: existingSubmission?.id || `submission-${portal.enrollment.id}-${type}`,
        definitionId: definition.id,
        type,
        studentId: portal.student.id,
        enrollmentId: portal.enrollment.id,
        courseId: portal.course.id,
        title: definition.title,
        answers: payload.answers || existingSubmission?.answers || {},
        ...attachmentFields,
        autoScore: payload.autoScore ?? existingSubmission?.autoScore ?? null,
        manualScore: payload.manualScore ?? existingSubmission?.manualScore ?? null,
        score: payload.score ?? existingSubmission?.score ?? null,
        maxScore: Number(definition.maxScore || existingSubmission?.maxScore || 100),
        status: payload.status || 'in_review',
        feedback: existingSubmission?.feedback || '',
        startedAt: existingSubmission?.startedAt || now,
        submittedAt: payload.submittedAt || now,
        createdAt: existingSubmission?.createdAt || now,
        updatedAt: now,
      };

      if (existingSubmission) {
        repositories.assessmentSubmissions.update(existingSubmission.id, () => submission);
      } else {
        repositories.assessmentSubmissions.insert(submission);
      }

      const existingProgress = selectAssessmentCollection(
        { enrollmentId: portal.enrollment.id, studentId: portal.student.id },
        context.getCollections(),
        indexes,
        'progress',
      ).find((item) => requireAssessmentType(item.type) === type) || null;

      const progress = {
        id: existingProgress?.id || `asg-${portal.student.id}-${type}`,
        enrollmentId: portal.enrollment.id,
        studentId: portal.student.id,
        courseId: portal.course.id,
        type,
        assessmentTitle: definition.title,
        status: payload.progressStatus || 'in_review',
        score: payload.score ?? existingProgress?.score ?? null,
        maxScore: Number(definition.maxScore || 100),
        notes: payload.notes || existingProgress?.notes || '',
        feedback: existingProgress?.feedback || '',
        updatedAt: now,
        createdAt: existingProgress?.createdAt || now,
        submittedAt: payload.submittedAt || now,
        completedAt: payload.completedAt || existingProgress?.completedAt || null,
      };

      if (existingProgress) {
        repositories.assessmentProgress.update(existingProgress.id, () => progress);
      } else {
        repositories.assessmentProgress.insert(progress);
      }

      return {
        submission,
        progress,
      };
    },

    async reviewSubmission(submissionId, payload = {}) {
      ensure(payload.status, 'Status review wajib diisi.', 400, 'STATUS_REQUIRED');

      if (canUseDatabaseStudentPersistence()) {
        const persistedReview = await reviewPersistedAssessment(submissionId, payload);
        ensure(persistedReview?.submission && persistedReview?.progress, 'Submission tidak ditemukan.', 404, 'SUBMISSION_NOT_FOUND');
        return persistedReview;
      }

      const submission = repositories.assessmentSubmissions.raw().find((item) => String(item.id) === String(submissionId)) || null;
      ensure(submission, 'Submission tidak ditemukan.', 404, 'SUBMISSION_NOT_FOUND');

      const reviewedAt = context.now();
      const nextScore = payload.score === '' || payload.score == null ? null : Number(payload.score);

      const updatedSubmission = repositories.assessmentSubmissions.update(submissionId, (item) => ({
        ...item,
        status: payload.status,
        score: nextScore,
        feedback: payload.feedback || '',
        notes: payload.feedback || '',
        reviewedAt,
        reviewerName: payload.reviewerName || 'Admin LKP',
        updatedAt: reviewedAt,
      }));

      const existingProgress = repositories.assessmentProgress.raw().find((item) => (
        String(item.enrollmentId) === String(submission.enrollmentId)
        && requireAssessmentType(item.type) === requireAssessmentType(submission.type)
      )) || null;

      const progress = {
        ...(existingProgress || {}),
        id: existingProgress?.id || `asg-${submission.studentId}-${submission.type}`,
        enrollmentId: submission.enrollmentId,
        studentId: submission.studentId,
        courseId: submission.courseId,
        type: submission.type,
        assessmentTitle: submission.title || submission.type,
        status: payload.status,
        score: nextScore,
        maxScore: submission.maxScore || existingProgress?.maxScore || 100,
        notes: payload.feedback || '',
        feedback: payload.feedback || '',
        submittedAt: submission.submittedAt || existingProgress?.submittedAt || reviewedAt,
        completedAt: payload.status === 'passed' ? reviewedAt : existingProgress?.completedAt || null,
        updatedAt: reviewedAt,
        createdAt: existingProgress?.createdAt || reviewedAt,
      };

      if (existingProgress) {
        repositories.assessmentProgress.update(existingProgress.id, () => progress);
      } else {
        repositories.assessmentProgress.insert(progress);
      }

      return {
        submission: updatedSubmission,
        progress,
      };
    },

    async listCertificates(filters = {}) {
      return adminService.listCertificates(filters);
    },

    async upsertCertificate(studentId, payload = {}) {
      return adminService.upsertCertificate(studentId, payload);
    },

    async deleteCertificate(certificateId) {
      const removed = await adminService.deleteCertificate(certificateId);
      ensure(removed, 'Sertifikat tidak ditemukan.', 404, 'CERTIFICATE_NOT_FOUND');
      return removed;
    },
  };
}

export default createAssessmentsService;