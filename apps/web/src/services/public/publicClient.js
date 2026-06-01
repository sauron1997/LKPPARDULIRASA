import { apiRequest } from '../apiClient';

function buildQueryString(params = {}) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return;
    }

    searchParams.set(key, String(value));
  });

  const query = searchParams.toString();
  return query ? `?${query}` : '';
}

export function fetchPublicLandingSnapshot() {
  return apiRequest('/api/v1/public/landing');
}

export function fetchPublicProfile() {
  return apiRequest('/api/v1/public/profile');
}

export function fetchPublicCourses(filters = {}) {
  return apiRequest(`/api/v1/public/courses${buildQueryString(filters)}`);
}

export function fetchPublicBlogPosts(filters = {}) {
  return apiRequest(`/api/v1/public/blog${buildQueryString(filters)}`);
}

export function fetchPublicBlogPost(slugOrId) {
  return apiRequest(`/api/v1/public/blog/${slugOrId}`);
}

export function fetchPublicGalleryItems(filters = {}) {
  return apiRequest(`/api/v1/public/gallery${buildQueryString(filters)}`);
}

export function fetchPublicAccreditations() {
  return apiRequest('/api/v1/public/accreditations');
}

export function fetchPublicStudents(filters = {}) {
  return apiRequest(`/api/v1/public/students${buildQueryString(filters)}`);
}

export function submitPublicContactMessage(payload) {
  return apiRequest('/api/v1/public/contact-messages', {
    method: 'POST',
    body: payload,
  });
}
