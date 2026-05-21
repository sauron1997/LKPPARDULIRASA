import {
  getDefaultAccreditations,
  getDefaultAccounts,
  getDefaultAssessmentDefinitions,
  getDefaultAssessmentProgress,
  getDefaultAssessmentSubmissions,
  getDefaultAttendanceRecords,
  getDefaultBlogPosts,
  getDefaultCertificates,
  getDefaultCourses,
  getDefaultEnrollments,
  getDefaultGalleryItems,
  getDefaultModules,
  getDefaultProfile,
  getDefaultPublicMessages,
  getDefaultScheduleAssignments,
  getDefaultScheduleSessions,
  getDefaultStudentMessages,
  getDefaultStudents,
} from '../../../../src/services/admin/defaults.js';
import {
  ASSESSMENT_TYPE_CONFIG,
  buildClassroomAccessMeta,
  buildSessionUser,
  buildStudentClassPortal,
  findCourseByReference,
  findEnrollmentByReference,
  getAccountIdentifiers,
  normalizeAssessmentType,
  normalizeLoginIdentifier,
  normalizeThreadMessages,
  resolveStudentByReference,
} from '../../../../src/utils/domainRelations.js';

const COLLECTION_LOADERS = {
  accounts: getDefaultAccounts,
  students: getDefaultStudents,
  courses: getDefaultCourses,
  enrollments: getDefaultEnrollments,
  modules: getDefaultModules,
  assessmentProgress: getDefaultAssessmentProgress,
  assessmentDefinitions: getDefaultAssessmentDefinitions,
  assessmentSubmissions: getDefaultAssessmentSubmissions,
  scheduleSessions: getDefaultScheduleSessions,
  scheduleAssignments: getDefaultScheduleAssignments,
  attendanceRecords: getDefaultAttendanceRecords,
  certificates: getDefaultCertificates,
  publicMessages: getDefaultPublicMessages,
  studentMessages: getDefaultStudentMessages,
  blogPosts: getDefaultBlogPosts,
  galleryItems: getDefaultGalleryItems,
  accreditations: getDefaultAccreditations,
};

const COLLECTION_KEYS = Object.keys(COLLECTION_LOADERS);

let sharedState;

function cloneValue(value) {
  if (value == null) return value;
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value));
}

function toKey(value) {
  return String(value ?? '');
}

function buildSingleIndex(items, resolver) {
  return items.reduce((index, item) => {
    index.set(toKey(resolver(item)), item);
    return index;
  }, new Map());
}

function buildGroupedIndex(items, resolver) {
  return items.reduce((index, item) => {
    const key = toKey(resolver(item));
    const bucket = index.get(key);

    if (bucket) {
      bucket.push(item);
    } else {
      index.set(key, [item]);
    }

    return index;
  }, new Map());
}

function getGroupedItems(index, key) {
  return index.get(toKey(key)) || [];
}

function sanitizeAccount(account) {
  if (!account) {
    return null;
  }

  const { password: _password, ...safeAccount } = account;
  return safeAccount;
}

function sanitizePortal(portal) {
  if (!portal) {
    return portal;
  }

  return {
    ...portal,
    account: sanitizeAccount(portal.account),
  };
}

function sanitizeClassBundle(bundle) {
  if (!bundle) {
    return bundle;
  }

  return {
    ...bundle,
    account: sanitizeAccount(bundle.account),
    portal: sanitizePortal(bundle.portal),
  };
}

function toIsoTimestamp(value) {
  if (!value) return new Date().toISOString();

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return new Date().toISOString();
  }

  return parsed.toISOString();
}

function toDateValue(value) {
  const parsed = new Date(value || 0);
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
}

function compareByUpdatedDesc(left, right) {
  return toDateValue(right?.updatedAt || right?.createdAt || right?.publishedAt)
    - toDateValue(left?.updatedAt || left?.createdAt || left?.publishedAt);
}

function parseNumericSuffix(value) {
  const match = String(value || '').match(/(\d+)(?!.*\d)/);
  return Number(match?.[1] || 0);
}

function slugify(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function formatCurrency(value) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function getLatestNumber(items, resolver) {
  return items.reduce((highest, item) => Math.max(highest, Number(resolver(item)) || 0), 0);
}

function buildInitialMediaLibrary(seed) {
  const media = [];

  seed.galleryItems.forEach((item) => {
    (item.media || []).forEach((asset) => {
      media.push({
        id: asset.id || `media-gallery-${item.id}-${media.length + 1}`,
        domain: 'gallery',
        parentId: item.id,
        name: asset.name || item.title,
        type: asset.type || item.type || 'photo',
        url: asset.url || '',
        mimeType: asset.mimeType || '',
        isObjectUrl: Boolean(asset.isObjectUrl),
        createdAt: item.createdAt || new Date().toISOString(),
        updatedAt: item.updatedAt || item.createdAt || new Date().toISOString(),
      });
    });
  });

  seed.blogPosts.forEach((post) => {
    if (!post.image) return;
    media.push({
      id: `media-blog-${post.id}`,
      domain: 'blog',
      parentId: post.id,
      name: post.title,
      type: 'image',
      url: post.image,
      mimeType: '',
      isObjectUrl: false,
      createdAt: post.createdAt || post.publishedAt || new Date().toISOString(),
      updatedAt: post.updatedAt || post.createdAt || new Date().toISOString(),
    });
  });

  seed.certificates.forEach((certificate) => {
    if (!certificate.fileUrl) return;
    media.push({
      id: `media-certificate-${certificate.id}`,
      domain: 'certificate',
      parentId: certificate.id,
      name: certificate.fileName || `${certificate.studentName || 'certificate'}.pdf`,
      type: 'document',
      url: certificate.fileUrl,
      mimeType: certificate.mimeType || 'application/pdf',
      isObjectUrl: false,
      createdAt: certificate.createdAt || certificate.issueDate || new Date().toISOString(),
      updatedAt: certificate.updatedAt || certificate.createdAt || new Date().toISOString(),
    });
  });

  seed.accreditations.forEach((item) => {
    if (!item.documentUrl) return;
    media.push({
      id: `media-accreditation-${item.id}`,
      domain: 'accreditation',
      parentId: item.id,
      name: item.documentName || item.title,
      type: 'document',
      url: item.documentUrl,
      mimeType: 'application/pdf',
      isObjectUrl: false,
      createdAt: item.updatedAt || new Date().toISOString(),
      updatedAt: item.updatedAt || new Date().toISOString(),
    });
  });

  return media.sort(compareByUpdatedDesc);
}

function buildDefaultState(overrides = {}) {
  const seed = COLLECTION_KEYS.reduce((accumulator, key) => ({
    ...accumulator,
    [key]: cloneValue(COLLECTION_LOADERS[key]()),
  }), {});

  return {
    ...seed,
    profile: cloneValue(getDefaultProfile()),
    mediaLibrary: buildInitialMediaLibrary(seed),
    sessions: [],
    ...cloneValue(overrides),
  };
}

function createArrayRepository(state, key) {
  return {
    key,
    list() {
      return cloneValue(state[key]);
    },
    raw() {
      return state[key];
    },
    getById(id) {
      return cloneValue(state[key].find((item) => String(item.id) === String(id)) || null);
    },
    insert(record, { prepend = true } = {}) {
      state[key] = prepend ? [cloneValue(record), ...state[key]] : [...state[key], cloneValue(record)];
      return cloneValue(record);
    },
    update(id, updater) {
      let updatedRecord = null;

      state[key] = state[key].map((item) => {
        if (String(item.id) !== String(id)) {
          return item;
        }

        const nextRecord = typeof updater === 'function' ? updater(cloneValue(item)) : { ...item, ...updater };
        updatedRecord = cloneValue(nextRecord);
        return nextRecord;
      });

      return updatedRecord;
    },
    remove(id) {
      const existing = state[key].find((item) => String(item.id) === String(id)) || null;
      state[key] = state[key].filter((item) => String(item.id) !== String(id));
      return cloneValue(existing);
    },
    replaceAll(records) {
      state[key] = cloneValue(records);
      return this.list();
    },
  };
}

function createObjectRepository(state, key) {
  return {
    get() {
      return cloneValue(state[key]);
    },
    update(updater) {
      const current = cloneValue(state[key]);
      state[key] = typeof updater === 'function' ? updater(current) : { ...current, ...updater };
      return cloneValue(state[key]);
    },
    replace(nextValue) {
      state[key] = cloneValue(nextValue);
      return cloneValue(state[key]);
    },
  };
}

export function createServiceError(status, message, code = 'SERVICE_ERROR', details = null) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  if (details != null) {
    error.details = details;
  }
  return error;
}

