import { createRouteFamilyClient } from '../admin/routeClient';

const adminApiClient = createRouteFamilyClient('/api/v1/admin');

export function fetchAdminMessageThreads(channel, filters = {}) {
  return adminApiClient.request(['messages', channel], { params: filters });
}

export function fetchAdminMessageThread(channel, threadId) {
  return adminApiClient.request(['messages', channel, threadId]);
}

export function replyAdminMessageThread(channel, threadId, payload) {
  return adminApiClient.request(['messages', channel, threadId, 'replies'], {
    method: 'POST',
    body: payload,
  });
}

export function updateAdminMessageThreadStatus(channel, threadId, payload) {
  return adminApiClient.request(['messages', channel, threadId, 'status'], {
    method: 'PATCH',
    body: payload,
  });
}
