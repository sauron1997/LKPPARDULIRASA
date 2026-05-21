import { Router } from 'express';
import { createMessagesService } from './messages.service.js';
import { asyncHandler, created, ok } from '../../utils/http.js';
import { requireAppRole } from '../../auth/session.js';
import { createMultipartError, multipartFormDataParser, parseRequestPayload } from '../../utils/multipart.js';

const router = Router();
const messagesService = createMessagesService();

function parseAdminReplyPayload(req) {
  return parseRequestPayload(req, {
    finalize(payload, files) {
      if (files.length > 1) {
        throw createMultipartError('Hanya satu lampiran yang didukung untuk balasan admin.', 'MULTIPLE_ATTACHMENTS_NOT_SUPPORTED');
      }

      return files.length
        ? { ...payload, uploadedFile: files[0] }
        : payload;
    },
  });
}

router.get('/admin/messages/:channel', requireAppRole('admin'), asyncHandler(async (req, res) => {
  ok(res, messagesService.listThreads(req.params.channel, req.query || {}));
}));

router.get('/admin/messages/:channel/:threadId', requireAppRole('admin'), asyncHandler(async (req, res) => {
  ok(res, messagesService.getThread(req.params.channel, req.params.threadId));
}));

router.post('/admin/messages/:channel/:threadId/replies', requireAppRole('admin'), multipartFormDataParser, asyncHandler(async (req, res) => {
  created(res, messagesService.replyToThread(req.params.channel, req.params.threadId, {
    ...parseAdminReplyPayload(req),
    authorRole: 'admin',
    authorName: 'Admin LKP',
  }));
}));

router.patch('/admin/messages/:channel/:threadId/status', requireAppRole('admin'), asyncHandler(async (req, res) => {
  ok(res, messagesService.updateThreadStatus(req.params.channel, req.params.threadId, req.body || {}));
}));

export default router;
