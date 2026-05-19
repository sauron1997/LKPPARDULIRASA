import { Router } from 'express';
import { createMessagesService } from './messages.service.js';
import { asyncHandler, created, ok } from '../../utils/http.js';
import { requireAppRole } from '../../auth/session.js';

const router = Router();
const messagesService = createMessagesService();

router.get('/admin/messages/:channel', requireAppRole('admin'), asyncHandler(async (req, res) => {
  ok(res, messagesService.listThreads(req.params.channel, req.query || {}));
}));

router.get('/admin/messages/:channel/:threadId', requireAppRole('admin'), asyncHandler(async (req, res) => {
  ok(res, messagesService.getThread(req.params.channel, req.params.threadId));
}));

router.post('/admin/messages/:channel/:threadId/replies', requireAppRole('admin'), asyncHandler(async (req, res) => {
  created(res, messagesService.replyToThread(req.params.channel, req.params.threadId, {
    ...req.body,
    authorRole: 'admin',
    authorName: 'Admin LKP',
  }));
}));

router.patch('/admin/messages/:channel/:threadId/status', requireAppRole('admin'), asyncHandler(async (req, res) => {
  ok(res, messagesService.updateThreadStatus(req.params.channel, req.params.threadId, req.body || {}));
}));

export default router;
