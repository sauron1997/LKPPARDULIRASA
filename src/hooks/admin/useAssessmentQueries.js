import { useQuery } from '@tanstack/react-query';
import { assessmentQueryKeys } from '../../lib/queries/assessmentQueryKeys';
import { mediaQueryKeys } from '../../lib/queries/mediaQueryKeys';
import {
  createAdminAssessmentDefinition,
  deleteAdminCertificate,
  fetchAdminAssessmentDefinitions,
  fetchAdminAssessmentProgress,
  fetchAdminAssessmentSubmissions,
  fetchAdminCertificates,
  reviewAdminAssessmentSubmission,
  updateAdminAssessmentDefinition,
  upsertAdminCertificate,
} from '../../services/assessments/assessmentsClient';
import { useInvalidationMutation } from './queryMutationUtils';

export function useAdminAssessmentDefinitionsQuery(filters = {}, options = {}) {
  return useQuery({
    queryKey: assessmentQueryKeys.definitions(filters),
    queryFn: () => fetchAdminAssessmentDefinitions(filters),
    staleTime: 60_000,
    ...options,
  });
}

export function useAdminAssessmentProgressQuery(filters = {}, options = {}) {
  return useQuery({
    queryKey: assessmentQueryKeys.progress(filters),
    queryFn: () => fetchAdminAssessmentProgress(filters),
    staleTime: 60_000,
    ...options,
  });
}

export function useAdminAssessmentSubmissionsQuery(filters = {}, options = {}) {
  return useQuery({
    queryKey: assessmentQueryKeys.submissions(filters),
    queryFn: () => fetchAdminAssessmentSubmissions(filters),
    staleTime: 60_000,
    ...options,
  });
}

export function useAdminCertificatesQuery(filters = {}, options = {}) {
  return useQuery({
    queryKey: assessmentQueryKeys.certificates(filters),
    queryFn: () => fetchAdminCertificates(filters),
    staleTime: 60_000,
    ...options,
  });
}

export function useCreateAdminAssessmentDefinitionMutation(options = {}) {
  return useInvalidationMutation({
    mutationFn: createAdminAssessmentDefinition,
    invalidate: [assessmentQueryKeys.all],
    options,
  });
}

export function useUpdateAdminAssessmentDefinitionMutation(options = {}) {
  return useInvalidationMutation({
    mutationFn: ({ definitionId, payload }) => updateAdminAssessmentDefinition(definitionId, payload),
    invalidate: (data, variables) => [
      assessmentQueryKeys.all,
      assessmentQueryKeys.definition(variables.definitionId),
    ],
    options,
  });
}

export function useReviewAdminAssessmentSubmissionMutation(options = {}) {
  return useInvalidationMutation({
    mutationFn: ({ submissionId, payload }) => reviewAdminAssessmentSubmission(submissionId, payload),
    invalidate: (data, variables) => [
      assessmentQueryKeys.all,
      assessmentQueryKeys.submission(variables.submissionId),
    ],
    options,
  });
}

export function useUpsertAdminCertificateMutation(options = {}) {
  return useInvalidationMutation({
    mutationFn: ({ studentId, payload }) => upsertAdminCertificate(studentId, payload),
    invalidate: [assessmentQueryKeys.all, mediaQueryKeys.all],
    options,
  });
}

export function useDeleteAdminCertificateMutation(options = {}) {
  return useInvalidationMutation({
    mutationFn: deleteAdminCertificate,
    invalidate: [assessmentQueryKeys.all, mediaQueryKeys.all],
    options,
  });
}
