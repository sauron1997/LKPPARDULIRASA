import { createRouteFamilyClient } from '../admin/routeClient';

const coursesClient = createRouteFamilyClient('/api/v1/admin/courses');

export function fetchAdminCourses(filters = {}) {
  return coursesClient.list(filters);
}

export function createAdminCourse(payload) {
  return coursesClient.create(payload);
}

export function fetchAdminCourse(courseId) {
  return coursesClient.get(courseId);
}

export function updateAdminCourse(courseId, payload) {
  return coursesClient.update(courseId, payload);
}

export function deleteAdminCourse(courseId) {
  return coursesClient.remove(courseId);
}

export function fetchAdminCourseModules(courseId) {
  return coursesClient.request([courseId, 'modules']);
}

export function createAdminCourseModule(courseId, payload) {
  return coursesClient.request([courseId, 'modules'], {
    method: 'POST',
    body: payload,
  });
}

export function updateAdminCourseModule(courseId, moduleId, payload) {
  return coursesClient.request([courseId, 'modules', moduleId], {
    method: 'PATCH',
    body: payload,
  });
}

export function deleteAdminCourseModule(courseId, moduleId) {
  return coursesClient.request([courseId, 'modules', moduleId], {
    method: 'DELETE',
  });
}
