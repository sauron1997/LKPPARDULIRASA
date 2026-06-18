import { useCallback, useMemo, useState } from 'react';
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
  const [tokenAuth, setTokenAuth] = useState(() => {
    // Restore token from localStorage on mount
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('lkp_auth_token');
      const userStr = localStorage.getItem('lkp_auth_user');
      if (stored && userStr) {
        try {
          return { token: stored, user: JSON.parse(userStr) };
        } catch {
          return null;
        }
      }
    }
    return null;
  });

  const sessionState = authClient.useSession();
  const hasBetterAuthSession = Boolean(sessionState.data?.session && sessionState.data?.user);
  const isProtectedScope = scope === 'protected';
  
  const meQuery = useQuery({
    queryKey: authQueryKeys.me(),
    queryFn: fetchCurrentUser,
    enabled: isProtectedScope && !sessionState.isPending && (hasBetterAuthSession || Boolean(tokenAuth)),
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

      // Try to fetch Better-Auth session
      const nextSession = await sessionState.refetch().catch(() => null);
      const hasNextSession = Boolean(nextSession?.data?.session && nextSession?.data?.user);
      const sessionUser = normalizeSessionUser(nextSession?.data?.user);

      // If Better-Auth session is available, use it
      if (hasNextSession) {
        if (payload?.user) {
          queryClient.setQueryData(authQueryKeys.me(), payload.user);
        }
        return {
          success: true,
          user: payload?.user || sessionUser,
        };
      }

      // Fallback to token-based auth (in-memory mode)
      if (payload?.token && payload?.user) {
        setTokenAuth({ token: payload.token, user: payload.user });
        localStorage.setItem('lkp_auth_token', payload.token);
        localStorage.setItem('lkp_auth_user', JSON.stringify(payload.user));
        queryClient.setQueryData(authQueryKeys.me(), payload.user);
        return {
          success: true,
          user: payload.user,
        };
      }

      return {
        success: false,
        message: 'Login diterima, tetapi sesi belum aktif di browser. Coba lagi. Jika tetap gagal, aktifkan cookie lalu refresh halaman.',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Email/NIS/username atau password salah',
      };
    }
  }, [queryClient, sessionState]);

  const logout = useCallback(async () => {
    // Clear token-based auth
    setTokenAuth(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('lkp_auth_token');
      localStorage.removeItem('lkp_auth_user');
    }

    await apiRequest('/api/v1/logout', {
      method: 'POST',
    }).catch(() => authClient.signOut().catch(() => {}));
    queryClient.clear();
    await sessionState.refetch().catch(() => {});
  }, [queryClient, sessionState]);

  const sessionUser = normalizeSessionUser(sessionState.data?.user);
  const tokenUser = tokenAuth?.user || null;
  const user = hasBetterAuthSession
    ? (isProtectedScope ? (meQuery.data || null) : sessionUser)
    : tokenUser
      ? (isProtectedScope ? (meQuery.data || tokenUser) : tokenUser)
      : null;
  const isLoadingSession = sessionState.isPending || (isProtectedScope && (hasBetterAuthSession || Boolean(tokenAuth)) && meQuery.isPending);
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
