import { and, asc, desc, eq, inArray, or } from 'drizzle-orm';
import {
  buildSessionUser,
  buildStudentClassPortal,
  normalizeAssessmentDefinition,
  normalizeAssessmentType,
  normalizeSubmissionAnswers,
} from '../../../../src/utils/domainRelations.js';
import { isDatabaseConfigured, requireDb } from '../../db/client.js';
import {
  assessmentDefinitions,
  assessmentProgress,
  assessmentQuestions,
  assessmentSubmissions,
  authUsers,
  certificates,
  courseModules,
  courses,
  enrollments,
  mediaAssets,
  students,
  submissionAnswers,
  submissionAttachments,
  userProfiles,
} from '../../db/schema/index.js';
import { listPersistedMessageThreads } from '../messages/messages.persistence.js';

function toBoolean(value) {
  return value === true || value === 'true';
}

function toDateString(value) {
  if (!value) {
    return '';
  }

  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString();
}

function toIntegerOrNull(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
}

function normalizeAssessmentStatus(value) {
  return String(value || 'not_started').toLowerCase();
}

function pickEnrollment(items = [], preferredEnrollmentId = null) {
  if (!items.length) {
    return null;
  }

  if (preferredEnrollmentId) {
    const matched = items.find((item) => String(item.id) === String(preferredEnrollmentId));
    if (matched) {
      return matched;
    }
  }

  const active = items.find((item) => String(item.status || '').toLowerCase() === 'active');
  return active || items[0];
}

function mapCourseRow(course, brochureAsset = null) {
  if (!course) {
    return null;
  }

  return {
    id: Number(course.id),
    slug: course.slug || '',
    title: course.title,
    aliases: Array.isArray(course.aliases) ? course.aliases : [],
    description: course.description || '',
    icon: course.icon || 'FileText',
    priceValue: Number(course.priceValue || 0),
    priceLabel: course.priceLabel || '',
    duration: course.duration || '',
    level: course.level || '',
    brochureName: brochureAsset?.originalName || '',
    brochureUrl: brochureAsset?.publicUrl || '',
    createdAt: toDateString(course.createdAt),
    updatedAt: toDateString(course.updatedAt),
  };
}

function mapModuleRow(module, media = null) {
  return {
    id: module.id,
    courseId: Number(module.courseId),
    title: module.title,
    summary: module.summary || '',
    order: Number(module.order || 0),
    durationLabel: module.durationLabel || '',
    resourceType: module.resourceType || 'lesson',
    isPublished: toBoolean(module.isPublished),
    fileName: media?.originalName || '',
    fileUrl: media?.publicUrl || '',
    mimeType: media?.mimeType || '',
    createdAt: toDateString(module.createdAt),
    updatedAt: toDateString(module.updatedAt),
  };
}

function mapStudentRow(student, enrollment, course) {
  if (!student) {
    return null;
  }

  return {
    id: Number(student.id),
    authUserId: student.authUserId || null,
    accountId: student.accountId || null,
    nis: student.nis,
    name: student.name,
    email: student.email,
    phone: student.phone || '',
    address: student.address || '',
    status: student.status || 'Aktif',
    registrationDate: student.registrationDate || null,
    notes: student.notes || '',
    courseId: enrollment?.courseId ?? null,
    enrollmentId: enrollment?.id ?? null,
    program: enrollment?.programSnapshot || course?.title || '',
    paymentStatus: enrollment?.paymentStatus || 'pending',
    paymentDate: enrollment?.paymentDate || null,
    createdAt: toDateString(student.createdAt),
    updatedAt: toDateString(student.updatedAt),
  };
}

