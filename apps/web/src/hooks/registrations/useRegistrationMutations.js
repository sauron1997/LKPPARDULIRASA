import { useMutation } from '@tanstack/react-query';
import { createRegistration } from '../../services/registrations/registrationsClient';

export function useCreateRegistrationMutation() {
  return useMutation({
    mutationFn: createRegistration,
  });
}
