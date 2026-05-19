import { QueryClient } from '@tanstack/react-query';

function shouldRetry(failureCount, error) {
  if (failureCount >= 2) {
    return false;
  }

  const status = error?.status || 0;

  if ([400, 401, 403, 404, 409, 422].includes(status)) {
    return false;
  }

  return true;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: shouldRetry,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
    mutations: {
      retry: false,
    },
  },
});
