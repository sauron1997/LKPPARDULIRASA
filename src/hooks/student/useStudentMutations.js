import { useMutation, useQueryClient } from '@tanstack/react-query';
import { studentQueryKeys } from '../../lib/queries/studentQueryKeys';
import {
  checkInStudentScheduleSession,
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

function replaceSessionRecord(collection, nextSession) {
  if (!nextSession) {
    return Array.isArray(collection) ? collection : [];
  }

  const source = Array.isArray(collection) ? collection : [];
  const nextSessionId = String(nextSession.id || nextSession.sessionId || '');
  return source.map((item) => {
    const itemId = String(item.id || item.sessionId || '');
    return itemId && itemId === nextSessionId ? { ...item, ...nextSession } : item;
  });
}

function patchSchedulePayload(current, result) {
  if (result?.schedule) {
    return result.schedule;
  }

  const nextSession = result?.session
    || result?.scheduleSession
    || result?.attendance?.session
    || (result?.attendance
      ? {
        id: result.attendance.sessionId || result.attendance.scheduleId,
        checkedIn: true,
        checkedInAt: result.attendance.checkedInAt,
        attendanceStatus: result.attendance.status || 'present',
      }
      : null);
  if (!nextSession || !current || typeof current !== 'object') {
    return current;
  }

  return {
    ...current,
    summary: result?.summary || current.summary,
    attendanceSummary: result?.attendanceSummary || current.attendanceSummary,
    nextSession: current.nextSession
      ? replaceSessionRecord([current.nextSession], nextSession)[0]
      : current.nextSession,
    upcoming: replaceSessionRecord(current.upcoming, nextSession),
    upcomingSessions: replaceSessionRecord(current.upcomingSessions, nextSession),
    history: replaceSessionRecord(current.history, nextSession),
    attendanceHistory: replaceSessionRecord(current.attendanceHistory, nextSession),
    sessions: replaceSessionRecord(current.sessions, nextSession),
  };
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

export function useStudentScheduleCheckInMutation(options = {}) {
  const queryClient = useQueryClient();
  const { onSuccess, ...mutationOptions } = options;

  return useMutation({
    mutationFn: ({ sessionId, ...payload }) => checkInStudentScheduleSession(sessionId, payload),
    ...mutationOptions,
    onSuccess: async (result, variables, context) => {
      queryClient.setQueryData(studentQueryKeys.schedule(), (current) => patchSchedulePayload(current, result));
      updateStudentDashboardCache(queryClient, (current) => ({
        ...current,
        schedule: patchSchedulePayload(current.schedule, result),
        classSchedule: patchSchedulePayload(current.classSchedule, result),
      }));

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: studentQueryKeys.schedule() }),
        queryClient.invalidateQueries({ queryKey: studentQueryKeys.dashboard() }),
      ]);
      await runOnSuccess(onSuccess, result, variables, context);
    },
  });
}
