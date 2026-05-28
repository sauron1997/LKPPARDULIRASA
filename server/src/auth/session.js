import { createAuthService } from '../modules/auth/auth.service.js';
import {
  canUseDatabaseAuthPersistence,
  findPersistedIdentityByAuthUserId,
} from '../modules/auth/auth.persistence.js';
import { loadRequestAuth } from '../middleware/requireAuth.js';
import { HttpError, asyncHandler } from '../utils/http.js';

const authService = createAuthService();

function getAuthorizationToken(req) {
  const header = req.headers.authorization;
  const customHeader = req.headers['x-session-token'];

  if (typeof header === 'string' && header.trim()) {
    return header;
  }

  if (typeof customHeader === 'string' && customHeader.trim()) {
    return customHeader;
  }

  return '';
}

function normalizePermissions(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeBetterAuthUser(user = {}, session = null) {
  return {
    id: user.accountId || user.studentId || user.id || null,
    authUserId: user.id || null,
    accountId: user.accountId || null,
    username: user.username || '',
    role: user.role || 'student',
    name: user.name || user.displayName || '',
    displayName: user.displayName || user.name || '',
    email: user.email || '',
    studentId: user.studentId || null,
    nis: user.nis || '',
    courseId: user.courseId || null,
    enrollmentId: user.enrollmentId || null,
    program: user.program || '',
    courseTitle: user.courseTitle || '',
    permissions: normalizePermissions(user.permissions),
    status: user.status || 'active',
    authProvider: 'better-auth',
    sessionId: session?.id || null,
  };
}

export async function loadAppSession(req) {
  if (req.appSession) {
    return req.appSession;
  }

  const authState = await loadRequestAuth(req).catch(() => null);

  if (authState?.user && authState?.session) {
    const persistedIdentity = canUseDatabaseAuthPersistence()
      ? await findPersistedIdentityByAuthUserId(authState.user.id).catch(() => null)
      : null;

    req.appSession = {
      token: null,
      user: persistedIdentity?.user || normalizeBetterAuthUser(authState.user, authState.session),
      provider: 'better-auth',
      session: authState.session,
    };
    req.actor = req.appSession.user;
    return req.appSession;
  }

  const token = getAuthorizationToken(req);
  const session = authService.requireSession(token);

  req.appSession = {
    ...session,
    provider: 'app-token',
  };
  req.actor = session.user;

  return req.appSession;
}

export function requireAppSession() {
  return asyncHandler(async (req, res, next) => {
    await loadAppSession(req);
    next();
  });
}

export function requireAppRole(requiredRoles) {
  const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
  const normalizedRoles = roles.map((role) => String(role).toLowerCase());

  return asyncHandler(async (req, res, next) => {
    const session = await loadAppSession(req);
    const role = String(session.user?.role || '').toLowerCase();

    if (!normalizedRoles.includes(role)) {
      throw new HttpError(403, 'You do not have access to this resource.', {
        code: 'FORBIDDEN',
        details: {
          requiredRoles: normalizedRoles,
          actualRole: role,
        },
      });
    }

    next();
  });
}
