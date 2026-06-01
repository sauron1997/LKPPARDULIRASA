import { useAdminInboxChannel } from './useAdminInboxChannel';

export function usePublicMessages() {
  return useAdminInboxChannel('public');
}
