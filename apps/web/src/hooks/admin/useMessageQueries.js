import { useQuery } from '@tanstack/react-query';
import { messageQueryKeys } from '../../lib/queries/messageQueryKeys';
import {
  fetchAdminMessageThread,
  fetchAdminMessageThreads,
  replyAdminMessageThread,
  updateAdminMessageThreadStatus,
} from '../../services/messages/messagesClient';
import { useInvalidationMutation } from './queryMutationUtils';

export function useAdminMessageThreadsQuery(channel, filters = {}, options = {}) {
  return useQuery({
    queryKey: messageQueryKeys.threads(channel, filters),
    queryFn: () => fetchAdminMessageThreads(channel, filters),
    enabled: Boolean(channel) && (options.enabled ?? true),
    staleTime: 30_000,
    ...options,
  });
}

export function useAdminMessageThreadQuery(channel, threadId, options = {}) {
  return useQuery({
    queryKey: messageQueryKeys.thread(channel, threadId),
    queryFn: () => fetchAdminMessageThread(channel, threadId),
    enabled: Boolean(channel && threadId) && (options.enabled ?? true),
    staleTime: 30_000,
    ...options,
  });
}

export function useReplyAdminMessageThreadMutation(options = {}) {
  return useInvalidationMutation({
    mutationFn: ({ channel, threadId, payload }) => replyAdminMessageThread(channel, threadId, payload),
    invalidate: (data, variables) => [
      messageQueryKeys.all,
      messageQueryKeys.thread(variables.channel, variables.threadId),
    ],
    options,
  });
}

export function useUpdateAdminMessageThreadStatusMutation(options = {}) {
  return useInvalidationMutation({
    mutationFn: ({ channel, threadId, payload }) => updateAdminMessageThreadStatus(channel, threadId, payload),
    invalidate: (data, variables) => [
      messageQueryKeys.all,
      messageQueryKeys.thread(variables.channel, variables.threadId),
    ],
    options,
  });
}
