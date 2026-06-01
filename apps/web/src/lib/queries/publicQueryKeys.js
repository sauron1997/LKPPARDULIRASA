function normalizeFilters(filters = {}) {
  return Object.entries(filters)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey));
}

export const publicQueryKeys = {
  all: ['public'],
  landing: () => [...publicQueryKeys.all, 'landing'],
  profile: () => [...publicQueryKeys.all, 'profile'],
  courses: (filters = {}) => [...publicQueryKeys.all, 'courses', normalizeFilters(filters)],
  blogPosts: (filters = {}) => [...publicQueryKeys.all, 'blog-posts', normalizeFilters(filters)],
  blogPost: (slugOrId) => [...publicQueryKeys.all, 'blog-posts', String(slugOrId)],
  gallery: (filters = {}) => [...publicQueryKeys.all, 'gallery', normalizeFilters(filters)],
  accreditations: () => [...publicQueryKeys.all, 'accreditations'],
  students: (filters = {}) => [...publicQueryKeys.all, 'students', normalizeFilters(filters)],
};
