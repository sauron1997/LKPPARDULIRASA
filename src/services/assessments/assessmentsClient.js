import { createRouteFamilyClient } from '../admin/routeClient';

const adminApiClient = createRouteFamilyClient('/api/v1/admin');

export function fetchAdminAssessmentDefinitions(filters = {}) {
  return adminApiClient.request(['assessments', 'definitions'], { params: filters });
}

export function createAdminAssessmentDefinition(payload) {
  return adminApiClient.request(['assessments', 'definitions'], {
    method: 'POST',
    body: payload,
  });
}

export function updateAdminAssessmentDefinition(definitionId, payload) {
  return adminApiClient.request(['assessments', 'definitions', definitionId], {
    method: 'PATCH',
    body: payload,
  });
}

export function fetchAdminAssessmentProgress(filters = {}) {
  return adminApiClient.request(['assessments', 'progress'], { params: filters });
}

export function fetchAdminAssessmentSubmissions(filters = {}) {
  return adminApiClient.request(['assessments', 'submissions'], { params: filters });
}

export function reviewAdminAssessmentSubmission(submissionId, payload) {
  return adminApiClient.request(['assessments', 'submissions', submissionId, 'review'], {
    method: 'POST',
    body: payload,
  });
}

export function fetchAdminCertificates(filters = {}) {
  return adminApiClient.request('certificates', { params: filters });
}

export function upsertAdminCertificate(studentId, payload) {
  return adminApiClient.request(['certificates', studentId], {
    method: 'PUT',
    body: payload,
  });
}

export function deleteAdminCertificate(certificateId) {
  return adminApiClient.request(['certificates', certificateId], {
    method: 'DELETE',
  });
}
