import { useMemo } from 'react';
import { getDefaultStudentMessages } from '../../services/admin/defaults';
import { useStoredDomain } from './useStoredDomain';

const STORAGE_KEY = 'lkp-domain-student-messages';

export function useStudentMessages() {
  const domain = useStoredDomain(STORAGE_KEY, getDefaultStudentMessages);

  return useMemo(() => ({
    messages: domain.data,
    setMessages: domain.setData,
    isReady: domain.isReady,
    error: domain.error,
    reload: domain.reload,
  }), [domain]);
}
