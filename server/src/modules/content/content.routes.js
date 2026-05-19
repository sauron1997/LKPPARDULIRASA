import { Router } from 'express';
import { createContentService } from './content.service.js';
import { asyncHandler, created, noContent, ok } from '../../utils/http.js';
import { requireAppRole } from '../../auth/session.js';

const router = Router();
const contentService = createContentService();

router.use(requireAppRole('admin'));

router.get('/profile', asyncHandler(async (req, res) => {
  ok(res, contentService.getProfile());
}));

router.patch('/profile', asyncHandler(async (req, res) => {
  ok(res, contentService.updateProfile(req.body || {}));
}));

router.get('/blog-posts', asyncHandler(async (req, res) => {
  ok(res, contentService.listBlogPosts(req.query || {}));
}));

router.post('/blog-posts', asyncHandler(async (req, res) => {
  created(res, contentService.createBlogPost(req.body || {}));
}));

router.get('/blog-posts/:postId', asyncHandler(async (req, res) => {
  ok(res, contentService.getBlogPost(req.params.postId));
}));

router.patch('/blog-posts/:postId', asyncHandler(async (req, res) => {
  ok(res, contentService.updateBlogPost(req.params.postId, req.body || {}));
}));

router.delete('/blog-posts/:postId', asyncHandler(async (req, res) => {
  contentService.deleteBlogPost(req.params.postId);
  noContent(res);
}));

router.get('/accreditations', asyncHandler(async (req, res) => {
  ok(res, contentService.listAccreditations());
}));

router.post('/accreditations', asyncHandler(async (req, res) => {
  created(res, contentService.createAccreditation(req.body || {}));
}));

router.get('/accreditations/:itemId', asyncHandler(async (req, res) => {
  ok(res, contentService.getAccreditation(req.params.itemId));
}));

router.patch('/accreditations/:itemId', asyncHandler(async (req, res) => {
  ok(res, contentService.updateAccreditation(req.params.itemId, req.body || {}));
}));

router.delete('/accreditations/:itemId', asyncHandler(async (req, res) => {
  contentService.deleteAccreditation(req.params.itemId);
  noContent(res);
}));

export default router;
