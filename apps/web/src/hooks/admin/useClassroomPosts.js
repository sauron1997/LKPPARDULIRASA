import { useMemo } from 'react';
import { normalizeClassroomPost } from '@lkp-parduli-rasa/domain';
import {
  useAdminClassroomPostsQuery,
  useCreateAdminClassroomPostMutation,
  useDeleteAdminClassroomPostMutation,
  useUpdateAdminClassroomPostMutation,
} from './useClassroomOverlayQueries';

export function useClassroomPosts(courseId = null) {
  const query = useAdminClassroomPostsQuery();
  const createMutation = useCreateAdminClassroomPostMutation();
  const updateMutation = useUpdateAdminClassroomPostMutation();
  const deleteMutation = useDeleteAdminClassroomPostMutation();

  const classroomPosts = useMemo(() => (Array.isArray(query.data) ? query.data : [])
    .map((post, index) => normalizeClassroomPost(post, index))
    .sort((left, right) => new Date(right.publishedAt || right.updatedAt || 0) - new Date(left.publishedAt || left.updatedAt || 0)), [query.data]);

  const posts = useMemo(() => (
    courseId == null
      ? classroomPosts
      : classroomPosts.filter((post) => String(post.courseId) === String(courseId))
  ), [classroomPosts, courseId]);

  return useMemo(() => ({
    classroomPosts,
    posts,
    createPost: (payload) => createMutation.mutateAsync(payload),
    updatePost: (postId, payload) => updateMutation.mutateAsync({ postId, payload }),
    removePost: (postId) => deleteMutation.mutateAsync(postId),
    isReady: !query.isPending,
    error: query.error?.message || createMutation.error?.message || updateMutation.error?.message || deleteMutation.error?.message || '',
    reload: query.refetch,
  }), [classroomPosts, createMutation, deleteMutation, posts, query.error?.message, query.isPending, query.refetch, updateMutation]);
}
