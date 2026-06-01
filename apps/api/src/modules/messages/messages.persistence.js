import { and, asc, desc, eq, inArray } from 'drizzle-orm';
import { normalizeThreadMessages } from '@lkp-parduli-rasa/domain/domain-relations';
import { isDatabaseConfigured, requireDb } from '../../db/client.js';
import { courses, mediaAssets, messageThreads, threadMessages } from '../../db/schema/index.js';

const MAX_ATTACHMENT_SIZE = 2.5 * 1024 * 1024;
const ALLOWED_ATTACHMENT_EXTENSIONS = new Set([
  'pdf',
  'jpg',
  'jpeg',
  'png',
  'webp',
  'doc',
  'docx',
  'xls',
  'xlsx',
  'ppt',
  'pptx',
  'txt',
]);

let hasLoggedMemoryModeWarning = false;

function toIsoString(value) {
  if (!value) return new Date().toISOString();

  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return new Date().toISOString();
  }

  return parsed.toISOString();
}

function parseAttachmentSize(value) {
  const size = Number(value);
  return Number.isFinite(size) && size >= 0 ? size : 0;
}

function getFileExtension(fileName = '') {
  return String(fileName).split('.').pop()?.toLowerCase() || '';
}

export function canUseMessageDatabasePersistence() {
  if (!isDatabaseConfigured && !hasLoggedMemoryModeWarning) {
    console.warn('[messages] DATABASE_URL is not configured. Admin inbox replies and attachments are running in memory mode.');
    hasLoggedMemoryModeWarning = true;
  }

  return isDatabaseConfigured;
}

export function normalizeSingleAttachment(payload = {}, ensure) {
  const directAttachment = payload.attachment && typeof payload.attachment === 'object'
    ? payload.attachment
    : Array.isArray(payload.attachments) && payload.attachments[0]
      ? payload.attachments[0]
      : null;
  const uploadedFile = payload.uploadedFile && typeof payload.uploadedFile === 'object'
    ? payload.uploadedFile
    : null;
  const source = directAttachment || uploadedFile || {};
  const name = String(
    payload.attachmentName
    || payload.fileName
    || source.name
    || source.fileName
    || '',
  ).trim();
  const url = String(
    payload.attachmentUrl
    || payload.fileUrl
    || payload.assetUrl
    || source.url
    || source.fileUrl
    || source.assetUrl
    || '',
  ).trim();
  const mimeType = String(
    payload.attachmentMimeType
    || payload.mimeType
    || source.mimeType
    || source.type
    || '',
  ).trim();
  const sizeBytes = parseAttachmentSize(
    payload.sizeBytes
    ?? payload.fileSize
    ?? source.sizeBytes
    ?? source.fileSize,
  );
  const sizeLabel = String(
    payload.attachmentSizeLabel
    || payload.fileSizeLabel
    || source.sizeLabel
    || source.fileSizeLabel
    || '',
  ).trim();

  if (!name && !url && !mimeType && !sizeBytes && !sizeLabel) {
    return null;
  }

  if (typeof ensure === 'function') {
    ensure(sizeBytes <= MAX_ATTACHMENT_SIZE, 'Ukuran lampiran maksimal 2.5 MB.', 400, 'ATTACHMENT_TOO_LARGE');
    ensure(ALLOWED_ATTACHMENT_EXTENSIONS.has(getFileExtension(name)), 'Format lampiran belum didukung.', 400, 'ATTACHMENT_TYPE_UNSUPPORTED');
  }

  return {
    id: String(payload.attachmentId || source.id || `attachment-${Date.now()}`),
    name: name || 'Lampiran',
    url,
    mimeType,
    sizeBytes,
    sizeLabel,
  };
}

function mapAttachmentRow(row) {
  return {
    id: row.id,
    name: row.originalName || 'Lampiran',
    url: row.publicUrl || '',
    mimeType: row.mimeType || '',
    sizeBytes: Number(row.metadata?.sizeBytes || 0),
    sizeLabel: String(row.metadata?.sizeLabel || ''),
  };
}

