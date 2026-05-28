import { useMemo } from 'react';
import { useAdminCoursesQuery } from './useCourseQueries';

export function useCourses() {
  const query = useAdminCoursesQuery();

  return useMemo(() => ({
    courses: Array.isArray(query.data) ? query.data : [],
    setCourses: () => {},
    isReady: !query.isPending,
    error: query.error?.message || '',
    reload: query.refetch,
  }), [query.data, query.error?.message, query.isPending, query.refetch]);
}
