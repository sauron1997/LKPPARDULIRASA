import { Router } from 'express';
import { createAssessmentsService } from './assessments.service.js';
import { asyncHandler, created, noContent, ok } from '../../utils/http.js';
import { requireAppRole } from '../../auth/session.js';
import { multipartFormDataParser, parseRequestPayload } from '../../utils/multipart.js';

const router = Router();
const assessmentsService = createAssessmentsService();

function parseAssessmentSubmissionPayload(req) {
  return parseRequestPayload(req, {
    finalize(payload, files) {
      const uploadedFile = files[0] || null;
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
    },
  });
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
  multipartFormDataParser,
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
