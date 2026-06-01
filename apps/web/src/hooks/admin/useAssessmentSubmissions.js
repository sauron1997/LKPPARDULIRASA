import { useMemo } from 'react';
import { getDefaultAssessmentSubmissions, ASSESSMENT_SUBMISSION_STORAGE_KEY } from '../../lib/domainCompat';
import { useStoredDomain } from './useStoredDomain';

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
