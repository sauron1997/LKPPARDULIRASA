import { createAuthClient } from 'better-auth/react';
import { usernameClient } from 'better-auth/client/plugins';

function getAuthBaseUrl() {
  const apiBaseUrl = String(import.meta.env.VITE_API_BASE_URL || '').trim();

  if (!apiBaseUrl) {
    return undefined;
  }

  return apiBaseUrl
    .replace(/\/+$/g, '')
    .replace(/\/api$/i, '');
}

export const authClient = createAuthClient({
  baseURL: getAuthBaseUrl(),
  basePath: '/api/auth',
  plugins: [usernameClient()],
});
