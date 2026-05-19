import { useMutation, useQueryClient } from '@tanstack/react-query';
import { studentQueryKeys } from '../../lib/queries/studentQueryKeys';
import {
  createStudentMessageThread,
  replyToStudentMessageThread,
  submitStudentAssessment,
  updateStudentProfile,
} from '../../services/student/studentClient';

async function runOnSuccess(callback, ...args) {
  if (typeof callback === 'function') {
    await callback(...args);
  }
}

function upsertRecord(collection, nextRecord) {
  if (!nextRecord) {
    return Array.isArray(collection) ? collection : [];
  }

  const source = Array.isArray(collection) ? collection : [];
  const filtered = source.filter((item) => String(item.id) !== String(nextRecord.id));
  return [nextRecord, ...filtered];
}

function updateStudentDashboardCache(queryClient, updater) {
  queryClient.setQueryData(studentQueryKeys.dashboard(), (current) => {
    if (!current) {
      return current;
    }

    return updater(current);
  });
}

export function useUpdateStudentProfileMutation(options = {}) {
  const queryClient = useQueryClient();
  const { onSuccess, ...mutationOptions } = options;

  return useMutation({
    mutationFn: updateStudentProfile,
    ...mutationOptions,
    onSuccess: async (...args) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: studentQueryKeys.profile() }),
        queryClient.invalidateQueries({ queryKey: studentQueryKeys.dashboard() }),
      ]);
      await runOnSuccess(onSuccess, ...args);
    },
  });
}

export function useCreateStudentMessageThreadMutation(options = {}) {
  const queryClient = useQueryClient();
  const { onSuccess, ...mutationOptions } = options;

  return useMutation({
    mutationFn: createStudentMessageThread,
    ...mutationOptions,
    onSuccess: async (...args) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: studentQueryKeys.messages() }),
        queryClient.invalidateQueries({ queryKey: studentQueryKeys.dashboard() }),
      ]);
      await runOnSuccess(onSuccess, ...args);
    },
  });
}

export function useReplyToStudentMessageThreadMutation(options = {}) {
  const queryClient = useQueryClient();
  const { onSuccess, ...mutationOptions } = options;

  return useMutation({
    mutationFn: ({ threadId, ...payload }) => replyToStudentMessageThread(threadId, payload),
    ...mutationOptions,
    onSuccess: async (...args) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: studentQueryKeys.messages() }),
        queryClient.invalidateQueries({ queryKey: studentQueryKeys.dashboard() }),
      ]);
      await runOnSuccess(onSuccess, ...args);
    },
  });
}

export function useSubmitStudentAssessmentMutation(options = {}) {
  const queryClient = useQueryClient();
  const { onSuccess, ...mutationOptions } = options;

  return useMutation({
    mutationFn: (payload) => {
      const { localAssetUrl: _localAssetUrl, ...requestPayload } = payload;
      return submitStudentAssessment(requestPayload);
    },
    ...mutationOptions,
    onSuccess: async (result, variables, context) => {
      const submission = result?.submission
        ? {
          ...result.submission,
          fileUrl: result.submission.fileUrl || variables?.localAssetUrl || '',
        }
        : null;
      const progress = result?.progress || null;

      if (progress) {
        queryClient.setQueryData(studentQueryKeys.assessmentProgress(), (current) => (
          upsertRecord(current, progress)
        ));
      }

      if (submission) {
        queryClient.setQueryData(studentQueryKeys.assessmentSubmissions(), (current) => (
          upsertRecord(current, submission)
        ));
      }

      updateStudentDashboardCache(queryClient, (current) => ({
        ...current,
        assessments: progress
          ? upsertRecord(current.assessments, progress)
          : current.assessments,
        assessmentSubmissions: submission
          ? upsertRecord(current.assessmentSubmissions, submission)
          : current.assessmentSubmissions,
      }));

      await runOnSuccess(onSuccess, result, variables, context);
    },
  });
}
