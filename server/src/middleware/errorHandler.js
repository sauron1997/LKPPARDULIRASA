import { env } from '../config/env.js';
import { HttpError, sendError } from '../utils/http.js';

function getDefaultMessage(status) {
  if (status >= 500) {
    return 'Internal server error.';
  }

  if (status === 404) {
    return 'Resource not found.';
  }

  if (status === 401) {
    return 'Authentication required.';
  }

  if (status === 403) {
    return 'Access denied.';
  }

  return 'Request failed.';
}

function normalizeStatus(status) {
  return Number.isInteger(status) && status >= 400 && status < 600 ? status : 500;
}

export function notFoundHandler(req, res, next) {
  next(new HttpError(404, `Route ${req.method} ${req.originalUrl} was not found.`, {
    code: 'NOT_FOUND',
  }));
}

export function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    next(error);
    return;
  }

  const status = normalizeStatus(error?.status || error?.statusCode);
  const message = error?.message || getDefaultMessage(status);
  const code = error?.code || (status >= 500 ? 'INTERNAL_SERVER_ERROR' : 'REQUEST_ERROR');
  const details = error?.details ?? (!env.isProduction && error?.cause ? String(error.cause) : undefined);

  sendError(res, status, message, {
    code,
    details: env.isProduction ? undefined : details,
  });
}

