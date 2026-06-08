import { createBackendContext } from '../../runtime/backend-context.js';
import { ensure } from '../../runtime/errors.js';
import { getStudentPortal } from './student-portal.js';
import { createStudentScheduleService } from './student-schedule.service.js';
import { normalizeThread, compareByUpdatedDesc } from '../messages/thread-utils.js';
import {
  canUseDatabaseAuthPersistence,
  findPersistedIdentityByAuthUserId,
  updatePersistedStudentProfile,
} from '../auth/auth.persistence.js';
import {
  canUseMessageDatabasePersistence as canUseDatabasePersistence,
  createPersistedStudentReply,
  createPersistedStudentThread,
  listPersistedMessageThreads,
} from '../messages/messages.persistence.js';

async function requirePortal(reference, options) {
  const portal = await getStudentPortal(reference, options);
  ensure(portal.student, 'Data siswa tidak ditemukan untuk sesi ini.', 404, 'STUDENT_PORTAL_NOT_FOUND');
  return portal;
}

async function getPersistedProfileBundle(reference = {}) {
  if (!canUseDatabaseAuthPersistence() || !reference.authUserId) {
    return null;
  }

  const identity = await findPersistedIdentityByAuthUserId(reference.authUserId);
  if (!identity?.student) {
    return null;
  }

  return {
    student: identity.student,
    account: identity.account,
    enrollment: identity.enrollment,
    course: identity.course,
  };
}

