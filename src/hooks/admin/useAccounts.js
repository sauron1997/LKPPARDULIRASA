import { useMemo } from 'react';
import { getDefaultAccounts } from '../../services/admin/defaults';
import { useStoredDomain } from './useStoredDomain';
import { ACCOUNT_STORAGE_KEY } from '../../utils/domainRelations';

export function useAccounts() {
  const domain = useStoredDomain(ACCOUNT_STORAGE_KEY, getDefaultAccounts);

  return useMemo(() => ({
    accounts: domain.data,
    setAccounts: domain.setData,
    isReady: domain.isReady,
    error: domain.error,
    reload: domain.reload,
  }), [domain]);
}
