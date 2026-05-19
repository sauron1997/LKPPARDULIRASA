import { randomBytes, randomUUID } from 'node:crypto';

function normalizePrefix(prefix) {
  return String(prefix || 'id')
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'id';
}

export function createId(prefix = 'id') {
  return `${normalizePrefix(prefix)}_${randomUUID().replace(/-/g, '')}`;
}

export function createShortId(prefix = 'id', size = 12) {
  const suffix = randomBytes(Math.max(size, 6)).toString('base64url').slice(0, size);
  return `${normalizePrefix(prefix)}_${suffix}`;
}

