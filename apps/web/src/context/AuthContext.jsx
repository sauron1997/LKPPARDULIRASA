import { useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AuthContext } from './authContextValue';
import { apiRequest } from '../services/apiClient';
import { authClient } from '../services/auth/authClient';
import { authQueryKeys } from '../lib/queries/authQueryKeys';

function isEmailIdentifier(value) {
  return String(value || '').includes('@');
}

function fetchCurrentUser() {
  return apiRequest('/api/v1/auth/me');
}

function normalizeSessionUser(user) {
  if (!user) {
    return null;
  }

  return {
    ...user,
    role: user.role || 'student',
  };
}

export function AuthProvider({ children, scope = 'protected' }) {
  const queryClient = useQueryClient();
  const sessionState = authClient.useSession();
  const hasSession = Boolean(sessionState.data?.session && sessionState.data?.user);
  const isProtectedScope = scope === 'protected';
  const meQuery = useQuery({
    queryKey: authQueryKeys.me(),
    queryFn: fetchCurrentUser,
    enabled: isProtectedScope && !sessionState.isPending && hasSession,
    staleTime: 30_000,
  });

  const login = useCallback(async (identifier, password) => {
    try {
      const normalizedIdentifier = String(identifier || '').trim();
      const payload = await apiRequest('/api/v1/auth/login', {
        method: 'POST',
        body: {
          identifier: normalizedIdentifier,
          password,
          loginMethod: isEmailIdentifier(normalizedIdentifier) ? 'email' : 'username',
        },
      });

      const nextSession = await sessionState.refetch().catch(() => null);
      const hasNextSession = Boolean(nextSession?.data?.session && nextSession?.data?.user);
      const sessionUser = normalizeSessionUser(nextSession?.data?.user);

      if (!hasNextSession) {
        return {
          success: false,
          message: 'Login diterima, tetapi sesi belum aktif di browser. Coba lagi. Jika tetap gagal, aktifkan cookie lalu refresh halaman.',
        };
      }

      if (payload?.user) {
        queryClient.setQueryData(authQueryKeys.me(), payload.user);
      }

      return {
        success: true,
        user: payload?.user || sessionUser,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Email/NIS/username atau password salah',
      };
    }
  }, [queryClient, sessionState]);

  const logout = useCallback(async () => {
    await apiRequest('/api/v1/logout', {
      method: 'POST',
    }).catch(() => authClient.signOut().catch(() => {}));
    queryClient.clear();
    await sessionState.refetch().catch(() => {});
  }, [queryClient, sessionState]);

  const sessionUser = normalizeSessionUser(sessionState.data?.user);
  const user = hasSession
    ? (isProtectedScope ? (meQuery.data || null) : sessionUser)
    : null;
  const isLoadingSession = sessionState.isPending || (isProtectedScope && hasSession && meQuery.isPending);
  const isAuthenticated = Boolean(user);
  const isAdmin = user?.role === 'admin';
  const isStudent = user?.role === 'student';
  const value = useMemo(() => ({
    user,
    login,
    logout,
    isAuthenticated,
    isAdmin,
    isStudent,
    isLoadingSession,
  }), [isAdmin, isAuthenticated, isLoadingSession, isStudent, login, logout, user]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
