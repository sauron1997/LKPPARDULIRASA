import { useQuery } from '@tanstack/react-query';
import { mediaQueryKeys } from '../../lib/queries/mediaQueryKeys';
import {
  createAdminGalleryItem,
  createAdminMediaLibraryItem,
  deleteAdminGalleryItem,
  deleteAdminMediaLibraryItem,
  fetchAdminGalleryItem,
  fetchAdminGalleryItems,
  fetchAdminMediaLibrary,
  updateAdminGalleryItem,
  updateAdminMediaLibraryItem,
} from '../../services/media/mediaClient';
import { useInvalidationMutation } from './queryMutationUtils';

export function useAdminMediaLibraryQuery(filters = {}, options = {}) {
  return useQuery({
    queryKey: mediaQueryKeys.library(filters),
    queryFn: () => fetchAdminMediaLibrary(filters),
    staleTime: 60_000,
    ...options,
  });
}

export function useAdminGalleryQuery(options = {}) {
  return useQuery({
    queryKey: mediaQueryKeys.gallery(),
    queryFn: fetchAdminGalleryItems,
    staleTime: 60_000,
    ...options,
  });
}

export function useAdminGalleryItemQuery(itemId, options = {}) {
  return useQuery({
    queryKey: mediaQueryKeys.galleryItem(itemId),
    queryFn: () => fetchAdminGalleryItem(itemId),
    enabled: Boolean(itemId) && (options.enabled ?? true),
    staleTime: 60_000,
    ...options,
  });
}

export function useCreateAdminMediaLibraryItemMutation(options = {}) {
  return useInvalidationMutation({
    mutationFn: createAdminMediaLibraryItem,
    invalidate: [mediaQueryKeys.all],
    options,
  });
}

export function useUpdateAdminMediaLibraryItemMutation(options = {}) {
  return useInvalidationMutation({
    mutationFn: ({ mediaId, payload }) => updateAdminMediaLibraryItem(mediaId, payload),
    invalidate: (data, variables) => [
      mediaQueryKeys.all,
      mediaQueryKeys.libraryItem(variables.mediaId),
    ],
    options,
  });
}

export function useDeleteAdminMediaLibraryItemMutation(options = {}) {
  return useInvalidationMutation({
    mutationFn: deleteAdminMediaLibraryItem,
    invalidate: [mediaQueryKeys.all],
    options,
  });
}

export function useCreateAdminGalleryItemMutation(options = {}) {
  return useInvalidationMutation({
    mutationFn: createAdminGalleryItem,
    invalidate: [mediaQueryKeys.all],
    options,
  });
}

export function useUpdateAdminGalleryItemMutation(options = {}) {
  return useInvalidationMutation({
    mutationFn: ({ itemId, payload }) => updateAdminGalleryItem(itemId, payload),
    invalidate: (data, variables) => [
      mediaQueryKeys.all,
      mediaQueryKeys.galleryItem(variables.itemId),
    ],
    options,
  });
}

export function useDeleteAdminGalleryItemMutation(options = {}) {
  return useInvalidationMutation({
    mutationFn: deleteAdminGalleryItem,
    invalidate: [mediaQueryKeys.all],
    options,
  });
}
