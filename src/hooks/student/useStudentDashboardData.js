import { useMemo } from 'react';
import { useStudentDashboardQuery } from './useStudentQueries';

const EMPTY_PORTAL = {
  account: null,
  student: null,
  enrollment: null,
  course: null,
  certificate: null,
  modules: [],
  assessments: [],
  assessmentDefinitions: [],
  assessmentSubmissions: [],
  assessmentActivities: [],
  nextActionableActivity: null,
  assessmentSummary: [],
  certificateGate: {
    checklist: [],
    eligible: false,
    downloadReady: false,
    doneCount: 0,
    totalCount: 0,
    tone: 'warning',
    headline: '',
    description: '',
    assessmentSummary: [],
  },
  threads: [],
  hasFullDownloadAccess: false,
  learning: {
    completionPercent: 0,
    totalModules: 0,
    completedModules: 0,
    currentModule: null,
  },
  paymentMeta: null,
};

export function useStudentDashboardData() {
  const dashboardQuery = useStudentDashboardQuery();
  const portal = useMemo(
    () => dashboardQuery.data || EMPTY_PORTAL,
    [dashboardQuery.data],
  );

  return {
    isReady: !dashboardQuery.isPending,
    error: dashboardQuery.error?.message || '',
    portal,
    reload: dashboardQuery.refetch,
  };
}
