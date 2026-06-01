import { useQuery } from '@tanstack/react-query';
import { classroomQueryKeys } from '../../lib/queries/classroomQueryKeys';
import {
  createAdminClassroomPost,
  createAdminClassworkItem,
  deleteAdminClassroomPost,
  fetchAdminClassroomPosts,
  fetchAdminClassworkItems,
  updateAdminClassroomPost,
} from '../../services/classroom/classroomClient';
import { useInvalidationMutation } from './queryMutationUtils';

export function useAdminClassroomPostsQuery(filters = {}, options = {}) {
  return useQuery({
    queryKey: classroomQueryKeys.posts(filters),
    queryFn: () => fetchAdminClassroomPosts(filters),
    staleTime: 60_000,
    ...options,
  });
}

export function useCreateAdminClassroomPostMutation(options = {}) {
  return useInvalidationMutation({
    mutationFn: createAdminClassroomPost,
    invalidate: [classroomQueryKeys.postsRoot()],
    options,
  });
}

export function useUpdateAdminClassroomPostMutation(options = {}) {
  return useInvalidationMutation({
    mutationFn: ({ postId, payload }) => updateAdminClassroomPost(postId, payload),
    invalidate: [classroomQueryKeys.postsRoot()],
    options,
  });
}

export function useDeleteAdminClassroomPostMutation(options = {}) {
  return useInvalidationMutation({
    mutationFn: deleteAdminClassroomPost,
    invalidate: [classroomQueryKeys.postsRoot()],
    options,
  });
}

export function useAdminClassworkItemsQuery(filters = {}, options = {}) {
  return useQuery({
    queryKey: classroomQueryKeys.classworkItems(filters),
    queryFn: () => fetchAdminClassworkItems(filters),
    staleTime: 60_000,
    ...options,
  });
}

export function useCreateAdminClassworkItemMutation(options = {}) {
  return useInvalidationMutation({
    mutationFn: createAdminClassworkItem,
    invalidate: [classroomQueryKeys.classworkRoot()],
    options,
  });
}
