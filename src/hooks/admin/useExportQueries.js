import { useMutation } from '@tanstack/react-query';
import { exportQueryKeys } from '../../lib/queries/exportQueryKeys';
import {
  exportAdminCertificates,
  exportAdminMessages,
  exportAdminStudents,
} from '../../services/exports/exportsClient';

function createExportMutationOptions(mutationKey, mutationFn, options = {}) {
  return {
    mutationKey,
    mutationFn,
    ...options,
  };
}

export function useAdminStudentsExportMutation(options = {}) {
  return useMutation(
    createExportMutationOptions(exportQueryKeys.students(), exportAdminStudents, options),
  );
}

export function useAdminMessagesExportMutation(options = {}) {
  return useMutation(
    createExportMutationOptions(exportQueryKeys.messages(), exportAdminMessages, options),
  );
}

export function useAdminCertificatesExportMutation(options = {}) {
  return useMutation(
    createExportMutationOptions(exportQueryKeys.certificates(), exportAdminCertificates, options),
  );
}
