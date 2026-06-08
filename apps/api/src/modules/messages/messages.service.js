import { createBackendContext } from '../../runtime/backend-context.js';
import { ensure } from '../../runtime/errors.js';
import { compareByUpdatedDesc } from '@lkp-parduli-rasa/domain/use-cases';
import { normalizeThreadMessages } from '@lkp-parduli-rasa/domain/domain-relations';
import { createPublicService } from '../public/public.service.js';
import { createStudentService } from '../student/student.service.js';
import {
  canUseMessageDatabasePersistence as canUseDatabasePersistence,
  createPersistedAdminReply,
  getPersistedMessageThread as getPersistedThread,
  listPersistedMessageThreads as listPersistedThreads,
  updatePersistedMessageThreadStatus as updatePersistedThreadStatus,
} from './messages.persistence.js';

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

function resolveChannelRepo(repositories, channel) {
  if (channel === 'public') return repositories.publicMessages;
  if (channel === 'student') return repositories.studentMessages;
  throw new Error('Unsupported channel');
}

function parseAttachmentSize(value) {
  const size = Number(value);
  return Number.isFinite(size) && size >= 0 ? size : 0;
}

function getFileExtension(fileName = '') {
  return String(fileName).split('.').pop()?.toLowerCase() || '';
}

function normalizeReplyAttachment(payload = {}) {
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

  ensure(sizeBytes <= MAX_ATTACHMENT_SIZE, 'Ukuran lampiran maksimal 2.5 MB.', 400, 'ATTACHMENT_TOO_LARGE');
  ensure(ALLOWED_ATTACHMENT_EXTENSIONS.has(getFileExtension(name)), 'Format lampiran belum didukung.', 400, 'ATTACHMENT_TYPE_UNSUPPORTED');

  return {
    id: String(payload.attachmentId || source.id || `attachment-${Date.now()}`),
    name: name || 'Lampiran',
    url,
    mimeType,
    sizeBytes,
    sizeLabel,
  };
}

function normalizeThread(thread) {
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
}

