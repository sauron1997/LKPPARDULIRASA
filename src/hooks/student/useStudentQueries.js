import { useQuery } from '@tanstack/react-query';
import { studentQueryKeys } from '../../lib/queries/studentQueryKeys';
import {
  fetchStudentAssessmentProgress,
  fetchStudentAssessmentSubmissions,
  fetchStudentCertificate,
  fetchStudentDashboard,
  fetchStudentMessages,
  fetchStudentModules,
  fetchStudentProfile,
} from '../../services/student/studentClient';

const DEFAULT_STALE_TIME = 60_000;

export function useStudentDashboardQuery(options = {}) {
  return useQuery({
    queryKey: studentQueryKeys.dashboard(),
    queryFn: fetchStudentDashboard,
    staleTime: DEFAULT_STALE_TIME,
    ...options,
  });
}

export function useStudentProfileQuery(options = {}) {
  return useQuery({
    queryKey: studentQueryKeys.profile(),
    queryFn: fetchStudentProfile,
    staleTime: DEFAULT_STALE_TIME,
    ...options,
  });
}

export function useStudentModulesQuery(options = {}) {
  return useQuery({
    queryKey: studentQueryKeys.modules(),
    queryFn: fetchStudentModules,
    staleTime: DEFAULT_STALE_TIME,
    ...options,
  });
}

export function useStudentMessagesQuery(options = {}) {
  return useQuery({
    queryKey: studentQueryKeys.messages(),
    queryFn: fetchStudentMessages,
    staleTime: DEFAULT_STALE_TIME,
    ...options,
  });
}

export function useStudentCertificateQuery(options = {}) {
  return useQuery({
    queryKey: studentQueryKeys.certificate(),
    queryFn: fetchStudentCertificate,
    staleTime: DEFAULT_STALE_TIME,
    ...options,
  });
}

export function useStudentAssessmentProgressQuery(options = {}) {
  return useQuery({
    queryKey: studentQueryKeys.assessmentProgress(),
    queryFn: fetchStudentAssessmentProgress,
    staleTime: DEFAULT_STALE_TIME,
    ...options,
  });
}

export function useStudentAssessmentSubmissionsQuery(options = {}) {
  return useQuery({
    queryKey: studentQueryKeys.assessmentSubmissions(),
    queryFn: fetchStudentAssessmentSubmissions,
    staleTime: DEFAULT_STALE_TIME,
    ...options,
  });
}