function mapEnrollmentRow(enrollment, course) {
  if (!enrollment) {
    return null;
  }

  return {
    id: enrollment.id,
    studentId: Number(enrollment.studentId),
    courseId: Number(enrollment.courseId),
    program: enrollment.programSnapshot || course?.title || '',
    courseTitleSnapshot: enrollment.programSnapshot || course?.title || '',
    status: enrollment.status || 'active',
    paymentStatus: enrollment.paymentStatus || 'pending',
    paymentDate: enrollment.paymentDate || null,
    registrationDate: enrollment.registrationDate || null,
    startedAt: enrollment.startedAt || null,
    completedAt: enrollment.completedAt || null,
    currentModuleId: enrollment.currentModuleId || null,
    progressPercent: Number(enrollment.progressPercent || 0),
    notes: enrollment.notes || '',
    createdAt: toDateString(enrollment.createdAt),
    updatedAt: toDateString(enrollment.updatedAt),
  };
}

function mapProgressRow(row) {
  return {
    ...row,
    studentId: Number(row.studentId),
    courseId: Number(row.courseId),
    maxScore: Number(row.maxScore || 100),
    score: row.score == null ? null : Number(row.score),
    status: normalizeAssessmentStatus(row.status),
    submittedAt: row.submittedAt ? toDateString(row.submittedAt) : null,
    completedAt: row.completedAt ? toDateString(row.completedAt) : null,
    createdAt: toDateString(row.createdAt),
    updatedAt: toDateString(row.updatedAt),
  };
}

function mapCertificateRow(certificate, asset = null) {
  if (!certificate) {
    return null;
  }

  return {
    id: certificate.id,
    studentId: Number(certificate.studentId),
    enrollmentId: certificate.enrollmentId,
    courseId: Number(certificate.courseId),
    nis: certificate.nis,
    studentName: certificate.studentName,
    program: certificate.program || '',
    issueDate: certificate.issueDate || '',
    status: certificate.status || 'available',
    fileName: asset?.originalName || '',
    fileUrl: asset?.publicUrl || '',
    mimeType: asset?.mimeType || '',
    fileMediaId: certificate.fileMediaId || null,
    eligibilitySnapshot: certificate.eligibilitySnapshot || {},
    notes: certificate.notes || '',
    createdAt: toDateString(certificate.createdAt),
    updatedAt: toDateString(certificate.updatedAt),
  };
}

function mapDefinitionRows(definitionRows = [], questionRows = []) {
  const questionsByDefinition = questionRows.reduce((accumulator, row) => {
    const bucket = accumulator.get(String(row.definitionId)) || [];
    bucket.push({
      id: row.id,
      prompt: row.prompt || '',
      kind: row.kind || 'essay',
      options: Array.isArray(row.options) ? row.options : [],
      answer: row.answer ?? null,
      weight: Number(row.weight || 1),
    });
    accumulator.set(String(row.definitionId), bucket);
    return accumulator;
  }, new Map());

  return definitionRows.map((row) => normalizeAssessmentDefinition({
    id: row.id,
    courseId: Number(row.courseId),
    type: row.type,
    title: row.title,
    summary: row.summary || '',
    description: row.summary || '',
    instructions: row.instructions || '',
    durationMinutes: Number(row.durationMinutes || 60),
    passingScore: Number(row.passingScore || 75),
    maxScore: Number(row.maxScore || 100),
    maxAttempts: Number(row.maxAttempts || 1),
    allowRetry: toBoolean(row.allowRetry),
    allowedExtensions: Array.isArray(row.allowedExtensions) ? row.allowedExtensions : [],
    isPublished: toBoolean(row.isPublished),
    questions: (questionsByDefinition.get(String(row.id)) || [])
      .sort((left, right) => Number(left.order || 0) - Number(right.order || 0)),
    createdAt: toDateString(row.createdAt),
    updatedAt: toDateString(row.updatedAt),
  }));
}