export function createMessagesService(options = {}) {
  const context = createBackendContext(options);
  const publicService = createPublicService({ context });
  const studentService = createStudentService({ context });
  const { repositories } = context;
  const persistenceMode = canUseDatabasePersistence() ? 'database' : 'memory';

  function withPersistenceMode(payload, key) {
    if (key) {
      return {
        [key]: payload,
        persistenceMode,
      };
    }

    return {
      ...payload,
      persistenceMode,
    };
  }

  return {
    async listThreads(channel, filters = {}) {
      if (canUseDatabasePersistence()) {
        const search = String(filters.search || '').trim().toLowerCase();
        const threads = (await listPersistedThreads(channel, filters))
          .map((thread) => ({
            ...normalizeThread(thread),
            persistenceMode,
          }))
          .filter((thread) => {
            if (!search) return true;
            const haystack = `${thread.senderName || ''} ${thread.senderEmail || ''} ${thread.subject || ''} ${thread.body || ''}`.toLowerCase();
            return haystack.includes(search);
          })
          .sort(compareByUpdatedDesc);

        return withPersistenceMode(threads, 'threads');
      }

      const repo = resolveChannelRepo(repositories, channel);
      const search = String(filters.search || '').trim().toLowerCase();

      const threads = repo.list()
        .map((thread) => normalizeThread(thread))
        .filter((thread) => {
          if (!search) return true;
          const haystack = `${thread.senderName || ''} ${thread.senderEmail || ''} ${thread.subject || ''} ${thread.body || ''}`.toLowerCase();
          return haystack.includes(search);
        })
        .sort(compareByUpdatedDesc)
        .map((thread) => ({
          ...thread,
          persistenceMode,
        }));

      return withPersistenceMode(threads, 'threads');
    },

    async getThread(channel, threadId) {
      if (canUseDatabasePersistence()) {
        const thread = await getPersistedThread(channel, threadId);
        ensure(thread, 'Thread pesan tidak ditemukan.', 404, 'THREAD_NOT_FOUND');
        return withPersistenceMode({
          ...normalizeThread(thread),
          persistenceMode,
        }, 'thread');
      }

      const repo = resolveChannelRepo(repositories, channel);
      const thread = repo.getById(threadId);
      ensure(thread, 'Thread pesan tidak ditemukan.', 404, 'THREAD_NOT_FOUND');
      return withPersistenceMode({
        ...normalizeThread(thread),
        persistenceMode,
      }, 'thread');
    },

    createPublicMessage(payload = {}) {
      return publicService.submitContactMessage(payload);
    },

    createStudentThread(reference = {}, payload = {}) {
      return studentService.createMessageThread(reference, payload);
    },

    async replyToThread(channel, threadId, payload = {}) {
      if (canUseDatabasePersistence()) {
        const attachment = normalizeReplyAttachment(payload);
        ensure(payload.body || attachment, 'Isi balasan atau lampiran wajib diisi.', 400, 'MESSAGE_REQUIRED');

        const thread = await createPersistedAdminReply(channel, threadId, {
          authorName: payload.authorName || 'Admin LKP',
          body: String(payload.body || '').trim(),
        }, attachment, context.now());

        ensure(thread, 'Thread pesan tidak ditemukan.', 404, 'THREAD_NOT_FOUND');
        return {
          ...normalizeThread(thread),
          persistenceMode,
        };
      }

      const repo = resolveChannelRepo(repositories, channel);
      const thread = repo.getById(threadId);
      ensure(thread, 'Thread pesan tidak ditemukan.', 404, 'THREAD_NOT_FOUND');

      const createdAt = context.now();
      const authorRole = payload.authorRole === 'student' ? 'student' : 'admin';
      const attachment = normalizeReplyAttachment(payload);
      ensure(payload.body || attachment, 'Isi balasan atau lampiran wajib diisi.', 400, 'MESSAGE_REQUIRED');
      const nextMessage = {
        id: `thread-message-${createdAt.replace(/[^0-9]/g, '')}`,
        authorRole,
        authorName: payload.authorName || (authorRole === 'student' ? thread.senderName || 'Siswa' : 'Admin LKP'),
        body: String(payload.body || '').trim(),
        createdAt,
        attachments: attachment ? [attachment] : [],
        fileName: attachment?.name || '',
        fileUrl: attachment?.url || '',
        mimeType: attachment?.mimeType || '',
        fileSize: attachment?.sizeBytes || 0,
        fileSizeLabel: attachment?.sizeLabel || '',
      };

      const normalized = normalizeThread(thread);
      repo.update(threadId, (current) => ({
        ...current,
        status: authorRole === 'admin' ? 'replied' : 'unread',
        updatedAt: createdAt,
        lastMessageAt: createdAt,
        lastMessagePreview: nextMessage.body || attachment?.name || 'Lampiran baru',
        unreadByAdmin: authorRole === 'student',
        unreadByStudent: channel === 'student' && authorRole === 'admin',
        body: normalized.body,
        responses: authorRole === 'admin'
          ? [...(normalized.responses || []), {
            id: nextMessage.id,
            body: nextMessage.body,
            createdAt,
            authorName: nextMessage.authorName,
            attachments: nextMessage.attachments,
            fileName: nextMessage.fileName,
            fileUrl: nextMessage.fileUrl,
            mimeType: nextMessage.mimeType,
            fileSize: nextMessage.fileSize,
            fileSizeLabel: nextMessage.fileSizeLabel,
          }]
          : normalized.responses,
        messages: [...normalized.messages, nextMessage],
      }));

      const updatedThread = repo.getById(threadId);
      return {
        ...normalizeThread(updatedThread),
        persistenceMode,
      };
    },

    async updateThreadStatus(channel, threadId, payload = {}) {
      ensure(payload.status, 'Status thread wajib diisi.', 400, 'STATUS_REQUIRED');

      if (canUseDatabasePersistence()) {
        const thread = await updatePersistedThreadStatus(channel, threadId, { status: payload.status }, context.now());
        ensure(thread, 'Thread pesan tidak ditemukan.', 404, 'THREAD_NOT_FOUND');
        return {
          ...normalizeThread(thread),
          persistenceMode,
        };
      }

      const repo = resolveChannelRepo(repositories, channel);
      const thread = repo.getById(threadId);
      ensure(thread, 'Thread pesan tidak ditemukan.', 404, 'THREAD_NOT_FOUND');

      repo.update(threadId, (current) => ({
        ...current,
        status: payload.status,
        updatedAt: context.now(),
        unreadByAdmin: payload.status === 'unread',
        unreadByStudent: channel === 'student' && payload.status !== 'unread',
      }));

      const updatedThread = repo.getById(threadId);
      return {
        ...normalizeThread(updatedThread),
        persistenceMode,
      };
    },
  };
}

export default createMessagesService;
