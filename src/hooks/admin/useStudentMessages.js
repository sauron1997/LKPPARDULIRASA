import { useAdminInboxChannel } from './useAdminInboxChannel';

export function useStudentMessages() {
  return useAdminInboxChannel('student');
}
