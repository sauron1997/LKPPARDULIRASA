import { useCallback, useMemo } from 'react';
import { buildClassroomRoster } from '../../utils/domainRelations';
import { useAccounts } from './useAccounts';
import { useCourses } from './useCourses';
import { useEnrollments } from './useEnrollments';
import { useStudents } from './useStudents';

export function useClassroomRoster(courseId = null) {
  const accountsDomain = useAccounts();
  const coursesDomain = useCourses();
  const enrollmentsDomain = useEnrollments();
  const studentsDomain = useStudents();

  const rosterByCourse = useMemo(() => coursesDomain.courses.reduce((accumulator, course) => ({
    ...accumulator,
    [course.id]: buildClassroomRoster({
      courseId: course.id,
      courses: coursesDomain.courses,
      enrollments: enrollmentsDomain.enrollments,
      students: studentsDomain.students,
      accounts: accountsDomain.accounts,
    }),
  }), {}), [
    accountsDomain.accounts,
    coursesDomain.courses,
    enrollmentsDomain.enrollments,
    studentsDomain.students,
  ]);

  const selected = courseId == null
    ? null
    : rosterByCourse[courseId] || buildClassroomRoster({
      courseId,
      courses: coursesDomain.courses,
      enrollments: enrollmentsDomain.enrollments,
      students: studentsDomain.students,
      accounts: accountsDomain.accounts,
    });

  const addMember = useCallback((enrollmentId) => {
    enrollmentsDomain.setEnrollments((currentEnrollments = []) => currentEnrollments.map((enrollment) => (
      String(enrollment.id) === String(enrollmentId)
        ? {
          ...enrollment,
          status: 'active',
          updatedAt: new Date().toISOString(),
        }
        : enrollment
    )));
  }, [enrollmentsDomain]);

  const removeMember = useCallback((enrollmentId) => {
    enrollmentsDomain.setEnrollments((currentEnrollments = []) => currentEnrollments.map((enrollment) => (
      String(enrollment.id) === String(enrollmentId)
        ? {
          ...enrollment,
          status: 'inactive',
          updatedAt: new Date().toISOString(),
        }
        : enrollment
    )));
  }, [enrollmentsDomain]);

  return useMemo(() => ({
    roster: selected?.roster || [],
    counts: selected?.counts || {
      total: 0,
      active: 0,
      completed: 0,
      verified: 0,
      pending: 0,
      rejected: 0,
      activeMembers: 0,
    },
    candidates: selected?.candidates || [],
    rosterByCourse,
    addMember,
    removeMember,
    setEnrollments: enrollmentsDomain.setEnrollments,
    isReady: [
      accountsDomain.isReady,
      coursesDomain.isReady,
      enrollmentsDomain.isReady,
      studentsDomain.isReady,
    ].every(Boolean),
    error: [
      accountsDomain.error,
      coursesDomain.error,
      enrollmentsDomain.error,
      studentsDomain.error,
    ].find(Boolean) || '',
    reload: () => {
      accountsDomain.reload();
      coursesDomain.reload();
      enrollmentsDomain.reload();
      studentsDomain.reload();
    },
  }), [
    accountsDomain,
    addMember,
    coursesDomain,
    enrollmentsDomain,
    removeMember,
    rosterByCourse,
    selected,
    studentsDomain,
  ]);
}
