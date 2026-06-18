import { Router } from 'express';
import { splitSetCookieHeader } from 'better-auth/cookies';
import { fromNodeHeaders } from 'better-auth/node';
import { createAuthService } from './auth.service.js';
import {
  canUseDatabaseAuthPersistence,
  ensurePersistedIdentityLink,
  findPersistedIdentityByIdentifier,
} from './auth.persistence.js';
import { asyncHandler, HttpError, ok } from '../../utils/http.js';
import { auth } from '../../auth/index.js';
import { loadAppSession, requireAppSession } from '../../auth/session.js';

const authService = createAuthService();

function getSessionToken(req) {
  return req.headers.authorization || req.headers['x-session-token'] || '';
}

function applyResponseHeaders(res, headers) {
  if (!headers) {
    return;
  }

  headers.forEach((value, key) => {
    if (key.toLowerCase() === 'set-cookie') {
      res.append('set-cookie', splitSetCookieHeader(value));
      return;
    }

    res.setHeader(key, value);
  });
}

async function handleLogin(req, res) {
  const payload = req.body || {};
  const useDatabasePersistence = canUseDatabaseAuthPersistence();

  // Try database persistence first if configured
  if (useDatabasePersistence) {
    try {
      const persistedIdentity = await findPersistedIdentityByIdentifier(payload.identifier);
      if (persistedIdentity) {
        // User exists in database - verify password with Better-Auth
        const signInEmail = persistedIdentity.authUser?.email || persistedIdentity.account?.email;
        if (!signInEmail) {
          throw new HttpError(401, 'Email/NIS/username atau password salah.', {
            code: 'INVALID_CREDENTIALS',
          });
        }

        try {
          const response = await auth.api.signInEmail({
            body: {
              email: signInEmail,
              password: payload?.password,
            },
            headers: fromNodeHeaders(req.headers),
            asResponse: true,
          });
          applyResponseHeaders(res, response.headers);
          const healedIdentity = await ensurePersistedIdentityLink({
            authUserId: persistedIdentity.authUser?.id || null,
            identifier: payload.identifier,
          }).catch(() => persistedIdentity);
          ok(res, { token: null, user: healedIdentity?.user || persistedIdentity.user });
          return;
        } catch (error) {
          // Better-Auth signInEmail failed - password mismatch
          throw new HttpError(401, 'Email/NIS/username atau password salah.', {
            code: 'INVALID_CREDENTIALS',
            details: error?.message || null,
          });
        }
      }
    } catch (error) {
      // Re-throw HttpError
      if (error instanceof HttpError) throw error;
      // For other DB errors, fall through to in-memory mode
      console.warn('Database auth failed, falling back to in-memory:', error?.message);
    }
  }

  // In-memory mode: authenticate against seed data
  try {
    const authResult = authService.authenticate(payload);
    const { account, user, token } = authResult;
    const signInEmail = account?.email || user?.email;

    // If database persistence is available, sync the user to Better-Auth
    if (useDatabasePersistence && signInEmail) {
      try {
        // Try to sign up in Better-Auth (ignore if user already exists)
        await auth.api.signUpEmail({
          body: {
            name: user.name,
            email: signInEmail,
            password: payload?.password,
            username: user.role === 'student' && user.nis ? user.nis : user.username || signInEmail,
            role: user.role,
            studentId: user.studentId != null ? String(user.studentId) : undefined,
            nis: user.nis || undefined,
            accountId: user.accountId || account.id,
            courseId: user.courseId != null ? String(user.courseId) : undefined,
            enrollmentId: user.enrollmentId || undefined,
          },
          headers: fromNodeHeaders(req.headers),
        }).catch((err) => {
          // Ignore 400, 409, 422 errors (user exists or validation issues)
          if (![400, 409, 422].includes(err?.statusCode)) {
            console.warn('Auth provisioning warning:', err?.message);
          }
        });
      } catch (provisionError) {
        // Non-critical - user is already authenticated via in-memory
        console.warn('Auth provisioning skipped:', provisionError?.message);
      }
    }

    // Return in-memory session token (already created by authenticate())
    ok(res, { token, user });
    return;
  } catch (error) {
    throw new HttpError(401, 'Email/NIS/username atau password salah.', {
      code: 'INVALID_CREDENTIALS',
      details: error?.message || null,
    });
  }
}

async function handleSession(req, res) {
  ok(res, await loadAppSession(req));
}

async function handleMe(req, res) {
  const session = await loadAppSession(req);
  ok(res, session.user);
}

async function handleLogout(req, res) {
  const token = getSessionToken(req);
  const session = await loadAppSession(req);
  let result = { success: true };

  if (token) {
    result = authService.logout(token);
  }

  if (session.provider === 'better-auth') {
    const response = await auth.api.signOut({
      headers: fromNodeHeaders(req.headers),
      asResponse: true,
    });

    applyResponseHeaders(res, response.headers);
  }

  ok(res, result);
}

export function createAuthRouter() {
  const router = Router();

  router.post('/login', asyncHandler(handleLogin));
  router.get('/session', requireAppSession(), asyncHandler(handleSession));
  router.get('/me', requireAppSession(), asyncHandler(handleMe));
  router.post('/logout', requireAppSession(), asyncHandler(handleLogout));

  return router;
}

export function createAuthSessionRouter() {
  const router = Router();

  router.get('/session', requireAppSession(), asyncHandler(handleSession));
  router.get('/me', requireAppSession(), asyncHandler(handleMe));
  router.post('/logout', requireAppSession(), asyncHandler(handleLogout));

  return router;
}

const router = createAuthRouter();
export const authSessionRouter = createAuthSessionRouter();

export default router;