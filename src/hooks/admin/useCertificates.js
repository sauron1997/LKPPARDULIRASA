import { useMemo } from 'react';
import { getDefaultCertificates } from '../../services/admin/defaults';
import { useStoredDomain } from './useStoredDomain';

const STORAGE_KEY = 'lkp-domain-certificates';

export function useCertificates() {
  const domain = useStoredDomain(STORAGE_KEY, getDefaultCertificates);

  return useMemo(() => ({
    certificates: domain.data,
    setCertificates: domain.setData,
    isReady: domain.isReady,
    error: domain.error,
    reload: domain.reload,
  }), [domain]);
}
