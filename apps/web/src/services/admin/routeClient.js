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

async function readErrorPayload(response) {
  return response.json().catch(() => null);
}

function createRouteError(response, payload) {
  const error = new Error(
    payload?.error?.message || `Request failed with status ${response.status}`,
  );

  error.name = 'ApiError';
  error.status = response.status;
  error.code = payload?.error?.code || 'API_REQUEST_FAILED';
  error.details = payload?.error?.details;

  return error;
}

export function buildQueryString(params = {}) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return;
    }

    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (item === undefined || item === null || item === '') {
          return;
        }

        searchParams.append(key, String(item));
      });
      return;
    }

    searchParams.set(key, String(value));
  });

  const query = searchParams.toString();
  return query ? `?${query}` : '';
}

export function normalizeQueryKeyFilters(filters = {}) {
  return Object.entries(filters)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
    .map(([key, value]) => [
      key,
      Array.isArray(value)
        ? value
          .filter((item) => item !== undefined && item !== null && item !== '')
          .map((item) => String(item))
        : value,
    ]);
}

function buildPath(basePath, pathOrSegments) {
  if (pathOrSegments == null) {
    return basePath;
  }

  if (Array.isArray(pathOrSegments)) {
    const normalizedSegments = pathOrSegments
      .filter((segment) => segment !== undefined && segment !== null && segment !== '')
      .map((segment) => encodeURIComponent(String(segment)));

    return normalizedSegments.length
      ? `${basePath}/${normalizedSegments.join('/')}`
      : basePath;
  }

  if (!pathOrSegments) {
    return basePath;
  }

  return pathOrSegments.startsWith('/')
    ? `${basePath}${pathOrSegments}`
    : `${basePath}/${pathOrSegments}`;
}

async function requestRoute(path, options = {}) {
  const {
    method = 'GET',
    body,
    headers = {},
    params,
    responseType = 'json',
  } = options;

  const requestHeaders = new Headers(headers);
  const requestBody = shouldSerializeJsonBody(body) ? JSON.stringify(body) : body;

  if (shouldSerializeJsonBody(body) && !requestHeaders.has('Content-Type')) {
    requestHeaders.set('Content-Type', 'application/json');
  }

  const response = await fetch(buildUrl(`${path}${buildQueryString(params)}`), {
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
      throw createRouteError(response, await readErrorPayload(response));
    }

    return response.blob();
  }

  if (responseType === 'blob-with-meta') {
    if (!response.ok) {
      throw createRouteError(response, await readErrorPayload(response));
    }

    const disposition = response.headers.get('Content-Disposition') || '';
    const fileNameMatch = disposition.match(/filename="([^"]+)"/i);

    return {
      blob: await response.blob(),
      fileName: fileNameMatch?.[1] || null,
      contentType: response.headers.get('Content-Type') || null,
    };
  }

  if (responseType === 'text') {
    if (!response.ok) {
      throw createRouteError(response, await readErrorPayload(response));
    }

    return response.text();
  }

  const payload = await response.json().catch(() => null);

  if (!response.ok || !payload?.success) {
    throw createRouteError(response, payload);
  }

  return payload.data;
}

export function createRouteFamilyClient(basePath) {
  return {
    basePath,
    buildPath(pathOrSegments) {
      return buildPath(basePath, pathOrSegments);
    },
    list(params = {}) {
      return requestRoute(basePath, { params });
    },
    get(resourceId, params = {}) {
      return requestRoute(buildPath(basePath, [resourceId]), { params });
    },
    create(payload) {
      return requestRoute(basePath, {
        method: 'POST',
        body: payload,
      });
    },
    update(resourceId, payload, options = {}) {
      return requestRoute(buildPath(basePath, [resourceId]), {
        method: options.method || 'PATCH',
        body: payload,
      });
    },
    remove(resourceId) {
      return requestRoute(buildPath(basePath, [resourceId]), {
        method: 'DELETE',
      });
    },
    request(pathOrSegments, options = {}) {
      return requestRoute(buildPath(basePath, pathOrSegments), options);
    },
  };
}
