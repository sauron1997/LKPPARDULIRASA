/**
 * Course Use Cases — CRUD and public catalog queries.
 */

import { ensure } from './errors.js';
import { slugify, formatCurrency } from './helpers.js';

/**
 * @param {Object} deps
 * @param {Object} deps.courseRepo - ICourseRepository
 * @param {Object} deps.blogRepo - IBlogPostRepository
 * @param {Object} deps.galleryRepo - IGalleryItemRepository
 * @param {Object} deps.profileRepo - IProfileRepository
 * @param {Object} deps.accreditationRepo - IAccreditationRepository
 * @param {Object} deps.paymentSettingsRepo - IPaymentSettingsRepository
 */
export function createCourseUseCases(deps) {
  const {
    courseRepo, blogRepo, galleryRepo, profileRepo,
    accreditationRepo, paymentSettingsRepo,
  } = deps;

  const now = () => new Date().toISOString();

  async function listCourses(filters = {}) {
    let courses = await courseRepo.list();
    if (filters.status) {
      courses = courses.filter(
        (c) => String(c.status || '').toLowerCase() === String(filters.status).toLowerCase()
      );
    }
    if (filters.search) {
      const q = String(filters.search).toLowerCase();
      courses = courses.filter(
        (c) => c.title.toLowerCase().includes(q) || c.description?.toLowerCase().includes(q)
      );
    }
    return courses;
  }

  async function getCourse(courseId) {
    const course = await courseRepo.getById(courseId);
    ensure(course, 'Program kursus tidak ditemukan.', 404, 'COURSE_NOT_FOUND');
    return course;
  }

  async function createCourse(payload = {}) {
    const ts = now();
    const id = payload.id || `course-${Date.now()}`;
    const record = {
      id,
      slug: payload.slug || slugify(payload.title || id),
      title: String(payload.title || ''),
      description: String(payload.description || ''),
      level: String(payload.level || ''),
      duration: String(payload.duration || ''),
      price: Number(payload.price || 0),
      priceLabel: payload.priceLabel || formatCurrency(payload.price),
      category: String(payload.category || ''),
      image: String(payload.image || ''),
      status: payload.status || 'draft',
      isFeatured: Boolean(payload.isFeatured || false),
      features: Array.isArray(payload.features) ? payload.features : [],
      schedule: String(payload.schedule || ''),
      maxStudents: Number(payload.maxStudents || 0),
      prerequisites: String(payload.prerequisites || ''),
      startDate: String(payload.startDate || ''),
      endDate: String(payload.endDate || ''),
      createdAt: ts,
      updatedAt: ts,
    };
    await courseRepo.insert(record);
    return record;
  }

  async function updateCourse(courseId, payload = {}) {
    const existing = await courseRepo.getById(courseId);
    ensure(existing, 'Program kursus tidak ditemukan.', 404, 'COURSE_NOT_FOUND');
    const ts = now();
    const next = {
      ...existing,
      ...payload,
      id: existing.id,
      slug: payload.slug || existing.slug,
      updatedAt: ts,
    };
    if (payload.price != null) {
      next.priceLabel = payload.priceLabel || formatCurrency(payload.price);
    }
    await courseRepo.update(existing.id, next);
    return next;
  }

  async function removeCourse(courseId) {
    const existing = await courseRepo.getById(courseId);
    ensure(existing, 'Program kursus tidak ditemukan.', 404, 'COURSE_NOT_FOUND');
    await courseRepo.remove(existing.id);
    return { id: existing.id };
  }

  async function getPublicOverview() {
    const [profile, courses, blogPosts, galleryItems, accreditations] = await Promise.all([
      profileRepo.get(),
      courseRepo.list(),
      blogRepo.list(),
      galleryRepo.list(),
      accreditationRepo.list(),
    ]);
    return {
      profile,
      courses: courses.filter((c) => c.status !== 'archived'),
      blogPosts: blogPosts.filter((p) => p.status !== 'archived'),
      galleryItems,
      accreditations,
    };
  }

  async function getPaymentSettings() {
    const settings = await paymentSettingsRepo.get();
    return {
      paymentMethods: settings?.paymentMethods || [],
      qrImageUrl: settings?.qrImageUrl || null,
      virtualAccount: settings?.virtualAccount || null,
      manualInstructions: settings?.manualInstructions || '',
      updatedAt: settings?.updatedAt || null,
    };
  }

  async function getCourseModules(courseId) {
    const course = await courseRepo.getById(courseId);
    ensure(course, 'Program kursus tidak ditemukan.', 404, 'COURSE_NOT_FOUND');
    return await courseRepo.listModules(courseId);
  }

  return {
    listCourses,
    getCourse,
    createCourse,
    updateCourse,
    removeCourse,
    getPublicOverview,
    getPaymentSettings,
    getCourseModules,
  };
}