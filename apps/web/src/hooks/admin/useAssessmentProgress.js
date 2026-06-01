import { useMemo } from 'react';
import { getDefaultAssessmentProgress, ASSESSMENT_PROGRESS_STORAGE_KEY } from '../../lib/domainCompat';
import { useStoredDomain } from './useStoredDomain';

export function useAssessmentProgress() {
  const domain = useStoredDomain(ASSESSMENT_PROGRESS_STORAGE_KEY, getDefaultAssessmentProgress);

  return useMemo(() => ({
    assessmentProgress: domain.data,
    setAssessmentProgress: domain.setData,
    isReady: domain.isReady,
    error: domain.error,
    reload: domain.reload,
  }), [domain]);
}
