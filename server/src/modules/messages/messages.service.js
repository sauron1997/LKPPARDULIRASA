import { createAdminService, ensure } from '../admin/admin.service.js';
import { createPublicService } from '../public/public.service.js';
import { createStudentService } from '../student/student.service.js';

function resolveChannelRepo(repositories, channel) {
  if (channel === 'public') return repositories.publicMessages;
  if (channel === 'student') return repositories.studentMessages;
  throw new Error('Unsupported channel');
}

export function createMessagesService(options = {}) {
  const adminService = createAdminService(options);
  const publicService = createPublicService({ context: adminService.getContext() });
  const studentService = createStudentService({ context: adminService.getContext() });
  const context = adminService.getContext();
  const { repositories } = context;

  return {
    listThreads(channel, filters = {}) {
      const repo = resolveChannelRepo(repositories, channel);
      const search = String(filters.search || '').trim().toLowerCase();

      return repo.list()
        .map((thread) => adminService.normalizeThread(thread))
        .filter((thread) => {
          if (!search) return true;
          const haystack = `${thread.senderName || ''} ${thread.senderEmail || ''} ${thread.subject || ''} ${thread.body || ''}`.toLowerCase();
          return haystack.includes(search);
        })
        .sort(adminService.helpers.compareByUpdatedDesc);
    },

    getThread(channel, threadId) {
      const repo = resolveChannelRepo(repositories, channel);
      const thread = repo.getById(threadId);
      ensure(thread, 'Thread pesan tidak ditemukan.', 404, 'THREAD_NOT_FOUND');
      return adminService.normalizeThread(thread);
    },

    createPublicMessage(payload = {}) {
      return publicService.submitContactMessage(payload);
    },

    createStudentThread(reference = {}, payload = {}) {
      return studentService.createMessageThread(reference, payload);
    },

    replyToThread(channel, threadId, payload = {}) {
      const repo = resolveChannelRepo(repositories, channel);
      const thread = repo.getById(threadId);
      ensure(thread, 'Thread pesan tidak ditemukan.', 404, 'THREAD_NOT_FOUND');
      ensure(payload.body, 'Isi balasan wajib diisi.', 400, 'MESSAGE_REQUIRED');

      const createdAt = context.now();
      const authorRole = payload.authorRole === 'student' ? 'student' : 'admin';
      const nextMessage = {
        id: `thread-message-${createdAt.replace(/[^0-9]/g, '')}`,
        authorRole,
        authorName: payload.authorName || (authorRole === 'student' ? thread.senderName || 'Siswa' : 'Admin LKP'),
        body: String(payload.body).trim(),
        createdAt,
      };

      const normalized = adminService.normalizeThread(thread);
      repo.update(threadId, (current) => ({
        ...current,
        status: authorRole === 'admin' ? 'replied' : 'unread',
        updatedAt: createdAt,
        lastMessageAt: createdAt,
        lastMessagePreview: nextMessage.body,
        unreadByAdmin: authorRole === 'student',
        unreadByStudent: authorRole === 'admin',
        body: normalized.body,
        responses: authorRole === 'admin'
          ? [...(normalized.responses || []), {
            id: nextMessage.id,
            body: nextMessage.body,
            createdAt,
            authorName: nextMessage.authorName,
          }]
          : normalized.responses,
        messages: [...normalized.messages, nextMessage],
      }));

      return this.getThread(channel, threadId);
    },

    updateThreadStatus(channel, threadId, payload = {}) {
      ensure(payload.status, 'Status thread wajib diisi.', 400, 'STATUS_REQUIRED');
      const repo = resolveChannelRepo(repositories, channel);
      const thread = repo.getById(threadId);
      ensure(thread, 'Thread pesan tidak ditemukan.', 404, 'THREAD_NOT_FOUND');

      repo.update(threadId, (current) => ({
        ...current,
        status: payload.status,
        updatedAt: context.now(),
      }));

      return this.getThread(channel, threadId);
    },
  };
}

export default createMessagesService;
