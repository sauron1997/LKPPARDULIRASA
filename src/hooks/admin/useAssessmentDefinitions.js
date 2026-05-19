import { useMemo } from 'react';
import { getDefaultAssessmentDefinitions } from '../../services/admin/defaults';
import { useStoredDomain } from './useStoredDomain';
import { ASSESSMENT_DEFINITION_STORAGE_KEY } from '../../utils/domainRelations';

export function useAssessmentDefinitions() {
  const domain = useStoredDomain(ASSESSMENT_DEFINITION_STORAGE_KEY, getDefaultAssessmentDefinitions);

  return useMemo(() => ({
    assessmentDefinitions: domain.data,
    setAssessmentDefinitions: domain.setData,
    isReady: domain.isReady,
    error: domain.error,
    reload: domain.reload,
  }), [domain]);
}
