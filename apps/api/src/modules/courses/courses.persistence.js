import { and, asc, desc, eq, inArray } from 'drizzle-orm';
import { requireDb, isDatabaseConfigured } from '../../db/client.js';
import {
  courseModules,
  courses,
  enrollments,
  mediaAssets,
} from '../../db/schema/index.js';
import {
  isDataUrl,
  persistDataUrlMediaAsset,
  removeStoredMediaFile,
} from '../media/media.storage.js';
import { ensureUniqueSlug } from '../../utils/slug.js';

function toBoolean(value) {
  return value === true || value === 'true';
}

function toDateString(value) {
  if (!value) {
    return new Date().toISOString();
  }

  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

function toInteger(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toStringArray(value) {
  return Array.isArray(value)
    ? value.map((item) => String(item || '').trim()).filter(Boolean)
    : [];
}

function hasOwn(payload, key) {
  return Object.prototype.hasOwnProperty.call(payload, key);
}

function isBlankValue(value) {
  return value == null || String(value).trim() === '';
}

function buildModuleMaterials(modules = []) {
  return modules.map((item) => ({
    id: item.id,
    title: item.title,
    summary: item.summary || '',
    fileName: item.fileName || '',
    fileUrl: item.fileUrl || '',
    mimeType: item.mimeType || '',
  }));
}

function mapModuleRow(row, mediaRow = null, courseTitle = '') {
  return {
    id: row.id,
    courseId: Number(row.courseId),
    courseTitle,
    title: row.title,
    summary: row.summary || '',
    order: Number(row.order || 0),
    durationLabel: row.durationLabel || '',
    resourceType: row.resourceType || 'lesson',
    isPublished: toBoolean(row.isPublished),
    fileName: mediaRow?.originalName || '',
    fileUrl: mediaRow?.publicUrl || '',
    mimeType: mediaRow?.mimeType || '',
    sizeLabel: mediaRow?.metadata?.fileSizeLabel || '',
    createdAt: toDateString(row.createdAt),
    updatedAt: toDateString(row.updatedAt),
  };
}

function mapCourseRow(row, modules = [], brochureMedia = null) {
  return {
    id: Number(row.id),
    slug: row.slug || '',
    title: row.title,
    aliases: Array.isArray(row.aliases) ? row.aliases : [],
    description: row.description || '',
    icon: row.icon || 'FileText',
    priceValue: Number(row.priceValue || 0),
    priceLabel: row.priceLabel || '',
    duration: row.duration || '',
    level: row.level || 'Umum',
    brochureName: brochureMedia?.originalName || '',
    brochureUrl: brochureMedia?.publicUrl || '',
    brochureMimeType: brochureMedia?.mimeType || '',
    materials: buildModuleMaterials(modules),
    moduleIds: modules.map((item) => item.id),
    moduleCount: modules.length,
    modules,
    isPublished: toBoolean(row.isPublished),
    createdAt: toDateString(row.createdAt),
    updatedAt: toDateString(row.updatedAt),
  };
}

async function listCourseRows(database) {
  return database.select().from(courses).orderBy(asc(courses.title), asc(courses.id));
}

async function listModuleRows(database, courseIds = []) {
  if (!courseIds.length) {
    return [];
  }

  return database.select().from(courseModules)
    .where(inArray(courseModules.courseId, courseIds.map((item) => Number(item))))
    .orderBy(asc(courseModules.order), asc(courseModules.createdAt));
}

async function listMediaRows(database, mediaIds = []) {
  const normalizedIds = [...new Set(mediaIds.filter(Boolean).map((item) => String(item)))];
  if (!normalizedIds.length) {
    return [];
  }

  return database.select().from(mediaAssets).where(inArray(mediaAssets.id, normalizedIds));
}

async function hydrateCourseRows(database, courseRows = []) {
  if (!courseRows.length) {
    return [];
  }

  const courseIds = courseRows.map((row) => Number(row.id));
  const moduleRows = await listModuleRows(database, courseIds);
  const moduleMediaRows = await listMediaRows(database, moduleRows.map((row) => row.fileMediaId));
  const brochureMediaRows = await listMediaRows(database, courseRows.map((row) => row.brochureMediaId));
  const moduleMediaById = new Map(moduleMediaRows.map((row) => [String(row.id), row]));
  const brochureMediaById = new Map(brochureMediaRows.map((row) => [String(row.id), row]));
  const modulesByCourseId = moduleRows.reduce((accumulator, row) => {
    const bucket = accumulator.get(String(row.courseId)) || [];
    bucket.push(row);
    accumulator.set(String(row.courseId), bucket);
    return accumulator;
  }, new Map());

  return courseRows.map((courseRow) => {
    const rawModules = modulesByCourseId.get(String(courseRow.id)) || [];
    const modules = rawModules.map((row) => mapModuleRow(
      row,
      row.fileMediaId ? moduleMediaById.get(String(row.fileMediaId)) || null : null,
      courseRow.title,
    ));
    const brochureMedia = courseRow.brochureMediaId
      ? brochureMediaById.get(String(courseRow.brochureMediaId)) || null
      : null;
    return mapCourseRow(courseRow, modules, brochureMedia);
  });
}

async function getCourseRow(database, courseId) {
  return (await database.select().from(courses).where(eq(courses.id, Number(courseId))).limit(1))[0] || null;
}

async function getModuleRow(database, courseId, moduleId) {
  return (await database.select().from(courseModules).where(and(
    eq(courseModules.id, String(moduleId)),
    eq(courseModules.courseId, Number(courseId)),
  )).limit(1))[0] || null;
}

async function getNextCourseId(database) {
  const [lastCourse] = await database.select().from(courses).orderBy(desc(courses.id)).limit(1);
  return Number(lastCourse?.id || 0) + 1;
}

async function resolveCourseSlug(database, payload = {}, fallbackTitle = '', currentCourseId = null) {
  const allRows = await listCourseRows(database);
  const existingSlugs = allRows
    .filter((row) => currentCourseId == null || Number(row.id) !== Number(currentCourseId))
    .map((row) => row.slug)
    .filter(Boolean);
  const requestedSlug = String(payload.slug || '').trim();
  const baseValue = requestedSlug || fallbackTitle || 'course';
  return ensureUniqueSlug(baseValue, existingSlugs);
}

async function persistLinkedMedia(tx, options = {}) {
  const {
    existingMediaId = null,
    ownerType,
    ownerId,
    url = '',
    name = '',
    mimeType = '',
    metadata = {},
  } = options;

  const mediaId = existingMediaId || `${ownerType}-${ownerId}`;
  const persistedUpload = isDataUrl(url)
    ? await persistDataUrlMediaAsset({
      mediaId,
      ownerType,
      ownerId,
      fileName: name,
      mimeType,
      dataUrl: url,
      metadata,
    })
    : null;
  const record = {
    id: String(mediaId),
    visibility: 'public',
    storageKey: persistedUpload?.storageKey || null,
    publicUrl: persistedUpload?.publicUrl || String(url || ''),
    originalName: persistedUpload?.originalName || String(name || ''),
    mimeType: persistedUpload?.mimeType || String(mimeType || ''),
    ownerType: String(ownerType),
    ownerId: String(ownerId),
    metadata: {
      ...(persistedUpload?.metadata || {}),
      ...metadata,
    },
    updatedAt: new Date(),
  };

  await tx.insert(mediaAssets).values({
    ...record,
    createdAt: new Date(),
  }).onConflictDoUpdate({
    target: mediaAssets.id,
    set: {
      publicUrl: record.publicUrl,
      originalName: record.originalName,
      mimeType: record.mimeType,
      ownerType: record.ownerType,
      ownerId: record.ownerId,
      metadata: record.metadata,
      updatedAt: record.updatedAt,
    },
  });

  return String(mediaId);
}

async function upsertCourseBrochure(tx, courseId, payload = {}, existingCourse = null) {
  const shouldTouch = hasOwn(payload, 'brochureUrl')
    || hasOwn(payload, 'brochureName')
    || hasOwn(payload, 'brochureMimeType');
  if (!shouldTouch) {
    return existingCourse?.brochureMediaId || null;
  }

  const existingAsset = existingCourse?.brochureMediaId
    ? (await tx.select().from(mediaAssets).where(eq(mediaAssets.id, String(existingCourse.brochureMediaId))).limit(1))[0] || null
    : null;
  const nextUrl = hasOwn(payload, 'brochureUrl') ? String(payload.brochureUrl || '') : existingAsset?.publicUrl || '';
  const nextName = hasOwn(payload, 'brochureName') ? String(payload.brochureName || '') : existingAsset?.originalName || '';
  const nextMimeType = hasOwn(payload, 'brochureMimeType') ? String(payload.brochureMimeType || '') : existingAsset?.mimeType || '';

  if (isBlankValue(nextUrl) && isBlankValue(nextName) && isBlankValue(nextMimeType)) {
    return null;
  }

  return persistLinkedMedia(tx, {
    existingMediaId: existingCourse?.brochureMediaId || existingAsset?.id || `course-brochure-${courseId}`,
    ownerType: 'course_brochure',
    ownerId: courseId,
    url: nextUrl,
    name: nextName,
    mimeType: nextMimeType,
    metadata: {
      domain: 'courses',
      role: 'brochure',
    },
  });
}

async function upsertModuleMedia(tx, courseId, moduleId, payload = {}, existingModule = null) {
  const shouldTouch = hasOwn(payload, 'fileUrl')
    || hasOwn(payload, 'fileName')
    || hasOwn(payload, 'mimeType')
    || hasOwn(payload, 'sizeLabel');
  if (!shouldTouch) {
    return existingModule?.fileMediaId || null;
  }

  const existingAsset = existingModule?.fileMediaId
    ? (await tx.select().from(mediaAssets).where(eq(mediaAssets.id, String(existingModule.fileMediaId))).limit(1))[0] || null
    : null;
  const nextUrl = hasOwn(payload, 'fileUrl') ? String(payload.fileUrl || '') : existingAsset?.publicUrl || '';
  const nextName = hasOwn(payload, 'fileName') ? String(payload.fileName || '') : existingAsset?.originalName || '';
  const nextMimeType = hasOwn(payload, 'mimeType') ? String(payload.mimeType || '') : existingAsset?.mimeType || '';
  const nextSizeLabel = hasOwn(payload, 'sizeLabel') ? String(payload.sizeLabel || '') : existingAsset?.metadata?.fileSizeLabel || '';

  if (isBlankValue(nextUrl) && isBlankValue(nextName) && isBlankValue(nextMimeType) && isBlankValue(nextSizeLabel)) {
    return null;
  }

  return persistLinkedMedia(tx, {
    existingMediaId: existingModule?.fileMediaId || existingAsset?.id || `course-module-file-${moduleId}`,
    ownerType: 'course_module',
    ownerId: moduleId,
    url: nextUrl,
    name: nextName,
    mimeType: nextMimeType,
    metadata: {
      domain: 'courses',
      role: 'module_file',
      courseId: Number(courseId),
      fileSizeLabel: nextSizeLabel,
    },
  });
}

async function getNextModuleId(database, courseId, order) {
  const baseId = `mod-${courseId}-${order}`;
  const existingRows = await database.select().from(courseModules).where(eq(courseModules.courseId, Number(courseId)));
  const taken = new Set(existingRows.map((row) => String(row.id)));
  if (!taken.has(baseId)) {
    return baseId;
  }

  let counter = 2;
  let nextId = `${baseId}-${counter}`;
  while (taken.has(nextId)) {
    counter += 1;
    nextId = `${baseId}-${counter}`;
  }
  return nextId;
}

export function canUseDatabaseCoursePersistence() {
  return isDatabaseConfigured;
}

export async function listPersistedCourses(filters = {}) {
  const database = requireDb();
  const hydrated = await hydrateCourseRows(database, await listCourseRows(database));
  const search = String(filters.search || '').trim().toLowerCase();

  if (!search) {
    return hydrated;
  }

  return hydrated.filter((course) => {
    const haystack = `${course.title} ${course.description} ${(course.aliases || []).join(' ')}`.toLowerCase();
    return haystack.includes(search);
  });
}

export async function getPersistedCourse(courseId) {
  const database = requireDb();
  const courseRow = await getCourseRow(database, courseId);
  if (!courseRow) {
    return null;
  }

  const [course] = await hydrateCourseRows(database, [courseRow]);
  return course || null;
}

export async function createPersistedCourse(payload = {}, options = {}) {
  const database = requireDb();
  const now = new Date();
  const nextId = await getNextCourseId(database);
  const title = String(payload.title || '').trim();
  const priceValue = toInteger(payload.priceValue || 0, 0);
  const priceLabel = payload.priceLabel || options.formatCurrency?.(priceValue) || '';
  const slug = await resolveCourseSlug(database, payload, title);

  return database.transaction(async (tx) => {
    const brochureMediaId = await upsertCourseBrochure(tx, nextId, payload, null);
    const record = {
      id: nextId,
      slug,
      title,
      aliases: toStringArray(payload.aliases),
      description: payload.description || '',
      icon: payload.icon || 'FileText',
      priceValue,
      priceLabel,
      duration: payload.duration || '',
      level: payload.level || 'Umum',
      brochureMediaId,
      isPublished: payload.isPublished === false ? 'false' : 'true',
      createdAt: now,
      updatedAt: now,
    };

    await tx.insert(courses).values(record);
    const createdRow = await getCourseRow(tx, nextId);
    const [createdCourse] = await hydrateCourseRows(tx, createdRow ? [createdRow] : []);
    return createdCourse || null;
  });
}

export async function updatePersistedCourse(courseId, payload = {}, options = {}) {
  const database = requireDb();
  const current = await getCourseRow(database, courseId);
  if (!current) {
    return null;
  }

  return database.transaction(async (tx) => {
    const nextTitle = payload.title != null ? String(payload.title).trim() : current.title;
    const nextPriceValue = payload.priceValue != null ? toInteger(payload.priceValue, Number(current.priceValue || 0)) : Number(current.priceValue || 0);
    const nextPriceLabel = payload.priceLabel != null
      ? String(payload.priceLabel || '')
      : current.priceLabel || options.formatCurrency?.(nextPriceValue) || '';
    const nextSlug = hasOwn(payload, 'slug')
      ? await resolveCourseSlug(tx, payload, nextTitle, current.id)
      : current.slug || await resolveCourseSlug(tx, {}, nextTitle, current.id);
    const brochureMediaId = await upsertCourseBrochure(tx, current.id, payload, current);

    await tx.update(courses).set({
      slug: nextSlug,
      title: nextTitle,
      aliases: Array.isArray(payload.aliases) ? toStringArray(payload.aliases) : current.aliases,
      description: payload.description ?? current.description,
      icon: payload.icon ?? current.icon,
      priceValue: nextPriceValue,
      priceLabel: nextPriceLabel,
      duration: payload.duration ?? current.duration,
      level: payload.level ?? current.level,
      brochureMediaId,
      isPublished: payload.isPublished == null ? current.isPublished : (payload.isPublished === false ? 'false' : 'true'),
      updatedAt: new Date(),
    }).where(eq(courses.id, Number(courseId)));

    const updatedRow = await getCourseRow(tx, courseId);
    const [updatedCourse] = await hydrateCourseRows(tx, updatedRow ? [updatedRow] : []);
    return updatedCourse || null;
  });
}

export async function deletePersistedCourse(courseId) {
  const database = requireDb();
  const existing = await getCourseRow(database, courseId);
  if (!existing) {
    return null;
  }

  const linkedEnrollments = await database.select().from(enrollments)
    .where(eq(enrollments.courseId, Number(courseId)))
    .limit(1);
  if (linkedEnrollments.length > 0) {
    return { blocked: true };
  }

  return database.transaction(async (tx) => {
    const moduleRows = await tx.select().from(courseModules).where(eq(courseModules.courseId, Number(courseId)));
    const mediaIds = [
      existing.brochureMediaId,
      ...moduleRows.map((row) => row.fileMediaId),
    ].filter(Boolean);
    const mediaRows = mediaIds.length > 0
      ? await tx.select().from(mediaAssets).where(inArray(mediaAssets.id, mediaIds.map((item) => String(item))))
      : [];

    await tx.delete(courseModules).where(eq(courseModules.courseId, Number(courseId)));
    await tx.delete(courses).where(eq(courses.id, Number(courseId)));

    if (mediaIds.length > 0) {
      await tx.delete(mediaAssets).where(inArray(mediaAssets.id, mediaIds.map((item) => String(item))));
    }

    await Promise.all(mediaRows.map((row) => removeStoredMediaFile(row.storageKey)));

    return existing;
  });
}

export async function listPersistedModules(courseId) {
  const database = requireDb();
  const courseRow = await getCourseRow(database, courseId);
  if (!courseRow) {
    return null;
  }

  const moduleRows = await database.select().from(courseModules)
    .where(eq(courseModules.courseId, Number(courseId)))
    .orderBy(asc(courseModules.order), asc(courseModules.createdAt));
  const mediaRows = await listMediaRows(database, moduleRows.map((row) => row.fileMediaId));
  const mediaById = new Map(mediaRows.map((row) => [String(row.id), row]));

  return moduleRows.map((row) => mapModuleRow(
    row,
    row.fileMediaId ? mediaById.get(String(row.fileMediaId)) || null : null,
    courseRow.title,
  ));
}

export async function createPersistedModule(courseId, payload = {}) {
  const database = requireDb();
  const courseRow = await getCourseRow(database, courseId);
  if (!courseRow) {
    return null;
  }

  const existingModules = await database.select().from(courseModules).where(eq(courseModules.courseId, Number(courseId)));
  const order = payload.order != null ? Number(payload.order) : existingModules.length + 1;
  const nextId = payload.id ? String(payload.id) : await getNextModuleId(database, courseId, order);
  const now = new Date();

  return database.transaction(async (tx) => {
    const fileMediaId = await upsertModuleMedia(tx, courseId, nextId, payload, null);
    await tx.insert(courseModules).values({
      id: nextId,
      courseId: Number(courseId),
      order,
      title: String(payload.title || '').trim(),
      summary: payload.summary || '',
      durationLabel: payload.durationLabel || '',
      fileMediaId,
      resourceType: payload.resourceType || 'lesson',
      isPublished: payload.isPublished === false ? 'false' : 'true',
      createdAt: now,
      updatedAt: now,
    });

    const createdRow = await getModuleRow(tx, courseId, nextId);
    const mediaRow = fileMediaId
      ? (await tx.select().from(mediaAssets).where(eq(mediaAssets.id, String(fileMediaId))).limit(1))[0] || null
      : null;
    return createdRow ? mapModuleRow(createdRow, mediaRow, courseRow.title) : null;
  });
}

export async function updatePersistedModule(courseId, moduleId, payload = {}) {
  const database = requireDb();
  const courseRow = await getCourseRow(database, courseId);
  if (!courseRow) {
    return { courseMissing: true };
  }

  const current = await getModuleRow(database, courseId, moduleId);
  if (!current) {
    return null;
  }

  return database.transaction(async (tx) => {
    const fileMediaId = await upsertModuleMedia(tx, courseId, moduleId, payload, current);
    await tx.update(courseModules).set({
      title: payload.title ?? current.title,
      summary: payload.summary ?? current.summary,
      order: payload.order != null ? Number(payload.order) : current.order,
      durationLabel: payload.durationLabel ?? current.durationLabel,
      fileMediaId,
      resourceType: payload.resourceType ?? current.resourceType,
      isPublished: payload.isPublished == null ? current.isPublished : (payload.isPublished === false ? 'false' : 'true'),
      updatedAt: new Date(),
    }).where(and(
      eq(courseModules.id, String(moduleId)),
      eq(courseModules.courseId, Number(courseId)),
    ));

    const updatedRow = await getModuleRow(tx, courseId, moduleId);
    const mediaRow = fileMediaId
      ? (await tx.select().from(mediaAssets).where(eq(mediaAssets.id, String(fileMediaId))).limit(1))[0] || null
      : null;
    return updatedRow ? mapModuleRow(updatedRow, mediaRow, courseRow.title) : null;
  });
}

export async function deletePersistedModule(courseId, moduleId) {
  const database = requireDb();
  const existing = await getModuleRow(database, courseId, moduleId);
  if (!existing) {
    return null;
  }

  return database.transaction(async (tx) => {
    const [mediaRow] = existing.fileMediaId
      ? await tx.select().from(mediaAssets).where(eq(mediaAssets.id, String(existing.fileMediaId))).limit(1)
      : [null];
    await tx.delete(courseModules).where(and(
      eq(courseModules.id, String(moduleId)),
      eq(courseModules.courseId, Number(courseId)),
    ));

    if (existing.fileMediaId) {
      await tx.delete(mediaAssets).where(eq(mediaAssets.id, String(existing.fileMediaId)));
    }

    await removeStoredMediaFile(mediaRow?.storageKey);

    return existing;
  });
}