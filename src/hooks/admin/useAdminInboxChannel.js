import {
  useAdminMessageThreadsQuery,
  useReplyAdminMessageThreadMutation,
  useUpdateAdminMessageThreadStatusMutation,
} from './useMessageQueries';

function buildReplyPayload(body, attachment) {
  const payload = { body };

  if (attachment) {
    payload.attachments = [attachment];
  }

  return payload;
}

export function useAdminInboxChannel(channel) {
  const threadsQuery = useAdminMessageThreadsQuery(channel);
  const replyMutation = useReplyAdminMessageThreadMutation();
  const statusMutation = useUpdateAdminMessageThreadStatusMutation();

  return {
    threads: Array.isArray(threadsQuery.data) ? threadsQuery.data : [],
    isReady: !threadsQuery.isPending,
    error: threadsQuery.error?.message || '',
    reload: () => threadsQuery.refetch(),
    onReply: async ({ threadId, body, attachment }) => replyMutation.mutateAsync({
      channel,
      threadId,
      payload: buildReplyPayload(body, attachment),
    }),
    isReplyPending: replyMutation.isPending,
    onStatusChange: async ({ threadId, status }) => statusMutation.mutateAsync({
      channel,
      threadId,
      payload: { status },
    }),
    isStatusPending: statusMutation.isPending,
    allowDelete: false,
  };
}

