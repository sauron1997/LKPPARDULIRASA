import { useMemo } from 'react';
import {
  CLASSWORK_RESULT_STORAGE_KEY,
  getDefaultClassworkResults,
  normalizeClassworkResult,
} from '../../lib/domainCompat';
import { useStoredDomain } from './useStoredDomain';

export function useClassroomResults() {
  const domain = useStoredDomain(CLASSWORK_RESULT_STORAGE_KEY, getDefaultClassworkResults);

  const classworkResults = useMemo(() => domain.data
    .map((result, index) => normalizeClassworkResult(result, index))
    .sort((left, right) => new Date(right.updatedAt || 0) - new Date(left.updatedAt || 0)), [domain.data]);

  return useMemo(() => ({
    classworkResults,
    setClassworkResults: domain.setData,
    isReady: domain.isReady,
    error: domain.error,
    reload: domain.reload,
  }), [classworkResults, domain]);
}