export function ensure(condition, message, status = 400, code = 'VALIDATION_ERROR', details = null) {
  if (!condition) {
    throw createServiceError(status, message, code, details);
  }
}

export function getBackendState(options = {}) {
  if (options.state) {
    return options.state;
  }

  if (options.context?.state) {
    return options.context.state;
  }

  if (!sharedState) {
    sharedState = buildDefaultState(options.seedState);
  }

  return sharedState;
}

export function resetBackendState(seedState = {}) {
  sharedState = buildDefaultState(seedState);
  return sharedState;
}

export function createBackendContext(options = {}) {
  const state = getBackendState(options);
  const repositories = {
    ...Object.fromEntries(COLLECTION_KEYS.map((key) => [key, createArrayRepository(state, key)])),
    profile: createObjectRepository(state, 'profile'),
    mediaLibrary: createArrayRepository(state, 'mediaLibrary'),
    sessions: createArrayRepository(state, 'sessions'),
    ...(options.context?.repositories || {}),
    ...(options.repositories || {}),
  };
  let collectionCache = null;
  let indexCache = null;

  function getCollections() {
    const nextCollections = {
      accounts: repositories.accounts.raw(),
      students: repositories.students.raw(),
      courses: repositories.courses.raw(),
      enrollments: repositories.enrollments.raw(),
      modules: repositories.modules.raw(),
      assessmentProgress: repositories.assessmentProgress.raw(),
      assessmentDefinitions: repositories.assessmentDefinitions.raw(),
      assessmentSubmissions: repositories.assessmentSubmissions.raw(),
      scheduleSessions: repositories.scheduleSessions.raw(),
      scheduleAssignments: repositories.scheduleAssignments.raw(),
      attendanceRecords: repositories.attendanceRecords.raw(),
      certificates: repositories.certificates.raw(),
      studentMessages: repositories.studentMessages.raw(),
      publicMessages: repositories.publicMessages.raw(),
      blogPosts: repositories.blogPosts.raw(),
    };

    if (
      collectionCache
      && Object.keys(nextCollections).every((key) => collectionCache[key] === nextCollections[key])
    ) {
      return collectionCache;
    }

    collectionCache = nextCollections;
    indexCache = null;
    return collectionCache;
  }

  function getIndexes() {
    const collections = getCollections();

    if (indexCache) {
      return indexCache;
    }

    indexCache = {
      accountsById: buildSingleIndex(collections.accounts, (item) => item.id),
      accountsByStudentId: buildSingleIndex(collections.accounts, (item) => item.studentId),
      studentsById: buildSingleIndex(collections.students, (item) => item.id),
      studentsByEmail: buildSingleIndex(collections.students, (item) => normalizeLoginIdentifier(item.email)),
      studentsByNis: buildSingleIndex(collections.students, (item) => item.nis),
      enrollmentsById: buildSingleIndex(collections.enrollments, (item) => item.id),
      enrollmentsByStudentId: buildSingleIndex(collections.enrollments, (item) => item.studentId),
      coursesById: buildSingleIndex(collections.courses, (item) => item.id),
      definitionsByCourseId: buildGroupedIndex(collections.assessmentDefinitions, (item) => item.courseId),
      definitionsByCourseType: buildSingleIndex(
        collections.assessmentDefinitions,
        (item) => `${toKey(item.courseId)}:${normalizeAssessmentType(item.type)}`,
      ),
      modulesByCourseId: buildGroupedIndex(collections.modules, (item) => item.courseId),
      progressByStudentId: buildGroupedIndex(collections.assessmentProgress, (item) => item.studentId),
      progressByEnrollmentId: buildGroupedIndex(collections.assessmentProgress, (item) => item.enrollmentId),
      submissionsByStudentId: buildGroupedIndex(collections.assessmentSubmissions, (item) => item.studentId),
      submissionsByEnrollmentId: buildGroupedIndex(collections.assessmentSubmissions, (item) => item.enrollmentId),
      scheduleSessionsByCourseId: buildGroupedIndex(collections.scheduleSessions, (item) => item.courseId),
      scheduleAssignmentsBySessionId: buildGroupedIndex(collections.scheduleAssignments, (item) => item.sessionId),
      scheduleAssignmentsByEnrollmentId: buildGroupedIndex(collections.scheduleAssignments, (item) => item.enrollmentId),
      attendanceBySessionId: buildGroupedIndex(collections.attendanceRecords, (item) => item.sessionId),
      attendanceByEnrollmentId: buildGroupedIndex(collections.attendanceRecords, (item) => item.enrollmentId),
      attendanceBySessionEnrollment: buildSingleIndex(collections.attendanceRecords, (item) => `${item.sessionId}:${item.enrollmentId}`),
      threadsByStudentId: buildGroupedIndex(collections.studentMessages, (item) => item.studentId),
      certificatesByStudentId: buildGroupedIndex(collections.certificates, (item) => item.studentId),
      certificatesByEnrollmentId: buildGroupedIndex(collections.certificates, (item) => item.enrollmentId),
      certificatesByNis: buildGroupedIndex(collections.certificates, (item) => item.nis),
    };

    return indexCache;
  }

  return {
    state,
    repositories,
    getCollections,
    getIndexes,
    now() {
      return new Date().toISOString();
    },
  };
}

export function rebuildMediaLibrary(options = {}) {
  const context = createBackendContext(options);
  const seed = {
    galleryItems: context.repositories.galleryItems.list(),
    blogPosts: context.repositories.blogPosts.list(),
    certificates: context.repositories.certificates.list(),
    accreditations: context.repositories.accreditations.list(),
  };
  const nextMedia = buildInitialMediaLibrary(seed);
  context.repositories.mediaLibrary.replaceAll(nextMedia);
  return nextMedia;
}

export function getStudentPortal(reference = {}, options = {}) {
  const context = createBackendContext(options);
  const user = reference.user || reference.actor || null;
  const studentReference = {
    studentId: reference.studentId || user?.studentId,
    enrollmentId: reference.enrollmentId || user?.enrollmentId,
    courseId: reference.courseId || user?.courseId,
    email: reference.email || user?.email,
    nis: reference.nis || user?.nis,
  };
  const accountReference = {
    accountId: reference.accountId || user?.accountId,
  };

  return sanitizePortal(buildStudentClassPortal(buildPortalInput({
    context,
    user,
    studentReference,
    accountReference,
  })));
}

function getDaysSince(value) {
  if (!value) return null;
  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) return null;
  return Math.max(0, Math.floor((Date.now() - parsedDate.getTime()) / 86400000));
}

