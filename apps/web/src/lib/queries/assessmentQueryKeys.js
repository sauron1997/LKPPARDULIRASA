import { normalizeQueryKeyFilters } from '../../services/admin/routeClient';

export const assessmentQueryKeys = {
  all: ['admin', 'assessments'],
  definitions: (filters = {}) => [...assessmentQueryKeys.all, 'definitions', normalizeQueryKeyFilters(filters)],
  definition: (definitionId) => [...assessmentQueryKeys.all, 'definitions', String(definitionId)],
  progress: (filters = {}) => [...assessmentQueryKeys.all, 'progress', normalizeQueryKeyFilters(filters)],
  submissions: (filters = {}) => [...assessmentQueryKeys.all, 'submissions', normalizeQueryKeyFilters(filters)],
  submission: (submissionId) => [...assessmentQueryKeys.all, 'submissions', String(submissionId)],
  certificates: (filters = {}) => [...assessmentQueryKeys.all, 'certificates', normalizeQueryKeyFilters(filters)],
  certificate: (certificateId) => [...assessmentQueryKeys.all, 'certificates', String(certificateId)],
};