function mapSubmissionRows(submissionRows = [], answerRows = [], attachmentRows = [], mediaRows = []) {
  const answersBySubmission = answerRows.reduce((accumulator, row) => {
    const bucket = accumulator.get(String(row.submissionId)) || [];
    bucket.push({
      questionId: row.questionId,
      value: row.value,
    });
    accumulator.set(String(row.submissionId), bucket);
    return accumulator;
  }, new Map());
  const mediaById = new Map(mediaRows.map((row) => [String(row.id), row]));
  const attachmentsBySubmission = attachmentRows.reduce((accumulator, row) => {
    const media = mediaById.get(String(row.mediaId));
    const bucket = accumulator.get(String(row.submissionId)) || [];
    if (media) {
      bucket.push({
        id: media.id,
        name: media.originalName || '',
        url: media.publicUrl || '',
        mimeType: media.mimeType || '',
        sizeLabel: media.metadata?.fileSizeLabel || '',
      });
    }
    accumulator.set(String(row.submissionId), bucket);
    return accumulator;
  }, new Map());

  return submissionRows.map((row) => {
    const attachments = attachmentsBySubmission.get(String(row.id)) || [];
    const firstAttachment = attachments[0] || null;

    return {
      id: row.id,
      definitionId: row.definitionId,
      enrollmentId: row.enrollmentId,
      studentId: Number(row.studentId),
      courseId: Number(row.courseId),
      type: normalizeAssessmentType(row.type),
      title: row.title || '',
      attempt: Number(row.attempt || 1),
      status: normalizeAssessmentStatus(row.status),
      score: row.score == null ? null : Number(row.score),
      maxScore: Number(row.maxScore || 100),
      feedback: row.feedback || '',
      reviewerName: row.reviewerName || '',
      submittedAt: row.submittedAt ? toDateString(row.submittedAt) : null,
      reviewedAt: row.reviewedAt ? toDateString(row.reviewedAt) : null,
      answers: normalizeSubmissionAnswers(answersBySubmission.get(String(row.id)) || []),
      attachments,
      fileName: firstAttachment?.name || '',
      fileUrl: firstAttachment?.url || '',
      mimeType: firstAttachment?.mimeType || '',
      fileSizeLabel: firstAttachment?.sizeLabel || '',
      createdAt: toDateString(row.createdAt),
      updatedAt: toDateString(row.updatedAt),
    };
  }).sort((left, right) => new Date(right.updatedAt || right.createdAt || 0) - new Date(left.updatedAt || left.createdAt || 0));
}

async function findStudentRow(database, reference = {}) {
  if (reference.studentId != null) {
    return (await database.select().from(students).where(eq(students.id, Number(reference.studentId))).limit(1))[0] || null;
  }

  if (reference.authUserId) {
    const authUserId = String(reference.authUserId);
    const byAuthUserId = (await database.select().from(students).where(eq(students.authUserId, authUserId)).limit(1))[0] || null;
    if (byAuthUserId) {
      return byAuthUserId;
    }
  }

  const email = String(reference.email || '').trim().toLowerCase();
  if (email) {
    const byEmail = (await database.select().from(students).where(eq(students.email, email)).limit(1))[0] || null;
    if (byEmail) {
      return byEmail;
    }
  }

  const nis = String(reference.nis || '').trim();
  if (nis) {
    return (await database.select().from(students).where(eq(students.nis, nis)).limit(1))[0] || null;
  }

  return null;
}

async function loadIdentityAccount(database, student, enrollment, course) {
  if (!student) {
    return null;
  }

  let authUser = null;
  if (student.authUserId) {
    [authUser] = await database.select().from(authUsers).where(eq(authUsers.id, student.authUserId)).limit(1);
  } else if (student.email) {
    [authUser] = await database.select().from(authUsers).where(eq(authUsers.email, student.email)).limit(1);
  }

  const profile = authUser
    ? (await database.select().from(userProfiles).where(eq(userProfiles.authUserId, authUser.id)).limit(1))[0] || null
    : null;
  const account = {
    id: authUser?.accountId || student.accountId || `acc-student-${student.id}`,
    accountId: authUser?.accountId || student.accountId || `acc-student-${student.id}`,
    username: authUser?.username || student.nis || student.email,
    loginId: authUser?.email || student.email,
    role: profile?.role || authUser?.role || 'student',
    name: profile?.displayName || authUser?.name || student.name,
    displayName: profile?.displayName || authUser?.name || student.name,
    email: authUser?.email || student.email,
    studentId: Number(student.id),
    nis: student.nis,
    courseId: enrollment?.courseId ?? toIntegerOrNull(authUser?.courseId) ?? course?.id ?? null,
    enrollmentId: enrollment?.id ?? authUser?.enrollmentId ?? null,
    permissions: Array.isArray(profile?.permissions) ? profile.permissions : [],
    status: profile?.status || 'active',
  };

  return {
    account,
    user: buildSessionUser({
      account,
      student: mapStudentRow(student, enrollment, course),
      enrollment: mapEnrollmentRow(enrollment, course),
      course: mapCourseRow(course),
    }),
  };
}

