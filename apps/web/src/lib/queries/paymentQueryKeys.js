export const paymentQueryKeys = {
  all: ['payments'],
  byEnrollmentRoot: (enrollmentId) => [...paymentQueryKeys.all, 'enrollment', enrollmentId],
  byEnrollment: (enrollmentId, accessToken = '') => [...paymentQueryKeys.all, 'enrollment', enrollmentId, accessToken || 'public'],
  byStudent: (studentId) => [...paymentQueryKeys.all, 'student', studentId],
  detail: (paymentId) => [...paymentQueryKeys.all, 'detail', paymentId],
  manualAdmin: () => [...paymentQueryKeys.all, 'admin', 'manual'],
};
