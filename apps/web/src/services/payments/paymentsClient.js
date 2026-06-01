import { apiRequest } from '../apiClient';

export function fetchPaymentByEnrollment(enrollmentId) {
  return apiRequest(`/api/v1/payments/enrollment/${enrollmentId}`);
}

export function checkPaymentStatus(paymentId) {
  return apiRequest(`/api/v1/payments/${paymentId}/status`, { method: 'POST' });
}

export function fetchPaymentsByStudent(studentId) {
  return apiRequest(`/api/v1/payments/student/${studentId}`);
}

export function fetchPayment(paymentId) {
  return apiRequest(`/api/v1/payments/${paymentId}`);
}
