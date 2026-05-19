import { useMemo } from 'react';
import { getDefaultAssessmentSubmissions } from '../../services/admin/defaults';
import { useStoredDomain } from './useStoredDomain';
import { ASSESSMENT_SUBMISSION_STORAGE_KEY } from '../../utils/domainRelations';

export function useAssessmentSubmissions() {
  const domain = useStoredDomain(ASSESSMENT_SUBMISSION_STORAGE_KEY, getDefaultAssessmentSubmissions);

  return useMemo(() => ({
    assessmentSubmissions: domain.data,
    setAssessmentSubmissions: domain.setData,
    isReady: domain.isReady,
    error: domain.error,
    reload: domain.reload,
  }), [domain]);
}
