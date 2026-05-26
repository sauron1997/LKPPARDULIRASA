import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { env } from '../config/env.js';
import * as schema from './schema/index.js';

export const isDatabaseConfigured = Boolean(env.databaseUrl);

function resolveSslConfig() {
  if (env.databaseSslMode === 'require') {
    return { rejectUnauthorized: true };
  }

  if (env.databaseSslMode === 'no-verify') {
    return { rejectUnauthorized: false };
  }

  return false;
}

export const pool = isDatabaseConfigured
  ? new Pool({
    connectionString: env.databaseUrl,
    ssl: resolveSslConfig(),
  })
  : null;

export const db = pool ? drizzle({ client: pool, schema }) : null;

export function requireDb() {
  if (!db) {
    throw new Error('DATABASE_URL is not configured.');
  }

  return db;
}
