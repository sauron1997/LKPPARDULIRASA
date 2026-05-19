import { useMemo } from 'react';
import { getDefaultAccreditations } from '../../services/admin/defaults';
import { useStoredDomain } from './useStoredDomain';

const STORAGE_KEY = 'lkp-domain-accreditations';

export function useAccreditationsDomain() {
  const domain = useStoredDomain(STORAGE_KEY, getDefaultAccreditations);

  return useMemo(() => ({
    items: domain.data,
    setItems: domain.setData,
    isReady: domain.isReady,
    error: domain.error,
    reload: domain.reload,
  }), [domain]);
}
