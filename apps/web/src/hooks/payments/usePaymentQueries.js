import { useQuery } from '@tanstack/react-query';
import { paymentQueryKeys } from '../../lib/queries/paymentQueryKeys';
import {
  fetchPaymentByEnrollment,
  fetchPaymentsByStudent,
  fetchPayment,
} from '../../services/payments/paymentsClient';

export function usePaymentByEnrollment(enrollmentId) {
  return useQuery({
    queryKey: paymentQueryKeys.byEnrollment(enrollmentId),
    queryFn: () => fetchPaymentByEnrollment(enrollmentId),
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
