import { useMemo } from 'react';
import { useAdminLearningOpsQuery } from './useAdminQueries';

const EMPTY_LEARNING_OPS = {
  classBundles: [],
  reviewQueue: [],
  retryQueue: [],
  certificateQueue: [],
  blockedByPayment: [],
  unpublishedDefinitions: [],
  courseHealth: [],
  stats: {
    reviewQueueCount: 0,
    retryCount: 0,
    notStartedCount: 0,
    eligibleCertificateCount: 0,
    certificateReadyToUploadCount: 0,
    certificateUploadedCount: 0,
    assessmentUnpublishedCount: 0,
    blockedByPaymentCount: 0,
  },
};

export function useAdminLearningOpsData() {
  const learningOpsQuery = useAdminLearningOpsQuery();

  return useMemo(() => ({
    ...(learningOpsQuery.data || EMPTY_LEARNING_OPS),
    isReady: !learningOpsQuery.isPending,
    error: learningOpsQuery.error?.message || '',
    reload: learningOpsQuery.refetch,
  }), [learningOpsQuery.data, learningOpsQuery.error?.message, learningOpsQuery.isPending, learningOpsQuery.refetch]);
}
