import { useMemo } from 'react';
import { useAdminCertificatesQuery } from './useAssessmentQueries';

export function useCertificates() {
  const query = useAdminCertificatesQuery();

  return useMemo(() => ({
    certificates: query.data || [],
    setCertificates: () => {},
    isReady: !query.isPending,
    error: query.error?.message || '',
    reload: query.refetch,
  }), [query.data, query.error, query.isPending, query.refetch]);
}
