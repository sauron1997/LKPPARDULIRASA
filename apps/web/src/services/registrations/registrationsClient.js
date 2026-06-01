import { apiRequest } from '../apiClient';

export function fetchRegistrationOptions() {
  return apiRequest('/api/v1/registrations/options');
}

export function createRegistration(payload) {
  return apiRequest('/api/v1/registrations', {
    method: 'POST',
    body: payload,
  });
}
