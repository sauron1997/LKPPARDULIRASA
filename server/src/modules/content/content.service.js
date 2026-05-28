import { createAdminService, ensure } from '../admin/admin.service.js';
import {
  canUseDatabasePersistence,
  createPersistedAccreditation,
  createPersistedBlogPost,
  deletePersistedAccreditation,
  deletePersistedBlogPost,
  getPersistedAccreditation,
  getPersistedBlogPost,
  getPersistedProfile,
  listPersistedAccreditations,
  listPersistedBlogPosts,
  updatePersistedAccreditation,
  updatePersistedBlogPost,
  updatePersistedProfile,
} from './content.persistence.js';

function createMemoryContentService(adminService, context) {
  const { repositories } = context;

  return {
    getProfile() {
      return repositories.profile.get();
    },

    updateProfile(payload = {}) {
      return repositories.profile.update((current) => ({
        ...current,
        ...payload,
        updatedAt: context.now(),
      }));
    },

    listBlogPosts(filters = {}) {
      const search = String(filters.search || '').trim().toLowerCase();

      return repositories.blogPosts.list()
        .filter((post) => {
          if (!search) return true;
          const haystack = `${post.title} ${post.summary} ${post.content}`.toLowerCase();
          return haystack.includes(search);
        })
        .sort(adminService.helpers.compareByUpdatedDesc);
    },

    getBlogPost(postId) {
      const post = repositories.blogPosts.raw().find((item) => (
        String(item.id) === String(postId)
        || String(item.slug) === String(postId)
      )) || null;

      ensure(post, 'Artikel blog tidak ditemukan.', 404, 'BLOG_POST_NOT_FOUND');
      return post;
    },

    createBlogPost(payload = {}) {
      ensure(payload.title, 'Judul artikel wajib diisi.', 400, 'BLOG_TITLE_REQUIRED');
      const now = context.now();
      const nextId = repositories.blogPosts.list().reduce((highest, item) => Math.max(highest, Number(item.id) || 0), 0) + 1;

      const post = {
        id: payload.id || nextId,
        slug: payload.slug || adminService.helpers.slugify(payload.title),
        title: String(payload.title).trim(),
        summary: payload.summary || '',
        content: payload.content || '',
        author: payload.author || 'Admin LKP',
        image: payload.image || '',
        tags: Array.isArray(payload.tags) ? payload.tags : [],
        category: payload.category || 'Edukasi',
        status: payload.status || 'draft',
        publishedAt: payload.publishedAt || now,
        createdAt: now,
        updatedAt: now,
      };

      repositories.blogPosts.insert(post);
      adminService.helpers.rebuildMediaLibrary();
      return post;
    },

    updateBlogPost(postId, payload = {}) {
      this.getBlogPost(postId);

      const post = repositories.blogPosts.update(postId, (current) => ({
        ...current,
        slug: payload.slug ?? current.slug,
        title: payload.title ?? current.title,
        summary: payload.summary ?? current.summary,
        content: payload.content ?? current.content,
        author: payload.author ?? current.author,
        image: payload.image ?? current.image,
        tags: Array.isArray(payload.tags) ? payload.tags : current.tags,
        category: payload.category ?? current.category,
        status: payload.status ?? current.status,
        publishedAt: payload.publishedAt ?? current.publishedAt,
        updatedAt: context.now(),
      }));

      adminService.helpers.rebuildMediaLibrary();
      return post;
    },

    deleteBlogPost(postId) {
      const removed = repositories.blogPosts.remove(postId);
      ensure(removed, 'Artikel blog tidak ditemukan.', 404, 'BLOG_POST_NOT_FOUND');
      adminService.helpers.rebuildMediaLibrary();
      return removed;
    },

    listAccreditations() {
      return repositories.accreditations.list().sort(adminService.helpers.compareByUpdatedDesc);
    },

    getAccreditation(itemId) {
      const item = repositories.accreditations.getById(itemId);
      ensure(item, 'Dokumen akreditasi tidak ditemukan.', 404, 'ACCREDITATION_NOT_FOUND');
      return item;
    },

    createAccreditation(payload = {}) {
      ensure(payload.title, 'Judul akreditasi wajib diisi.', 400, 'ACCREDITATION_TITLE_REQUIRED');
      const now = context.now();
      const nextId = repositories.accreditations.list().reduce((highest, item) => Math.max(highest, Number(item.id) || 0), 0) + 1;

      const record = {
        id: payload.id || nextId,
        title: String(payload.title).trim(),
        certificateNumber: payload.certificateNumber || '',
        description: payload.description || '',
        expiryDate: payload.expiryDate || '',
        year: payload.year || '',
        status: payload.status || 'Aktif',
        documentUrl: payload.documentUrl || '',
        documentName: payload.documentName || '',
        updatedAt: now,
      };

      repositories.accreditations.insert(record);
      adminService.helpers.rebuildMediaLibrary();
      return record;
    },

    updateAccreditation(itemId, payload = {}) {
      this.getAccreditation(itemId);

      const record = repositories.accreditations.update(itemId, (current) => ({
        ...current,
        title: payload.title ?? current.title,
        certificateNumber: payload.certificateNumber ?? current.certificateNumber,
        description: payload.description ?? current.description,
        expiryDate: payload.expiryDate ?? current.expiryDate,
        year: payload.year ?? current.year,
        status: payload.status ?? current.status,
        documentUrl: payload.documentUrl ?? current.documentUrl,
        documentName: payload.documentName ?? current.documentName,
        updatedAt: context.now(),
      }));

      adminService.helpers.rebuildMediaLibrary();
      return record;
    },

    deleteAccreditation(itemId) {
      const removed = repositories.accreditations.remove(itemId);
      ensure(removed, 'Dokumen akreditasi tidak ditemukan.', 404, 'ACCREDITATION_NOT_FOUND');
      adminService.helpers.rebuildMediaLibrary();
      return removed;
    },
  };
}

