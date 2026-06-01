import { useQuery } from '@tanstack/react-query';
import { courseQueryKeys } from '../../lib/queries/courseQueryKeys';
import {
  createAdminCourse,
  createAdminCourseModule,
  deleteAdminCourse,
  deleteAdminCourseModule,
  fetchAdminCourse,
  fetchAdminCourseModules,
  fetchAdminCourses,
  updateAdminCourse,
  updateAdminCourseModule,
} from '../../services/courses/coursesClient';
import { useInvalidationMutation } from './queryMutationUtils';

export function useAdminCoursesQuery(filters = {}, options = {}) {
  return useQuery({
    queryKey: courseQueryKeys.list(filters),
    queryFn: () => fetchAdminCourses(filters),
    staleTime: 60_000,
    ...options,
  });
}

export function useAdminCourseQuery(courseId, options = {}) {
  return useQuery({
    queryKey: courseQueryKeys.detail(courseId),
    queryFn: () => fetchAdminCourse(courseId),
    enabled: Boolean(courseId) && (options.enabled ?? true),
    staleTime: 60_000,
    ...options,
  });
}

export function useAdminCourseModulesQuery(courseId, options = {}) {
  return useQuery({
    queryKey: courseQueryKeys.modules(courseId),
    queryFn: () => fetchAdminCourseModules(courseId),
    enabled: Boolean(courseId) && (options.enabled ?? true),
    staleTime: 60_000,
    ...options,
  });
}

export function useCreateAdminCourseMutation(options = {}) {
  return useInvalidationMutation({
    mutationFn: createAdminCourse,
    invalidate: [courseQueryKeys.all],
    options,
  });
}

export function useUpdateAdminCourseMutation(options = {}) {
  return useInvalidationMutation({
    mutationFn: ({ courseId, payload }) => updateAdminCourse(courseId, payload),
    invalidate: (data, variables) => [
      courseQueryKeys.all,
      courseQueryKeys.detail(variables.courseId),
      courseQueryKeys.modules(variables.courseId),
    ],
    options,
  });
}

export function useDeleteAdminCourseMutation(options = {}) {
  return useInvalidationMutation({
    mutationFn: deleteAdminCourse,
    invalidate: [courseQueryKeys.all],
    options,
  });
}

export function useCreateAdminCourseModuleMutation(options = {}) {
  return useInvalidationMutation({
    mutationFn: ({ courseId, payload }) => createAdminCourseModule(courseId, payload),
    invalidate: (data, variables) => [
      courseQueryKeys.all,
      courseQueryKeys.detail(variables.courseId),
      courseQueryKeys.modules(variables.courseId),
    ],
    options,
  });
}

export function useUpdateAdminCourseModuleMutation(options = {}) {
  return useInvalidationMutation({
    mutationFn: ({ courseId, moduleId, payload }) => updateAdminCourseModule(courseId, moduleId, payload),
    invalidate: (data, variables) => [
      courseQueryKeys.all,
      courseQueryKeys.detail(variables.courseId),
      courseQueryKeys.modules(variables.courseId),
    ],
    options,
  });
}

export function useDeleteAdminCourseModuleMutation(options = {}) {
  return useInvalidationMutation({
    mutationFn: ({ courseId, moduleId }) => deleteAdminCourseModule(courseId, moduleId),
    invalidate: (data, variables) => [
      courseQueryKeys.all,
      courseQueryKeys.detail(variables.courseId),
      courseQueryKeys.modules(variables.courseId),
    ],
    options,
  });
}
