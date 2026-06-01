import { useMemo } from 'react';
import { useAdminAssessmentDefinitionsQuery } from './useAssessmentQueries';

export function useAssessmentDefinitions() {
  const query = useAdminAssessmentDefinitionsQuery();

  return useMemo(() => ({
    assessmentDefinitions: Array.isArray(query.data) ? query.data : [],
    setAssessmentDefinitions: () => {},
    isReady: !query.isPending,
    error: query.error?.message || '',
    reload: query.refetch,
  }), [query.data, query.error?.message, query.isPending, query.refetch]);
}
