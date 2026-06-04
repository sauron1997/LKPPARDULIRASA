import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { paymentSettingsQueryKeys } from '../../lib/queries/paymentSettingsQueryKeys';
import {
  fetchAdminPaymentSettings,
  fetchPaymentSettings,
  updatePaymentSettings,
} from '../../services/paymentSettings/paymentSettingsClient';

export function usePaymentSettings() {
  const query = useQuery({
    queryKey: paymentSettingsQueryKeys.detail(),
    queryFn: fetchPaymentSettings,
    staleTime: 30_000,
  });

  return query;
}

export function useAdminPaymentSettings() {
  const query = useQuery({
    queryKey: [...paymentSettingsQueryKeys.detail(), 'admin'],
    queryFn: fetchAdminPaymentSettings,
    staleTime: 30_000,
  });

  return query;
}

export function useUpdatePaymentSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updatePaymentSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: paymentSettingsQueryKeys.all });
    },
  });
}