function mapMessageRow(row, attachments = []) {
  const firstAttachment = attachments[0] || null;

  return {
    id: row.id,
    authorRole: row.authorRole,
    authorName: row.authorName || '',
    body: row.body || '',
    createdAt: toIsoString(row.createdAt),
    attachments,
    fileName: firstAttachment?.name || '',
    fileUrl: firstAttachment?.url || '',
    mimeType: firstAttachment?.mimeType || '',
    fileSize: firstAttachment?.sizeBytes || 0,
    fileSizeLabel: firstAttachment?.sizeLabel || '',
  };
}

function mapThreadRow(row, messages = [], courseTitle = '') {
  const normalized = normalizeThreadMessages({
    id: row.id,
    senderName: row.senderName || '',
    senderEmail: row.senderEmail || '',
    senderAddress: row.senderAddress || '',
    subject: row.subject || '',
    status: row.status || 'unread',
    createdAt: toIsoString(row.createdAt),
    updatedAt: toIsoString(row.updatedAt),
    draft: row.draft || '',
    studentId: row.studentId,
    enrollmentId: row.enrollmentId,
    courseId: row.courseId,
    courseTitle,
    messages,
  });

  return {
    id: row.id,
    channel: row.channel,
    studentId: row.studentId,
    enrollmentId: row.enrollmentId || null,
    courseId: row.courseId,
    courseTitle,
    senderName: row.senderName || '',
    senderEmail: row.senderEmail || '',
    senderAddress: row.senderAddress || '',
    subject: row.subject || '',
    status: row.status || 'unread',
    draft: row.draft || '',
    body: normalized.body,
    messages: normalized.messages,
    responses: normalized.responses,
    createdAt: toIsoString(row.createdAt),
    updatedAt: toIsoString(row.updatedAt),
    lastMessageAt: row.lastMessageAt ? toIsoString(row.lastMessageAt) : normalized.lastMessageAt,
    lastMessagePreview: normalized.messages.at(-1)?.body || normalized.body,
  };
}

async function loadThreadRows(filters = {}) {
  const database = requireDb();
  const whereClauses = [];

  if (filters.channel) {
    whereClauses.push(eq(messageThreads.channel, filters.channel));
  }

  if (filters.threadId) {
    whereClauses.push(eq(messageThreads.id, String(filters.threadId)));
  }

  if (filters.studentId != null) {
    whereClauses.push(eq(messageThreads.studentId, Number(filters.studentId)));
  }

  const query = database.select().from(messageThreads);
  const rows = whereClauses.length
    ? await query.where(whereClauses.length === 1 ? whereClauses[0] : and(...whereClauses)).orderBy(desc(messageThreads.updatedAt))
    : await query.orderBy(desc(messageThreads.updatedAt));

  return rows;
}

async function hydrateThreads(rows = []) {
  if (!rows.length) {
    return [];
  }

  const database = requireDb();
  const threadIds = rows.map((row) => row.id);
  const courseIds = [...new Set(rows.map((row) => row.courseId).filter((courseId) => courseId != null))];
  const [messageRows, courseRows] = await Promise.all([
    database.select().from(threadMessages).where(inArray(threadMessages.threadId, threadIds)).orderBy(asc(threadMessages.createdAt)),
    courseIds.length
      ? database.select().from(courses).where(inArray(courses.id, courseIds))
      : Promise.resolve([]),
  ]);

  const messageIds = messageRows.map((row) => row.id);
  const attachmentRows = messageIds.length
    ? await database.select().from(mediaAssets).where(and(
      eq(mediaAssets.ownerType, 'thread_message'),
      inArray(mediaAssets.ownerId, messageIds),
    )).orderBy(asc(mediaAssets.createdAt))
    : [];

  const attachmentsByMessageId = attachmentRows.reduce((map, row) => {
    const bucket = map.get(String(row.ownerId)) || [];
    bucket.push(mapAttachmentRow(row));
    map.set(String(row.ownerId), bucket);
    return map;
  }, new Map());

  const messagesByThreadId = messageRows.reduce((map, row) => {
    const bucket = map.get(String(row.threadId)) || [];
    bucket.push(mapMessageRow(row, attachmentsByMessageId.get(String(row.id)) || []));
    map.set(String(row.threadId), bucket);
    return map;
  }, new Map());

  const courseTitleById = new Map(courseRows.map((row) => [String(row.id), row.title]));

  return rows.map((row) => mapThreadRow(
    row,
    messagesByThreadId.get(String(row.id)) || [],
    row.courseId != null ? (courseTitleById.get(String(row.courseId)) || '') : '',
  ));
}

