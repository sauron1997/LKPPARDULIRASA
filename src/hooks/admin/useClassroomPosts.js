import { useCallback, useMemo } from 'react';
import { getDefaultClassroomPosts } from '../../services/admin/defaults';
import {
  CLASSROOM_POST_STORAGE_KEY,
  normalizeClassroomPost,
} from '../../utils/domainRelations';
import { useStoredDomain } from './useStoredDomain';

export function useClassroomPosts(courseId = null) {
  const domain = useStoredDomain(CLASSROOM_POST_STORAGE_KEY, getDefaultClassroomPosts);

  const classroomPosts = useMemo(() => domain.data
    .map((post, index) => normalizeClassroomPost(post, index))
    .sort((left, right) => new Date(right.publishedAt || right.updatedAt || 0) - new Date(left.publishedAt || left.updatedAt || 0)), [domain.data]);

  const posts = useMemo(() => (
    courseId == null
      ? classroomPosts
      : classroomPosts.filter((post) => String(post.courseId) === String(courseId))
  ), [classroomPosts, courseId]);

  const createPost = useCallback((payload) => {
    const nextPost = normalizeClassroomPost({
      ...payload,
      id: payload?.id || `post-${payload?.courseId || 'course'}-${Date.now()}`,
      createdAt: payload?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    domain.setData((currentPosts = []) => [nextPost, ...currentPosts]);
    return nextPost;
  }, [domain]);

  const updatePost = useCallback((postId, updater) => {
    let updatedPost = null;

    domain.setData((currentPosts = []) => currentPosts.map((post, index) => {
      if (String(post.id) !== String(postId)) {
        return post;
      }

      const nextValue = typeof updater === 'function' ? updater(post) : { ...post, ...updater };
      updatedPost = normalizeClassroomPost({
        ...post,
        ...nextValue,
        updatedAt: new Date().toISOString(),
      }, index);
      return updatedPost;
    }));

    return updatedPost;
  }, [domain]);

  const removePost = useCallback((postId) => {
    domain.setData((currentPosts = []) => currentPosts.filter((post) => String(post.id) !== String(postId)));
  }, [domain]);

  return useMemo(() => ({
    classroomPosts,
    posts,
    setClassroomPosts: domain.setData,
    createPost,
    updatePost,
    removePost,
    isReady: domain.isReady,
    error: domain.error,
    reload: domain.reload,
  }), [classroomPosts, createPost, domain, posts, removePost, updatePost]);
}
