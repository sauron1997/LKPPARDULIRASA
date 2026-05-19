import { HttpError } from '../utils/http.js';
import { loadRequestAuth } from './requireAuth.js';

function toRoleList(roleInput) {
  return Array.isArray(roleInput) ? roleInput : [roleInput];
}

function getUserRoles(user) {
  if (!user) {
    return [];
  }

  if (Array.isArray(user.roles)) {
    return user.roles.filter(Boolean).map((role) => String(role).toLowerCase());
  }

  if (user.role) {
    return [String(user.role).toLowerCase()];
  }

  return [];
}

export function requireRole(requiredRoles, options = {}) {
  const allowedRoles = toRoleList(requiredRoles)
    .filter(Boolean)
    .map((role) => String(role).toLowerCase());

  return async function requireAuthorizedRole(req, res, next) {
    try {
      const authState = await loadRequestAuth(req, options);
      const userRoles = getUserRoles(authState.user);
      const isAllowed = allowedRoles.some((role) => userRoles.includes(role));

      if (!authState.user || !authState.session) {
        throw new HttpError(401, 'Authentication required.', {
          code: 'UNAUTHORIZED',
        });
      }

      if (!isAllowed) {
        throw new HttpError(403, 'You do not have access to this resource.', {
          code: 'FORBIDDEN',
          details: {
            requiredRoles: allowedRoles,
            actualRoles: userRoles,
          },
        });
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

