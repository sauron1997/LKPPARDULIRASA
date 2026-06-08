import { createBackendContext, rebuildMediaLibrary } from '../../runtime/backend-context.js';
import { ensure } from '../../runtime/errors.js';
import { slugify, formatCurrency } from '@lkp-parduli-rasa/domain/use-cases';
import {
  canUseDatabaseCoursePersistence,
  createPersistedCourse,
  createPersistedModule,
  deletePersistedCourse,
  deletePersistedModule,
  getPersistedCourse,
  listPersistedCourses,
  listPersistedModules,
  updatePersistedCourse,
  updatePersistedModule,
} from './courses.persistence.js';

export function createCoursesService(options = {}) {
  const context = createBackendContext(options);
  const { repositories } = context;

  function hydrateCourse(course) {
    const modules = repositories.modules.list()
      .filter((item) => String(item.courseId) === String(course.id))
      .sort((left, right) => Number(left.order || 0) - Number(right.order || 0));

    return {
      ...course,
      moduleIds: modules.map((item) => item.id),
      moduleCount: modules.length,
      modules,
    };
  }

  return {
    async listCourses(filters = {}) {
      if (canUseDatabaseCoursePersistence()) {
        return listPersistedCourses(filters);
      }

      const search = String(filters.search || '').trim().toLowerCase();

      return repositories.courses.list()
        .filter((course) => {
          if (!search) return true;
          const haystack = `${course.title} ${course.description} ${(course.aliases || []).join(' ')}`.toLowerCase();
          return haystack.includes(search);
        })
        .map(hydrateCourse);
    },

    async getCourse(courseId) {
      if (canUseDatabaseCoursePersistence()) {
        const course = await getPersistedCourse(courseId);
        ensure(course, 'Program kursus tidak ditemukan.', 404, 'COURSE_NOT_FOUND');
        return course;
      }

      const course = repositories.courses.getById(courseId);
      ensure(course, 'Program kursus tidak ditemukan.', 404, 'COURSE_NOT_FOUND');
      return hydrateCourse(course);
    },

    async createCourse(payload = {}) {
      ensure(payload.title, 'Nama program wajib diisi.', 400, 'TITLE_REQUIRED');

      if (canUseDatabaseCoursePersistence()) {
        const course = await createPersistedCourse(payload, {
          formatCurrency: formatCurrency,
        });
        ensure(course, 'Program kursus gagal dibuat.', 500, 'COURSE_CREATE_FAILED');
        return course;
      }

      const now = context.now();
      const nextId = repositories.courses.list().reduce((highest, item) => Math.max(highest, Number(item.id) || 0), 0) + 1;

      const course = {
        id: nextId,
        title: String(payload.title).trim(),
        aliases: Array.isArray(payload.aliases) ? payload.aliases : [],
        description: payload.description || '',
        icon: payload.icon || 'FileText',
        priceValue: Number(payload.priceValue || 0),
        priceLabel: payload.priceLabel || formatCurrency(payload.priceValue || 0),
        duration: payload.duration || '',
        level: payload.level || 'Umum',
        brochureName: payload.brochureName || '',
        brochureUrl: payload.brochureUrl || '',
        materials: Array.isArray(payload.materials) ? payload.materials : [],
        createdAt: now,
        updatedAt: now,
      };

      repositories.courses.insert(course);
      return hydrateCourse(course);
    },

    async updateCourse(courseId, payload = {}) {
      if (canUseDatabaseCoursePersistence()) {
        const course = await updatePersistedCourse(courseId, payload, {
          formatCurrency: formatCurrency,
        });
        ensure(course, 'Program kursus tidak ditemukan.', 404, 'COURSE_NOT_FOUND');
        return course;
      }

      const course = repositories.courses.getById(courseId);
      ensure(course, 'Program kursus tidak ditemukan.', 404, 'COURSE_NOT_FOUND');

      const updatedCourse = repositories.courses.update(courseId, (current) => ({
        ...current,
        title: payload.title ?? current.title,
        aliases: Array.isArray(payload.aliases) ? payload.aliases : current.aliases,
        description: payload.description ?? current.description,
        icon: payload.icon ?? current.icon,
        priceValue: payload.priceValue != null ? Number(payload.priceValue) : current.priceValue,
        priceLabel: payload.priceLabel ?? current.priceLabel,
        duration: payload.duration ?? current.duration,
        level: payload.level ?? current.level,
        brochureName: payload.brochureName ?? current.brochureName,
        brochureUrl: payload.brochureUrl ?? current.brochureUrl,
        materials: Array.isArray(payload.materials) ? payload.materials : current.materials,
        updatedAt: context.now(),
      }));

      return hydrateCourse(updatedCourse);
    },

    async deleteCourse(courseId) {
      if (canUseDatabaseCoursePersistence()) {
        const result = await deletePersistedCourse(courseId);
        ensure(!result?.blocked, 'Program masih dipakai oleh data pendaftaran/siswa.', 409, 'COURSE_IN_USE');
        ensure(result, 'Program kursus tidak ditemukan.', 404, 'COURSE_NOT_FOUND');
        return result;
      }

      const hasEnrollment = repositories.enrollments.raw().some((item) => String(item.courseId) === String(courseId));
      ensure(!hasEnrollment, 'Program masih dipakai oleh data pendaftaran/siswa.', 409, 'COURSE_IN_USE');

      repositories.modules.replaceAll(
        repositories.modules.raw().filter((item) => String(item.courseId) !== String(courseId)),
      );

      const removed = repositories.courses.remove(courseId);
      ensure(removed, 'Program kursus tidak ditemukan.', 404, 'COURSE_NOT_FOUND');
      return removed;
    },

    async listModules(courseId) {
      if (canUseDatabaseCoursePersistence()) {
        const modules = await listPersistedModules(courseId);
        ensure(modules, 'Program kursus tidak ditemukan.', 404, 'COURSE_NOT_FOUND');
        return modules;
      }

      await this.getCourse(courseId);
      return repositories.modules.list()
        .filter((item) => String(item.courseId) === String(courseId))
        .sort((left, right) => Number(left.order || 0) - Number(right.order || 0));
    },

    async createModule(courseId, payload = {}) {
      const course = await this.getCourse(courseId);
      ensure(payload.title, 'Judul modul wajib diisi.', 400, 'MODULE_TITLE_REQUIRED');

      if (canUseDatabaseCoursePersistence()) {
        const moduleRecord = await createPersistedModule(courseId, payload);
        ensure(moduleRecord, 'Modul gagal dibuat.', 500, 'MODULE_CREATE_FAILED');
        return moduleRecord;
      }

      const modules = await this.listModules(courseId);
      const order = payload.order != null ? Number(payload.order) : modules.length + 1;
      const nextId = payload.id || `mod-${course.id}-${order}`;
      const now = context.now();

      const moduleRecord = {
        id: nextId,
        courseId: course.id,
        courseTitle: course.title,
        title: String(payload.title).trim(),
        summary: payload.summary || '',
        order,
        durationLabel: payload.durationLabel || '',
        resourceType: payload.resourceType || 'lesson',
        isPublished: payload.isPublished ?? true,
        createdAt: now,
        updatedAt: now,
      };

      repositories.modules.insert(moduleRecord, { prepend: false });
      return moduleRecord;
    },

    async updateModule(courseId, moduleId, payload = {}) {
      await this.getCourse(courseId);

      if (canUseDatabaseCoursePersistence()) {
        const moduleRecord = await updatePersistedModule(courseId, moduleId, payload);
        ensure(moduleRecord, 'Modul tidak ditemukan.', 404, 'MODULE_NOT_FOUND');
        return moduleRecord;
      }

      const moduleRecord = repositories.modules.raw().find((item) => (
        String(item.id) === String(moduleId)
        && String(item.courseId) === String(courseId)
      )) || null;

      ensure(moduleRecord, 'Modul tidak ditemukan.', 404, 'MODULE_NOT_FOUND');

      return repositories.modules.update(moduleId, (current) => ({
        ...current,
        title: payload.title ?? current.title,
        summary: payload.summary ?? current.summary,
        order: payload.order != null ? Number(payload.order) : current.order,
        durationLabel: payload.durationLabel ?? current.durationLabel,
        resourceType: payload.resourceType ?? current.resourceType,
        isPublished: payload.isPublished ?? current.isPublished,
        updatedAt: context.now(),
      }));
    },

    async deleteModule(courseId, moduleId) {
      await this.getCourse(courseId);

      if (canUseDatabaseCoursePersistence()) {
        const removed = await deletePersistedModule(courseId, moduleId);
        ensure(removed, 'Modul tidak ditemukan.', 404, 'MODULE_NOT_FOUND');
        return removed;
      }

      const removed = repositories.modules.remove(moduleId);
      ensure(removed && String(removed.courseId) === String(courseId), 'Modul tidak ditemukan.', 404, 'MODULE_NOT_FOUND');
      return removed;
    },
  };
}

export default createCoursesService;