export function canUseDatabaseStudentPersistence() {
  return isDatabaseConfigured;
}

export async function listPersistedAssessmentProgress(filters = {}) {
  const database = requireDb();
  const conditions = [];

  if (filters.studentId != null) {
    conditions.push(eq(assessmentProgress.studentId, Number(filters.studentId)));
  }
  if (filters.enrollmentId) {
    conditions.push(eq(assessmentProgress.enrollmentId, String(filters.enrollmentId)));
  }
  if (filters.courseId != null) {
    conditions.push(eq(assessmentProgress.courseId, Number(filters.courseId)));
  }
  if (filters.status) {
    conditions.push(eq(assessmentProgress.status, String(filters.status)));
  }

  const query = database.select().from(assessmentProgress).orderBy(desc(assessmentProgress.updatedAt));
  const rows = conditions.length > 0 ? await query.where(and(...conditions)) : await query;
  return rows.map(mapProgressRow);
}

export async function listPersistedAssessmentSubmissions(filters = {}) {
  const database = requireDb();
  const conditions = [];

  if (filters.studentId != null) {
    conditions.push(eq(assessmentSubmissions.studentId, Number(filters.studentId)));
  }
  if (filters.enrollmentId) {
    conditions.push(eq(assessmentSubmissions.enrollmentId, String(filters.enrollmentId)));
  }
  if (filters.courseId != null) {
    conditions.push(eq(assessmentSubmissions.courseId, Number(filters.courseId)));
  }

  const query = database.select().from(assessmentSubmissions).orderBy(desc(assessmentSubmissions.updatedAt));
  const submissionRows = conditions.length > 0 ? await query.where(and(...conditions)) : await query;
  const submissionIds = submissionRows.map((row) => row.id);
  const answerRows = submissionIds.length > 0
    ? await database.select().from(submissionAnswers).where(inArray(submissionAnswers.submissionId, submissionIds))
    : [];
  const attachmentRows = submissionIds.length > 0
    ? await database.select().from(submissionAttachments).where(inArray(submissionAttachments.submissionId, submissionIds))
    : [];
  const mediaIds = attachmentRows.map((row) => row.mediaId);
  const mediaRows = mediaIds.length > 0
    ? await database.select().from(mediaAssets).where(inArray(mediaAssets.id, mediaIds))
    : [];

  return mapSubmissionRows(submissionRows, answerRows, attachmentRows, mediaRows);
}

