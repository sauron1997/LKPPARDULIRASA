import { normalizeQueryKeyFilters } from '../../services/admin/routeClient';

export const courseQueryKeys = {
  all: ['admin', 'courses'],
  lists: () => [...courseQueryKeys.all, 'list'],
  list: (filters = {}) => [...courseQueryKeys.lists(), normalizeQueryKeyFilters(filters)],
  detail: (courseId) => [...courseQueryKeys.all, 'detail', String(courseId)],
  modules: (courseId) => [...courseQueryKeys.detail(courseId), 'modules'],
};
