import { createHash } from 'node:crypto';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { env } from '../../config/env.js';

const fallbackUploadsDir = fileURLToPath(new URL('../../../uploads', import.meta.url));

function getUploadsRoot() {
  return resolve(env.uploadsDir || fallbackUploadsDir);
}

function extensionFromMimeType(mimeType = '') {
  const normalizedMimeType = String(mimeType || '').trim().toLowerCase();
  if (normalizedMimeType === 'application/pdf') return '.pdf';
  if (normalizedMimeType === 'application/zip') return '.zip';
  if (normalizedMimeType === 'image/png') return '.png';
  if (normalizedMimeType === 'image/jpeg') return '.jpg';
  if (normalizedMimeType === 'image/webp') return '.webp';
  if (normalizedMimeType === 'text/plain') return '.txt';
  return '';
}

function buildStorageKey(ownerType, ownerId, mediaId, extension) {
  return `${String(ownerType || 'media').replace(/[^a-z0-9_-]+/gi, '-')}/${String(ownerId || 'item').replace(/[^a-z0-9_-]+/gi, '-')}/${String(mediaId || 'asset').replace(/[^a-z0-9_-]+/gi, '-')}${extension}`;
}

function parseDataUrl(dataUrl = '') {
  const match = String(dataUrl || '').match(/^data:([^;,]+)?(?:;charset=[^;,]+)?;base64,(.+)$/i);
  if (!match) {
    return null;
  }

  return {
    mimeType: match[1] || 'application/octet-stream',
    buffer: Buffer.from(match[2], 'base64'),
  };
}

export function isDataUrl(value = '') {
  return String(value || '').startsWith('data:');
}

export async function persistDataUrlMediaAsset(options = {}) {
  const parsed = parseDataUrl(options.dataUrl);
  if (!parsed) {
    return null;
  }

  const fileName = String(options.fileName || '').trim();
  const extension = extname(fileName) || extensionFromMimeType(options.mimeType || parsed.mimeType);
  const mediaId = String(options.mediaId || `${Date.now()}`);
  const storageKey = buildStorageKey(options.ownerType, options.ownerId, mediaId, extension);
  const absolutePath = resolve(join(getUploadsRoot(), storageKey));

  await mkdir(dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, parsed.buffer);

  return {
    storageKey,
    publicUrl: `/api/v1/media/assets/${encodeURIComponent(mediaId)}`,
    originalName: fileName || `${mediaId}${extension}`,
    mimeType: options.mimeType || parsed.mimeType,
    metadata: {
      byteSize: parsed.buffer.length,
      checksum: createHash('sha256').update(parsed.buffer).digest('hex'),
      persistedFrom: 'data_url',
      ...(options.metadata || {}),
    },
  };
}

export function resolveStoredMediaPath(storageKey = '') {
  return resolve(join(getUploadsRoot(), String(storageKey || '')));
}

export async function removeStoredMediaFile(storageKey = '') {
  if (!storageKey) {
    return;
  }

  try {
    await rm(resolveStoredMediaPath(storageKey), { force: true });
  } catch {
    // Ignore missing files during cleanup.
  }
}