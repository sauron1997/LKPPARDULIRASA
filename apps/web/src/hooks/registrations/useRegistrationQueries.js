import { useQuery } from '@tanstack/react-query';
import { registrationQueryKeys } from '../../lib/queries/registrationQueryKeys';
import { fetchRegistrationOptions } from '../../services/registrations/registrationsClient';

export function useRegistrationOptionsQuery() {
  return useQuery({
    queryKey: registrationQueryKeys.options(),
    queryFn: fetchRegistrationOptions,
    staleTime: 60_000,
  });
}
