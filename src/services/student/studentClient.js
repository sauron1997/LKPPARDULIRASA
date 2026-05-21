import { apiRequest } from '../apiClient';

export function createStudentAssessmentAsset(file) {
  if (!(file instanceof File)) {
    throw new Error('File jawaban tidak valid.');
  }

  return {
    assetUrl: URL.createObjectURL(file),
    fileName: file.name || '',
    mimeType: file.type || '',
    fileSize: Number(file.size || 0),
  };
}

export function revokeStudentAssessmentAssetUrl(assetUrl) {
  if (typeof assetUrl === 'string' && assetUrl.startsWith('blob:')) {
    URL.revokeObjectURL(assetUrl);
  }
}

export function fetchStudentDashboard() {
  return apiRequest('/api/v1/student/dashboard');
}

export function fetchStudentProfile() {
  return apiRequest('/api/v1/student/profile');
}

export function updateStudentProfile(payload) {
  return apiRequest('/api/v1/student/profile', {
    method: 'PATCH',
    body: payload,
  });
}

export function fetchStudentModules() {
  return apiRequest('/api/v1/student/modules');
}

export function fetchStudentSchedule() {
  return apiRequest('/api/v1/student/schedule');
}

export function checkInStudentScheduleSession(sessionId, payload = {}) {
  if (!sessionId) {
    throw new Error('Sesi jadwal tidak valid.');
  }

  return apiRequest(`/api/v1/student/schedule/${encodeURIComponent(sessionId)}/check-in`, {
    method: 'POST',
    body: payload,
  });
}

export function fetchStudentMessages() {
  return apiRequest('/api/v1/student/messages');
}

export function createStudentMessageThread(payload) {
  return apiRequest('/api/v1/student/messages', {
    method: 'POST',
    body: payload,
  });
}

export function replyToStudentMessageThread(threadId, payload) {
  return apiRequest(`/api/v1/student/messages/${threadId}/replies`, {
    method: 'POST',
    body: payload,
  });
}

export function fetchStudentCertificate() {
  return apiRequest('/api/v1/student/certificate');
}

export function fetchStudentAssessmentProgress() {
  return apiRequest('/api/v1/student/assessments/progress');
}

export function fetchStudentAssessmentSubmissions() {
  return apiRequest('/api/v1/student/assessments/submissions');
}

export function submitStudentAssessment(payload) {
  return apiRequest('/api/v1/student/assessments/submissions', {
    method: 'POST',
    body: payload,
  });
}
