import { useMemo } from 'react';
import { useCourses } from './useCourses';

export function useModules() {
  const coursesDomain = useCourses();
  const modules = useMemo(() => (
    coursesDomain.courses.flatMap((course) => (
      Array.isArray(course.modules)
        ? course.modules.map((module) => ({
          ...module,
          courseId: module.courseId ?? course.id,
        }))
        : []
    ))
  ), [coursesDomain.courses]);

  return useMemo(() => ({
    modules,
    setModules: () => {},
    isReady: coursesDomain.isReady,
    error: coursesDomain.error,
    reload: coursesDomain.reload,
  }), [coursesDomain.error, coursesDomain.isReady, coursesDomain.reload, modules]);
}
