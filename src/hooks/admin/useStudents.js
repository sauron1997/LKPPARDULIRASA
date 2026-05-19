import { useMemo } from 'react';
import { getDefaultStudents } from '../../services/admin/defaults';
import { useStoredDomain } from './useStoredDomain';

const STORAGE_KEY = 'lkp-domain-students';

export function useStudents() {
  const domain = useStoredDomain(STORAGE_KEY, getDefaultStudents);

  return useMemo(() => ({
    students: domain.data,
    setStudents: domain.setData,
    isReady: domain.isReady,
    error: domain.error,
    reload: domain.reload,
  }), [domain]);
}
