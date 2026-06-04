import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { paymentQueryKeys } from '../../lib/queries/paymentQueryKeys';
import {
  fetchManualPayments,
  fetchPaymentByEnrollment,
  fetchPaymentsByStudent,
  fetchPayment,
  rejectManualPayment,
  uploadPaymentProof,
  verifyManualPayment,
} from '../../services/payments/paymentsClient';
import { adminQueryKeys } from '../../lib/queries/adminQueryKeys';
import { studentQueryKeys } from '../../lib/queries/studentQueryKeys';

export function usePaymentByEnrollment(enrollmentId) {
  return usePaymentByEnrollmentWithAccess(enrollmentId);
}

export function usePaymentByEnrollmentWithAccess(enrollmentId, accessToken = '') {
  return useQuery({
    queryKey: paymentQueryKeys.byEnrollment(enrollmentId, accessToken),
    queryFn: () => fetchPaymentByEnrollment(enrollmentId, accessToken),
    enabled: Boolean(enrollmentId),
    refetchInterval: (query) => {
      const data = query.state.data;
      if (data && (data.status === 'paid' || data.status === 'expired' || data.status === 'failed')) {
        return false;
      }
      return 5000; // Poll every 5s while pending
    },
  });
}

export function usePaymentsByStudent(studentId) {
  return useQuery({
    queryKey: paymentQueryKeys.byStudent(studentId),
    queryFn: () => fetchPaymentsByStudent(studentId),
    enabled: Boolean(studentId),
  });
}

export function usePayment(paymentId) {
  return useQuery({
    queryKey: paymentQueryKeys.detail(paymentId),
    queryFn: () => fetchPayment(paymentId),
    enabled: Boolean(paymentId),
  });
}

export function useUploadPaymentProofMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ paymentId, payload }) => uploadPaymentProof(paymentId, payload),
    onSuccess: async (data, variables) => {
      const invalidations = [
        paymentQueryKeys.all,
        paymentQueryKeys.byEnrollment(variables.enrollmentId || data?.enrollmentId, variables.accessToken),
        paymentQueryKeys.detail(variables.paymentId || data?.id),
        paymentQueryKeys.byStudent(data?.studentId),
        studentQueryKeys.dashboard(),
      ].filter(Boolean);

      await Promise.all(invalidations.map((queryKey) => queryClient.invalidateQueries({ queryKey })));
    },
  });
}

export function useManualPaymentsQuery(options = {}) {
  return useQuery({
    queryKey: paymentQueryKeys.manualAdmin(),
    queryFn: fetchManualPayments,
    staleTime: 30_000,
    ...options,
  });
}

function buildManualPaymentInvalidations() {
  return [
    paymentQueryKeys.all,
    paymentQueryKeys.manualAdmin(),
    adminQueryKeys.dashboard(),
    adminQueryKeys.studentsRoot(),
    studentQueryKeys.dashboard(),
  ];
}

function buildManualPaymentRecordInvalidations(payment) {
  return [
    payment?.id ? paymentQueryKeys.detail(payment.id) : null,
    payment?.enrollmentId ? paymentQueryKeys.byEnrollment(payment.enrollmentId) : null,
    payment?.studentId ? paymentQueryKeys.byStudent(payment.studentId) : null,
  ].filter(Boolean);
}

export function useVerifyManualPaymentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ paymentId, payload }) => verifyManualPayment(paymentId, payload),
    onSuccess: async (payment) => {
      await Promise.all(
        [...buildManualPaymentInvalidations(), ...buildManualPaymentRecordInvalidations(payment)]
          .map((queryKey) => queryClient.invalidateQueries({ queryKey })),
      );
    },
  });
}

export function useRejectManualPaymentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ paymentId, payload }) => rejectManualPayment(paymentId, payload),
    onSuccess: async (payment) => {
      await Promise.all(
        [...buildManualPaymentInvalidations(), ...buildManualPaymentRecordInvalidations(payment)]
          .map((queryKey) => queryClient.invalidateQueries({ queryKey })),
      );
    },
  });
}
