import { Router } from 'express';
import { splitSetCookieHeader } from 'better-auth/cookies';
import { fromNodeHeaders } from 'better-auth/node';
import { createAuthService } from './auth.service.js';
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
  const { account, user } = authService.authenticate(req.body || {});

  try {
    await auth.api.signUpEmail({
      body: {
        name: user.name,
        email: user.email,
        password: req.body?.password,
        username: user.role === 'student' && user.nis ? user.nis : user.username || user.email,
        role: user.role,
        studentId: user.studentId != null ? String(user.studentId) : undefined,
        nis: user.nis || undefined,
        accountId: user.accountId || account.id,
        courseId: user.courseId != null ? String(user.courseId) : undefined,
        enrollmentId: user.enrollmentId || undefined,
      },
      headers: fromNodeHeaders(req.headers),
    });
  } catch (error) {
    if (![400, 409, 422].includes(error?.statusCode)) {
      throw new HttpError(error?.statusCode || 500, error?.message || 'Provisioning auth gagal diproses.', {
        code: error?.code || 'AUTH_PROVISION_FAILED',
      });
    }
  }

  const response = await auth.api.signInEmail({
    body: {
      email: account.email,
      password: req.body?.password,
    },
    headers: fromNodeHeaders(req.headers),
    asResponse: true,
  });

  applyResponseHeaders(res, response.headers);
  const result = authService.login(req.body || {});
  ok(res, result);
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
