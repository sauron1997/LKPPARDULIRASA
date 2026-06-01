import { useQuery } from '@tanstack/react-query';
import { contentQueryKeys } from '../../lib/queries/contentQueryKeys';
import { mediaQueryKeys } from '../../lib/queries/mediaQueryKeys';
import {
  createAdminAccreditation,
  createAdminBlogPost,
  deleteAdminAccreditation,
  deleteAdminBlogPost,
  fetchAdminAccreditation,
  fetchAdminAccreditations,
  fetchAdminBlogPost,
  fetchAdminBlogPosts,
  fetchAdminContentProfile,
  updateAdminAccreditation,
  updateAdminBlogPost,
  updateAdminContentProfile,
} from '../../services/content/contentClient';
import { useInvalidationMutation } from './queryMutationUtils';

export function useAdminContentProfileQuery(options = {}) {
  return useQuery({
    queryKey: contentQueryKeys.profile(),
    queryFn: fetchAdminContentProfile,
    staleTime: 60_000,
    ...options,
  });
}

export function useAdminBlogPostsQuery(filters = {}, options = {}) {
  return useQuery({
    queryKey: contentQueryKeys.blogPosts(filters),
    queryFn: () => fetchAdminBlogPosts(filters),
    staleTime: 60_000,
    ...options,
  });
}

export function useAdminBlogPostQuery(postId, options = {}) {
  return useQuery({
    queryKey: contentQueryKeys.blogPost(postId),
    queryFn: () => fetchAdminBlogPost(postId),
    enabled: Boolean(postId) && (options.enabled ?? true),
    staleTime: 60_000,
    ...options,
  });
}

export function useAdminAccreditationsQuery(options = {}) {
  return useQuery({
    queryKey: contentQueryKeys.accreditations(),
    queryFn: fetchAdminAccreditations,
    staleTime: 60_000,
    ...options,
  });
}

export function useAdminAccreditationQuery(itemId, options = {}) {
  return useQuery({
    queryKey: contentQueryKeys.accreditation(itemId),
    queryFn: () => fetchAdminAccreditation(itemId),
    enabled: Boolean(itemId) && (options.enabled ?? true),
    staleTime: 60_000,
    ...options,
  });
}

export function useUpdateAdminContentProfileMutation(options = {}) {
  return useInvalidationMutation({
    mutationFn: updateAdminContentProfile,
    invalidate: [contentQueryKeys.profile()],
    options,
  });
}

export function useCreateAdminBlogPostMutation(options = {}) {
  return useInvalidationMutation({
    mutationFn: createAdminBlogPost,
    invalidate: [contentQueryKeys.all, mediaQueryKeys.all],
    options,
  });
}

export function useUpdateAdminBlogPostMutation(options = {}) {
  return useInvalidationMutation({
    mutationFn: ({ postId, payload }) => updateAdminBlogPost(postId, payload),
    invalidate: (data, variables) => [
      contentQueryKeys.all,
      contentQueryKeys.blogPost(variables.postId),
      mediaQueryKeys.all,
    ],
    options,
  });
}

export function useDeleteAdminBlogPostMutation(options = {}) {
  return useInvalidationMutation({
    mutationFn: deleteAdminBlogPost,
    invalidate: [contentQueryKeys.all, mediaQueryKeys.all],
    options,
  });
}

export function useCreateAdminAccreditationMutation(options = {}) {
  return useInvalidationMutation({
    mutationFn: createAdminAccreditation,
    invalidate: [contentQueryKeys.all, mediaQueryKeys.all],
    options,
  });
}

export function useUpdateAdminAccreditationMutation(options = {}) {
  return useInvalidationMutation({
    mutationFn: ({ itemId, payload }) => updateAdminAccreditation(itemId, payload),
    invalidate: (data, variables) => [
      contentQueryKeys.all,
      contentQueryKeys.accreditation(variables.itemId),
      mediaQueryKeys.all,
    ],
    options,
  });
}

export function useDeleteAdminAccreditationMutation(options = {}) {
  return useInvalidationMutation({
    mutationFn: deleteAdminAccreditation,
    invalidate: [contentQueryKeys.all, mediaQueryKeys.all],
    options,
  });
}
