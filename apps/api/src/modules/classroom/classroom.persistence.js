import { and, asc, desc, eq } from 'drizzle-orm';
import { normalizeClassroomPost, normalizeClassworkItem } from '@lkp-parduli-rasa/domain/domain-relations';
import { isDatabaseConfigured, requireDb } from '../../db/client.js';
import { mediaAssets } from '../../db/schema/index.js';

function toDateString(value) {
  if (!value) {
    return '';
  }

  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString();
}

function mapOverlayRow(row) {
  return {
    id: row.id,
    ownerType: row.ownerType,
    ownerId: row.ownerId,
    metadata: row.metadata || {},
    createdAt: toDateString(row.createdAt),
    updatedAt: toDateString(row.updatedAt),
  };
}

function buildOverlayRow(id, ownerType, ownerId, metadata = {}) {
  const now = new Date();
  return {
    id: String(id),
    visibility: 'private',
    storageKey: null,
    publicUrl: null,
    originalName: metadata.title || metadata.name || String(id),
    mimeType: 'application/json',
    ownerType,
    ownerId: String(ownerId || ''),
    metadata,
    createdAt: now,
    updatedAt: now,
  };
}

export function canUseDatabaseClassroomOverlayPersistence() {
  return isDatabaseConfigured;
}

export async function listPersistedClassroomPosts(filters = {}) {
  const database = requireDb();
  const conditions = [eq(mediaAssets.ownerType, 'classroom_post')];
  if (filters.courseId != null && filters.courseId !== '') {
    conditions.push(eq(mediaAssets.ownerId, String(filters.courseId)));
  }

  const rows = await database.select().from(mediaAssets)
    .where(and(...conditions))
    .orderBy(desc(mediaAssets.updatedAt), desc(mediaAssets.createdAt));

  return rows.map((row, index) => normalizeClassroomPost({
    id: row.id,
    courseId: row.ownerId ? Number(row.ownerId) : null,
    ...(row.metadata || {}),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }, index));
}

export async function createPersistedClassroomPost(payload = {}) {
  const database = requireDb();
  const postId = payload.id || `post-${payload.courseId || 'course'}-${Date.now()}`;
  const row = buildOverlayRow(postId, 'classroom_post', payload.courseId, {
    courseId: payload.courseId ?? null,
    title: payload.title || 'Pengumuman kelas',
    body: payload.body || '',
    authorName: payload.authorName || 'Admin LKP',
    status: payload.status || (payload.isPublished === false ? 'draft' : 'published'),
    isPublished: payload.isPublished ?? true,
    publishedAt: payload.publishedAt || null,
    attachmentName: payload.attachmentName || '',
    attachmentUrl: payload.attachmentUrl || '',
    attachmentMimeType: payload.attachmentMimeType || '',
  });

  await database.insert(mediaAssets).values(row);
  const [created] = await database.select().from(mediaAssets).where(eq(mediaAssets.id, String(postId))).limit(1);
  return normalizeClassroomPost({
    id: created.id,
    courseId: created.ownerId ? Number(created.ownerId) : null,
    ...(created.metadata || {}),
    createdAt: created.createdAt,
    updatedAt: created.updatedAt,
  });
}

export async function updatePersistedClassroomPost(postId, payload = {}) {
  const database = requireDb();
  const [current] = await database.select().from(mediaAssets)
    .where(and(eq(mediaAssets.id, String(postId)), eq(mediaAssets.ownerType, 'classroom_post')))
    .limit(1);
  if (!current) {
    return null;
  }

  const nextMetadata = {
    ...(current.metadata || {}),
    ...payload,
  };

  await database.update(mediaAssets).set({
    originalName: nextMetadata.title || current.originalName,
    metadata: nextMetadata,
    updatedAt: new Date(),
  }).where(eq(mediaAssets.id, String(postId)));

  const [updated] = await database.select().from(mediaAssets).where(eq(mediaAssets.id, String(postId))).limit(1);
  return normalizeClassroomPost({
    id: updated.id,
    courseId: updated.ownerId ? Number(updated.ownerId) : null,
    ...(updated.metadata || {}),
    createdAt: updated.createdAt,
    updatedAt: updated.updatedAt,
  });
}

export async function deletePersistedClassroomPost(postId) {
  const database = requireDb();
  const [current] = await database.select().from(mediaAssets)
    .where(and(eq(mediaAssets.id, String(postId)), eq(mediaAssets.ownerType, 'classroom_post')))
    .limit(1);
  if (!current) {
    return null;
  }

  await database.delete(mediaAssets).where(eq(mediaAssets.id, String(postId)));
  return mapOverlayRow(current);
}

export async function listPersistedClassworkItems(filters = {}) {
  const database = requireDb();
  const conditions = [eq(mediaAssets.ownerType, 'classwork_item')];
  if (filters.courseId != null && filters.courseId !== '') {
    conditions.push(eq(mediaAssets.ownerId, String(filters.courseId)));
  }

  const rows = await database.select().from(mediaAssets)
    .where(and(...conditions))
    .orderBy(asc(mediaAssets.createdAt));

  return rows.map((row, index) => normalizeClassworkItem({
    id: row.id,
    courseId: row.ownerId ? Number(row.ownerId) : null,
    ...(row.metadata || {}),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }, index));
}

export async function createPersistedClassworkItem(payload = {}) {
  const database = requireDb();
  const itemId = payload.id || `classwork-${payload.courseId || 'course'}-${Date.now()}`;
  const row = buildOverlayRow(itemId, 'classwork_item', payload.courseId, {
    courseId: payload.courseId ?? null,
    topicId: payload.topicId ?? null,
    moduleId: payload.moduleId ?? payload.topicId ?? null,
    moduleIds: Array.isArray(payload.moduleIds) ? payload.moduleIds : [],
    type: payload.type || 'assignment',
    title: payload.title || 'Classwork',
    summary: payload.summary || '',
    description: payload.description || payload.summary || '',
    instructions: payload.instructions || '',
    maxScore: payload.maxScore ?? 100,
    passingScore: payload.passingScore ?? 75,
    maxAttempts: payload.maxAttempts ?? 1,
    dueAt: payload.dueAt || null,
    submissionMode: payload.submissionMode || 'upload',
    orderIndex: payload.orderIndex ?? payload.order ?? 1,
    isPublished: payload.isPublished ?? true,
    source: 'classroom',
    resourceType: payload.resourceType || '',
    materialUrl: payload.materialUrl || '',
    attachmentName: payload.attachmentName || payload.fileName || '',
    attachmentUrl: payload.attachmentUrl || payload.fileUrl || '',
    attachmentMimeType: payload.attachmentMimeType || payload.mimeType || '',
  });

  await database.insert(mediaAssets).values(row);
  const [created] = await database.select().from(mediaAssets).where(eq(mediaAssets.id, String(itemId))).limit(1);
  return normalizeClassworkItem({
    id: created.id,
    courseId: created.ownerId ? Number(created.ownerId) : null,
    ...(created.metadata || {}),
    createdAt: created.createdAt,
    updatedAt: created.updatedAt,
  });
}
