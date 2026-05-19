import { normalizeQueryKeyFilters } from '../../services/admin/routeClient';

export const messageQueryKeys = {
  all: ['admin', 'messages'],
  channel: (channel) => [...messageQueryKeys.all, String(channel)],
  threads: (channel, filters = {}) => [...messageQueryKeys.channel(channel), 'threads', normalizeQueryKeyFilters(filters)],
  thread: (channel, threadId) => [...messageQueryKeys.channel(channel), 'thread', String(threadId)],
};
