import { HttpError } from '../utils/http.js';

async function parseWithSchema(schema, value, req) {
  if (typeof schema === 'function') {
    return schema(value, req);
  }

  if (typeof schema?.parseAsync === 'function') {
    return schema.parseAsync(value);
  }

  if (typeof schema?.safeParseAsync === 'function') {
    const result = await schema.safeParseAsync(value);

    if (!result.success) {
      throw result.error;
    }

    return result.data;
  }

  if (typeof schema?.parse === 'function') {
    return schema.parse(value);
  }

  if (typeof schema?.safeParse === 'function') {
    const result = schema.safeParse(value);

    if (!result.success) {
      throw result.error;
    }

    return result.data;
  }

  throw new TypeError('validate() expects a schema with parse/safeParse or a validator function.');
}

export function validate(schema, options = {}) {
  const source = options.source || 'body';
  const target = options.target || source;
  const replaceRequestValue = options.replaceRequestValue !== false;

  return async function validateRequest(req, res, next) {
    try {
      const parsed = await parseWithSchema(schema, req[source], req);

      req.validated = {
        ...(req.validated || {}),
        [target]: parsed,
      };

      if (replaceRequestValue && ['body', 'query', 'params'].includes(source)) {
        req[source] = parsed;
      }

      next();
    } catch (error) {
      next(new HttpError(422, 'Validation failed.', {
        code: 'VALIDATION_ERROR',
        details: error?.issues || error?.details || error?.message,
        cause: error,
      }));
    }
  };
}

