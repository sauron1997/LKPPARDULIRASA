import { normalizeQueryKeyFilters } from '../../services/admin/routeClient';

export const classroomQueryKeys = {
  all: ['classroom-overlay'],
  postsRoot: () => [...classroomQueryKeys.all, 'posts'],
  posts: (filters = {}) => [...classroomQueryKeys.postsRoot(), normalizeQueryKeyFilters(filters)],
  post: (postId) => [...classroomQueryKeys.postsRoot(), String(postId)],
  classworkRoot: () => [...classroomQueryKeys.all, 'classwork-items'],
  classworkItems: (filters = {}) => [...classroomQueryKeys.classworkRoot(), normalizeQueryKeyFilters(filters)],
};
