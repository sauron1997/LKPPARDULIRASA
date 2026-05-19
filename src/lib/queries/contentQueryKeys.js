import { normalizeQueryKeyFilters } from '../../services/admin/routeClient';

export const contentQueryKeys = {
  all: ['admin', 'content'],
  profile: () => [...contentQueryKeys.all, 'profile'],
  blogPosts: (filters = {}) => [...contentQueryKeys.all, 'blog-posts', normalizeQueryKeyFilters(filters)],
  blogPost: (postId) => [...contentQueryKeys.all, 'blog-posts', String(postId)],
  accreditations: () => [...contentQueryKeys.all, 'accreditations'],
  accreditation: (itemId) => [...contentQueryKeys.all, 'accreditations', String(itemId)],
};
