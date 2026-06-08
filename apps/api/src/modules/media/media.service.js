import { createBackendContext, rebuildMediaLibrary } from '../../runtime/backend-context.js';
import { ensure } from '../../runtime/errors.js';
import { compareByUpdatedDesc } from '@lkp-parduli-rasa/domain/use-cases';
import { requireDb } from '../../db/client.js';
import { mediaAssets } from '../../db/schema/index.js';
import { eq } from 'drizzle-orm';
import {
  canUseDatabasePersistence,
  createPersistedGalleryItem,
  createPersistedLibraryItem,
  deletePersistedGalleryItem,
  deletePersistedLibraryItem,
  getPersistedGalleryItem,
  listPersistedGalleryItems,
  listPersistedMediaLibrary,
  updatePersistedGalleryItem,
  updatePersistedLibraryItem,
} from '../content/content.persistence.js';
import { resolveStoredMediaPath } from './media.storage.js';

function normalizeGalleryMedia(payload = {}, fallbackId) {
  if (Array.isArray(payload.media) && payload.media.length) {
    return payload.media.map((item, index) => ({
      id: item.id || `${fallbackId}-media-${index + 1}`,
      name: item.name || `Media ${index + 1}`,
      type: item.type || 'photo',
      url: item.url || '',
      mimeType: item.mimeType || '',
      isObjectUrl: Boolean(item.isObjectUrl),
    }));
  }

  if (payload.url) {
    return [{
      id: `${fallbackId}-media-1`,
      name: payload.title || 'Media',
      type: payload.type || 'photo',
      url: payload.url,
      mimeType: payload.mimeType || '',
      isObjectUrl: Boolean(payload.isObjectUrl),
    }];
  }

  return [];
}

