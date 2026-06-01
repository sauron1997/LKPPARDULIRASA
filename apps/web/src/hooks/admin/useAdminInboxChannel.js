import { useCallback, useMemo } from 'react';
import {
  useAdminMessageThreadsQuery,
  useReplyAdminMessageThreadMutation,
  useUpdateAdminMessageThreadStatusMutation,
} from './useMessageQueries';

function buildReplyPayload(body, attachment) {
  if (!(attachment instanceof File)) {
    return { body };
  }

  const formData = new FormData();
  formData.set('body', body || '');
  formData.set('attachment', attachment);
  return formData;
}

export function useAdminInboxChannel(channel) {
  const threadsQuery = useAdminMessageThreadsQuery(channel);
  const replyMutation = useReplyAdminMessageThreadMutation();
  const statusMutation = useUpdateAdminMessageThreadStatusMutation();

  const reload = useCallback(async () => threadsQuery.refetch(), [threadsQuery]);

  const onReply = useCallback(async ({ threadId, body, attachment }) => (
    replyMutation.mutateAsync({
      channel,
      threadId,
      payload: buildReplyPayload(body, attachment),
    })
  ), [channel, replyMutation]);

  const onStatusChange = useCallback(async ({ threadId, status }) => (
    statusMutation.mutateAsync({
      channel,
      threadId,
      payload: { status },
    })
  ), [channel, statusMutation]);

  return useMemo(() => ({
    threads: Array.isArray(threadsQuery.data?.threads) ? threadsQuery.data.threads : [],
    persistenceMode: threadsQuery.data?.persistenceMode === 'database' ? 'database' : 'memory',
    isReady: !threadsQuery.isPending,
    error: threadsQuery.error?.message || '',
    reload,
    onReply,
    isReplyPending: replyMutation.isPending,
    onStatusChange,
    isStatusPending: statusMutation.isPending,
    allowDelete: false,
  }), [
    onReply,
    onStatusChange,
    reload,
    replyMutation.isPending,
    statusMutation.isPending,
    threadsQuery.data,
    threadsQuery.error?.message,
    threadsQuery.isPending,
  ]);
}

export default useAdminInboxChannel;
