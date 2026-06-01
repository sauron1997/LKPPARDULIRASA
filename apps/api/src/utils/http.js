export class HttpError extends Error {
  constructor(status, message, options = {}) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.code = options.code || 'HTTP_ERROR';
    this.details = options.details;
    this.cause = options.cause;
  }
}

function withMeta(payload, meta) {
  return meta ? { ...payload, meta } : payload;
}

export function successEnvelope(data = null, meta) {
  return withMeta({ success: true, data }, meta);
}

export function errorEnvelope(message, options = {}) {
  const error = {
    code: options.code || 'INTERNAL_SERVER_ERROR',
    message,
  };

  if (options.details !== undefined) {
    error.details = options.details;
  }

  return withMeta({ success: false, error }, options.meta);
}

export function sendSuccess(res, status, data = null, meta) {
  return res.status(status).json(successEnvelope(data, meta));
}

export function sendError(res, status, message, options = {}) {
  return res.status(status).json(errorEnvelope(message, options));
}

export function ok(res, data = null, meta) {
  return sendSuccess(res, 200, data, meta);
}

export function created(res, data = null, meta) {
  return sendSuccess(res, 201, data, meta);
}

export function noContent(res) {
  return res.status(204).end();
}

export function asyncHandler(handler) {
  return function wrappedHandler(req, res, next) {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}
