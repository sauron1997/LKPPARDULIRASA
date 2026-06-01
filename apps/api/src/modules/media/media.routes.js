import { Router } from 'express';
import { existsSync } from 'node:fs';
import { createMediaService } from './media.service.js';
import { asyncHandler, created, noContent, ok } from '../../utils/http.js';
import { requireAppRole } from '../../auth/session.js';

const router = Router();
const mediaService = createMediaService();

router.get('/assets/:mediaId', asyncHandler(async (req, res) => {
  const asset = await mediaService.getPublicAsset(req.params.mediaId);

  if (asset.absolutePath && existsSync(asset.absolutePath)) {
    if (asset.mimeType) {
      res.type(asset.mimeType);
    }
    return res.sendFile(asset.absolutePath);
  }

  if (asset.publicUrl) {
    return res.redirect(asset.publicUrl);
  }

  return res.status(404).end();
}));

router.use(requireAppRole('admin'));

router.get('/library', asyncHandler(async (req, res) => {
  ok(res, await mediaService.listLibrary(req.query || {}));
}));

router.post('/library', asyncHandler(async (req, res) => {
  created(res, await mediaService.createLibraryItem(req.body || {}));
}));

router.patch('/library/:mediaId', asyncHandler(async (req, res) => {
  ok(res, await mediaService.updateLibraryItem(req.params.mediaId, req.body || {}));
}));

router.delete('/library/:mediaId', asyncHandler(async (req, res) => {
  await mediaService.deleteLibraryItem(req.params.mediaId);
  noContent(res);
}));

router.get('/gallery', asyncHandler(async (req, res) => {
  ok(res, await mediaService.listGalleryItems());
}));

router.post('/gallery', asyncHandler(async (req, res) => {
  created(res, await mediaService.createGalleryItem(req.body || {}));
}));

router.get('/gallery/:itemId', asyncHandler(async (req, res) => {
  ok(res, await mediaService.getGalleryItem(req.params.itemId));
}));

router.patch('/gallery/:itemId', asyncHandler(async (req, res) => {
  ok(res, await mediaService.updateGalleryItem(req.params.itemId, req.body || {}));
}));

router.delete('/gallery/:itemId', asyncHandler(async (req, res) => {
  await mediaService.deleteGalleryItem(req.params.itemId);
  noContent(res);
}));

export default router;