import { Router } from 'express';
import { createContentService } from './content.service.js';
import { asyncHandler, created, noContent, ok } from '../../utils/http.js';
import { requireAppRole } from '../../auth/session.js';

const router = Router();
const contentService = createContentService();

router.use(requireAppRole('admin'));

router.get('/profile', asyncHandler(async (req, res) => {
  ok(res, await contentService.getProfile());
}));

router.patch('/profile', asyncHandler(async (req, res) => {
  ok(res, await contentService.updateProfile(req.body || {}));
}));

router.get('/blog-posts', asyncHandler(async (req, res) => {
  ok(res, await contentService.listBlogPosts(req.query || {}));
}));

router.post('/blog-posts', asyncHandler(async (req, res) => {
  created(res, await contentService.createBlogPost(req.body || {}));
}));

router.get('/blog-posts/:postId', asyncHandler(async (req, res) => {
  ok(res, await contentService.getBlogPost(req.params.postId));
}));

router.patch('/blog-posts/:postId', asyncHandler(async (req, res) => {
  ok(res, await contentService.updateBlogPost(req.params.postId, req.body || {}));
}));

router.delete('/blog-posts/:postId', asyncHandler(async (req, res) => {
  await contentService.deleteBlogPost(req.params.postId);
  noContent(res);
}));

router.get('/accreditations', asyncHandler(async (req, res) => {
  ok(res, await contentService.listAccreditations());
}));

router.post('/accreditations', asyncHandler(async (req, res) => {
  created(res, await contentService.createAccreditation(req.body || {}));
}));

router.get('/accreditations/:itemId', asyncHandler(async (req, res) => {
  ok(res, await contentService.getAccreditation(req.params.itemId));
}));

router.patch('/accreditations/:itemId', asyncHandler(async (req, res) => {
  ok(res, await contentService.updateAccreditation(req.params.itemId, req.body || {}));
}));

router.delete('/accreditations/:itemId', asyncHandler(async (req, res) => {
  await contentService.deleteAccreditation(req.params.itemId);
  noContent(res);
}));

export default router;