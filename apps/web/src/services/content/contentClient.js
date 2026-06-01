import { createRouteFamilyClient } from '../admin/routeClient';

const contentClient = createRouteFamilyClient('/api/v1/admin/content');

export function fetchAdminContentProfile() {
  return contentClient.request('profile');
}

export function updateAdminContentProfile(payload) {
  return contentClient.request('profile', {
    method: 'PATCH',
    body: payload,
  });
}

export function fetchAdminBlogPosts(filters = {}) {
  return contentClient.request('blog-posts', { params: filters });
}

export function createAdminBlogPost(payload) {
  return contentClient.request('blog-posts', {
    method: 'POST',
    body: payload,
  });
}

export function fetchAdminBlogPost(postId) {
  return contentClient.request(['blog-posts', postId]);
}

export function updateAdminBlogPost(postId, payload) {
  return contentClient.request(['blog-posts', postId], {
    method: 'PATCH',
    body: payload,
  });
}

export function deleteAdminBlogPost(postId) {
  return contentClient.request(['blog-posts', postId], {
    method: 'DELETE',
  });
}

export function fetchAdminAccreditations() {
  return contentClient.request('accreditations');
}

export function createAdminAccreditation(payload) {
  return contentClient.request('accreditations', {
    method: 'POST',
    body: payload,
  });
}

export function fetchAdminAccreditation(itemId) {
  return contentClient.request(['accreditations', itemId]);
}

export function updateAdminAccreditation(itemId, payload) {
  return contentClient.request(['accreditations', itemId], {
    method: 'PATCH',
    body: payload,
  });
}

export function deleteAdminAccreditation(itemId) {
  return contentClient.request(['accreditations', itemId], {
    method: 'DELETE',
  });
}
