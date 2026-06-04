import { apiRequest } from '../apiClient';

export function fetchPaymentSettings() {
  return apiRequest('/api/v1/payment-settings');
}

export function fetchAdminPaymentSettings() {
  return apiRequest('/api/v1/admin/payment-settings');
}

export function updatePaymentSettings(settings) {
  return apiRequest('/api/v1/admin/payment-settings', {
    method: 'PUT',
    body: settings,
  });
}
