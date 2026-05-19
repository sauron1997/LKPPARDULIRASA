import { useMemo } from 'react';
import { getDefaultPublicMessages } from '../../services/admin/defaults';
import { useStoredDomain } from './useStoredDomain';

const STORAGE_KEY = 'lkp-domain-public-messages';

export function usePublicMessages() {
  const domain = useStoredDomain(STORAGE_KEY, getDefaultPublicMessages);

  return useMemo(() => ({
    messages: domain.data,
    setMessages: domain.setData,
    isReady: domain.isReady,
    error: domain.error,
    reload: domain.reload,
  }), [domain]);
}
