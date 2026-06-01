import { useMemo } from 'react';
import { useAdminStudentsQuery } from './useAdminQueries';

export function useAccounts() {
  const query = useAdminStudentsQuery();

  return useMemo(() => ({
    accounts: Array.isArray(query.data)
      ? query.data.map((bundle) => bundle.account).filter(Boolean)
      : [],
    setAccounts: () => {},
    isReady: !query.isPending,
    error: query.error?.message || '',
    reload: query.refetch,
  }), [query.data, query.error?.message, query.isPending, query.refetch]);
}
