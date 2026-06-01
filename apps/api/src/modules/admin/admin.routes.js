import { Router } from 'express';
import { createAdminService } from './admin.service.js';
import { asyncHandler, ok } from '../../utils/http.js';
import { requireAppRole } from '../../auth/session.js';

const router = Router();
const adminService = createAdminService();

router.use(requireAppRole('admin'));

router.get('/dashboard', asyncHandler(async (req, res) => {
  ok(res, await adminService.getDashboard());
}));

router.get('/learning-ops', asyncHandler(async (req, res) => {
  ok(res, adminService.getLearningOps());
}));

router.get('/students', asyncHandler(async (req, res) => {
  ok(res, await adminService.listStudents(req.query || {}));
}));

router.get('/courses/:courseId/schedules', asyncHandler(async (req, res) => {
  ok(res, adminService.listCourseSchedules(req.params.courseId));
}));

router.post('/courses/:courseId/schedules', asyncHandler(async (req, res) => {
  ok(res, adminService.createCourseSchedule(req.params.courseId, req.body || {}));
}));

router.patch('/courses/:courseId/schedules/:scheduleId', asyncHandler(async (req, res) => {
  ok(res, adminService.updateCourseSchedule(req.params.courseId, req.params.scheduleId, req.body || {}));
}));

router.delete('/courses/:courseId/schedules/:scheduleId', asyncHandler(async (req, res) => {
  ok(res, adminService.removeCourseSchedule(req.params.courseId, req.params.scheduleId));
}));

router.get('/schedules/:scheduleId/attendance', asyncHandler(async (req, res) => {
  ok(res, adminService.listScheduleAttendance(req.params.scheduleId));
}));

router.put('/schedules/:scheduleId/attendance', asyncHandler(async (req, res) => {
  ok(res, adminService.updateScheduleAttendance(req.params.scheduleId, req.body || {}));
}));

router.get('/students/:studentId', asyncHandler(async (req, res) => {
  ok(res, await adminService.getStudent(req.params.studentId));
}));

router.patch('/students/:studentId', asyncHandler(async (req, res) => {
  ok(res, await adminService.updateStudent(req.params.studentId, req.body || {}));
}));

router.patch('/students/:studentId/payment', asyncHandler(async (req, res) => {
  ok(res, await adminService.updatePaymentStatus(req.params.studentId, req.body || {}));
}));

export default router;