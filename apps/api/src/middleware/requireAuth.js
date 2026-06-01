import { fromNodeHeaders } from 'better-auth/node';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { env } from '../config/env.js';
import { HttpError } from '../utils/http.js';

let authModulePromise;

function resolveAuthExport(authModule) {
  return authModule?.auth || authModule?.default || null;
}

async function loadAuthModule() {
  if (!authModulePromise) {
    const authModuleUrl = new URL(env.authModulePath, env.serverRootUrl);
    const authModuleFile = fileURLToPath(authModuleUrl);

    if (!existsSync(authModuleFile)) {
      throw new HttpError(503, 'Better Auth is not configured yet.', {
        code: 'AUTH_NOT_CONFIGURED',
        details: `Expected ${env.authModulePath} to export auth or default.`,
      });
    }

    authModulePromise = import(authModuleUrl.href).catch((error) => {
      authModulePromise = null;
      throw error;
    });
  }

  return authModulePromise;
}

async function resolveAuthInstance(explicitAuth) {
  if (explicitAuth) {
    return explicitAuth;
  }

  const authModule = await loadAuthModule();
  const auth = resolveAuthExport(authModule);

  if (!auth?.api?.getSession) {
    throw new HttpError(503, 'Better Auth module is missing an auth export.', {
      code: 'AUTH_EXPORT_MISSING',
    });
  }

  return auth;
}

export async function loadRequestAuth(req, options = {}) {
  if (req.auth?.raw) {
    return req.auth;
  }

  const auth = await resolveAuthInstance(options.auth);
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });

  req.auth = {
    raw: session,
    session: session?.session || null,
    user: session?.user || null,
  };

  return req.auth;
}

export function requireAuth(options = {}) {
  return async function requireAuthenticatedUser(req, res, next) {
    try {
      const authState = await loadRequestAuth(req, options);

      if (!authState.user || !authState.session) {
        throw new HttpError(401, 'Authentication required.', {
          code: 'UNAUTHORIZED',
        });
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}