export async function getPersistedStudentPortal(reference = {}) {
  const database = requireDb();
  const studentRow = await findStudentRow(database, reference);
  if (!studentRow) {
    return null;
  }

  const enrollmentRows = await database.select().from(enrollments)
    .where(eq(enrollments.studentId, Number(studentRow.id)))
    .orderBy(desc(enrollments.updatedAt), desc(enrollments.createdAt));
  const enrollmentRow = pickEnrollment(enrollmentRows, reference.enrollmentId);
  const courseRow = enrollmentRow
    ? (await database.select().from(courses).where(eq(courses.id, Number(enrollmentRow.courseId))).limit(1))[0] || null
    : null;
  const brochureAsset = courseRow?.brochureMediaId
    ? (await database.select().from(mediaAssets).where(eq(mediaAssets.id, courseRow.brochureMediaId)).limit(1))[0] || null
    : null;
  const moduleRows = courseRow
    ? await database.select().from(courseModules)
      .where(eq(courseModules.courseId, Number(courseRow.id)))
      .orderBy(asc(courseModules.order), asc(courseModules.createdAt))
    : [];
  const moduleMediaIds = moduleRows.map((row) => row.fileMediaId).filter(Boolean);
  const moduleMediaRows = moduleMediaIds.length > 0
    ? await database.select().from(mediaAssets).where(inArray(mediaAssets.id, moduleMediaIds))
    : [];
  const moduleMediaById = new Map(moduleMediaRows.map((row) => [String(row.id), row]));
  const definitionRows = courseRow
    ? await database.select().from(assessmentDefinitions)
      .where(eq(assessmentDefinitions.courseId, Number(courseRow.id)))
      .orderBy(asc(assessmentDefinitions.createdAt))
    : [];
  const questionRows = definitionRows.length > 0
    ? await database.select().from(assessmentQuestions).where(inArray(assessmentQuestions.definitionId, definitionRows.map((row) => row.id)))
    : [];
  const progressRows = await listPersistedAssessmentProgress({
    studentId: Number(studentRow.id),
    enrollmentId: enrollmentRow?.id || null,
    courseId: courseRow?.id || null,
  });
  const submissionRows = await listPersistedAssessmentSubmissions({
    studentId: Number(studentRow.id),
    enrollmentId: enrollmentRow?.id || null,
    courseId: courseRow?.id || null,
  });
  const certificateRows = await database.select().from(certificates).where(or(
    eq(certificates.studentId, Number(studentRow.id)),
    enrollmentRow ? eq(certificates.enrollmentId, String(enrollmentRow.id)) : eq(certificates.studentId, Number(studentRow.id)),
    eq(certificates.nis, studentRow.nis),
  ));
  const certificateMediaIds = certificateRows.map((row) => row.fileMediaId).filter(Boolean);
  const certificateMediaRows = certificateMediaIds.length > 0
    ? await database.select().from(mediaAssets).where(inArray(mediaAssets.id, certificateMediaIds))
    : [];
  const certificateMediaById = new Map(certificateMediaRows.map((row) => [String(row.id), row]));
  const identity = await loadIdentityAccount(database, studentRow, enrollmentRow, courseRow);
  const persistedThreads = await listPersistedMessageThreads('student', { studentId: Number(studentRow.id) }).catch(() => []);
  const course = mapCourseRow(courseRow, brochureAsset);
  const enrollment = mapEnrollmentRow(enrollmentRow, course);
  const student = mapStudentRow(studentRow, enrollmentRow, course);

  return buildStudentClassPortal({
    user: {
      ...(reference.user || reference.actor || identity?.user || {}),
      authUserId: reference.authUserId || reference.user?.authUserId || reference.actor?.authUserId || studentRow.authUserId || null,
    },
    accountReference: {
      accountId: reference.accountId || identity?.account?.id || student.accountId || null,
    },
    studentReference: {
      studentId: reference.studentId || student.id,
      enrollmentId: reference.enrollmentId || enrollment?.id || null,
      courseId: reference.courseId || course?.id || null,
      email: reference.email || student.email,
      nis: reference.nis || student.nis,
    },
    accounts: identity?.account ? [identity.account] : [],
    students: [student],
    courses: course ? [course] : [],
    enrollments: enrollment ? [enrollment] : [],
    modules: moduleRows.map((row) => mapModuleRow(row, moduleMediaById.get(String(row.fileMediaId)) || null)),
    assessmentProgress: progressRows,
    assessmentDefinitions: mapDefinitionRows(definitionRows, questionRows),
    assessmentSubmissions: submissionRows,
    certificates: certificateRows.map((row) => mapCertificateRow(row, certificateMediaById.get(String(row.fileMediaId)) || null)),
    messages: persistedThreads,
  });
}

