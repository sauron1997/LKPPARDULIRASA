import { createRouteFamilyClient } from '../admin/routeClient';

const mediaClient = createRouteFamilyClient('/api/v1/admin/media');

export function fetchAdminMediaLibrary(filters = {}) {
  return mediaClient.request('library', { params: filters });
}

export function createAdminMediaLibraryItem(payload) {
  return mediaClient.request('library', {
    method: 'POST',
    body: payload,
  });
}

export function updateAdminMediaLibraryItem(mediaId, payload) {
  return mediaClient.request(['library', mediaId], {
    method: 'PATCH',
    body: payload,
  });
}

export function deleteAdminMediaLibraryItem(mediaId) {
  return mediaClient.request(['library', mediaId], {
    method: 'DELETE',
  });
}

export function fetchAdminGalleryItems() {
  return mediaClient.request('gallery');
}

export function createAdminGalleryItem(payload) {
  return mediaClient.request('gallery', {
    method: 'POST',
    body: payload,
  });
}

export function fetchAdminGalleryItem(itemId) {
  return mediaClient.request(['gallery', itemId]);
}

export function updateAdminGalleryItem(itemId, payload) {
  return mediaClient.request(['gallery', itemId], {
    method: 'PATCH',
    body: payload,
  });
}

export function deleteAdminGalleryItem(itemId) {
  return mediaClient.request(['gallery', itemId], {
    method: 'DELETE',
  });
}