function createMemoryMediaService(context) {
  const { repositories } = context;

  return {
    listLibrary(filters = {}) {
      const search = String(filters.search || '').trim().toLowerCase();

      return repositories.mediaLibrary.list().filter((item) => {
        if (!search) return true;
        const haystack = `${item.name} ${item.domain} ${item.type}`.toLowerCase();
        return haystack.includes(search);
      });
    },

    createLibraryItem(payload = {}) {
      ensure(payload.name, 'Nama media wajib diisi.', 400, 'MEDIA_NAME_REQUIRED');
      ensure(payload.url, 'URL media wajib diisi.', 400, 'MEDIA_URL_REQUIRED');

      const record = {
        id: payload.id || `media-${Date.now()}`,
        domain: payload.domain || 'library',
        parentId: payload.parentId || null,
        name: String(payload.name).trim(),
        type: payload.type || 'asset',
        url: payload.url,
        mimeType: payload.mimeType || '',
        isObjectUrl: Boolean(payload.isObjectUrl),
        createdAt: context.now(),
        updatedAt: context.now(),
      };

      repositories.mediaLibrary.insert(record);
      return record;
    },
    updateLibraryItem(mediaId, payload = {}) {
      const existing = repositories.mediaLibrary.getById(mediaId);
      ensure(existing, 'Media tidak ditemukan.', 404, 'MEDIA_NOT_FOUND');

      return repositories.mediaLibrary.update(mediaId, (current) => ({
        ...current,
        name: payload.name ?? current.name,
        type: payload.type ?? current.type,
        url: payload.url ?? current.url,
        mimeType: payload.mimeType ?? current.mimeType,
        updatedAt: context.now(),
      }));
    },

    deleteLibraryItem(mediaId) {
      const removed = repositories.mediaLibrary.remove(mediaId);
      ensure(removed, 'Media tidak ditemukan.', 404, 'MEDIA_NOT_FOUND');
      return removed;
    },

    listGalleryItems() {
      return repositories.galleryItems.list().sort(compareByUpdatedDesc);
    },

    getGalleryItem(itemId) {
      const item = repositories.galleryItems.getById(itemId);
      ensure(item, 'Item galeri tidak ditemukan.', 404, 'GALLERY_ITEM_NOT_FOUND');
      return item;
    },

    createGalleryItem(payload = {}) {
      ensure(payload.title, 'Judul galeri wajib diisi.', 400, 'GALLERY_TITLE_REQUIRED');
      const nextId = repositories.galleryItems.list().reduce((highest, item) => Math.max(highest, Number(item.id) || 0), 0) + 1;
      const media = normalizeGalleryMedia(payload, `gallery-${nextId}`);
      const now = context.now();

      const record = {
        id: payload.id || nextId,
        title: String(payload.title).trim(),
        description: payload.description || '',
        tags: Array.isArray(payload.tags) ? payload.tags : ['Kursus Komputer'],
        media,
        coverId: payload.coverId || media[0]?.id || '',
        type: payload.type || media[0]?.type || 'photo',
        createdAt: now,
        updatedAt: now,
      };

      repositories.galleryItems.insert(record);
      rebuildMediaLibrary({ context });
      return record;
    },
    updateGalleryItem(itemId, payload = {}) {
      this.getGalleryItem(itemId);

      const record = repositories.galleryItems.update(itemId, (current) => {
        const media = payload.media || payload.url
          ? normalizeGalleryMedia({ ...current, ...payload }, `gallery-${current.id}`)
          : current.media;

        return {
          ...current,
          title: payload.title ?? current.title,
          description: payload.description ?? current.description,
          tags: Array.isArray(payload.tags) ? payload.tags : current.tags,
          media,
          coverId: payload.coverId ?? media[0]?.id ?? current.coverId,
          type: payload.type ?? media[0]?.type ?? current.type,
          updatedAt: context.now(),
        };
      });

      rebuildMediaLibrary({ context });
      return record;
    },

    deleteGalleryItem(itemId) {
      const removed = repositories.galleryItems.remove(itemId);
      ensure(removed, 'Item galeri tidak ditemukan.', 404, 'GALLERY_ITEM_NOT_FOUND');
      rebuildMediaLibrary({ context });
      return removed;
    },
  };
}
export function createMediaService(options = {}) {
  const context = createBackendContext(options);
  const memoryService = createMemoryMediaService(context);

  if (!canUseDatabasePersistence()) {
    return memoryService;
  }

  return {
    async getPublicAsset(mediaId) {
      const database = requireDb();
      const [asset] = await database.select().from(mediaAssets).where(eq(mediaAssets.id, String(mediaId))).limit(1);
      ensure(asset, 'Media tidak ditemukan.', 404, 'MEDIA_NOT_FOUND');
      ensure(String(asset.ownerType || '') !== 'manual-payment', 'Media tidak dapat diakses.', 403, 'MEDIA_FORBIDDEN');
      ensure(String(asset.visibility || 'public') === 'public', 'Media tidak dapat diakses.', 403, 'MEDIA_FORBIDDEN');
      return {
        ...asset,
        absolutePath: asset.storageKey ? resolveStoredMediaPath(asset.storageKey) : '',
      };
    },

    async listLibrary(filters = {}) {
      return listPersistedMediaLibrary(filters);
    },

    async createLibraryItem(payload = {}) {
      ensure(payload.name, 'Nama media wajib diisi.', 400, 'MEDIA_NAME_REQUIRED');
      ensure(payload.url, 'URL media wajib diisi.', 400, 'MEDIA_URL_REQUIRED');
      return createPersistedLibraryItem(payload);
    },

    async updateLibraryItem(mediaId, payload = {}) {
      const item = await updatePersistedLibraryItem(mediaId, payload);
      ensure(item, 'Media tidak ditemukan.', 404, 'MEDIA_NOT_FOUND');
      return item;
    },

    async deleteLibraryItem(mediaId) {
      const removed = await deletePersistedLibraryItem(mediaId);
      ensure(removed, 'Media tidak ditemukan.', 404, 'MEDIA_NOT_FOUND');
      return removed;
    },

    async listGalleryItems() {
      return listPersistedGalleryItems();
    },

    async getGalleryItem(itemId) {
      const item = await getPersistedGalleryItem(itemId);
      ensure(item, 'Item galeri tidak ditemukan.', 404, 'GALLERY_ITEM_NOT_FOUND');
      return item;
    },

    async createGalleryItem(payload = {}) {
      ensure(payload.title, 'Judul galeri wajib diisi.', 400, 'GALLERY_TITLE_REQUIRED');
      return createPersistedGalleryItem(payload);
    },

    async updateGalleryItem(itemId, payload = {}) {
      const item = await updatePersistedGalleryItem(itemId, payload);
      ensure(item, 'Item galeri tidak ditemukan.', 404, 'GALLERY_ITEM_NOT_FOUND');
      return item;
    },

    async deleteGalleryItem(itemId) {
      const removed = await deletePersistedGalleryItem(itemId);
      ensure(removed, 'Item galeri tidak ditemukan.', 404, 'GALLERY_ITEM_NOT_FOUND');
      return removed;
    },
  };
}

export default createMediaService;