function formatQueueAge(value) {
  const days = getDaysSince(value);
  if (days == null) return 'Baru masuk';
  if (days === 0) return 'Hari ini';
  if (days === 1) return '1 hari';
  return `${days} hari`;
}

function getPublishedDefinitionCountForCourse(definitions = []) {
  return ASSESSMENT_TYPE_CONFIG.filter((typeItem) => (
    definitions.some((definition) => (
      normalizeAssessmentType(definition.type) === typeItem.key
      && definition.isPublished !== false
    ))
  )).length;
}

function buildPortalInput({
  context,
  user = null,
  studentReference = {},
  accountReference = {},
}) {
  const collections = context.getCollections();
  const indexes = context.getIndexes();
  let student = null;

  if (studentReference.studentId != null) {
    student = indexes.studentsById.get(toKey(studentReference.studentId)) || null;
  } else if (studentReference.email) {
    student = indexes.studentsByEmail.get(normalizeLoginIdentifier(studentReference.email)) || null;
  } else if (studentReference.nis) {
    student = indexes.studentsByNis.get(toKey(studentReference.nis)) || null;
  }

  if (!student && user?.studentId != null) {
    student = indexes.studentsById.get(toKey(user.studentId)) || null;
  }

  const account = accountReference.accountId != null
    ? indexes.accountsById.get(toKey(accountReference.accountId)) || null
    : student
      ? indexes.accountsByStudentId.get(toKey(student.id)) || null
      : null;
  const enrollment = studentReference.enrollmentId != null
    ? indexes.enrollmentsById.get(toKey(studentReference.enrollmentId)) || null
    : student
      ? indexes.enrollmentsByStudentId.get(toKey(student.id)) || null
      : null;
  const courseId = studentReference.courseId ?? enrollment?.courseId ?? student?.courseId ?? null;
  const course = courseId != null
    ? indexes.coursesById.get(toKey(courseId)) || null
    : null;
  const certificates = [...new Map([
    ...(student ? getGroupedItems(indexes.certificatesByStudentId, student.id) : []),
    ...(enrollment ? getGroupedItems(indexes.certificatesByEnrollmentId, enrollment.id) : []),
    ...((student?.nis || studentReference.nis) ? getGroupedItems(indexes.certificatesByNis, student?.nis || studentReference.nis) : []),
  ].map((item) => [toKey(item.id), item])).values()];

  return {
    user,
    accountReference,
    studentReference,
    accounts: account ? [account] : [],
    students: student ? [student] : collections.students,
    courses: course ? [course] : collections.courses,
    enrollments: enrollment ? [enrollment] : collections.enrollments,
    modules: course ? getGroupedItems(indexes.modulesByCourseId, course.id) : [],
    assessmentProgress: enrollment
      ? getGroupedItems(indexes.progressByEnrollmentId, enrollment.id)
      : student
        ? getGroupedItems(indexes.progressByStudentId, student.id)
        : [],
    assessmentDefinitions: course ? getGroupedItems(indexes.definitionsByCourseId, course.id) : [],
    assessmentSubmissions: enrollment
      ? getGroupedItems(indexes.submissionsByEnrollmentId, enrollment.id)
      : student
        ? getGroupedItems(indexes.submissionsByStudentId, student.id)
        : [],
    certificates,
    messages: student ? getGroupedItems(indexes.threadsByStudentId, student.id) : [],
  };
}

function buildClassBundle(portal) {
  if (!portal?.student || !portal?.course) {
    return null;
  }

  const reviewCount = portal.assessmentSubmissions.filter((submission) => submission.status === 'in_review').length;
  const retryCount = portal.assessmentActivities.filter((activity) => activity.meta.status === 'retry').length;
  const notStartedCount = portal.assessmentActivities.filter((activity) => activity.meta.status === 'not_started').length;
  const latestSubmission = portal.assessmentSubmissions[0] || null;

  return sanitizeClassBundle({
    key: portal.enrollment?.id || portal.student.id,
    student: portal.student,
    account: portal.account,
    enrollment: portal.enrollment,
    course: portal.course,
    certificate: portal.certificate,
    assessments: portal.assessments,
    submissions: portal.assessmentSubmissions,
    gate: portal.certificateGate,
    portal,
    reviewCount,
    retryCount,
    notStartedCount,
    activeModuleTitle: portal.learning.currentModule?.title || 'Belum ada modul aktif',
    latestActivityAt: latestSubmission?.updatedAt
      || latestSubmission?.submittedAt
      || portal.enrollment?.updatedAt
      || portal.student.updatedAt,
  });
}

function buildStudentBundle(reference = {}, options = {}) {
  const context = createBackendContext(options);
  const portal = buildStudentClassPortal(buildPortalInput({
    context,
    user: reference.user || reference.actor || null,
    studentReference: {
      studentId: reference.studentId || reference.user?.studentId || reference.actor?.studentId,
      enrollmentId: reference.enrollmentId || reference.user?.enrollmentId || reference.actor?.enrollmentId,
      courseId: reference.courseId || reference.user?.courseId || reference.actor?.courseId,
      email: reference.email || reference.user?.email || reference.actor?.email,
      nis: reference.nis || reference.user?.nis || reference.actor?.nis,
    },
    accountReference: {
      accountId: reference.accountId || reference.user?.accountId || reference.actor?.accountId,
    },
  }));

  return buildClassBundle(portal);
}

const LATE_ATTENDANCE_AFTER_MINUTES = 15;
const VALID_SESSION_STATUSES = new Set(['scheduled', 'planned', 'published', 'completed', 'cancelled']);
const VALID_ATTENDANCE_STATUSES = new Set(['present', 'late', 'excused', 'absent']);

