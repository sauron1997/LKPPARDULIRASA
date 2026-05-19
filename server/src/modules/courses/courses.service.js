import { createAdminService, ensure } from '../admin/admin.service.js';

export function createCoursesService(options = {}) {
  const adminService = createAdminService(options);
  const context = adminService.getContext();
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
    listCourses(filters = {}) {
      const search = String(filters.search || '').trim().toLowerCase();

      return repositories.courses.list()
        .filter((course) => {
          if (!search) return true;
          const haystack = `${course.title} ${course.description} ${(course.aliases || []).join(' ')}`.toLowerCase();
          return haystack.includes(search);
        })
        .map(hydrateCourse);
    },

    getCourse(courseId) {
      const course = repositories.courses.getById(courseId);
      ensure(course, 'Program kursus tidak ditemukan.', 404, 'COURSE_NOT_FOUND');
      return hydrateCourse(course);
    },

    createCourse(payload = {}) {
      ensure(payload.title, 'Nama program wajib diisi.', 400, 'TITLE_REQUIRED');
      const now = context.now();
      const nextId = repositories.courses.list().reduce((highest, item) => Math.max(highest, Number(item.id) || 0), 0) + 1;

      const course = {
        id: nextId,
        title: String(payload.title).trim(),
        aliases: Array.isArray(payload.aliases) ? payload.aliases : [],
        description: payload.description || '',
        icon: payload.icon || 'FileText',
        priceValue: Number(payload.priceValue || 0),
        priceLabel: payload.priceLabel || adminService.helpers.formatCurrency(payload.priceValue || 0),
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

    updateCourse(courseId, payload = {}) {
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

    deleteCourse(courseId) {
      const hasEnrollment = repositories.enrollments.raw().some((item) => String(item.courseId) === String(courseId));
      ensure(!hasEnrollment, 'Program masih dipakai oleh data pendaftaran/siswa.', 409, 'COURSE_IN_USE');

      repositories.modules.replaceAll(
        repositories.modules.raw().filter((item) => String(item.courseId) !== String(courseId)),
      );

      const removed = repositories.courses.remove(courseId);
      ensure(removed, 'Program kursus tidak ditemukan.', 404, 'COURSE_NOT_FOUND');
      return removed;
    },

    listModules(courseId) {
      this.getCourse(courseId);
      return repositories.modules.list()
        .filter((item) => String(item.courseId) === String(courseId))
        .sort((left, right) => Number(left.order || 0) - Number(right.order || 0));
    },

    createModule(courseId, payload = {}) {
      const course = this.getCourse(courseId);
      ensure(payload.title, 'Judul modul wajib diisi.', 400, 'MODULE_TITLE_REQUIRED');

      const modules = this.listModules(courseId);
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

    updateModule(courseId, moduleId, payload = {}) {
      this.getCourse(courseId);
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

    deleteModule(courseId, moduleId) {
      this.getCourse(courseId);
      const removed = repositories.modules.remove(moduleId);
      ensure(removed && String(removed.courseId) === String(courseId), 'Modul tidak ditemukan.', 404, 'MODULE_NOT_FOUND');
      return removed;
    },
  };
}

export default createCoursesService;
