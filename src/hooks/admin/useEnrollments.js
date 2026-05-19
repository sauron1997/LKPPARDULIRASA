import { useMemo } from 'react';
import { getDefaultEnrollments } from '../../services/admin/defaults';
import { useStoredDomain } from './useStoredDomain';
import { ENROLLMENT_STORAGE_KEY } from '../../utils/domainRelations';

export function useEnrollments() {
  const domain = useStoredDomain(ENROLLMENT_STORAGE_KEY, getDefaultEnrollments);

  return useMemo(() => ({
    enrollments: domain.data,
    setEnrollments: domain.setData,
    isReady: domain.isReady,
    error: domain.error,
    reload: domain.reload,
  }), [domain]);
}