export function createStudentService(options = {}) {
  const context = createBackendContext(options);
  const { repositories } = context;
  const scheduleService = createStudentScheduleService(options);

  return {
    async getDashboard(reference = {}) {
      const portal = await requirePortal(reference, { context });
      let scheduleBundle = {
        schedules: [],
        summary: { total: 0, checkedIn: 0, notCheckedIn: 0 },
      };

      try {
        scheduleBundle = await scheduleService.getStudentSchedules(reference);
      } catch (error) {
        if (error.status !== 403) {
          throw error;
        }
      }

      return {
        ...portal,
        schedule: scheduleBundle,
        classSchedule: scheduleBundle,
        upcomingSchedules: scheduleBundle.schedules
          .filter((item) => new Date(item.endAt).getTime() >= Date.now())
          .slice(0, 3),
        attendanceSummary: scheduleBundle.summary,
      };
    },

    async getProfile(reference = {}) {
      const persistedProfile = await getPersistedProfileBundle(reference);
      if (persistedProfile) {
        return persistedProfile;
      }

      const portal = await requirePortal(reference, { context });
      return {
        student: portal.student,
        account: portal.account,
        enrollment: portal.enrollment,
        course: portal.course,
      };
    },

    async updateProfile(reference = {}, payload = {}) {
      if (canUseDatabaseAuthPersistence() && reference.authUserId) {
        const persistedIdentity = await updatePersistedStudentProfile(reference, payload).catch((error) => {
          if (error?.message === 'EMAIL_ALREADY_USED') {
            ensure(false, 'Email ini sudah dipakai akun lain.', 409, 'EMAIL_ALREADY_USED');
          }

          throw error;
        });

        if (persistedIdentity?.student) {
          const updatedAt = context.now();
          const activeAccount = repositories.accounts.raw().find((item) => (
            String(item.id) === String(persistedIdentity.account?.id)
            || String(item.studentId) === String(persistedIdentity.student.id)
          )) || null;

          repositories.students.update(persistedIdentity.student.id, (student) => ({
            ...student,
            name: persistedIdentity.student.name,
            email: persistedIdentity.student.email,
            phone: persistedIdentity.student.phone || '',
            address: persistedIdentity.student.address || '',
            updatedAt,
          }));

          if (activeAccount) {
            repositories.accounts.update(activeAccount.id, (account) => ({
              ...account,
              name: persistedIdentity.student.name,
              displayName: persistedIdentity.student.name,
              email: persistedIdentity.student.email,
              nis: persistedIdentity.student.nis || account.nis,
              updatedAt,
            }));
          }

          return {
            student: persistedIdentity.student,
            account: persistedIdentity.account,
            enrollment: persistedIdentity.enrollment,
            course: persistedIdentity.course,
          };
        }
      }

      const portal = await requirePortal(reference, { context });
      ensure(payload.name, 'Nama wajib diisi.', 400, 'NAME_REQUIRED');
      ensure(payload.email, 'Email wajib diisi.', 400, 'EMAIL_REQUIRED');
      ensure(payload.phone, 'No HP wajib diisi.', 400, 'PHONE_REQUIRED');
      ensure(payload.address, 'Alamat wajib diisi.', 400, 'ADDRESS_REQUIRED');

      const normalizedEmail = String(payload.email).trim().toLowerCase();
      const activeAccount = repositories.accounts.raw().find((item) => (
        String(item.id) === String(portal.account?.id)
        || String(item.studentId) === String(portal.student.id)
      )) || null;

      const duplicateEmail = repositories.accounts.raw().find((account) => (
        String(account.id) !== String(activeAccount?.id)
        && String(account.email || '').trim().toLowerCase() === normalizedEmail
      )) || null;

      ensure(!duplicateEmail, 'Email ini sudah dipakai akun lain.', 409, 'EMAIL_ALREADY_USED');

      const updatedAt = context.now();
      const updatedStudent = repositories.students.update(portal.student.id, (student) => ({
        ...student,
        name: String(payload.name).trim(),
        email: normalizedEmail,
        phone: String(payload.phone).trim(),
        address: String(payload.address).trim(),
        updatedAt,
      }));

      if (activeAccount) {
        repositories.accounts.update(activeAccount.id, (account) => ({
          ...account,
          name: updatedStudent.name,
          displayName: updatedStudent.name,
          email: normalizedEmail,
          updatedAt,
        }));
      }

      return this.getProfile({ studentId: portal.student.id });
    },

    async listModules(reference = {}) {
      const portal = await requirePortal(reference, { context });
      return {
        modules: portal.modules,
        learning: portal.learning,
        nextActionableActivity: portal.nextActionableActivity,
        assessmentActivities: portal.assessmentActivities,
      };
    },

    async listSchedules(reference = {}, filters = {}) {
      await requirePortal(reference, { context });
      return scheduleService.getStudentSchedules(reference, filters);
    },

    async listAttendance(reference = {}, filters = {}) {
      await requirePortal(reference, { context });
      return scheduleService.getStudentAttendance(reference, filters);
    },

    async checkInSchedule(reference = {}, scheduleId, payload = {}) {
      await requirePortal(reference, { context });
      return scheduleService.checkInStudentSchedule(reference, scheduleId, payload);
    },

    async listMessages(reference = {}) {
      const portal = await requirePortal(reference, { context });

      if (canUseDatabasePersistence()) {
        const threads = await listPersistedMessageThreads('student', { studentId: portal.student.id });
        return threads
          .map((thread) => normalizeThread(thread))
          .sort(compareByUpdatedDesc);
      }

      return portal.threads.map((thread) => normalizeThread(thread));
    },

    async createMessageThread(reference = {}, payload = {}) {
      const portal = await requirePortal(reference, { context });
      ensure(payload.subject, 'Subjek wajib diisi.', 400, 'SUBJECT_REQUIRED');
      ensure(payload.body, 'Pesan wajib diisi.', 400, 'MESSAGE_REQUIRED');

      const createdAt = context.now();
      const threadSeed = createdAt.replace(/[^0-9]/g, '');

      if (canUseDatabasePersistence()) {
        const thread = await createPersistedStudentThread(portal, {
          id: `thread-${threadSeed}`,
          subject: String(payload.subject).trim(),
          body: String(payload.body).trim(),
        }, createdAt);

        return normalizeThread(thread);
      }

      const nextThread = {
        id: `thread-${threadSeed}`,
        channel: 'student',
        threadType: payload.threadType || 'consultation',
        studentId: portal.student.id,
        enrollmentId: portal.enrollment?.id || null,
        courseId: portal.course?.id || null,
        courseTitle: portal.course?.title || portal.enrollment?.courseTitle || '',
        category: String(payload.category || 'lainnya').toLowerCase(),
        priority: payload.priority || 'normal',
        senderName: portal.student.name,
        subject: String(payload.subject).trim(),
        body: String(payload.body).trim(),
        status: 'unread',
        createdAt,
        updatedAt: createdAt,
        lastMessageAt: createdAt,
        lastMessagePreview: String(payload.body).trim(),
        unreadByAdmin: true,
        unreadByStudent: false,
        draft: '',
        messages: [
          {
            id: `thread-message-${threadSeed}-1`,
            authorRole: 'student',
            authorName: portal.student.name,
            body: String(payload.body).trim(),
            createdAt,
          },
        ],
      };

      repositories.studentMessages.insert(nextThread);
      return normalizeThread(nextThread);
    },

    async replyToThread(reference = {}, threadId, payload = {}) {
      const portal = await requirePortal(reference, { context });
      ensure(payload.body, 'Balasan wajib diisi.', 400, 'MESSAGE_REQUIRED');
      const createdAt = context.now();

      if (canUseDatabasePersistence()) {
        const thread = await createPersistedStudentReply(portal, threadId, {
          body: String(payload.body).trim(),
        }, createdAt);

        ensure(thread, 'Thread pesan tidak ditemukan.', 404, 'THREAD_NOT_FOUND');
        return normalizeThread(thread);
      }

      const thread = repositories.studentMessages.raw().find((item) => (
        String(item.id) === String(threadId)
        && String(item.studentId) === String(portal.student.id)
      )) || null;

      ensure(thread, 'Thread pesan tidak ditemukan.', 404, 'THREAD_NOT_FOUND');
      const nextMessage = {
        id: `thread-message-${createdAt.replace(/[^0-9]/g, '')}`,
        authorRole: 'student',
        authorName: portal.student.name,
        body: String(payload.body).trim(),
        createdAt,
      };

      const messages = Array.isArray(thread.messages)
        ? thread.messages
        : normalizeThread(thread).messages;

      repositories.studentMessages.update(thread.id, (currentThread) => ({
        ...currentThread,
        status: 'unread',
        updatedAt: createdAt,
        lastMessageAt: createdAt,
        lastMessagePreview: nextMessage.body,
        unreadByAdmin: true,
        unreadByStudent: false,
        body: messages[0]?.body || currentThread.body || '',
        messages: [...messages, nextMessage],
      }));

      const updatedThread = repositories.studentMessages.raw().find((item) => String(item.id) === String(threadId)) || null;
      return normalizeThread(updatedThread);
    },

    async getCertificate(reference = {}) {
      const portal = await requirePortal(reference, { context });
      return {
        certificate: portal.certificate,
        certificateGate: portal.certificateGate,
      };
    },
  };
}

export default createStudentService;