export async function listPersistedMessageThreads(channel, filters = {}) {
  const rows = await loadThreadRows({
    channel,
    studentId: filters.studentId,
  });
  const search = String(filters.search || '').trim().toLowerCase();
  const threads = await hydrateThreads(rows);

  return search
    ? threads.filter((thread) => `${thread.senderName} ${thread.senderEmail} ${thread.subject} ${thread.body}`.toLowerCase().includes(search))
    : threads;
}

export async function getPersistedMessageThread(channel, threadId, filters = {}) {
  const rows = await loadThreadRows({
    channel,
    threadId,
    studentId: filters.studentId,
  });
  const thread = (await hydrateThreads(rows))[0] || null;
  return thread;
}

async function createMessageAttachmentRecord(tx, attachment, messageId, channel) {
  if (!attachment) {
    return null;
  }

  const row = {
    id: attachment.id || `media-thread-message-${messageId}`,
    visibility: 'private',
    storageKey: null,
    publicUrl: attachment.url || '',
    originalName: attachment.name || 'Lampiran',
    mimeType: attachment.mimeType || '',
    ownerType: 'thread_message',
    ownerId: String(messageId),
    metadata: {
      channel,
      sizeBytes: attachment.sizeBytes || 0,
      sizeLabel: attachment.sizeLabel || '',
      type: 'message_attachment',
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await tx.insert(mediaAssets).values(row);
  return row;
}

export async function createPersistedPublicMessage(payload = {}, nowIso) {
  const database = requireDb();
  const createdAt = nowIso || new Date().toISOString();
  const threadId = payload.id ? String(payload.id) : `public-thread-${createdAt.replace(/[^0-9]/g, '')}`;
  const messageId = `thread-message-${createdAt.replace(/[^0-9]/g, '')}-1`;

  await database.transaction(async (tx) => {
    await tx.insert(messageThreads).values({
      id: threadId,
      channel: 'public',
      studentId: null,
      enrollmentId: null,
      courseId: null,
      senderName: String(payload.name).trim(),
      senderEmail: String(payload.email).trim().toLowerCase(),
      senderAddress: String(payload.address).trim(),
      subject: String(payload.subject || 'Pesan dari halaman kontak').trim(),
      status: 'unread',
      draft: '',
      lastMessageAt: new Date(createdAt),
      createdAt: new Date(createdAt),
      updatedAt: new Date(createdAt),
    });

    await tx.insert(threadMessages).values({
      id: messageId,
      threadId,
      authorUserId: null,
      authorRole: 'public',
      authorName: String(payload.name).trim(),
      body: String(payload.message).trim(),
      createdAt: new Date(createdAt),
    });
  });

  return getPersistedMessageThread('public', threadId);
}

export async function createPersistedStudentThread(portal, payload = {}, nowIso) {
  const database = requireDb();
  const createdAt = nowIso || new Date().toISOString();
  const threadId = payload.id ? String(payload.id) : `thread-${createdAt.replace(/[^0-9]/g, '')}`;
  const messageId = `thread-message-${createdAt.replace(/[^0-9]/g, '')}-1`;

  await database.transaction(async (tx) => {
    await tx.insert(messageThreads).values({
      id: threadId,
      channel: 'student',
      studentId: Number(portal.student.id),
      enrollmentId: portal.enrollment?.id || null,
      courseId: portal.course?.id || null,
      senderName: portal.student.name,
      senderEmail: portal.student.email || '',
      senderAddress: portal.student.address || '',
      subject: String(payload.subject).trim(),
      status: 'unread',
      draft: '',
      lastMessageAt: new Date(createdAt),
      createdAt: new Date(createdAt),
      updatedAt: new Date(createdAt),
    });

    await tx.insert(threadMessages).values({
      id: messageId,
      threadId,
      authorUserId: portal.account?.id || null,
      authorRole: 'student',
      authorName: portal.student.name,
      body: String(payload.body).trim(),
      createdAt: new Date(createdAt),
    });
  });

  return getPersistedMessageThread('student', threadId, { studentId: portal.student.id });
}

export async function createPersistedStudentReply(portal, threadId, payload = {}, nowIso) {
  const database = requireDb();
  const thread = await getPersistedMessageThread('student', threadId, { studentId: portal.student.id });
  if (!thread) {
    return null;
  }

  const createdAt = nowIso || new Date().toISOString();
  const messageId = `thread-message-${createdAt.replace(/[^0-9]/g, '')}`;

  await database.transaction(async (tx) => {
    await tx.insert(threadMessages).values({
      id: messageId,
      threadId: String(threadId),
      authorUserId: portal.account?.id || null,
      authorRole: 'student',
      authorName: portal.student.name,
      body: String(payload.body).trim(),
      createdAt: new Date(createdAt),
    });

    await tx.update(messageThreads).set({
      status: 'unread',
      lastMessageAt: new Date(createdAt),
      updatedAt: new Date(createdAt),
    }).where(eq(messageThreads.id, String(threadId)));
  });

  return getPersistedMessageThread('student', threadId, { studentId: portal.student.id });
}

export async function createPersistedAdminReply(channel, threadId, payload = {}, attachment = null, nowIso) {
  const database = requireDb();
  const thread = await getPersistedMessageThread(channel, threadId);
  if (!thread) {
    return null;
  }

  const createdAt = nowIso || new Date().toISOString();
  const messageId = `thread-message-${createdAt.replace(/[^0-9]/g, '')}`;

  await database.transaction(async (tx) => {
    await tx.insert(threadMessages).values({
      id: messageId,
      threadId: String(threadId),
      authorUserId: null,
      authorRole: 'admin',
      authorName: payload.authorName || 'Admin LKP',
      body: String(payload.body || '').trim(),
      createdAt: new Date(createdAt),
    });

    await createMessageAttachmentRecord(tx, attachment, messageId, channel);

    await tx.update(messageThreads).set({
      status: 'replied',
      lastMessageAt: new Date(createdAt),
      updatedAt: new Date(createdAt),
    }).where(eq(messageThreads.id, String(threadId)));
  });

  return getPersistedMessageThread(channel, threadId);
}

export async function updatePersistedMessageThreadStatus(channel, threadId, payload = {}, nowIso) {
  const database = requireDb();
  const thread = await getPersistedMessageThread(channel, threadId);
  if (!thread) {
    return null;
  }

  const nextStatus = typeof payload === 'string' ? payload : payload.status;

  await database.update(messageThreads).set({
    status: nextStatus,
    updatedAt: new Date(nowIso || new Date().toISOString()),
  }).where(eq(messageThreads.id, String(threadId)));

  return getPersistedMessageThread(channel, threadId);
}

export async function getPersistedMessageCounts() {
  const [publicThreads, studentThreads] = await Promise.all([
    listPersistedMessageThreads('public'),
    listPersistedMessageThreads('student'),
  ]);

  return {
    unreadPublicCount: publicThreads.filter((thread) => thread.status === 'unread').length,
    unreadStudentCount: studentThreads.filter((thread) => thread.status === 'unread').length,
  };
}
