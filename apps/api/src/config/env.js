import 'dotenv/config';

function parsePort(value, fallback) {
  const parsed = Number.parseInt(value || '', 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function normalizeBasePath(value, fallback) {
  const candidate = String(value || fallback || '').trim();

  if (!candidate) {
    return fallback;
  }

  const withLeadingSlash = candidate.startsWith('/') ? candidate : `/${candidate}`;
  const normalized = withLeadingSlash.replace(/\/+$/g, '');

  return normalized || '/';
}

function parseOrigins(value, fallback) {
  const raw = String(value || fallback || '').trim();

  if (!raw) {
    return [];
  }

  return raw
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function resolvePublicHost(value, fallback = 'localhost') {
  const host = String(value || '').trim();

  if (!host || host === '0.0.0.0' || host === '::') {
    return fallback;
  }

  return host;
}

function normalizeDatabaseSslMode(value) {
  const normalized = String(value || '').trim().toLowerCase();

  if (['require', 'verify-full'].includes(normalized)) {
    return 'require';
  }

  if (['no-verify', 'allow-insecure', 'insecure'].includes(normalized)) {
    return 'no-verify';
  }

  return 'disable';
}

function isPlaceholderSecret(value) {
  const normalized = String(value || '').trim();
  return !normalized
    || normalized === 'change-me-before-production'
    || normalized === 'better-auth-secret-12345678901234567890'
    || normalized.includes('replace-with');
}

function isLocalUrl(value) {
  const normalized = String(value || '').trim().toLowerCase();
  return normalized.includes('localhost') || normalized.includes('127.0.0.1');
}

const nodeEnv = process.env.NODE_ENV || 'development';
const apiBasePath = normalizeBasePath(process.env.API_BASE_PATH, '/api');
const host = process.env.HOST || 'localhost';
const port = parsePort(process.env.PORT, 3001);
const authBasePath = normalizeBasePath(process.env.AUTH_BASE_PATH, `${apiBasePath}/auth`);
const publicHost = resolvePublicHost(host);

export const env = Object.freeze({
  appName: process.env.APP_NAME || 'LKP Parduli Rasa API',
  nodeEnv,
  isProduction: nodeEnv === 'production',
  serverRootUrl: new URL('../', import.meta.url),
  host,
  port,
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  corsOrigins: parseOrigins(process.env.CORS_ORIGINS, process.env.CLIENT_ORIGIN || 'http://localhost:5173'),
  apiBasePath,
  authBasePath,
  authModulePath: process.env.AUTH_MODULE_PATH || './auth/index.js',
  databaseUrl: process.env.DATABASE_URL || '',
  databaseSslMode: normalizeDatabaseSslMode(process.env.DATABASE_SSL_MODE),
  betterAuthSecret: process.env.BETTER_AUTH_SECRET || process.env.AUTH_SECRET || 'better-auth-secret-12345678901234567890',
  betterAuthUrl: process.env.BETTER_AUTH_URL || `http://${publicHost}:${port}${authBasePath}`,
  uploadsDir: String(process.env.UPLOADS_DIR || '').trim(),
});

if (env.isProduction) {
  const validationErrors = [];

  if (!env.databaseUrl) {
    validationErrors.push('DATABASE_URL is required in production.');
  }

  if (!env.clientOrigin || isLocalUrl(env.clientOrigin)) {
    validationErrors.push('CLIENT_ORIGIN must point to the production domain.');
  }

  if (!env.corsOrigins.length || env.corsOrigins.some((origin) => isLocalUrl(origin))) {
    validationErrors.push('CORS_ORIGINS must list the production origin.');
  }

  if (!env.betterAuthUrl || isLocalUrl(env.betterAuthUrl)) {
    validationErrors.push('BETTER_AUTH_URL must point to the production domain.');
  }

  if (isPlaceholderSecret(env.betterAuthSecret)) {
    validationErrors.push('BETTER_AUTH_SECRET must be replaced before production.');
  }

  if (!env.uploadsDir) {
    validationErrors.push('UPLOADS_DIR must be configured to a writable directory in production.');
  }

  if (validationErrors.length > 0) {
    throw new Error(`Invalid production environment:\n- ${validationErrors.join('\n- ')}`);
  }
}
