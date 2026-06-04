import { apiRequest } from '../apiClient';

export function fetchPaymentByEnrollment(enrollmentId, accessToken = '') {
  const query = accessToken ? `?token=${encodeURIComponent(accessToken)}` : '';
  return apiRequest(`/api/v1/payments/enrollment/${enrollmentId}${query}`);
}

export function checkPaymentStatus(paymentId) {
  return apiRequest(`/api/v1/payments/${paymentId}/status`, { method: 'POST' });
}

export function uploadPaymentProof(paymentId, payload) {
  return apiRequest(`/api/v1/payments/${paymentId}/proof`, {
    method: 'POST',
    body: payload,
  });
}

export function fetchPaymentsByStudent(studentId) {
  return apiRequest(`/api/v1/payments/student/${studentId}`);
}

export function fetchPayment(paymentId) {
  return apiRequest(`/api/v1/payments/${paymentId}`);
}

export function fetchManualPayments() {
  return apiRequest('/api/v1/admin/payments/manual');
}

export function verifyManualPayment(paymentId, payload = {}) {
  return apiRequest(`/api/v1/admin/payments/${paymentId}/verify`, {
    method: 'PATCH',
    body: payload,
  });
}

export function rejectManualPayment(paymentId, payload = {}) {
  return apiRequest(`/api/v1/admin/payments/${paymentId}/reject`, {
    method: 'PATCH',
    body: payload,
  });
}
