import { Router } from 'express';
import { createPublicService } from './public.service.js';
import { asyncHandler, created, ok } from '../../utils/http.js';

const router = Router();
const publicService = createPublicService();

router.get('/landing', asyncHandler(async (req, res) => {
  ok(res, publicService.getLandingSnapshot());
}));

router.get('/site', asyncHandler(async (req, res) => {
  ok(res, publicService.getLandingSnapshot());
}));

router.get('/profile', asyncHandler(async (req, res) => {
  ok(res, publicService.getProfile());
}));

router.get('/courses', asyncHandler(async (req, res) => {
  ok(res, publicService.listCourses(req.query || {}));
}));

router.get('/courses/:courseId', asyncHandler(async (req, res) => {
  ok(res, publicService.getCourse(req.params.courseId));
}));

router.get('/blog', asyncHandler(async (req, res) => {
  ok(res, publicService.listBlogPosts(req.query || {}));
}));

router.get('/blog/:slugOrId', asyncHandler(async (req, res) => {
  ok(res, publicService.getBlogPost(req.params.slugOrId));
}));

router.get('/gallery', asyncHandler(async (req, res) => {
  ok(res, publicService.listGalleryItems(req.query || {}));
}));

router.get('/accreditations', asyncHandler(async (req, res) => {
  ok(res, publicService.listAccreditations());
}));

router.get('/students', asyncHandler(async (req, res) => {
  ok(res, publicService.listPublicStudents(req.query || {}));
}));

router.post('/contact-messages', asyncHandler(async (req, res) => {
  created(res, publicService.submitContactMessage(req.body || {}));
}));

export default router;
