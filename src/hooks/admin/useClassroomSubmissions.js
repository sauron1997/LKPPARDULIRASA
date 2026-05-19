import { useMemo } from 'react';
import { getDefaultClassworkSubmissions } from '../../services/admin/defaults';
import {
  CLASSWORK_SUBMISSION_STORAGE_KEY,
  normalizeClassworkSubmission,
} from '../../utils/domainRelations';
import { useStoredDomain } from './useStoredDomain';

export function useClassroomSubmissions() {
  const domain = useStoredDomain(CLASSWORK_SUBMISSION_STORAGE_KEY, getDefaultClassworkSubmissions);

  const classworkSubmissions = useMemo(() => domain.data
    .map((submission, index) => normalizeClassworkSubmission(submission, index))
    .sort((left, right) => new Date(right.updatedAt || right.submittedAt || 0) - new Date(left.updatedAt || left.submittedAt || 0)), [domain.data]);

  return useMemo(() => ({
    classworkSubmissions,
    setClassworkSubmissions: domain.setData,
    isReady: domain.isReady,
    error: domain.error,
    reload: domain.reload,
  }), [classworkSubmissions, domain]);
}
