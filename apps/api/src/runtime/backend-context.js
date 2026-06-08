/**
 * Backend Context Runtime Module
 *
 * Extracted from admin.service.js (Phase 8).
 * Provides the in-memory backend context used by the repository adapter
 * in dev/demo/fallback mode. Contains:
 *   - in-memory state bootstrap
 *   - array/object repository factories
 *   - collection + index builders
 *   - createBackendContext() factory
 *
 * This module has zero coupling to business logic.
 * Business logic lives in packages/domain/src/use-cases/.
 */

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
} from '@lkp-parduli-rasa/domain/defaults';
import { normalizeLoginIdentifier, normalizeAssessmentType } from '@lkp-parduli-rasa/domain/domain-relations';

// ---------------------------------------------------------------------------
// Collection registry
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Shared singleton state (in-memory)
// ---------------------------------------------------------------------------

let sharedState;

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------

function cloneValue(value) {
  if (value == null) return value;
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

function toKey(value) {
  return String(value ?? '');
}

export function buildSingleIndex(items, resolver) {
  return items.reduce((index, item) => {
    index.set(toKey(resolver(item)), item);
    return index;
  }, new Map());
}

export function buildGroupedIndex(items, resolver) {
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

export function getGroupedItems(index, key) {
  return index.get(toKey(key)) || [];
}

// ---------------------------------------------------------------------------
// Media library builder (used to pre-populate from seed)
// ---------------------------------------------------------------------------

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
      mimeType:'application/pdf',
      isObjectUrl: false,
      createdAt: item.updatedAt || new Date().toISOString(),
      updatedAt: item.updatedAt || new Date().toISOString(),
    });
  });

  return media;
}

// ---------------------------------------------------------------------------
// State bootstrap
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Repository factories
// ---------------------------------------------------------------------------

export function createArrayRepository(state, key) {
  return {
    key,
    list() { return cloneValue(state[key]); },
    raw() { return state[key]; },
    getById(id) {
      return cloneValue(state[key].find((item) => String(item.id) === String(id)) || null);
    },
    insert(record, { prepend = true } = {}) {
      state[key] = prepend ? [cloneValue(record), ...state[key]] : [...state[key], cloneValue(record)];return cloneValue(record);
    },
    update(id, updater) {
      let updatedRecord = null;
      state[key] = state[key].map((item) => {
        if (String(item.id) !== String(id)) return item;
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

export function createObjectRepository(state, key) {
  return {
    get() { return cloneValue(state[key]); },
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

// ---------------------------------------------------------------------------
// State accessors
// ---------------------------------------------------------------------------

export function getBackendState(options = {}) {
  if (options.state) return options.state;
  if (options.context?.state) return options.context.state;
  if (!sharedState) sharedState = buildDefaultState(options.seedState);
  return sharedState;
}

export function resetBackendState(seedState = {}) {
  sharedState = buildDefaultState(seedState);
  return sharedState;
}

// ---------------------------------------------------------------------------
// Main context factory
// ---------------------------------------------------------------------------

export function rebuildMediaLibrary(options = {}) {const context = createBackendContext(options);
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
      blogPosts: repositories.blogPosts.raw(),};

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
    if (indexCache) return indexCache;

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
    now() { return new Date().toISOString(); },
    getState() { return state; },
  };
}