export const paymentQueryKeys = {
  all: ['payments'],
  byEnrollment: (enrollmentId) => [...paymentQueryKeys.all, 'enrollment', enrollmentId],
  byStudent: (studentId) => [...paymentQueryKeys.all, 'student', studentId],
  detail: (paymentId) => [...paymentQueryKeys.all, 'detail', paymentId],
};
