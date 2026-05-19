import { Router } from 'express';
import { createExportsService } from './exports.service.js';
import { asyncHandler } from '../../utils/http.js';
import { requireAppRole } from '../../auth/session.js';

const router = Router();
const exportsService = createExportsService();

function sendExport(res, payload) {
  res.setHeader('Content-Type', payload.contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${payload.fileName}"`);
  res.status(200).send(payload.content);
}

router.use(requireAppRole('admin'));

router.get('/students', asyncHandler(async (req, res) => {
  sendExport(res, exportsService.exportStudents(req.query || {}));
}));

router.get('/messages', asyncHandler(async (req, res) => {
  sendExport(res, exportsService.exportMessages(req.query || {}));
}));

router.get('/certificates', asyncHandler(async (req, res) => {
  sendExport(res, exportsService.exportCertificates(req.query || {}));
}));

export default router;