export function createContentService(options = {}) {
  const adminService = createAdminService(options);
  const context = adminService.getContext();
  const memoryService = createMemoryContentService(adminService, context);

  if (!canUseDatabasePersistence()) {
    return memoryService;
  }

  return {
    async getProfile() {
      return getPersistedProfile();
    },

    async updateProfile(payload = {}) {
      return updatePersistedProfile(payload);
    },

    async listBlogPosts(filters = {}) {
      return listPersistedBlogPosts(filters);
    },

    async getBlogPost(postId) {
      const post = await getPersistedBlogPost(postId);
      ensure(post, 'Artikel blog tidak ditemukan.', 404, 'BLOG_POST_NOT_FOUND');
      return post;
    },

    async createBlogPost(payload = {}) {
      ensure(payload.title, 'Judul artikel wajib diisi.', 400, 'BLOG_TITLE_REQUIRED');
      return createPersistedBlogPost(payload);
    },

    async updateBlogPost(postId, payload = {}) {
      const post = await updatePersistedBlogPost(postId, payload);
      ensure(post, 'Artikel blog tidak ditemukan.', 404, 'BLOG_POST_NOT_FOUND');
      return post;
    },

    async deleteBlogPost(postId) {
      const removed = await deletePersistedBlogPost(postId);
      ensure(removed, 'Artikel blog tidak ditemukan.', 404, 'BLOG_POST_NOT_FOUND');
      return removed;
    },

    async listAccreditations() {
      return listPersistedAccreditations();
    },

    async getAccreditation(itemId) {
      const item = await getPersistedAccreditation(itemId);
      ensure(item, 'Dokumen akreditasi tidak ditemukan.', 404, 'ACCREDITATION_NOT_FOUND');
      return item;
    },

    async createAccreditation(payload = {}) {
      ensure(payload.title, 'Judul akreditasi wajib diisi.', 400, 'ACCREDITATION_TITLE_REQUIRED');
      return createPersistedAccreditation(payload);
    },

    async updateAccreditation(itemId, payload = {}) {
      const item = await updatePersistedAccreditation(itemId, payload);
      ensure(item, 'Dokumen akreditasi tidak ditemukan.', 404, 'ACCREDITATION_NOT_FOUND');
      return item;
    },

    async deleteAccreditation(itemId) {
      const removed = await deletePersistedAccreditation(itemId);
      ensure(removed, 'Dokumen akreditasi tidak ditemukan.', 404, 'ACCREDITATION_NOT_FOUND');
      return removed;
    },
  };
}

export default createContentService;
