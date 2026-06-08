/**
 * Thread Utilities — extracted from admin.service.js (Phase 8 final).
 * Provides thread normalization and sorting helpers.
 */

import { normalizeThreadMessages } from '@lkp-parduli-rasa/domain/domain-relations';

export function compareByUpdatedDesc(left, right) {
  return new Date(right.updatedAt || 0).getTime() - new Date(left.updatedAt || 0).getTime();
}

export function normalizeThread(thread) {
  if (!thread) return thread;
  const normalized = normalizeThreadMessages(thread);
  return {
    ...thread,
    body: normalized.body,
    messages: normalized.messages,
    responses: normalized.responses,
    updatedAt: thread.updatedAt || normalized.lastMessageAt,
    lastMessageAt: thread.lastMessageAt || normalized.lastMessageAt,
    lastMessagePreview: thread.lastMessagePreview || normalized.messages.at(-1)?.body || normalized.body,
  };
}

export const threadHelpers = {
  compareByUpdatedDesc,
  normalizeThread,
};
