import { useMemo } from 'react';
import { getDefaultBlogPosts } from '../../services/admin/defaults';
import { useStoredDomain } from './useStoredDomain';

const STORAGE_KEY = 'lkp-domain-blog-posts';

export function useBlogPostsDomain() {
  const domain = useStoredDomain(STORAGE_KEY, getDefaultBlogPosts);

  return useMemo(() => ({
    posts: domain.data,
    setPosts: domain.setData,
    isReady: domain.isReady,
    error: domain.error,
    reload: domain.reload,
  }), [domain]);
}