export async function submitPersistedAssessment(reference = {}, payload = {}) {
  const portal = await getPersistedStudentPortal(reference);
  if (!portal?.student || !portal?.enrollment || !portal?.course) {
    return null;
  }

  const definition = portal.assessmentDefinitions.find((item) => normalizeAssessmentType(item.type) === normalizeAssessmentType(payload.type));
  if (!definition) {
    return null;
  }

  const database = requireDb();
  const type = normalizeAssessmentType(payload.type);
  const now = new Date();
  const submissionId = `submission-${portal.enrollment.id}-${type}`;
  const progressId = `asg-${portal.student.id}-${type}`;
  const existingSubmission = (await database.select().from(assessmentSubmissions).where(eq(assessmentSubmissions.id, submissionId)).limit(1))[0] || null;
  const nextScore = payload.score === '' || payload.score == null ? existingSubmission?.score ?? null : Number(payload.score);
  const submissionRecord = {
    id: submissionId,
    definitionId: definition.id,
    enrollmentId: portal.enrollment.id,
    studentId: Number(portal.student.id),
    courseId: Number(portal.course.id),
    type,
    title: definition.title,
    attempt: Number(existingSubmission?.attempt || 1),
    status: payload.status || 'in_review',
    score: nextScore,
    maxScore: Number(definition.maxScore || 100),
    feedback: existingSubmission?.feedback || '',
    reviewerName: existingSubmission?.reviewerName || '',
    submittedAt: now,
    reviewedAt: existingSubmission?.reviewedAt || null,
    createdAt: existingSubmission?.createdAt || now,
    updatedAt: now,
  };

  await database.insert(assessmentSubmissions).values(submissionRecord).onConflictDoUpdate({
    target: assessmentSubmissions.id,
    set: {
      title: submissionRecord.title,
      status: submissionRecord.status,
      score: submissionRecord.score,
      maxScore: submissionRecord.maxScore,
      feedback: submissionRecord.feedback,
      reviewerName: submissionRecord.reviewerName,
      submittedAt: submissionRecord.submittedAt,
      updatedAt: submissionRecord.updatedAt,
    },
  });

  await database.delete(submissionAnswers).where(eq(submissionAnswers.submissionId, submissionId));
  const nextAnswers = payload.answers && typeof payload.answers === 'object'
    ? Object.entries(payload.answers).map(([questionId, value], index) => ({
      id: `${submissionId}-answer-${index + 1}`,
      submissionId,
      questionId,
      value,
    }))
    : [];
  if (nextAnswers.length > 0) {
    await database.insert(submissionAnswers).values(nextAnswers);
  }

  await database.delete(submissionAttachments).where(eq(submissionAttachments.submissionId, submissionId));
  if (payload.fileUrl || payload.uploadedFile?.assetUrl) {
    const mediaId = `submission-media-${submissionId}`;
    await database.insert(mediaAssets).values({
      id: mediaId,
      visibility: 'private',
      storageKey: null,
      publicUrl: payload.fileUrl || payload.uploadedFile?.assetUrl || '',
      originalName: payload.fileName || payload.uploadedFile?.fileName || '',
      mimeType: payload.mimeType || payload.uploadedFile?.mimeType || '',
      ownerType: 'assessment_submission',
      ownerId: submissionId,
      metadata: {
        fileSizeLabel: payload.fileSizeLabel || payload.uploadedFile?.fileSizeLabel || '',
      },
      createdAt: now,
      updatedAt: now,
    }).onConflictDoUpdate({
      target: mediaAssets.id,
      set: {
        visibility: 'private',
        publicUrl: payload.fileUrl || payload.uploadedFile?.assetUrl || '',
        originalName: payload.fileName || payload.uploadedFile?.fileName || '',
        mimeType: payload.mimeType || payload.uploadedFile?.mimeType || '',
        ownerType: 'assessment_submission',
        ownerId: submissionId,
        metadata: {
          fileSizeLabel: payload.fileSizeLabel || payload.uploadedFile?.fileSizeLabel || '',
        },
        updatedAt: now,
      },
    });

    await database.insert(submissionAttachments).values({
      id: `${submissionId}-attachment-1`,
      submissionId,
      mediaId,
    });
  }

  await database.insert(assessmentProgress).values({
    id: progressId,
    enrollmentId: portal.enrollment.id,
    studentId: Number(portal.student.id),
    courseId: Number(portal.course.id),
    type,
    assessmentTitle: definition.title,
    status: payload.progressStatus || 'in_review',
    score: nextScore,
    maxScore: Number(definition.maxScore || 100),
    submittedAt: now,
    completedAt: payload.completedAt ? new Date(payload.completedAt) : null,
    feedback: '',
    notes: payload.notes || '',
    createdAt: now,
    updatedAt: now,
  }).onConflictDoUpdate({
    target: assessmentProgress.id,
    set: {
      status: payload.progressStatus || 'in_review',
      score: nextScore,
      maxScore: Number(definition.maxScore || 100),
      submittedAt: now,
      completedAt: payload.completedAt ? new Date(payload.completedAt) : null,
      notes: payload.notes || '',
      updatedAt: now,
    },
  });

  const [submission] = await listPersistedAssessmentSubmissions({
    studentId: portal.student.id,
    enrollmentId: portal.enrollment.id,
    courseId: portal.course.id,
  }).then((items) => items.filter((item) => String(item.id) === submissionId));
  const [progress] = await listPersistedAssessmentProgress({
    studentId: portal.student.id,
    enrollmentId: portal.enrollment.id,
    courseId: portal.course.id,
  }).then((items) => items.filter((item) => String(item.id) === progressId));

  return {
    submission: submission || null,
    progress: progress || null,
  };
}

