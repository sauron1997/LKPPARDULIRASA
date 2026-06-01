import { createRouteFamilyClient } from '../admin/routeClient';

const classroomClient = createRouteFamilyClient('/api/v1/admin/classroom');

export function fetchAdminClassroomPosts(filters = {}) {
  return classroomClient.request('posts', { params: filters });
}

export function createAdminClassroomPost(payload) {
  return classroomClient.request('posts', {
    method: 'POST',
    body: payload,
  });
}

export function updateAdminClassroomPost(postId, payload) {
  return classroomClient.request(['posts', postId], {
    method: 'PATCH',
    body: payload,
  });
}

export function deleteAdminClassroomPost(postId) {
  return classroomClient.request(['posts', postId], {
    method: 'DELETE',
  });
}

export function fetchAdminClassworkItems(filters = {}) {
  return classroomClient.request('classwork-items', { params: filters });
}

export function createAdminClassworkItem(payload) {
  return classroomClient.request('classwork-items', {
    method: 'POST',
    body: payload,
  });
}
