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

function resolvePublicHost(value, fallback = '127.0.0.1') {
  const host = String(value || '').trim();

  if (!host || host === '0.0.0.0' || host === '::') {
    return fallback;
  }

  return host;
}

const nodeEnv = process.env.NODE_ENV || 'development';
const apiBasePath = normalizeBasePath(process.env.API_BASE_PATH, '/api');
const host = process.env.HOST || '127.0.0.1';
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
  betterAuthSecret: process.env.BETTER_AUTH_SECRET || process.env.AUTH_SECRET || 'better-auth-secret-12345678901234567890',
  betterAuthUrl: process.env.BETTER_AUTH_URL || `http://${publicHost}:${port}${authBasePath}`,
});