export async function reviewPersistedAssessment(submissionId, payload = {}) {
  const database = requireDb();
  const submission = (await database.select().from(assessmentSubmissions).where(eq(assessmentSubmissions.id, String(submissionId))).limit(1))[0] || null;
  if (!submission) {
    return null;
  }

  const reviewedAt = new Date();
  const nextScore = payload.score === '' || payload.score == null ? null : Number(payload.score);

  await database.update(assessmentSubmissions)
    .set({
      status: payload.status,
      score: nextScore,
      feedback: payload.feedback || '',
      reviewerName: payload.reviewerName || 'Admin LKP',
      reviewedAt,
      updatedAt: reviewedAt,
    })
    .where(eq(assessmentSubmissions.id, String(submissionId)));

  const progressId = `asg-${submission.studentId}-${normalizeAssessmentType(submission.type)}`;
  await database.insert(assessmentProgress).values({
    id: progressId,
    enrollmentId: submission.enrollmentId,
    studentId: Number(submission.studentId),
    courseId: Number(submission.courseId),
    type: normalizeAssessmentType(submission.type),
    assessmentTitle: submission.title || submission.type,
    status: payload.status,
    score: nextScore,
    maxScore: Number(submission.maxScore || 100),
    submittedAt: submission.submittedAt || reviewedAt,
    completedAt: payload.status === 'passed' ? reviewedAt : null,
    feedback: payload.feedback || '',
    notes: payload.feedback || '',
    createdAt: reviewedAt,
    updatedAt: reviewedAt,
  }).onConflictDoUpdate({
    target: assessmentProgress.id,
    set: {
      status: payload.status,
      score: nextScore,
      maxScore: Number(submission.maxScore || 100),
      feedback: payload.feedback || '',
      notes: payload.feedback || '',
      completedAt: payload.status === 'passed' ? reviewedAt : null,
      updatedAt: reviewedAt,
    },
  });

  const [updatedSubmission] = await listPersistedAssessmentSubmissions({
    studentId: Number(submission.studentId),
    enrollmentId: submission.enrollmentId,
    courseId: Number(submission.courseId),
  }).then((items) => items.filter((item) => String(item.id) === String(submissionId)));
  const [updatedProgress] = await listPersistedAssessmentProgress({
    studentId: Number(submission.studentId),
    enrollmentId: submission.enrollmentId,
    courseId: Number(submission.courseId),
  }).then((items) => items.filter((item) => String(item.id) === progressId));

  return {
    submission: updatedSubmission || null,
    progress: updatedProgress || null,
  };
}
