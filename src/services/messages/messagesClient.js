import { createRouteFamilyClient } from '../admin/routeClient';

const adminApiClient = createRouteFamilyClient('/api/v1/admin');

function normalizeThreadsResponse(payload) {
  if (Array.isArray(payload)) {
    return {
      threads: payload,
      persistenceMode: 'memory',
    };
  }

  return {
    threads: Array.isArray(payload?.threads)
      ? payload.threads
      : Array.isArray(payload?.items)
        ? payload.items
        : [],
    persistenceMode: payload?.persistenceMode === 'database' ? 'database' : 'memory',
  };
}

function normalizeThreadResponse(payload) {
  if (payload && !Array.isArray(payload) && payload.thread) {
    return {
      thread: payload.thread,
      persistenceMode: payload?.persistenceMode === 'database' ? 'database' : 'memory',
    };
  }

  return {
    thread: payload,
    persistenceMode: 'memory',
  };
}

function appendFormDataValue(formData, key, value) {
  if (value === undefined || value === null || value === '') {
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => appendFormDataValue(formData, key, item));
    return;
  }

  if (value instanceof Blob) {
    formData.append(key, value);
    return;
  }

  formData.append(key, String(value));
}

function normalizeReplyPayload(payload) {
  if (payload instanceof FormData || payload == null) {
    return payload;
  }

  const attachmentValues = [
    ...(Array.isArray(payload.attachments) ? payload.attachments : []),
    ...(Array.isArray(payload.files) ? payload.files : []),
  ].filter(Boolean);

  if (attachmentValues.length === 0) {
    return payload;
  }

  const formData = new FormData();
  Object.entries(payload).forEach(([key, value]) => {
    if (key === 'attachments' || key === 'files') {
      return;
    }

    appendFormDataValue(formData, key, value);
  });
  attachmentValues.forEach((file) => appendFormDataValue(formData, 'attachments', file));

  return formData;
}

export function fetchAdminMessageThreads(channel, filters = {}) {
  return adminApiClient.request(['messages', channel], { params: filters })
    .then(normalizeThreadsResponse);
}

export function fetchAdminMessageThread(channel, threadId) {
  return adminApiClient.request(['messages', channel, threadId])
    .then(normalizeThreadResponse);
}

export function replyAdminMessageThread(channel, threadId, payload) {
  return adminApiClient.request(['messages', channel, threadId, 'replies'], {
    method: 'POST',
    body: normalizeReplyPayload(payload),
  });
}

export function updateAdminMessageThreadStatus(channel, threadId, payload) {
  return adminApiClient.request(['messages', channel, threadId, 'status'], {
    method: 'PATCH',
    body: payload,
  });
}