function parseDateTime(value) {
  const parsed = new Date(value || 0);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function sortSessionsAsc(left, right) {
  return (parseDateTime(left.startAt)?.getTime() || 0) - (parseDateTime(right.startAt)?.getTime() || 0);
}

function isEnrollmentAssignable(enrollment) {
  return String(enrollment?.status || '').toLowerCase() === 'active'
    && String(enrollment?.paymentStatus || '').toLowerCase() === 'verified';
}

function normalizeSessionPayload(payload = {}, courseId, now) {
  const title = String(payload.title || '').trim();
  const startAt = parseDateTime(payload.startAt || payload.startsAt || payload.scheduledAt);
  const endAt = parseDateTime(payload.endAt || payload.endsAt);
  const status = payload.status || 'scheduled';

  ensure(title, 'Judul jadwal wajib diisi.', 400, 'SCHEDULE_TITLE_REQUIRED');
  ensure(startAt, 'Waktu mulai jadwal tidak valid.', 400, 'SCHEDULE_START_INVALID');
  ensure(endAt, 'Waktu selesai jadwal tidak valid.', 400, 'SCHEDULE_END_INVALID');
  ensure(endAt.getTime() > startAt.getTime(), 'Waktu selesai harus setelah waktu mulai.', 400, 'SCHEDULE_RANGE_INVALID');
  ensure(VALID_SESSION_STATUSES.has(status), 'Status jadwal tidak valid.', 400, 'SCHEDULE_STATUS_INVALID');

  return {
    courseId: Number(courseId),
    moduleId: payload.moduleId || null,
    title,
    startAt: startAt.toISOString(),
    endAt: endAt.toISOString(),
    status,
    locationLabel: String(payload.locationLabel || payload.location || '').trim(),
    meetingLink: String(payload.meetingLink || '').trim(),
    instructorName: String(payload.instructorName || '').trim(),
    notes: String(payload.notes || '').trim(),
    updatedAt: now,
  };
}

function getSessionAssignments(sessionId, context) {
  return context.repositories.scheduleAssignments.raw()
    .filter((item) => String(item.sessionId) === String(sessionId) && item.assignmentStatus !== 'removed');
}

function getSessionAttendance(sessionId, context) {
  return context.repositories.attendanceRecords.raw()
    .filter((item) => String(item.sessionId) === String(sessionId));
}

function buildAttendanceSummary(records = [], assignments = []) {
  const counts = { present: 0, late: 0, excused: 0, absent: 0, pending: 0 };
  const recordedEnrollmentIds = new Set();

  records.forEach((record) => {
    if (counts[record.status] != null) {
      counts[record.status] += 1;
    }
    recordedEnrollmentIds.add(String(record.enrollmentId));
  });

  assignments.forEach((assignment) => {
    if (!recordedEnrollmentIds.has(String(assignment.enrollmentId))) {
      counts.pending += 1;
    }
  });

  const total = assignments.length || records.length;
  const attended = counts.present + counts.late + counts.excused;

  return {
    ...counts,
    total,
    attended,
    rate: total ? Math.round((attended / total) * 100) : 0,
  };
}

function decorateSession(session, context) {
  const assignments = getSessionAssignments(session.id, context);
  const attendance = getSessionAttendance(session.id, context);

  return {
    ...cloneValue(session),
    startsAt: session.startAt,
    endsAt: session.endAt,
    location: session.locationLabel || '',
    status: session.status === 'published' || session.status === 'planned' ? 'scheduled' : session.status,
    assignmentCount: assignments.length,
    attendanceSummary: buildAttendanceSummary(attendance, assignments),
  };
}

function createAssignmentsForSession(session, context) {
  const now = context.now();
  const existingKeys = new Set(context.repositories.scheduleAssignments.raw()
    .map((item) => `${item.sessionId}:${item.enrollmentId}`));

  context.repositories.enrollments.raw()
    .filter((enrollment) => String(enrollment.courseId) === String(session.courseId) && isEnrollmentAssignable(enrollment))
    .forEach((enrollment) => {
      const key = `${session.id}:${enrollment.id}`;
      if (existingKeys.has(key)) {
        return;
      }

      context.repositories.scheduleAssignments.insert({
        id: `assign-${session.id}-${enrollment.id}`,
        sessionId: session.id,
        enrollmentId: enrollment.id,
        studentId: Number(enrollment.studentId),
        courseId: Number(enrollment.courseId),
        status: 'scheduled',
        assignmentStatus: 'assigned',
        createdAt: now,
        updatedAt: now,
      }, { prepend: false });
    });
}

function listCourseSchedules(courseId, context) {
  const course = context.getIndexes().coursesById.get(toKey(courseId)) || null;
  ensure(course, 'Program kursus tidak ditemukan.', 404, 'COURSE_NOT_FOUND');

  const sessions = context.repositories.scheduleSessions.raw()
    .filter((item) => String(item.courseId) === String(courseId))
    .map((item) => decorateSession(item, context))
    .sort(sortSessionsAsc);

  return { sessions };
}

function createCourseSchedule(courseId, payload = {}, context) {
  const now = context.now();
  const course = context.getIndexes().coursesById.get(toKey(courseId)) || null;
  ensure(course, 'Program kursus tidak ditemukan.', 404, 'COURSE_NOT_FOUND');
  const record = {
    id: payload.id || `session-${courseId}-${Date.now()}`,
    ...normalizeSessionPayload(payload, courseId, now),
    createdAt: now,
  };

  context.repositories.scheduleSessions.insert(record, { prepend: false });
  const explicitEnrollmentIds = Array.isArray(payload.enrollmentIds)
    ? payload.enrollmentIds
    : payload.enrollmentId
      ? [payload.enrollmentId]
      : null;

  if (explicitEnrollmentIds) {
    const existingKeys = new Set(context.repositories.scheduleAssignments.raw()
      .map((item) => `${item.sessionId}:${item.enrollmentId}`));
    explicitEnrollmentIds.forEach((enrollmentId) => {
      const enrollment = context.getIndexes().enrollmentsById.get(toKey(enrollmentId)) || null;
      ensure(enrollment, 'Enrollment tidak ditemukan.', 404, 'ENROLLMENT_NOT_FOUND');
      ensure(String(enrollment.courseId) === String(course.id), 'Enrollment tidak sesuai dengan jadwal kursus.', 400, 'ENROLLMENT_COURSE_MISMATCH');
      const key = `${record.id}:${enrollment.id}`;
      if (existingKeys.has(key)) return;
      context.repositories.scheduleAssignments.insert({
        id: `assign-${record.id}-${enrollment.id}`,
        sessionId: record.id,
        enrollmentId: enrollment.id,
        studentId: Number(enrollment.studentId),
        courseId: Number(enrollment.courseId),
        status: 'scheduled',
        assignmentStatus: 'assigned',
        createdAt: now,
        updatedAt: now,
      }, { prepend: false });
    });
  } else {
    createAssignmentsForSession(record, context);
  }

  return decorateSession(record, context);
}

function updateCourseSchedule(courseId, scheduleId, payload = {}, context) {
  const existing = context.repositories.scheduleSessions.raw().find((item) => (
    String(item.id) === String(scheduleId) && String(item.courseId) === String(courseId)
  )) || null;
  ensure(existing, 'Jadwal tidak ditemukan.', 404, 'SCHEDULE_NOT_FOUND');

  const now = context.now();
  const nextRecord = {
    ...existing,
    ...normalizeSessionPayload({ ...existing, ...payload }, courseId, now),
    id: existing.id,
    createdAt: existing.createdAt,
  };

  context.repositories.scheduleSessions.update(existing.id, () => nextRecord);
  createAssignmentsForSession(nextRecord, context);
  return decorateSession(nextRecord, context);
}

function removeCourseSchedule(courseId, scheduleId, context) {
  const existing = context.repositories.scheduleSessions.raw().find((item) => (
    String(item.id) === String(scheduleId) && String(item.courseId) === String(courseId)
  )) || null;
  ensure(existing, 'Jadwal tidak ditemukan.', 404, 'SCHEDULE_NOT_FOUND');
  context.repositories.scheduleSessions.remove(existing.id);
  context.repositories.scheduleAssignments.replaceAll(context.repositories.scheduleAssignments.raw()
    .filter((item) => String(item.sessionId) !== String(existing.id)));
  context.repositories.attendanceRecords.replaceAll(context.repositories.attendanceRecords.raw()
    .filter((item) => String(item.sessionId) !== String(existing.id)));
  return { id: existing.id };
}

function listScheduleAttendance(scheduleId, context) {
  const indexes = context.getIndexes();
  const session = context.repositories.scheduleSessions.raw()
    .find((item) => String(item.id) === String(scheduleId)) || null;
  ensure(session, 'Jadwal tidak ditemukan.', 404, 'SCHEDULE_NOT_FOUND');
  const recordsByEnrollment = new Map(getSessionAttendance(scheduleId, context)
    .map((item) => [toKey(item.enrollmentId), item]));

  const rows = getSessionAssignments(scheduleId, context).map((assignment) => {
    const student = indexes.studentsById.get(toKey(assignment.studentId)) || null;
    const enrollment = indexes.enrollmentsById.get(toKey(assignment.enrollmentId)) || null;
    const record = recordsByEnrollment.get(toKey(assignment.enrollmentId)) || null;

    return {
      id: record?.id || assignment.id,
      studentId: assignment.studentId,
      enrollmentId: assignment.enrollmentId,
      assignment,
      student,
      enrollment,
      attendance: record,
      status: record?.status || 'pending',
    };
  });

  return {
    session: decorateSession(session, context),
    rows,
    roster: rows,
    summary: buildAttendanceSummary([...recordsByEnrollment.values()], getSessionAssignments(scheduleId, context)),
  };
}

function upsertAttendanceRecord(scheduleId, payload = {}, context, markedBy = 'admin') {
  const session = context.repositories.scheduleSessions.raw()
    .find((item) => String(item.id) === String(scheduleId)) || null;
  ensure(session, 'Jadwal tidak ditemukan.', 404, 'SCHEDULE_NOT_FOUND');
  ensure(session.status !== 'cancelled', 'Jadwal yang dibatalkan tidak bisa menerima absensi.', 400, 'SCHEDULE_CANCELLED');
  ensure(payload.enrollmentId, 'Enrollment wajib diisi.', 400, 'ENROLLMENT_REQUIRED');
  if (payload.status === 'unmarked') {
    const existingRecord = context.repositories.attendanceRecords.raw().find((item) => (
      String(item.sessionId) === String(scheduleId) && String(item.enrollmentId) === String(payload.enrollmentId)
    )) || null;
    if (existingRecord) {
      context.repositories.attendanceRecords.remove(existingRecord.id);
    }
    return null;
  }

  ensure(VALID_ATTENDANCE_STATUSES.has(payload.status), 'Status absensi tidak valid.', 400, 'ATTENDANCE_STATUS_INVALID');

  const assignment = getSessionAssignments(scheduleId, context)
    .find((item) => String(item.enrollmentId) === String(payload.enrollmentId)) || null;
  ensure(assignment, 'Siswa tidak terdaftar pada jadwal ini.', 404, 'SCHEDULE_ASSIGNMENT_NOT_FOUND');

  const now = context.now();
  const existing = context.repositories.attendanceRecords.raw().find((item) => (
    String(item.sessionId) === String(scheduleId) && String(item.enrollmentId) === String(payload.enrollmentId)
  )) || null;
  const nextRecord = {
    id: existing?.id || `att-${scheduleId}-${assignment.enrollmentId}`,
    sessionId: session.id,
    assignmentId: assignment.id,
    enrollmentId: assignment.enrollmentId,
    studentId: Number(assignment.studentId),
    courseId: Number(assignment.courseId),
    status: payload.status,
    checkInAt: payload.checkInAt || existing?.checkInAt || (payload.status === 'present' || payload.status === 'late' ? now : null),
    source: markedBy === 'student' ? 'student' : 'admin',
    recordedBy: payload.recordedBy || markedBy,
    notes: String(payload.notes || payload.note || '').trim(),
    markedAt: now,
    markedBy,
    note: String(payload.note || payload.notes || '').trim(),
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };

  if (existing) {
    context.repositories.attendanceRecords.update(existing.id, () => nextRecord);
  } else {
    context.repositories.attendanceRecords.insert(nextRecord, { prepend: false });
  }

  return nextRecord;
}

function getStudentScheduleBundle(reference = {}, context) {
  const portal = getStudentPortal(reference, { context });
  ensure(portal.student, 'Data siswa tidak ditemukan untuk sesi ini.', 404, 'STUDENT_PORTAL_NOT_FOUND');
  ensure(portal.enrollment && portal.course, 'Enrollment siswa tidak ditemukan.', 404, 'ENROLLMENT_NOT_FOUND');
  const access = buildClassroomAccessMeta(portal.enrollment, portal.course);
  ensure(access.canAccess, access.reason, 403, 'CLASSROOM_ACCESS_DENIED', access);
  const enrollmentId = portal.enrollment?.id;
  const assignments = context.repositories.scheduleAssignments.raw()
    .filter((item) => String(item.enrollmentId) === String(enrollmentId) && item.assignmentStatus !== 'removed');
  const assignedSessionIds = new Set(assignments.map((item) => String(item.sessionId)));
  const attendanceBySession = new Map(context.repositories.attendanceRecords.raw()
    .filter((item) => String(item.enrollmentId) === String(enrollmentId))
    .map((item) => [String(item.sessionId), item]));
  const schedules = context.repositories.scheduleSessions.raw()
    .filter((item) => assignedSessionIds.has(String(item.id)) && item.status !== 'cancelled')
    .map((session) => ({
      ...decorateSession(session, context),
      attendance: attendanceBySession.get(String(session.id)) || null,
      canCheckIn: canStudentCheckIn(session, portal),
    }))
    .sort(sortSessionsAsc);
  const upcoming = schedules.filter((session) => (parseDateTime(session.endAt)?.getTime() || 0) >= Date.now());
  const history = schedules.filter((session) => (parseDateTime(session.endAt)?.getTime() || 0) < Date.now());

  return {
    portal,
    access,
    schedules,
    sessions: schedules,
    upcoming,
    upcomingSessions: upcoming,
    history,
    attendanceHistory: history,
    nextSession: upcoming[0] || null,
    attendance: [...attendanceBySession.values()],
    summary: buildAttendanceSummary([...attendanceBySession.values()], assignments),
  };
}

function canStudentCheckIn(session, portal) {
  const access = buildClassroomAccessMeta(portal.enrollment, portal.course);
  if (!access.canAccess || ['cancelled', 'completed'].includes(String(session.status || '').toLowerCase())) {
    return false;
  }

  return true;
}

function checkInStudentSchedule(reference = {}, scheduleId, context, payload = {}) {
  const bundle = getStudentScheduleBundle(reference, context);
  const session = bundle.schedules.find((item) => String(item.id) === String(scheduleId)) || null;
  ensure(session, 'Jadwal tidak ditemukan untuk akun ini.', 404, 'STUDENT_SCHEDULE_NOT_FOUND');
  ensure(!session.attendance, 'Absensi untuk jadwal ini sudah tercatat.', 409, 'ATTENDANCE_ALREADY_RECORDED');
  ensure(session.canCheckIn, 'Absensi belum tersedia atau akses kelas belum aktif.', 400, 'CHECK_IN_NOT_AVAILABLE');

  const now = context.now();
  const startsAt = parseDateTime(session.startAt)?.getTime() || 0;
  const status = Date.now() > startsAt + (LATE_ATTENDANCE_AFTER_MINUTES * 60000) ? 'late' : 'present';

  return upsertAttendanceRecord(scheduleId, {
    enrollmentId: bundle.portal.enrollment?.id,
    status: ['present', 'late'].includes(String(payload.status || '').toLowerCase())
      ? String(payload.status).toLowerCase()
      : status,
    checkInAt: payload.checkInAt || now,
    notes: payload.notes,
  }, context, 'student');
}

export function buildLearningOpsSnapshot(options = {}) {
  const context = createBackendContext(options);
  const collections = context.getCollections();
  const indexes = context.getIndexes();
  const references = collections.enrollments.length
    ? collections.enrollments.map((enrollment) => ({
      enrollmentId: enrollment.id,
      studentId: enrollment.studentId,
      courseId: enrollment.courseId,
    }))
    : collections.students.map((student) => ({
      enrollmentId: student.enrollmentId,
      studentId: student.id,
      courseId: student.courseId,
    }));
  const classBundles = [];
  const reviewQueue = [];
  const retryQueue = [];
  const certificateQueue = [];
  const blockedByPayment = [];
  const courseHealthMap = new Map(collections.courses.map((course) => {
    const definitions = getGroupedItems(indexes.definitionsByCourseId, course.id);

    return [toKey(course.id), {
      course,
      activeStudents: 0,
      progressTotal: 0,
      reviewCount: 0,
      retryCount: 0,
      eligibleCount: 0,
      publishedAssessmentCount: getPublishedDefinitionCountForCourse(definitions),
    }];
  }));

  references.forEach((reference) => {
    const portal = buildStudentClassPortal(buildPortalInput({
      context,
      studentReference: reference,
    }));

    if (!portal.student || !portal.course) {
      return;
    }

    const bundle = buildClassBundle(portal);
    const reviewCount = bundle.reviewCount;
    const retryCount = bundle.retryCount;
    const courseHealth = courseHealthMap.get(toKey(bundle.course?.id));

    if (courseHealth) {
      courseHealth.activeStudents += 1;
      courseHealth.progressTotal += Number(bundle.portal.learning.completionPercent || 0);
      courseHealth.reviewCount += reviewCount;
      courseHealth.retryCount += retryCount;
      if (bundle.gate.eligible) {
        courseHealth.eligibleCount += 1;
      }
    }

    classBundles.push(bundle);

    bundle.submissions
      .filter((submission) => submission.status === 'in_review')
      .forEach((submission) => {
      const activity = bundle.portal.assessmentActivities.find((item) => item.key === normalizeAssessmentType(submission.type));
      reviewQueue.push({
        id: submission.id,
        bundle,
        submission,
        activity,
        student: bundle.student,
        course: bundle.course,
        enrollment: bundle.enrollment,
        ageLabel: formatQueueAge(submission.submittedAt || submission.updatedAt),
        ageDays: getDaysSince(submission.submittedAt || submission.updatedAt) ?? 0,
      });
    });

    bundle.portal.assessmentActivities
      .filter((activity) => activity.meta.status === 'retry')
      .forEach((activity) => {
        retryQueue.push({ bundle, activity });
      });

    if (bundle.gate.eligible && !bundle.gate.downloadReady) {
      certificateQueue.push(bundle);
    }

    if (String(bundle.enrollment?.paymentStatus || bundle.student.paymentStatus || '').toLowerCase() !== 'verified') {
      blockedByPayment.push(bundle);
    }
  });

  reviewQueue.sort((left, right) => right.ageDays - left.ageDays);

  const unpublishedDefinitions = collections.courses.flatMap((course) => (
    ASSESSMENT_TYPE_CONFIG
      .map((typeItem) => {
        const definition = getGroupedItems(indexes.definitionsByCourseId, course.id)
          .find((item) => normalizeAssessmentType(item.type) === typeItem.key);

        return definition && definition.isPublished !== false
          ? null
          : { course, type: typeItem };
      })
      .filter(Boolean)
  ));
  const courseHealth = [...courseHealthMap.values()]
    .map((item) => ({
      course: item.course,
      activeStudents: item.activeStudents,
      averageProgress: item.activeStudents ? Math.round(item.progressTotal / item.activeStudents) : 0,
      publishedAssessmentCount: item.publishedAssessmentCount,
      reviewCount: item.reviewCount,
      retryCount: item.retryCount,
      eligibleCount: item.eligibleCount,
    }))
    .sort((left, right) => (right.reviewCount + right.retryCount) - (left.reviewCount + left.retryCount));
  const nowTime = Date.now();
  const weekAheadTime = nowTime + (7 * 86400000);
  const recentWindowTime = nowTime - (7 * 86400000);
  const upcomingSessions = collections.scheduleSessions.filter((session) => {
    const startTime = parseDateTime(session.startAt)?.getTime() || 0;
    return session.status !== 'cancelled' && startTime >= nowTime && startTime <= weekAheadTime;
  });
  const completedSessions = collections.scheduleSessions.filter((session) => (
    session.status === 'completed' || (parseDateTime(session.endAt)?.getTime() || 0) < nowTime
  ));
  const pendingAttendanceSessions = completedSessions.filter((session) => {
    const assignments = getSessionAssignments(session.id, context);
    const records = getSessionAttendance(session.id, context);
    return assignments.length > records.length;
  });
  const recentAttendanceRecords = collections.attendanceRecords.filter((record) => (
    (parseDateTime(record.markedAt || record.checkInAt)?.getTime() || 0) >= recentWindowTime
  ));
  const attendanceRate7d = recentAttendanceRecords.length
    ? Math.round((recentAttendanceRecords.filter((record) => ['present', 'late', 'excused'].includes(record.status)).length / recentAttendanceRecords.length) * 100)
    : 0;
  const riskByEnrollment = recentAttendanceRecords.reduce((map, record) => {
    if (record.status === 'absent' || record.status === 'late') {
      map.set(toKey(record.enrollmentId), (map.get(toKey(record.enrollmentId)) || 0) + 1);
    }
    return map;
  }, new Map());
  const atRiskStudentsCount = [...riskByEnrollment.values()].filter((count) => count >= 2).length;

  return {
    classBundles,
    reviewQueue,
    retryQueue,
    certificateQueue,
    blockedByPayment,
    unpublishedDefinitions,
    courseHealth,
    scheduleHealth: {
      upcomingSessions: upcomingSessions.map((session) => decorateSession(session, context)).sort(sortSessionsAsc),
      pendingAttendanceSessions: pendingAttendanceSessions.map((session) => decorateSession(session, context)).sort(sortSessionsAsc),
      attendanceRate7d,
      atRiskStudentsCount,
    },
    stats: {
      reviewQueueCount: reviewQueue.length,
      retryCount: retryQueue.length,
      notStartedCount: classBundles.reduce((sum, bundle) => sum + bundle.notStartedCount, 0),
      eligibleCertificateCount: classBundles.filter((bundle) => bundle.gate.eligible).length,
      certificateReadyToUploadCount: certificateQueue.length,
      certificateUploadedCount: classBundles.filter((bundle) => bundle.gate.downloadReady).length,
      assessmentUnpublishedCount: unpublishedDefinitions.length,
      blockedByPaymentCount: blockedByPayment.length,
      upcomingSessionsCount: upcomingSessions.length,
      pendingAttendanceMarkingCount: pendingAttendanceSessions.length,
      attendanceRate7d,
      atRiskStudentsCount,
    },
  };
}

function buildAdminDashboardPayload(options = {}) {
  const context = createBackendContext(options);
  const learningOps = buildLearningOpsSnapshot({ context });
  const collections = context.getCollections();
  const unreadPublicCount = collections.publicMessages.filter((message) => message.status === 'unread').length;
  const unreadStudentCount = collections.studentMessages.filter((message) => message.status === 'unread').length;
  const pendingPayments = learningOps.classBundles.filter((bundle) => (
    String(bundle.enrollment?.paymentStatus || bundle.student.paymentStatus || '').toLowerCase() === 'pending'
  )).length;
  const recentEnrollments = [...learningOps.classBundles]
    .sort((left, right) => new Date(right.student.registrationDate || 0) - new Date(left.student.registrationDate || 0))
    .slice(0, 5)
    .map((bundle) => ({
      id: bundle.student.id,
      name: bundle.student.name,
      nis: bundle.student.nis || '',
      courseId: bundle.course?.id || null,
      program: bundle.course?.title || bundle.student.program || '',
      status: bundle.student.status,
      paymentStatus: bundle.enrollment?.paymentStatus || bundle.student.paymentStatus || 'pending',
      registrationDate: bundle.student.registrationDate || bundle.student.createdAt || bundle.enrollment?.createdAt || null,
    }));
  const programDistributionMap = learningOps.classBundles.reduce((result, bundle) => {
    const name = bundle.course?.title || bundle.student.program || 'Program';
    result.set(name, (result.get(name) || 0) + 1);
    return result;
  }, new Map());
  const programDistribution = [...programDistributionMap.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((left, right) => right.value - left.value)
    .slice(0, 5)
    .map((item) => ({
      ...item,
      percentage: learningOps.classBundles.length
        ? Math.round((item.value / learningOps.classBundles.length) * 100)
        : 0,
    }));

  return {
    summary: {
      totalStudents: learningOps.classBundles.length,
      totalCourses: collections.courses.length,
      totalCertificates: collections.certificates.length,
      totalBlogPosts: collections.blogPosts.length,
      unreadPublicCount,
      unreadStudentCount,
      pendingPayments,
      reviewQueueCount: learningOps.stats.reviewQueueCount,
      retryCount: learningOps.stats.retryCount,
      notStartedCount: learningOps.stats.notStartedCount,
      certificateReadyToUploadCount: learningOps.stats.certificateReadyToUploadCount,
      upcomingSessionsCount: learningOps.stats.upcomingSessionsCount,
      pendingAttendanceMarkingCount: learningOps.stats.pendingAttendanceMarkingCount,
      attendanceRate7d: learningOps.stats.attendanceRate7d,
      atRiskStudentsCount: learningOps.stats.atRiskStudentsCount,
    },
    recentEnrollments,
    programDistribution,
    reviewQueueTop: learningOps.reviewQueue.slice(0, 4),
    courseHealthTop: learningOps.courseHealth.slice(0, 5),
    scheduleHealth: learningOps.scheduleHealth,
  };
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

function syncStudentRelationshipFields(student, enrollment, course) {
  return {
    courseId: course?.id ?? student.courseId ?? enrollment?.courseId ?? null,
    enrollmentId: enrollment?.id ?? student.enrollmentId ?? null,
    program: course?.title || enrollment?.program || student.program || '',
  };
}

export function createAdminService(options = {}) {
  const context = createBackendContext(options);
  const { repositories } = context;

  return {
    getDashboard() {
      return buildAdminDashboardPayload({ context });
    },

    getLearningOps() {
      return buildLearningOpsSnapshot({ context });
    },

    listCourseSchedules(courseIdOrFilters = {}) {
      const filters = typeof courseIdOrFilters === 'object' && courseIdOrFilters !== null
        ? courseIdOrFilters
        : { courseId: courseIdOrFilters };
      let sessions = filters.courseId
        ? listCourseSchedules(filters.courseId, context).sessions
        : context.repositories.scheduleSessions.raw().map((item) => decorateSession(item, context));

      if (filters.enrollmentId) {
        const sessionIds = new Set(context.repositories.scheduleAssignments.raw()
          .filter((assignment) => String(assignment.enrollmentId) === String(filters.enrollmentId))
          .map((assignment) => String(assignment.sessionId)));
        sessions = sessions.filter((session) => sessionIds.has(String(session.id)));
      }

      if (filters.status) {
        sessions = sessions.filter((session) => String(session.status || '').toLowerCase() === String(filters.status).toLowerCase());
      }

      if (filters.from) {
        const from = parseDateTime(filters.from);
        ensure(from, 'Tanggal awal tidak valid.', 400, 'FROM_INVALID');
        sessions = sessions.filter((session) => (parseDateTime(session.startAt)?.getTime() || 0) >= from.getTime());
      }

      if (filters.to) {
        const to = parseDateTime(filters.to);
        ensure(to, 'Tanggal akhir tidak valid.', 400, 'TO_INVALID');
        sessions = sessions.filter((session) => (parseDateTime(session.startAt)?.getTime() || 0) <= to.getTime());
      }

      return { sessions: sessions.sort(sortSessionsAsc) };
    },

    createCourseSchedule(courseId, payload = {}) {
      if (typeof courseId === 'object' && courseId !== null) {
        return createCourseSchedule(courseId.courseId, courseId, context);
      }
      return createCourseSchedule(courseId, payload, context);
    },

    updateCourseSchedule(courseId, scheduleId, payload = {}) {
      return updateCourseSchedule(courseId, scheduleId, payload, context);
    },

    removeCourseSchedule(courseId, scheduleId) {
      return removeCourseSchedule(courseId, scheduleId, context);
    },

    listScheduleAttendance(scheduleId) {
      return listScheduleAttendance(scheduleId, context);
    },

    assignEnrollmentsToSchedule(scheduleId, payload = {}) {
      const session = context.repositories.scheduleSessions.raw()
        .find((item) => String(item.id) === String(scheduleId)) || null;
      ensure(session, 'Jadwal tidak ditemukan.', 404, 'SCHEDULE_NOT_FOUND');
      const enrollmentIds = Array.isArray(payload.enrollmentIds)
        ? payload.enrollmentIds
        : payload.enrollmentId
          ? [payload.enrollmentId]
          : [];
      ensure(enrollmentIds.length, 'Minimal satu enrollment wajib dipilih.', 400, 'ENROLLMENT_REQUIRED');
      const existingKeys = new Set(context.repositories.scheduleAssignments.raw()
        .map((item) => `${item.sessionId}:${item.enrollmentId}`));
      const now = context.now();

      enrollmentIds.forEach((enrollmentId) => {
        const enrollment = context.getIndexes().enrollmentsById.get(toKey(enrollmentId)) || null;
        ensure(enrollment, 'Enrollment tidak ditemukan.', 404, 'ENROLLMENT_NOT_FOUND');
        ensure(String(enrollment.courseId) === String(session.courseId), 'Enrollment tidak sesuai dengan jadwal kursus.', 400, 'ENROLLMENT_COURSE_MISMATCH');
        const key = `${session.id}:${enrollment.id}`;
        if (existingKeys.has(key)) return;
        context.repositories.scheduleAssignments.insert({
          id: `assign-${session.id}-${enrollment.id}`,
          sessionId: session.id,
          enrollmentId: enrollment.id,
          studentId: Number(enrollment.studentId),
          courseId: Number(enrollment.courseId),
          status: 'scheduled',
          assignmentStatus: 'assigned',
          createdAt: now,
          updatedAt: now,
        }, { prepend: false });
      });

      return listScheduleAttendance(scheduleId, context);
    },

    listSessionAttendance(scheduleId) {
      return listScheduleAttendance(scheduleId, context);
    },

    recordSessionAttendance(scheduleId, payload = {}) {
      const existing = context.repositories.attendanceRecords.raw().find((item) => (
        String(item.sessionId) === String(scheduleId)
        && String(item.enrollmentId) === String(payload.enrollmentId)
      )) || null;
      ensure(!existing, 'Attendance untuk enrollment dan sesi ini sudah ada.', 409, 'ATTENDANCE_DUPLICATE');
      return upsertAttendanceRecord(scheduleId, {
        ...payload,
        status: payload.status || 'present',
      }, context, payload.source || 'admin');
    },

    updateSessionAttendance(scheduleId, attendanceId, payload = {}) {
      const attendance = context.repositories.attendanceRecords.raw().find((item) => (
        String(item.id) === String(attendanceId)
        && String(item.sessionId) === String(scheduleId)
      )) || null;
      ensure(attendance, 'Attendance tidak ditemukan.', 404, 'ATTENDANCE_NOT_FOUND');
      return upsertAttendanceRecord(scheduleId, {
        ...attendance,
        ...payload,
        enrollmentId: attendance.enrollmentId,
        status: payload.status || attendance.status,
      }, context, payload.source || attendance.source || 'admin');
    },

    updateScheduleAttendance(scheduleId, payload = {}) {
      const records = Array.isArray(payload.records) ? payload.records : [payload];
      records.forEach((record) => upsertAttendanceRecord(scheduleId, record, context, 'admin'));
      return listScheduleAttendance(scheduleId, context);
    },

    getStudentSchedules(reference = {}) {
      const bundle = getStudentScheduleBundle(reference, context);
      return {
        access: bundle.access,
        schedules: bundle.schedules,
        summary: bundle.summary,
      };
    },

    getStudentAttendance(reference = {}) {
      const bundle = getStudentScheduleBundle(reference, context);
      return {
        access: bundle.access,
        attendance: bundle.attendance,
        summary: bundle.summary,
      };
    },

    checkInStudentSchedule(reference = {}, scheduleId, payload = {}) {
      const attendance = checkInStudentSchedule(reference, scheduleId, context, payload);
      return {
        attendance,
        schedules: getStudentScheduleBundle(reference, context).schedules,
      };
    },

    listStudents(filters = {}) {
      const snapshot = buildLearningOpsSnapshot({ context });
      const normalizedSearch = String(filters.search || '').trim().toLowerCase();

      return snapshot.classBundles.filter((bundle) => {
        const haystack = `${bundle.student.name} ${bundle.student.nis} ${bundle.student.email} ${bundle.course?.title || ''}`.toLowerCase();
        const matchesSearch = normalizedSearch ? haystack.includes(normalizedSearch) : true;
        const paymentStatus = String(bundle.enrollment?.paymentStatus || bundle.student.paymentStatus || '').toLowerCase();
        const matchesPayment = filters.paymentStatus
          ? paymentStatus === String(filters.paymentStatus).toLowerCase()
          : true;
        const matchesCertificate = filters.certificateReady === 'true'
          ? bundle.gate.eligible && bundle.gate.downloadReady
          : filters.certificateReady === 'pending'
            ? bundle.gate.eligible && !bundle.gate.downloadReady
            : true;

        return matchesSearch && matchesPayment && matchesCertificate;
      });
    },

    getStudent(studentId) {
      const bundle = buildStudentBundle({ studentId }, { context });
      ensure(bundle, 'Data siswa tidak ditemukan.', 404, 'STUDENT_NOT_FOUND');
      return bundle;
    },

    updateStudent(studentId, payload = {}) {
      const resolved = resolveStudentAndAccount(studentId, context);
      const now = context.now();
      const currentCourse = findCourseByReference(repositories.courses.raw(), {
        courseId: payload.courseId ?? resolved.student.courseId ?? resolved.enrollment?.courseId,
        program: payload.program ?? resolved.student.program ?? resolved.enrollment?.program,
      });
      const relationFields = syncStudentRelationshipFields(resolved.student, resolved.enrollment, currentCourse);

      if (payload.email) {
        const normalizedEmail = normalizeLoginIdentifier(payload.email);
        const duplicate = repositories.accounts.raw().find((account) => (
          String(account.id) !== String(resolved.account?.id)
          && normalizeLoginIdentifier(account.email) === normalizedEmail
        ));
        ensure(!duplicate, 'Email sudah dipakai akun lain.', 409, 'EMAIL_ALREADY_USED');
      }

      const updatedStudent = repositories.students.update(studentId, (student) => ({
        ...student,
        name: payload.name ?? student.name,
        email: payload.email ? normalizeLoginIdentifier(payload.email) : student.email,
        phone: payload.phone ?? student.phone,
        address: payload.address ?? student.address,
        notes: payload.notes ?? student.notes,
        status: payload.status ?? student.status,
        paymentStatus: payload.paymentStatus ?? student.paymentStatus,
        paymentDate: payload.paymentDate ?? student.paymentDate,
        ...relationFields,
        updatedAt: now,
      }));

      if (resolved.account) {
        repositories.accounts.update(resolved.account.id, (account) => ({
          ...account,
          name: payload.name ?? account.name,
          displayName: payload.name ?? account.displayName,
          email: payload.email ? normalizeLoginIdentifier(payload.email) : account.email,
          courseId: relationFields.courseId,
          enrollmentId: relationFields.enrollmentId,
          updatedAt: now,
        }));
      }

      if (resolved.enrollment) {
        repositories.enrollments.update(resolved.enrollment.id, (enrollment) => ({
          ...enrollment,
          courseId: relationFields.courseId,
          program: relationFields.program,
          status: payload.enrollmentStatus ?? payload.status ?? enrollment.status,
          paymentStatus: payload.paymentStatus ?? enrollment.paymentStatus,
          paymentDate: payload.paymentDate ?? enrollment.paymentDate,
          updatedAt: now,
        }));
      }

      return updatedStudent;
    },

    updatePaymentStatus(studentId, payload = {}) {
      ensure(payload.paymentStatus, 'Status pembayaran wajib diisi.', 400, 'PAYMENT_STATUS_REQUIRED');
      return this.updateStudent(studentId, {
        paymentStatus: payload.paymentStatus,
        paymentDate: payload.paymentStatus === 'verified'
          ? payload.paymentDate || new Date().toISOString().slice(0, 10)
          : payload.paymentDate ?? null,
        notes: payload.notes,
      });
    },

    listCertificates(filters = {}) {
      const certificates = repositories.certificates.list();
      if (!filters.studentId) {
        return certificates.sort(compareByUpdatedDesc);
      }

      return certificates
        .filter((item) => String(item.studentId) === String(filters.studentId))
        .sort(compareByUpdatedDesc);
    },

    upsertCertificate(studentId, payload = {}) {
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

    listCourseHealth() {
      return buildLearningOpsSnapshot({ context }).courseHealth;
    },

    getPublicOverview() {
      return {
        profile: repositories.profile.get(),
        courses: repositories.courses.list().filter((item) => item.status !== 'archived'),
        blogPosts: repositories.blogPosts.list().filter((item) => item.status !== 'archived'),
        galleryItems: repositories.galleryItems.list(),
        accreditations: repositories.accreditations.list(),
      };
    },

    findAccountByIdentifier(identifier) {
      const normalizedIdentifier = normalizeLoginIdentifier(identifier);
      const students = repositories.students.raw();

      return repositories.accounts.raw().find((account) => {
        if (String(account.status || 'active').toLowerCase() !== 'active') {
          return false;
        }

        const identifiers = getAccountIdentifiers(
          account,
          students.find((student) => String(student.id) === String(account.studentId)) || null,
        );

        return identifiers.includes(normalizedIdentifier);
      }) || null;
    },

    buildSessionUser(account) {
      if (!account) return null;

      const student = repositories.students.raw().find((item) => (
        String(item.id) === String(account.studentId)
        || String(item.accountId) === String(account.id)
      )) || null;
      const enrollment = findEnrollmentByReference(repositories.enrollments.raw(), {
        enrollmentId: account.enrollmentId || student?.enrollmentId,
        studentId: account.studentId || student?.id,
        courseId: account.courseId || student?.courseId,
        program: student?.program,
      }, repositories.courses.raw());
      const course = findCourseByReference(repositories.courses.raw(), {
        courseId: enrollment?.courseId || account.courseId || student?.courseId,
        program: student?.program,
      });

      return buildSessionUser({ account, student, enrollment, course });
    },

    normalizeThread(thread) {
      const normalized = normalizeThreadMessages(thread);
      return {
        ...thread,
        body: normalized.body,
        messages: normalized.messages,
        responses: normalized.responses,
        updatedAt: thread.updatedAt || normalized.lastMessageAt,
        lastMessageAt: thread.lastMessageAt || normalized.lastMessageAt,
        lastMessagePreview: thread.lastMessagePreview || normalized.messages.at(-1)?.body || normalized.body,
      };
    },

    getContext() {
      return context;
    },

    helpers: {
      cloneValue,
      compareByUpdatedDesc,
      createServiceError,
      ensure,
      formatCurrency,
      getLatestNumber,
      parseNumericSuffix,
      rebuildMediaLibrary: () => rebuildMediaLibrary({ context }),
      resolveStudentByReference: (reference = {}) => resolveStudentByReference(repositories.students.list(), reference),
      slugify,
      toIsoTimestamp,
    },
  };
}

export default createAdminService;
