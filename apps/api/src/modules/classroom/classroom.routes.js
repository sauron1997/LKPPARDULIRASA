import { Router } from 'express';
import { requireAppRole } from '../../auth/session.js';
import { asyncHandler, created, noContent, ok } from '../../utils/http.js';
import { createClassroomService } from './classroom.service.js';

const router = Router();
const classroomService = createClassroomService();

router.use(requireAppRole('admin'));

router.get('/posts', asyncHandler(async (req, res) => {
  ok(res, await classroomService.listPosts(req.query || {}));
}));

router.post('/posts', asyncHandler(async (req, res) => {
  created(res, await classroomService.createPost(req.body || {}));
}));

router.patch('/posts/:postId', asyncHandler(async (req, res) => {
  ok(res, await classroomService.updatePost(req.params.postId, req.body || {}));
}));

router.delete('/posts/:postId', asyncHandler(async (req, res) => {
  await classroomService.deletePost(req.params.postId);
  noContent(res);
}));

router.get('/classwork-items', asyncHandler(async (req, res) => {
  ok(res, await classroomService.listClassworkItems(req.query || {}));
}));

router.post('/classwork-items', asyncHandler(async (req, res) => {
  created(res, await classroomService.createClassworkItem(req.body || {}));
}));

export default router;