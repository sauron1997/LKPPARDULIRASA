import { normalizeQueryKeyFilters } from '../../services/admin/routeClient';

export const mediaQueryKeys = {
  all: ['admin', 'media'],
  library: (filters = {}) => [...mediaQueryKeys.all, 'library', normalizeQueryKeyFilters(filters)],
  libraryItem: (mediaId) => [...mediaQueryKeys.all, 'library', String(mediaId)],
  gallery: () => [...mediaQueryKeys.all, 'gallery'],
  galleryItem: (itemId) => [...mediaQueryKeys.all, 'gallery', String(itemId)],
};
