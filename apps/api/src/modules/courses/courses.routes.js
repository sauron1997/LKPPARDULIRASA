import { Router } from 'express';
import { createCoursesService } from './courses.service.js';
import { asyncHandler, created, noContent, ok } from '../../utils/http.js';
import { requireAppRole } from '../../auth/session.js';

const router = Router();
const coursesService = createCoursesService();

router.use(requireAppRole('admin'));

router.get('/', asyncHandler(async (req, res) => {
  ok(res, await coursesService.listCourses(req.query || {}));
}));

router.post('/', asyncHandler(async (req, res) => {
  created(res, await coursesService.createCourse(req.body || {}));
}));

router.get('/:courseId', asyncHandler(async (req, res) => {
  ok(res, await coursesService.getCourse(req.params.courseId));
}));

router.patch('/:courseId', asyncHandler(async (req, res) => {
  ok(res, await coursesService.updateCourse(req.params.courseId, req.body || {}));
}));

router.delete('/:courseId', asyncHandler(async (req, res) => {
  await coursesService.deleteCourse(req.params.courseId);
  noContent(res);
}));

router.get('/:courseId/modules', asyncHandler(async (req, res) => {
  ok(res, await coursesService.listModules(req.params.courseId));
}));

router.post('/:courseId/modules', asyncHandler(async (req, res) => {
  created(res, await coursesService.createModule(req.params.courseId, req.body || {}));
}));

router.patch('/:courseId/modules/:moduleId', asyncHandler(async (req, res) => {
  ok(res, await coursesService.updateModule(req.params.courseId, req.params.moduleId, req.body || {}));
}));

router.delete('/:courseId/modules/:moduleId', asyncHandler(async (req, res) => {
  await coursesService.deleteModule(req.params.courseId, req.params.moduleId);
  noContent(res);
}));

export default router;