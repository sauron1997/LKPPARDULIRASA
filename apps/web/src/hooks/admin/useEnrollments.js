import { useMemo } from 'react';
import { useAdminStudentsQuery } from './useAdminQueries';

export function useEnrollments() {
  const query = useAdminStudentsQuery();

  return useMemo(() => ({
    enrollments: Array.isArray(query.data)
      ? query.data
        .map((bundle) => bundle.enrollment)
        .filter(Boolean)
      : [],
    setEnrollments: () => {},
    isReady: !query.isPending,
    error: query.error?.message || '',
    reload: query.refetch,
  }), [query.data, query.error?.message, query.isPending, query.refetch]);
}
