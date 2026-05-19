import { useBlogPostsDomain } from '../hooks/admin/useBlogPostsDomain';

export const useBlogPosts = () => {
  const { posts, setPosts, isReady, error, reload } = useBlogPostsDomain();

  return { posts, setPosts, isReady, error, reload };
};
