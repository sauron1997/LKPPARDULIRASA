import { useQuery } from '@tanstack/react-query';
import { adminQueryKeys } from '../../lib/queries/adminQueryKeys';
import {
  fetchAdminDashboard,
  fetchAdminLearningOps,
  fetchAdminStudent,
  fetchAdminStudents,
  updateAdminStudent,
  updateAdminStudentPayment,
} from '../../services/admin/adminClient';
import { useInvalidationMutation } from './queryMutationUtils';

function buildStudentMutationInvalidations() {
  return [
    { queryKey: adminQueryKeys.dashboard() },
    { queryKey: adminQueryKeys.learningOps() },
    { queryKey: adminQueryKeys.studentsRoot() },
  ];
}

export function useAdminDashboardQuery(options = {}) {
  return useQuery({
    queryKey: adminQueryKeys.dashboard(),
    queryFn: fetchAdminDashboard,
    staleTime: 60_000,
    ...options,
  });
}

export function useAdminLearningOpsQuery(options = {}) {
  return useQuery({
    queryKey: adminQueryKeys.learningOps(),
    queryFn: fetchAdminLearningOps,
    staleTime: 60_000,
    ...options,
  });
}

export function useAdminStudentsQuery(filters = {}, options = {}) {
  return useQuery({
    queryKey: adminQueryKeys.students(filters),
    queryFn: () => fetchAdminStudents(filters),
    staleTime: 60_000,
    ...options,
  });
}

export function useAdminStudentQuery(studentId, options = {}) {
  return useQuery({
    queryKey: adminQueryKeys.student(studentId),
    queryFn: () => fetchAdminStudent(studentId),
    enabled: Boolean(studentId) && (options.enabled ?? true),
    staleTime: 60_000,
    ...options,
  });
}

export function useUpdateAdminStudentMutation(options = {}) {
  return useInvalidationMutation({
    mutationFn: ({ studentId, payload }) => updateAdminStudent(studentId, payload),
    invalidate: buildStudentMutationInvalidations,
    options,
  });
}

export function useUpdateAdminStudentPaymentMutation(options = {}) {
  return useInvalidationMutation({
    mutationFn: ({ studentId, payload }) => updateAdminStudentPayment(studentId, payload),
    invalidate: buildStudentMutationInvalidations,
    options,
  });
}
