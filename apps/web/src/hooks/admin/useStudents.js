import { useMemo } from 'react';
import { useAdminStudentsQuery } from './useAdminQueries';

export function useStudents() {
  const query = useAdminStudentsQuery();

  return useMemo(() => ({
    students: Array.isArray(query.data)
      ? query.data.map((bundle) => bundle.student).filter(Boolean)
      : [],
    setStudents: () => {},
    isReady: !query.isPending,
    error: query.error?.message || '',
    reload: query.refetch,
  }), [query.data, query.error?.message, query.isPending, query.refetch]);
}
