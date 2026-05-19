import { Router } from 'express';
import { createAdminService } from './admin.service.js';
import { asyncHandler, ok } from '../../utils/http.js';
import { requireAppRole } from '../../auth/session.js';

const router = Router();
const adminService = createAdminService();

router.use(requireAppRole('admin'));

router.get('/dashboard', asyncHandler(async (req, res) => {
  ok(res, adminService.getDashboard());
}));

router.get('/learning-ops', asyncHandler(async (req, res) => {
  ok(res, adminService.getLearningOps());
}));

router.get('/students', asyncHandler(async (req, res) => {
  ok(res, adminService.listStudents(req.query || {}));
}));

router.get('/students/:studentId', asyncHandler(async (req, res) => {
  ok(res, adminService.getStudent(req.params.studentId));
}));

router.patch('/students/:studentId', asyncHandler(async (req, res) => {
  ok(res, adminService.updateStudent(req.params.studentId, req.body || {}));
}));

router.patch('/students/:studentId/payment', asyncHandler(async (req, res) => {
  ok(res, adminService.updatePaymentStatus(req.params.studentId, req.body || {}));
}));

export default router;
