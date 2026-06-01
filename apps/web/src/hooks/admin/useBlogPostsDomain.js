import { useCallback, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { contentQueryKeys } from '../../lib/queries/contentQueryKeys';
import {
  createAdminBlogPost,
  deleteAdminBlogPost,
  fetchAdminBlogPosts,
  updateAdminBlogPost,
} from '../../services/content/contentClient';
import { applyDomainUpdater, getDomainErrorMessage, syncCollectionState } from './remoteDomainState';
import { useAdminBlogPostsQuery } from './useContentQueries';

const EMPTY_FILTERS = {};

export function useBlogPostsDomain() {
  const queryClient = useQueryClient();
  const postsQuery = useAdminBlogPostsQuery(EMPTY_FILTERS);
  const [mutationError, setMutationError] = useState('');
  const posts = useMemo(() => postsQuery.data || [], [postsQuery.data]);

  const setPosts = useCallback(async (updater) => {
    const queryKey = contentQueryKeys.blogPosts(EMPTY_FILTERS);
    const current = queryClient.getQueryData(queryKey) || posts;
    const next = applyDomainUpdater(current, updater);

    setMutationError('');
    queryClient.setQueryData(queryKey, next);

    try {
      await syncCollectionState({
        currentItems: current,
        nextItems: next,
        createItem: (item) => createAdminBlogPost(item),
        updateItem: (item) => updateAdminBlogPost(item.id, item),
        deleteItem: (item) => deleteAdminBlogPost(item.id),
      });

      const refreshed = await fetchAdminBlogPosts(EMPTY_FILTERS);
      queryClient.setQueryData(queryKey, refreshed);
      await queryClient.invalidateQueries({ queryKey: contentQueryKeys.all });
      return refreshed;
    } catch (error) {
      queryClient.setQueryData(queryKey, current);
      setMutationError(getDomainErrorMessage(error, 'Artikel blog gagal disimpan. Coba lagi.'));
      throw error;
    }
  }, [posts, queryClient]);

  return useMemo(() => ({
    posts,
    setPosts,
    isReady: postsQuery.isFetched,
    error: mutationError || getDomainErrorMessage(postsQuery.error, ''),
    reload: () => postsQuery.refetch(),
  }), [mutationError, posts, postsQuery, setPosts]);
}
