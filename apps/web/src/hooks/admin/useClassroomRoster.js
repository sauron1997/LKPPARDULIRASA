import { useCallback, useMemo } from 'react';
import { buildClassroomRoster } from '@lkp-parduli-rasa/domain';
import { useAccounts } from './useAccounts';
import {
  useUpdateAdminStudentMutation,
  useUpdateAdminStudentPaymentMutation,
} from './useAdminQueries';
import { useCourses } from './useCourses';
import { useEnrollments } from './useEnrollments';
import { useStudents } from './useStudents';

export function useClassroomRoster(courseId = null) {
  const accountsDomain = useAccounts();
  const coursesDomain = useCourses();
  const enrollmentsDomain = useEnrollments();
  const studentsDomain = useStudents();
  const updateStudentMutation = useUpdateAdminStudentMutation();
  const updateStudentPaymentMutation = useUpdateAdminStudentPaymentMutation();

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

  const rosterEntries = useMemo(
    () => Object.values(rosterByCourse).flatMap((bundle) => bundle.roster || []),
    [rosterByCourse],
  );

  const resolveStudentIdByEnrollment = useCallback((enrollmentId) => (
    rosterEntries.find((entry) => String(entry.enrollment?.id) === String(enrollmentId))?.student?.id || null
  ), [rosterEntries]);

  const addMember = useCallback(async (enrollmentId) => {
    const studentId = resolveStudentIdByEnrollment(enrollmentId);
    if (!studentId) {
      return;
    }

    await updateStudentMutation.mutateAsync({
      studentId,
      payload: {
        enrollmentStatus: 'active',
      },
    });
  }, [resolveStudentIdByEnrollment, updateStudentMutation]);

  const removeMember = useCallback(async (enrollmentId) => {
    const studentId = resolveStudentIdByEnrollment(enrollmentId);
    if (!studentId) {
      return;
    }

    await updateStudentMutation.mutateAsync({
      studentId,
      payload: {
        enrollmentStatus: 'cancelled',
      },
    });
  }, [resolveStudentIdByEnrollment, updateStudentMutation]);

  const verifyPayment = useCallback(async (enrollmentId) => {
    const studentId = resolveStudentIdByEnrollment(enrollmentId);
    if (!studentId) {
      return;
    }

    await updateStudentPaymentMutation.mutateAsync({
      studentId,
      payload: {
        paymentStatus: 'verified',
        paymentDate: new Date().toISOString().slice(0, 10),
      },
    });
  }, [resolveStudentIdByEnrollment, updateStudentPaymentMutation]);

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
    verifyPayment,
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
    verifyPayment,
    rosterByCourse,
    selected,
    studentsDomain,
  ]);
}
