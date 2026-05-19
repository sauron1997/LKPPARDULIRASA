import { useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../context/useAuth';
import { buildStudentClassroomPortal } from '../../utils/domainRelations';
import { studentQueryKeys } from '../../lib/queries/studentQueryKeys';
import {
  useStudentAssessmentProgressQuery,
  useStudentAssessmentSubmissionsQuery,
  useStudentCertificateQuery,
  useStudentDashboardQuery,
  useStudentModulesQuery,
} from './useStudentQueries';

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
  classroom: {
    access: null,
  },
};

function hasOwnValue(record, key) {
  return Boolean(record) && Object.prototype.hasOwnProperty.call(record, key);
}

function resolveArrayValue(primaryValue, fallbackValue = []) {
  return Array.isArray(primaryValue) ? primaryValue : fallbackValue;
}

export function useStudentClassroomData() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const dashboardQuery = useStudentDashboardQuery();
  const dashboardPortal = dashboardQuery.data || EMPTY_PORTAL;
  const hasStudentContext = Boolean(dashboardQuery.data?.student);
  const shouldFetchModules = hasStudentContext && !hasOwnValue(dashboardQuery.data, 'modules');
  const shouldFetchCertificate = hasStudentContext && !hasOwnValue(dashboardQuery.data, 'certificate');
  const shouldFetchProgress = hasStudentContext && !hasOwnValue(dashboardQuery.data, 'assessments');
  const shouldFetchSubmissions = hasStudentContext && !hasOwnValue(dashboardQuery.data, 'assessmentSubmissions');

  const modulesQuery = useStudentModulesQuery({
    enabled: shouldFetchModules,
  });
  const certificateQuery = useStudentCertificateQuery({
    enabled: shouldFetchCertificate,
  });
  const progressQuery = useStudentAssessmentProgressQuery({
    enabled: shouldFetchProgress,
  });
  const submissionsQuery = useStudentAssessmentSubmissionsQuery({
    enabled: shouldFetchSubmissions,
  });

  const modules = shouldFetchModules
    ? resolveArrayValue(modulesQuery.data?.modules, resolveArrayValue(dashboardPortal.modules))
    : resolveArrayValue(dashboardPortal.modules);
  const assessmentProgress = shouldFetchProgress
    ? resolveArrayValue(progressQuery.data, resolveArrayValue(dashboardPortal.assessments))
    : resolveArrayValue(dashboardPortal.assessments);
  const assessmentSubmissions = shouldFetchSubmissions
    ? resolveArrayValue(submissionsQuery.data, resolveArrayValue(dashboardPortal.assessmentSubmissions))
    : resolveArrayValue(dashboardPortal.assessmentSubmissions);
  const certificate = shouldFetchCertificate
    ? certificateQuery.data?.certificate ?? dashboardPortal.certificate ?? null
    : dashboardPortal.certificate ?? null;

  const portal = useMemo(() => buildStudentClassroomPortal({
    user,
    accounts: dashboardPortal.account ? [dashboardPortal.account] : [],
    students: dashboardPortal.student ? [dashboardPortal.student] : [],
    courses: dashboardPortal.course ? [dashboardPortal.course] : [],
    enrollments: dashboardPortal.enrollment ? [dashboardPortal.enrollment] : [],
    modules,
    assessmentProgress,
    assessmentDefinitions: resolveArrayValue(dashboardPortal.assessmentDefinitions),
    assessmentSubmissions,
    certificates: certificate ? [certificate] : [],
    messages: resolveArrayValue(dashboardPortal.threads),
    classroomPosts: [],
    classworkItems: [],
    classworkResults: [],
    classworkSubmissions: [],
  }), [
    assessmentProgress,
    assessmentSubmissions,
    certificate,
    dashboardPortal.account,
    dashboardPortal.assessmentDefinitions,
    dashboardPortal.course,
    dashboardPortal.enrollment,
    dashboardPortal.student,
    dashboardPortal.threads,
    modules,
    user,
  ]);

  const updateDashboardCollection = useCallback((key, updater, fallbackValue = []) => {
    queryClient.setQueryData(studentQueryKeys.dashboard(), (current) => {
      if (!current) {
        return current;
      }

      const baseValue = Array.isArray(current[key]) ? current[key] : fallbackValue;
      const nextValue = typeof updater === 'function' ? updater(baseValue) : updater;
      return {
        ...current,
        [key]: nextValue,
      };
    });
  }, [queryClient]);

  const setAssessmentProgress = useCallback((updater) => {
    queryClient.setQueryData(studentQueryKeys.assessmentProgress(), (current) => {
      const base = Array.isArray(current) ? current : resolveArrayValue(dashboardPortal.assessments);
      return typeof updater === 'function' ? updater(base) : updater;
    });
    updateDashboardCollection('assessments', updater, resolveArrayValue(dashboardPortal.assessments));
  }, [dashboardPortal.assessments, queryClient, updateDashboardCollection]);

  const setAssessmentSubmissions = useCallback((updater) => {
    queryClient.setQueryData(studentQueryKeys.assessmentSubmissions(), (current) => {
      const base = Array.isArray(current) ? current : resolveArrayValue(dashboardPortal.assessmentSubmissions);
      return typeof updater === 'function' ? updater(base) : updater;
    });
    updateDashboardCollection('assessmentSubmissions', updater, resolveArrayValue(dashboardPortal.assessmentSubmissions));
  }, [dashboardPortal.assessmentSubmissions, queryClient, updateDashboardCollection]);

  return {
    isReady: !dashboardQuery.isPending
      && (!shouldFetchModules || !modulesQuery.isPending)
      && (!shouldFetchCertificate || !certificateQuery.isPending)
      && (!shouldFetchProgress || !progressQuery.isPending)
      && (!shouldFetchSubmissions || !submissionsQuery.isPending),
    error: dashboardQuery.error?.message
      || (shouldFetchModules ? modulesQuery.error?.message : '')
      || (shouldFetchCertificate ? certificateQuery.error?.message : '')
      || (shouldFetchProgress ? progressQuery.error?.message : '')
      || (shouldFetchSubmissions ? submissionsQuery.error?.message : '')
      || '',
    portal,
    classroomAccess: portal.classroom?.access || null,
    setAssessmentProgress,
    setAssessmentSubmissions,
    reload: () => {
      dashboardQuery.refetch();
      if (shouldFetchModules) modulesQuery.refetch();
      if (shouldFetchCertificate) certificateQuery.refetch();
      if (shouldFetchProgress) progressQuery.refetch();
      if (shouldFetchSubmissions) submissionsQuery.refetch();
    },
  };
}
