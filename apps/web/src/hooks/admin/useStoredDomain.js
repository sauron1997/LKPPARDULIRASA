import { useCallback, useSyncExternalStore } from 'react';
import {
  getStoredValueStore,
} from '../../services/admin/storage';

export function useStoredDomain(storageKey, getFallbackValue) {
  const store = getStoredValueStore(storageKey, getFallbackValue);
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot);

  const setData = useCallback((updater) => {
    store.set(updater);
  }, [store]);

  const reload = useCallback(() => {
    store.reload();
  }, [store]);

  return {
    data: snapshot.data,
    setData,
    isReady: snapshot.isReady,
    error: snapshot.error,
    reload,
  };
}
