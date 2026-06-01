import { useCallback, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { contentQueryKeys } from '../../lib/queries/contentQueryKeys';
import {
  createAdminAccreditation,
  deleteAdminAccreditation,
  fetchAdminAccreditations,
  updateAdminAccreditation,
} from '../../services/content/contentClient';
import { useAdminAccreditationsQuery } from './useContentQueries';
import { applyDomainUpdater, getDomainErrorMessage, syncCollectionState } from './remoteDomainState';

export function useAccreditationsDomain() {
  const queryClient = useQueryClient();
  const itemsQuery = useAdminAccreditationsQuery();
  const [mutationError, setMutationError] = useState('');
  const items = useMemo(() => itemsQuery.data || [], [itemsQuery.data]);

  const setItems = useCallback(async (updater) => {
    const queryKey = contentQueryKeys.accreditations();
    const current = queryClient.getQueryData(queryKey) || items;
    const next = applyDomainUpdater(current, updater);

    setMutationError('');
    queryClient.setQueryData(queryKey, next);

    try {
      await syncCollectionState({
        currentItems: current,
        nextItems: next,
        createItem: (item) => createAdminAccreditation(item),
        updateItem: (item) => updateAdminAccreditation(item.id, item),
        deleteItem: (item) => deleteAdminAccreditation(item.id),
      });

      const refreshed = await fetchAdminAccreditations();
      queryClient.setQueryData(queryKey, refreshed);
      await queryClient.invalidateQueries({ queryKey: contentQueryKeys.all });
      return refreshed;
    } catch (error) {
      queryClient.setQueryData(queryKey, current);
      setMutationError(getDomainErrorMessage(error, 'Dokumen akreditasi gagal disimpan. Coba lagi.'));
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
