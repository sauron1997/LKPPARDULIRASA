import { Router } from 'express';
import { createMediaService } from './media.service.js';
import { asyncHandler, created, noContent, ok } from '../../utils/http.js';
import { requireAppRole } from '../../auth/session.js';

const router = Router();
const mediaService = createMediaService();

router.use(requireAppRole('admin'));

router.get('/library', asyncHandler(async (req, res) => {
  ok(res, mediaService.listLibrary(req.query || {}));
}));

router.post('/library', asyncHandler(async (req, res) => {
  created(res, mediaService.createLibraryItem(req.body || {}));
}));

router.patch('/library/:mediaId', asyncHandler(async (req, res) => {
  ok(res, mediaService.updateLibraryItem(req.params.mediaId, req.body || {}));
}));

router.delete('/library/:mediaId', asyncHandler(async (req, res) => {
  mediaService.deleteLibraryItem(req.params.mediaId);
  noContent(res);
}));

router.get('/gallery', asyncHandler(async (req, res) => {
  ok(res, mediaService.listGalleryItems());
}));

router.post('/gallery', asyncHandler(async (req, res) => {
  created(res, mediaService.createGalleryItem(req.body || {}));
}));

router.get('/gallery/:itemId', asyncHandler(async (req, res) => {
  ok(res, mediaService.getGalleryItem(req.params.itemId));
}));

router.patch('/gallery/:itemId', asyncHandler(async (req, res) => {
  ok(res, mediaService.updateGalleryItem(req.params.itemId, req.body || {}));
}));

router.delete('/gallery/:itemId', asyncHandler(async (req, res) => {
  mediaService.deleteGalleryItem(req.params.itemId);
  noContent(res);
}));

export default router;
