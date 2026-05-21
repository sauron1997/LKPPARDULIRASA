import { createAdminService, ensure, getStudentPortal } from '../admin/admin.service.js';

function requirePortal(reference, options) {
  const portal = getStudentPortal(reference, options);
  ensure(portal.student, 'Data siswa tidak ditemukan untuk sesi ini.', 404, 'STUDENT_PORTAL_NOT_FOUND');
  return portal;
}

export function createStudentService(options = {}) {
  const adminService = createAdminService(options);
  const context = adminService.getContext();
  const { repositories } = context;

  return {
    getDashboard(reference = {}) {
      const portal = requirePortal(reference, { context });
      let scheduleBundle = {
        schedules: [],
        summary: { total: 0, checkedIn: 0, notCheckedIn: 0 },
      };

      try {
        scheduleBundle = adminService.getStudentSchedules(reference);
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

    getProfile(reference = {}) {
      const portal = requirePortal(reference, { context });
      return {
        student: portal.student,
        account: portal.account,
        enrollment: portal.enrollment,
        course: portal.course,
      };
    },

    updateProfile(reference = {}, payload = {}) {
      const portal = requirePortal(reference, { context });
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

    listModules(reference = {}) {
      const portal = requirePortal(reference, { context });
      return {
        modules: portal.modules,
        learning: portal.learning,
        nextActionableActivity: portal.nextActionableActivity,
        assessmentActivities: portal.assessmentActivities,
      };
    },

    listSchedules(reference = {}, filters = {}) {
      requirePortal(reference, { context });
      return adminService.getStudentSchedules(reference, filters);
    },

    listAttendance(reference = {}, filters = {}) {
      requirePortal(reference, { context });
      return adminService.getStudentAttendance(reference, filters);
    },

    checkInSchedule(reference = {}, scheduleId, payload = {}) {
      requirePortal(reference, { context });
      return adminService.checkInStudentSchedule(reference, scheduleId, payload);
    },

    listMessages(reference = {}) {
      const portal = requirePortal(reference, { context });
      return portal.threads.map((thread) => adminService.normalizeThread(thread));
    },

    createMessageThread(reference = {}, payload = {}) {
      const portal = requirePortal(reference, { context });
      ensure(payload.subject, 'Subjek wajib diisi.', 400, 'SUBJECT_REQUIRED');
      ensure(payload.body, 'Pesan wajib diisi.', 400, 'MESSAGE_REQUIRED');

      const createdAt = context.now();
      const threadSeed = createdAt.replace(/[^0-9]/g, '');
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
      return adminService.normalizeThread(nextThread);
    },

    replyToThread(reference = {}, threadId, payload = {}) {
      const portal = requirePortal(reference, { context });
      ensure(payload.body, 'Balasan wajib diisi.', 400, 'MESSAGE_REQUIRED');

      const thread = repositories.studentMessages.raw().find((item) => (
        String(item.id) === String(threadId)
        && String(item.studentId) === String(portal.student.id)
      )) || null;

      ensure(thread, 'Thread pesan tidak ditemukan.', 404, 'THREAD_NOT_FOUND');

      const createdAt = context.now();
      const nextMessage = {
        id: `thread-message-${createdAt.replace(/[^0-9]/g, '')}`,
        authorRole: 'student',
        authorName: portal.student.name,
        body: String(payload.body).trim(),
        createdAt,
      };

      const messages = Array.isArray(thread.messages)
        ? thread.messages
        : adminService.normalizeThread(thread).messages;

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

      return this.listMessages({ studentId: portal.student.id }).find((item) => String(item.id) === String(threadId));
    },

    getCertificate(reference = {}) {
      const portal = requirePortal(reference, { context });
      return {
        certificate: portal.certificate,
        certificateGate: portal.certificateGate,
      };
    },
  };
}

export default createStudentService;
