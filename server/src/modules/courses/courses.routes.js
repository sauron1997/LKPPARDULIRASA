import { Router } from 'express';
import { createCoursesService } from './courses.service.js';
import { asyncHandler, created, noContent, ok } from '../../utils/http.js';
import { requireAppRole } from '../../auth/session.js';

const router = Router();
const coursesService = createCoursesService();

router.use(requireAppRole('admin'));

router.get('/', asyncHandler(async (req, res) => {
  ok(res, coursesService.listCourses(req.query || {}));
}));

router.post('/', asyncHandler(async (req, res) => {
  created(res, coursesService.createCourse(req.body || {}));
}));

router.get('/:courseId', asyncHandler(async (req, res) => {
  ok(res, coursesService.getCourse(req.params.courseId));
}));

router.patch('/:courseId', asyncHandler(async (req, res) => {
  ok(res, coursesService.updateCourse(req.params.courseId, req.body || {}));
}));

router.delete('/:courseId', asyncHandler(async (req, res) => {
  coursesService.deleteCourse(req.params.courseId);
  noContent(res);
}));

router.get('/:courseId/modules', asyncHandler(async (req, res) => {
  ok(res, coursesService.listModules(req.params.courseId));
}));

router.post('/:courseId/modules', asyncHandler(async (req, res) => {
  created(res, coursesService.createModule(req.params.courseId, req.body || {}));
}));

router.patch('/:courseId/modules/:moduleId', asyncHandler(async (req, res) => {
  ok(res, coursesService.updateModule(req.params.courseId, req.params.moduleId, req.body || {}));
}));

router.delete('/:courseId/modules/:moduleId', asyncHandler(async (req, res) => {
  coursesService.deleteModule(req.params.courseId, req.params.moduleId);
  noContent(res);
}));

export default router;
