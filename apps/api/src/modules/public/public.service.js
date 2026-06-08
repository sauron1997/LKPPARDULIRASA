/**
 * Public Service — zero dependency on legacy admin.service.js (Phase 8migration).
 */
import { createBackendContext } from '../../runtime/backend-context.js';
import { ensure } from '../../runtime/errors.js';
import { compareByUpdatedDesc } from '@lkp-parduli-rasa/domain/use-cases';
import { normalizeThreadMessages } from '@lkp-parduli-rasa/domain/domain-relations';
import {
  canUseMessageDatabasePersistence as canUseDatabasePersistence,
  createPersistedPublicMessage,
} from '../messages/messages.persistence.js';

export function createPublicService(options = {}) {
  const context = createBackendContext(options);
  const { repositories } = context;

  function listPublishedPosts(filters = {}) {
    const search = String(filters.search || '').trim().toLowerCase();

    return repositories.blogPosts.list()
      .filter((post) => {
        if (filters.status && String(post.status) !== String(filters.status)) return false;
        if (!search) return true;
        const haystack = `${post.title} ${post.summary} ${post.content} ${(post.tags || []).join(' ')}`.toLowerCase();
        return haystack.includes(search);
      })
      .sort(compareByUpdatedDesc);
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

  return {
    getLandingSnapshot() {
      const courses = repositories.courses.list();
      const blogPosts = listPublishedPosts({ status: 'published' });
      return {
        profile: repositories.profile.get(),
        featuredCourses: courses.slice(0, 3),
        courses,
        latestBlogPosts: blogPosts.slice(0, 4),
        galleryItems: repositories.galleryItems.list().slice(0, 8),
        accreditations: repositories.accreditations.list(),};
    },

    getProfile() {
      return repositories.profile.get();
    },

    listCourses(filters = {}) {
      const search = String(filters.search || '').trim().toLowerCase();
      const modules = repositories.modules.list();
      return repositories.courses.list()
        .filter((course) => {
          if (!search) return true;
          const haystack = `${course.title} ${course.description} ${(course.aliases || []).join(' ')}`.toLowerCase();
          return haystack.includes(search);
        })
        .map((course) => {
          const courseModules = modules.filter((item) => String(item.courseId) === String(course.id));
          return {
            ...course,
            moduleIds: courseModules.map((item) => item.id),
            moduleCount: courseModules.length,
            modules: filters.includeModules === 'true' ? courseModules : undefined,
          };
        });
    },

    getCourse(courseId) {
      const course = repositories.courses.getById(courseId);
      ensure(course, 'Program kursus tidak ditemukan.', 404, 'COURSE_NOT_FOUND');
      return {
        ...course,
        modules: repositories.modules.list()
          .filter((item) => String(item.courseId) === String(course.id))
          .sort((left, right) => Number(left.order || 0) - Number(right.order || 0)),
      };
    },

    listBlogPosts(filters = {}) {
      return listPublishedPosts({ search: filters.search, status: filters.status || 'published' });
    },

    getBlogPost(slugOrId) {
      const matchedPost = repositories.blogPosts.list().find((post) => (
        String(post.id) === String(slugOrId) || String(post.slug) === String(slugOrId)
      )) || null;
      ensure(matchedPost, 'Artikel blog tidak ditemukan.', 404, 'BLOG_POST_NOT_FOUND');
      return matchedPost;
    },

    listGalleryItems(filters = {}) {
      const tagFilter = String(filters.tag || '').trim().toLowerCase();
      const typeFilter = String(filters.type || '').trim().toLowerCase();
      return repositories.galleryItems.list().filter((item) => {
        const matchesTag = tagFilter ? (item.tags || []).some((tag) => String(tag).toLowerCase() === tagFilter) : true;
        const matchesType = typeFilter ? String(item.type || '').toLowerCase() === typeFilter : true;
        return matchesTag && matchesType;
      });
    },

    listAccreditations() {
      return repositories.accreditations.list().sort(compareByUpdatedDesc);
    },

    listPublicStudents(filters = {}) {
      const search = String(filters.search || '').trim().toLowerCase();
      const courseId = filters.courseId != null ? String(filters.courseId) : '';
      const status = filters.status != null ? String(filters.status).toLowerCase() : '';
      return repositories.students.list()
        .filter((student) => {
          const matchesSearch = search ? `${student.name} ${student.nis} ${student.program}`.toLowerCase().includes(search) : true;
          const matchesCourse = courseId ? String(student.courseId) === courseId : true;
          const matchesStatus = status ? String(student.status || '').toLowerCase() === status : true;
          return matchesSearch && matchesCourse && matchesStatus;
        })
        .map((student) => ({
          id: student.id, nis: student.nis, name: student.name,
          program: student.program, courseId: student.courseId,
          status: student.status, registrationDate: student.registrationDate,
        }));
    },

    async submitContactMessage(payload = {}) {
      ensure(payload.name, 'Nama wajib diisi.', 400, 'NAME_REQUIRED');
      ensure(payload.email, 'Email wajib diisi.', 400, 'EMAIL_REQUIRED');
      ensure(payload.address, 'Alamat wajib diisi.', 400, 'ADDRESS_REQUIRED');
      ensure(payload.message, 'Pesan wajib diisi.', 400, 'MESSAGE_REQUIRED');

      const createdAt = context.now();

      if (canUseDatabasePersistence()) {
        const thread = await createPersistedPublicMessage({
          id: `public-thread-${createdAt.replace(/[^0-9]/g, '')}`,
          name: String(payload.name).trim(),
          email: String(payload.email).trim().toLowerCase(),
          address: String(payload.address).trim(),
          subject: String(payload.subject || 'Pesan dari halaman kontak').trim(),
          message: String(payload.message).trim(),
        }, createdAt);
        return normalizeThread(thread);
      }

      const nextId = repositories.publicMessages.list().reduce(
        (highest, item) => Math.max(highest, Number(item.id) || 0), 0,
      ) + 1;
      const record = {
        id: nextId, channel: 'public',
        senderName: String(payload.name).trim(),
        senderEmail: String(payload.email).trim().toLowerCase(),
        senderAddress: String(payload.address).trim(),
        subject: String(payload.subject || 'Pesan dari halaman kontak').trim(),
        body: String(payload.message).trim(),
        status: 'unread', createdAt, responses: [], draft: '', updatedAt: createdAt,
      };
      repositories.publicMessages.insert(record);
      return normalizeThread(record);
    },
  };
}

export default createPublicService;