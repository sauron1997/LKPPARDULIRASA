import { normalizeQueryKeyFilters } from '../../services/admin/routeClient';

export const adminQueryKeys = {
  all: ['admin'],
  dashboard: () => [...adminQueryKeys.all, 'dashboard'],
  learningOps: () => [...adminQueryKeys.all, 'learning-ops'],
  studentsRoot: () => [...adminQueryKeys.all, 'students'],
  students: (filters = {}) => [...adminQueryKeys.studentsRoot(), normalizeQueryKeyFilters(filters)],
  student: (studentId) => [...adminQueryKeys.studentsRoot(), String(studentId)],
};
