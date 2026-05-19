import { useMutation, useQueryClient } from '@tanstack/react-query';

function normalizeInvalidationEntry(entry) {
  if (!entry) {
    return null;
  }

  return Array.isArray(entry) ? { queryKey: entry } : entry;
}

export function useInvalidationMutation(config) {
  const queryClient = useQueryClient();
  const { mutationFn, invalidate, options = {} } = config;
  const { onSuccess, ...restOptions } = options;

  return useMutation({
    mutationFn,
    ...restOptions,
    onSuccess: async (data, variables, context) => {
      const keysToInvalidate = typeof invalidate === 'function'
        ? invalidate(data, variables, context)
        : invalidate;

      const invalidations = [...new Map(
        (keysToInvalidate || [])
          .map(normalizeInvalidationEntry)
          .filter(Boolean)
          .map((entry) => [JSON.stringify(entry), entry]),
      ).values()];

      await Promise.all(
        invalidations.map((entry) => queryClient.invalidateQueries(entry)),
      );

      return onSuccess?.(data, variables, context);
    },
  });
}
