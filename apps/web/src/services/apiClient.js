function getApiBaseUrl() {
  return (import.meta.env.VITE_API_BASE_URL || '').trim();
}

function buildUrl(path) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const baseUrl = getApiBaseUrl();
  return baseUrl ? `${baseUrl}${normalizedPath}` : normalizedPath;
}

function shouldSerializeJsonBody(body) {
  if (body == null) {
    return false;
  }

  if (body instanceof FormData) {
    return false;
  }

  return typeof body === 'object';
}

export class ApiError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = options.status || 500;
    this.code = options.code || 'API_REQUEST_FAILED';
    this.details = options.details;
  }
}

export async function apiRequest(path, options = {}) {
  const {
    method = 'GET',
    body,
    headers = {},
    responseType = 'json',
  } = options;

  const requestHeaders = new Headers(headers);
  const requestBody = shouldSerializeJsonBody(body) ? JSON.stringify(body) : body;

  if (shouldSerializeJsonBody(body) && !requestHeaders.has('Content-Type')) {
    requestHeaders.set('Content-Type', 'application/json');
  }

  const response = await fetch(buildUrl(path), {
    method,
    credentials: 'include',
    headers: requestHeaders,
    body: body === undefined ? undefined : requestBody,
  });

  if (response.status === 204) {
    return null;
  }

  if (responseType === 'blob') {
    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      throw new ApiError(
        payload?.error?.message || `Request failed with status ${response.status}`,
        {
          status: response.status,
          code: payload?.error?.code,
          details: payload?.error?.details,
        },
      );
    }

    return response.blob();
  }

  if (responseType === 'text') {
    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      throw new ApiError(
        payload?.error?.message || `Request failed with status ${response.status}`,
        {
          status: response.status,
          code: payload?.error?.code,
          details: payload?.error?.details,
        },
      );
    }

    return response.text();
  }

  const payload = await response.json().catch(() => null);

  if (!response.ok || !payload?.success) {
    throw new ApiError(
      payload?.error?.message || `Request failed with status ${response.status}`,
      {
        status: response.status,
        code: payload?.error?.code,
        details: payload?.error?.details,
      },
    );
  }

  return payload.data;
}
