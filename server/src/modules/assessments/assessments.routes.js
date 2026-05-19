import express, { Router } from 'express';
import { createAssessmentsService } from './assessments.service.js';
import { asyncHandler, created, noContent, ok } from '../../utils/http.js';
import { requireAppRole } from '../../auth/session.js';

const router = Router();
const assessmentsService = createAssessmentsService();
const multipartParser = express.raw({ type: 'multipart/form-data', limit: '10mb' });

function createMultipartError(message, code = 'INVALID_MULTIPART_PAYLOAD') {
  const error = new Error(message);
  error.status = 400;
  error.code = code;
  return error;
}

function formatFileSizeLabel(size = 0) {
  if (size >= 1024 * 1024) {
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }

  if (size >= 1024) {
    return `${Math.max(1, Math.round(size / 1024))} KB`;
  }

  return `${Math.max(1, size)} B`;
}

function parseContentDisposition(value = '') {
  const nameMatch = value.match(/name="([^"]+)"/i);
  const fileNameMatch = value.match(/filename="([^"]*)"/i);

  return {
    name: nameMatch?.[1] || '',
    fileName: fileNameMatch?.[1] || '',
  };
}

function parseMultipartFieldValue(value = '') {
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

function parseAssessmentSubmissionPayload(req) {
  const contentType = String(req.headers['content-type'] || '');
  if (!contentType.toLowerCase().includes('multipart/form-data')) {
    return req.body || {};
  }

  const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
  if (!boundaryMatch) {
    throw createMultipartError('Boundary multipart tidak ditemukan.');
  }

  const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from([]);
  const boundary = `--${boundaryMatch[1] || boundaryMatch[2] || ''}`;
  const segments = rawBody.toString('latin1').split(boundary).slice(1, -1);
  const payload = {};
  let uploadedFile = null;

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
      uploadedFile = {
        fieldName: disposition.name,
        fileName: disposition.fileName,
        mimeType: headers.get('content-type') || '',
        fileSizeLabel: formatFileSizeLabel(contentBuffer.length),
      };
      return;
    }

    payload[disposition.name] = parseMultipartFieldValue(contentBuffer.toString('utf8'));
  });

  if (!uploadedFile) {
    return payload;
  }

  const fallbackAssetId = `${Date.now()}-${encodeURIComponent(uploadedFile.fileName)}`;

  return {
    ...payload,
    uploadedFile: {
      ...uploadedFile,
      assetUrl: payload.assetUrl || payload.fileUrl || `/api/v1/student/assessments/submissions/assets/${fallbackAssetId}`,
    },
    fileName: payload.fileName || uploadedFile.fileName,
    fileUrl: payload.fileUrl || payload.assetUrl || `/api/v1/student/assessments/submissions/assets/${fallbackAssetId}`,
    mimeType: payload.mimeType || uploadedFile.mimeType,
    fileSizeLabel: payload.fileSizeLabel || uploadedFile.fileSizeLabel,
  };
}

router.get('/student/assessments/progress', requireAppRole('student'), asyncHandler(async (req, res) => {
  ok(res, assessmentsService.listProgress({ studentId: req.actor.studentId, enrollmentId: req.actor.enrollmentId }));
}));

router.get('/student/assessments/submissions', requireAppRole('student'), asyncHandler(async (req, res) => {
  ok(res, assessmentsService.listSubmissions({ studentId: req.actor.studentId, enrollmentId: req.actor.enrollmentId }));
}));

router.post(
  '/student/assessments/submissions',
  requireAppRole('student'),
  multipartParser,
  asyncHandler(async (req, res) => {
    created(res, assessmentsService.submitAssessment(req.actor, parseAssessmentSubmissionPayload(req)));
  }),
);

router.get('/admin/assessments/definitions', requireAppRole('admin'), asyncHandler(async (req, res) => {
  ok(res, assessmentsService.listDefinitions(req.query || {}));
}));

router.post('/admin/assessments/definitions', requireAppRole('admin'), asyncHandler(async (req, res) => {
  created(res, assessmentsService.createDefinition(req.body || {}));
}));

router.patch('/admin/assessments/definitions/:definitionId', requireAppRole('admin'), asyncHandler(async (req, res) => {
  ok(res, assessmentsService.updateDefinition(req.params.definitionId, req.body || {}));
}));

router.get('/admin/assessments/progress', requireAppRole('admin'), asyncHandler(async (req, res) => {
  ok(res, assessmentsService.listProgress(req.query || {}));
}));

router.get('/admin/assessments/submissions', requireAppRole('admin'), asyncHandler(async (req, res) => {
  ok(res, assessmentsService.listSubmissions(req.query || {}));
}));

router.post('/admin/assessments/submissions/:submissionId/review', requireAppRole('admin'), asyncHandler(async (req, res) => {
  created(res, assessmentsService.reviewSubmission(req.params.submissionId, req.body || {}));
}));

router.get('/admin/certificates', requireAppRole('admin'), asyncHandler(async (req, res) => {
  ok(res, assessmentsService.listCertificates(req.query || {}));
}));

router.put('/admin/certificates/:studentId', requireAppRole('admin'), asyncHandler(async (req, res) => {
  ok(res, assessmentsService.upsertCertificate(req.params.studentId, req.body || {}));
}));

router.delete('/admin/certificates/:certificateId', requireAppRole('admin'), asyncHandler(async (req, res) => {
  assessmentsService.deleteCertificate(req.params.certificateId);
  noContent(res);
}));

export default router;
