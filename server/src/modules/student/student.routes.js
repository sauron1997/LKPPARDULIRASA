import { Router } from 'express';
import { createStudentService } from './student.service.js';
import { asyncHandler, created, ok } from '../../utils/http.js';
import { requireAppRole } from '../../auth/session.js';

const router = Router();
const studentService = createStudentService();
const studentOnly = requireAppRole('student');

function getReference(req) {
  return req.actor || req.appSession?.user || {};
}

router.use(studentOnly);

router.get('/dashboard', asyncHandler(async (req, res) => {
  ok(res, studentService.getDashboard(getReference(req)));
}));

router.get('/profile', asyncHandler(async (req, res) => {
  ok(res, studentService.getProfile(getReference(req)));
}));

router.patch('/profile', asyncHandler(async (req, res) => {
  ok(res, studentService.updateProfile(getReference(req), req.body || {}));
}));

router.get('/modules', asyncHandler(async (req, res) => {
  ok(res, studentService.listModules(getReference(req)));
}));

router.get('/schedules', asyncHandler(async (req, res) => {
  ok(res, studentService.listSchedules(getReference(req), req.query || {}));
}));

router.get('/schedule', asyncHandler(async (req, res) => {
  ok(res, studentService.listSchedules(getReference(req), req.query || {}));
}));

router.get('/attendance', asyncHandler(async (req, res) => {
  ok(res, studentService.listAttendance(getReference(req), req.query || {}));
}));

router.post('/schedules/:scheduleId/check-in', asyncHandler(async (req, res) => {
  created(res, studentService.checkInSchedule(getReference(req), req.params.scheduleId, req.body || {}));
}));

router.post('/schedule/:scheduleId/check-in', asyncHandler(async (req, res) => {
  created(res, studentService.checkInSchedule(getReference(req), req.params.scheduleId, req.body || {}));
}));

router.post('/attendance/check-in', asyncHandler(async (req, res) => {
  created(res, studentService.checkInSchedule(getReference(req), req.body?.sessionId, req.body || {}));
}));

router.get('/messages', asyncHandler(async (req, res) => {
  ok(res, studentService.listMessages(getReference(req)));
}));

router.post('/messages', asyncHandler(async (req, res) => {
  created(res, studentService.createMessageThread(getReference(req), req.body || {}));
}));

router.post('/messages/:threadId/replies', asyncHandler(async (req, res) => {
  created(res, studentService.replyToThread(getReference(req), req.params.threadId, req.body || {}));
}));

router.get('/certificate', asyncHandler(async (req, res) => {
  ok(res, studentService.getCertificate(getReference(req)));
}));

export default router;
