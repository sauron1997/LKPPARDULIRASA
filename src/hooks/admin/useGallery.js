import { useMemo } from 'react';
import { getDefaultGalleryItems } from '../../services/admin/defaults';
import { useStoredDomain } from './useStoredDomain';

const STORAGE_KEY = 'lkp-domain-gallery';

export function useGallery() {
  const domain = useStoredDomain(STORAGE_KEY, getDefaultGalleryItems);

  return useMemo(() => ({
    items: domain.data,
    setItems: domain.setData,
    isReady: domain.isReady,
    error: domain.error,
    reload: domain.reload,
  }), [domain]);
}
