import { useMutation } from '@tanstack/react-query';
import { submitPublicContactMessage } from '../../services/public/publicClient';

export function useSubmitPublicContactMessageMutation() {
  return useMutation({
    mutationFn: submitPublicContactMessage,
  });
}

