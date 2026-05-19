import { useMemo } from 'react';
import { getDefaultCourses } from '../../services/admin/defaults';
import { useStoredDomain } from './useStoredDomain';

const STORAGE_KEY = 'lkp-domain-courses';

export function useCourses() {
  const domain = useStoredDomain(STORAGE_KEY, getDefaultCourses);

  return useMemo(() => ({
    courses: domain.data,
    setCourses: domain.setData,
    isReady: domain.isReady,
    error: domain.error,
    reload: domain.reload,
  }), [domain]);
}
