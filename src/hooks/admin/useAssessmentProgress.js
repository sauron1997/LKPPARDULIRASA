import { useMemo } from 'react';
import { getDefaultAssessmentProgress } from '../../services/admin/defaults';
import { useStoredDomain } from './useStoredDomain';
import { ASSESSMENT_PROGRESS_STORAGE_KEY } from '../../utils/domainRelations';

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
