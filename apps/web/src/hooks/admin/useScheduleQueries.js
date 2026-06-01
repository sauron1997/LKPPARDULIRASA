import { useQuery } from '@tanstack/react-query';
import { adminQueryKeys } from '../../lib/queries/adminQueryKeys';
import { courseQueryKeys } from '../../lib/queries/courseQueryKeys';
import {
  createAdminScheduleSession,
  deleteAdminScheduleSession,
  fetchAdminCourseSchedule,
  fetchAdminScheduleAttendance,
  updateAdminScheduleAttendance,
  updateAdminScheduleSession,
} from '../../services/admin/scheduleClient';
import { useInvalidationMutation } from './queryMutationUtils';

function buildScheduleInvalidations(courseId, sessionId = null) {
  const invalidations = [
    { queryKey: adminQueryKeys.dashboard() },
    { queryKey: adminQueryKeys.learningOps() },
    { queryKey: adminQueryKeys.classroom(courseId) },
    { queryKey: adminQueryKeys.schedule(courseId) },
    { queryKey: courseQueryKeys.detail(courseId) },
  ];

  if (sessionId) {
    invalidations.push({ queryKey: adminQueryKeys.scheduleAttendance(courseId, sessionId) });
  }

  return invalidations;
}

export function useAdminCourseScheduleQuery(courseId, options = {}) {
  return useQuery({
    queryKey: adminQueryKeys.schedule(courseId),
    queryFn: () => fetchAdminCourseSchedule(courseId),
    enabled: Boolean(courseId) && (options.enabled ?? true),
    staleTime: 60_000,
    ...options,
  });
}

export function useAdminScheduleAttendanceQuery(courseId, sessionId, options = {}) {
  return useQuery({
    queryKey: adminQueryKeys.scheduleAttendance(courseId, sessionId),
    queryFn: () => fetchAdminScheduleAttendance(courseId, sessionId),
    enabled: Boolean(courseId) && Boolean(sessionId) && (options.enabled ?? true),
    staleTime: 30_000,
    ...options,
  });
}

export function useCreateAdminScheduleSessionMutation(options = {}) {
  return useInvalidationMutation({
    mutationFn: ({ courseId, payload }) => createAdminScheduleSession(courseId, payload),
    invalidate: (data, variables) => buildScheduleInvalidations(variables.courseId),
    options,
  });
}

export function useUpdateAdminScheduleSessionMutation(options = {}) {
  return useInvalidationMutation({
    mutationFn: ({ courseId, sessionId, payload }) => updateAdminScheduleSession(courseId, sessionId, payload),
    invalidate: (data, variables) => buildScheduleInvalidations(variables.courseId, variables.sessionId),
    options,
  });
}

export function useDeleteAdminScheduleSessionMutation(options = {}) {
  return useInvalidationMutation({
    mutationFn: ({ courseId, sessionId }) => deleteAdminScheduleSession(courseId, sessionId),
    invalidate: (data, variables) => buildScheduleInvalidations(variables.courseId, variables.sessionId),
    options,
  });
}

export function useUpdateAdminScheduleAttendanceMutation(options = {}) {
  return useInvalidationMutation({
    mutationFn: ({ courseId, sessionId, attendanceId, payload }) => updateAdminScheduleAttendance(courseId, sessionId, attendanceId, payload),
    invalidate: (data, variables) => buildScheduleInvalidations(variables.courseId, variables.sessionId),
    options,
  });
}
