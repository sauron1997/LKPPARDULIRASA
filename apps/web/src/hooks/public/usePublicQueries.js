import { useQuery } from '@tanstack/react-query';
import { publicQueryKeys } from '../../lib/queries/publicQueryKeys';
import {
  fetchPublicAccreditations,
  fetchPublicBlogPost,
  fetchPublicBlogPosts,
  fetchPublicCourses,
  fetchPublicGalleryItems,
  fetchPublicLandingSnapshot,
  fetchPublicProfile,
  fetchPublicStudents,
} from '../../services/public/publicClient';
import {
  getDefaultAccreditations,
  getDefaultBlogPosts,
  getDefaultCourses,
  getDefaultGalleryItems,
  getDefaultProfile,
  getDefaultStudents,
} from '@lkp-parduli-rasa/domain';

const DEFAULT_COURSES = getDefaultCourses();
const DEFAULT_BLOG_POSTS = getDefaultBlogPosts().filter((post) => post.status === 'published');
const DEFAULT_GALLERY_ITEMS = getDefaultGalleryItems();

function getDefaultLandingSnapshot() {
  return {
    profile: getDefaultProfile(),
    featuredCourses: DEFAULT_COURSES.slice(0, 3),
    courses: DEFAULT_COURSES,
    latestBlogPosts: DEFAULT_BLOG_POSTS.slice(0, 4),
    galleryItems: DEFAULT_GALLERY_ITEMS.slice(0, 8),
    accreditations: getDefaultAccreditations(),
  };
}

function getDefaultBlogPost(slugOrId) {
  return DEFAULT_BLOG_POSTS.find((post) => (
    String(post.id) === String(slugOrId)
    || String(post.slug) === String(slugOrId)
  )) || undefined;
}

export function usePublicLandingQuery() {
  return useQuery({
    queryKey: publicQueryKeys.landing(),
    queryFn: fetchPublicLandingSnapshot,
    placeholderData: getDefaultLandingSnapshot,
    staleTime: 60_000,
  });
}

export function usePublicProfileQuery() {
  return useQuery({
    queryKey: publicQueryKeys.profile(),
    queryFn: fetchPublicProfile,
    placeholderData: getDefaultProfile,
    staleTime: 60_000,
  });
}

export function usePublicCoursesQuery(filters = {}) {
  return useQuery({
    queryKey: publicQueryKeys.courses(filters),
    queryFn: () => fetchPublicCourses(filters),
    placeholderData: DEFAULT_COURSES,
    staleTime: 60_000,
  });
}

export function usePublicBlogPostsQuery(filters = {}) {
  return useQuery({
    queryKey: publicQueryKeys.blogPosts(filters),
    queryFn: () => fetchPublicBlogPosts(filters),
    placeholderData: DEFAULT_BLOG_POSTS,
    staleTime: 60_000,
  });
}

export function usePublicBlogPostQuery(slugOrId, options = {}) {
  return useQuery({
    queryKey: publicQueryKeys.blogPost(slugOrId),
    queryFn: () => fetchPublicBlogPost(slugOrId),
    placeholderData: () => getDefaultBlogPost(slugOrId),
    enabled: Boolean(slugOrId) && (options.enabled ?? true),
    staleTime: 60_000,
  });
}

export function usePublicGalleryQuery(filters = {}) {
  return useQuery({
    queryKey: publicQueryKeys.gallery(filters),
    queryFn: () => fetchPublicGalleryItems(filters),
    placeholderData: DEFAULT_GALLERY_ITEMS,
    staleTime: 60_000,
  });
}

export function usePublicAccreditationsQuery() {
  return useQuery({
    queryKey: publicQueryKeys.accreditations(),
    queryFn: fetchPublicAccreditations,
    placeholderData: getDefaultAccreditations,
    staleTime: 60_000,
  });
}

export function usePublicStudentsQuery(filters = {}) {
  return useQuery({
    queryKey: publicQueryKeys.students(filters),
    queryFn: () => fetchPublicStudents(filters),
    placeholderData: getDefaultStudents,
    staleTime: 60_000,
  });
}
