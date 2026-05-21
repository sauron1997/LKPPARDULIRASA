import express from 'express';

export const multipartFormDataParser = express.raw({ type: 'multipart/form-data', limit: '10mb' });

export function createMultipartError(message, code = 'INVALID_MULTIPART_PAYLOAD') {
  const error = new Error(message);
  error.status = 400;
  error.code = code;
  return error;
}

export function formatFileSizeLabel(size = 0) {
  if (size >= 1024 * 1024) {
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }

  if (size >= 1024) {
    return `${Math.max(1, Math.round(size / 1024))} KB`;
  }

  return `${Math.max(1, size)} B`;
}

function toDataUrl(mimeType = '', contentBuffer = Buffer.from([])) {
  const normalizedMimeType = mimeType || 'application/octet-stream';
  return `data:${normalizedMimeType};base64,${contentBuffer.toString('base64')}`;
}

function parseContentDisposition(value = '') {
  const nameMatch = value.match(/name="([^"]+)"/i);
  const fileNameMatch = value.match(/filename="([^"]*)"/i);

  return {
    name: nameMatch?.[1] || '',
    fileName: fileNameMatch?.[1] || '',
  };
}

export function parseMultipartFieldValue(value = '') {
  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }

  if (
    (trimmed.startsWith('{') && trimmed.endsWith('}'))
    || (trimmed.startsWith('[') && trimmed.endsWith(']'))
  ) {
    try {
      return JSON.parse(trimmed);
    } catch {
      return value;
    }
  }

  return value;
}

export function isMultipartRequest(req) {
  return String(req.headers['content-type'] || '').toLowerCase().includes('multipart/form-data');
}

export function parseMultipartPayload(req, options = {}) {
  const contentType = String(req.headers['content-type'] || '');
  const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
  if (!boundaryMatch) {
    throw createMultipartError('Boundary multipart tidak ditemukan.');
  }

  const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from([]);
  const boundary = `--${boundaryMatch[1] || boundaryMatch[2] || ''}`;
  const segments = rawBody.toString('latin1').split(boundary).slice(1, -1);
  const payload = {};
  const files = [];

  segments.forEach((segment) => {
    const normalizedSegment = segment
      .replace(/^\r\n/, '')
      .replace(/\r\n$/, '');

    if (!normalizedSegment || normalizedSegment === '--') {
      return;
    }

    const separatorIndex = normalizedSegment.indexOf('\r\n\r\n');
    if (separatorIndex < 0) {
      return;
    }

    const headerLines = normalizedSegment
      .slice(0, separatorIndex)
      .split('\r\n')
      .filter(Boolean);
    const headers = headerLines.reduce((result, line) => {
      const splitIndex = line.indexOf(':');
      if (splitIndex > 0) {
        result.set(
          line.slice(0, splitIndex).trim().toLowerCase(),
          line.slice(splitIndex + 1).trim(),
        );
      }
      return result;
    }, new Map());
    const contentBuffer = Buffer.from(
      normalizedSegment.slice(separatorIndex + 4).replace(/\r\n$/, ''),
      'latin1',
    );
    const disposition = parseContentDisposition(headers.get('content-disposition'));

    if (!disposition.name) {
      return;
    }

    if (disposition.fileName) {
      files.push({
        fieldName: disposition.name,
        fileName: disposition.fileName,
        mimeType: headers.get('content-type') || '',
        sizeBytes: contentBuffer.length,
        fileSizeLabel: formatFileSizeLabel(contentBuffer.length),
        fileUrl: toDataUrl(headers.get('content-type') || '', contentBuffer),
      });
      return;
    }

    payload[disposition.name] = parseMultipartFieldValue(contentBuffer.toString('utf8'));
  });

  if (typeof options.finalize === 'function') {
    return options.finalize(payload, files, req);
  }

  return files.length ? { ...payload, files } : payload;
}

export function parseRequestPayload(req, options = {}) {
  if (!isMultipartRequest(req)) {
    return req.body || {};
  }

  return parseMultipartPayload(req, options);
}
