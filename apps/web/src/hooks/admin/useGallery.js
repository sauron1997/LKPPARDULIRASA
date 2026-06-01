import { useCallback, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { mediaQueryKeys } from '../../lib/queries/mediaQueryKeys';
import {
  createAdminGalleryItem,
  deleteAdminGalleryItem,
  fetchAdminGalleryItems,
  updateAdminGalleryItem,
} from '../../services/media/mediaClient';
import { useAdminGalleryQuery } from './useMediaQueries';
import { applyDomainUpdater, getDomainErrorMessage, syncCollectionState } from './remoteDomainState';

export function useGallery() {
  const queryClient = useQueryClient();
  const itemsQuery = useAdminGalleryQuery();
  const [mutationError, setMutationError] = useState('');
  const items = useMemo(() => itemsQuery.data || [], [itemsQuery.data]);

  const setItems = useCallback(async (updater) => {
    const queryKey = mediaQueryKeys.gallery();
    const current = queryClient.getQueryData(queryKey) || items;
    const next = applyDomainUpdater(current, updater);

    setMutationError('');
    queryClient.setQueryData(queryKey, next);

    try {
      await syncCollectionState({
        currentItems: current,
        nextItems: next,
        createItem: (item) => createAdminGalleryItem(item),
        updateItem: (item) => updateAdminGalleryItem(item.id, item),
        deleteItem: (item) => deleteAdminGalleryItem(item.id),
      });

      const refreshed = await fetchAdminGalleryItems();
      queryClient.setQueryData(queryKey, refreshed);
      await queryClient.invalidateQueries({ queryKey: mediaQueryKeys.all });
      return refreshed;
    } catch (error) {
      queryClient.setQueryData(queryKey, current);
      setMutationError(getDomainErrorMessage(error, 'Item galeri gagal disimpan. Coba lagi.'));
      throw error;
    }
  }, [items, queryClient]);

  return useMemo(() => ({
    items,
    setItems,
    isReady: itemsQuery.isFetched,
    error: mutationError || getDomainErrorMessage(itemsQuery.error, ''),
    reload: () => itemsQuery.refetch(),
  }), [items, itemsQuery, mutationError, setItems]);
}
