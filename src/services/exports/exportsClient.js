import { createRouteFamilyClient } from '../admin/routeClient';

const exportsClient = createRouteFamilyClient('/api/v1/admin/exports');

export function exportAdminStudents(filters = {}) {
  return exportsClient.request('students', {
    params: filters,
    responseType: 'blob-with-meta',
  });
}

export function exportAdminMessages(filters = {}) {
  return exportsClient.request('messages', {
    params: filters,
    responseType: 'blob-with-meta',
  });
}

export function exportAdminCertificates(filters = {}) {
  return exportsClient.request('certificates', {
    params: filters,
    responseType: 'blob-with-meta',
  });
}
