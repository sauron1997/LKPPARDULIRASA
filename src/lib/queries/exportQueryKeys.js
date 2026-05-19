import { normalizeQueryKeyFilters } from '../../services/admin/routeClient';

export const exportQueryKeys = {
  all: ['admin', 'exports'],
  students: (filters = {}) => [...exportQueryKeys.all, 'students', normalizeQueryKeyFilters(filters)],
  messages: (filters = {}) => [...exportQueryKeys.all, 'messages', normalizeQueryKeyFilters(filters)],
  certificates: (filters = {}) => [...exportQueryKeys.all, 'certificates', normalizeQueryKeyFilters(filters)],
};
