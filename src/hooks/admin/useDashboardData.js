import { useMemo } from 'react';
import { useAdminDashboardQuery } from './useAdminQueries';
import { EMPTY_ADMIN_DASHBOARD } from '../../services/admin/adminClient';

export function useDashboardData() {
  const dashboardQuery = useAdminDashboardQuery();

  return useMemo(() => ({
    ...(dashboardQuery.data || EMPTY_ADMIN_DASHBOARD),
    isReady: !dashboardQuery.isPending,
    error: dashboardQuery.error?.message || '',
    reload: dashboardQuery.refetch,
  }), [dashboardQuery.data, dashboardQuery.error?.message, dashboardQuery.isPending, dashboardQuery.refetch]);
}
