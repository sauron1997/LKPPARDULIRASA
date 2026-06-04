import { Router } from 'express';
import { existsSync } from 'node:fs';
import { createPaymentsService } from './payments.service.js';
import { asyncHandler, created, ok } from '../../utils/http.js';
import { loadAppSession, requireAppRole } from '../../auth/session.js';

const router = Router();
const adminRouter = Router();
const paymentsService = createPaymentsService();

async function loadOptionalActor(req) {
  const session = await loadAppSession(req).catch(() => null);
  return session?.user || null;
}

// Create a payment transaction (used internally by registration)
router.post('/', asyncHandler(async (req, res) => {
  const { enrollmentId, studentId, amount, itemDetails, customerDetails } = req.body || {};
  const result = await paymentsService.createPaymentTransaction({
    enrollmentId,
    studentId,
    amount,
    itemDetails,
    customerDetails,
  });
  created(res, result);
}));

// Midtrans webhook endpoint
router.post('/webhook/midtrans', asyncHandler(async (req, res) => {
  const result = await paymentsService.handleMidtransNotification(req.body || {});
  ok(res, result);
}));

// Stream proof for an authorized public/student/admin viewer
router.get('/:paymentId/proof/file', asyncHandler(async (req, res) => {
  const asset = await paymentsService.getManualPaymentProofAsset(req.params.paymentId, {
    actor: await loadOptionalActor(req),
    accessToken: req.query?.token || '',
  });
  if (!asset) {
    return res.status(404).json({ success: false, error: { code: 'MANUAL_PROOF_NOT_FOUND', message: 'Bukti pembayaran tidak ditemukan.' } });
  }

  if (asset.absolutePath && existsSync(asset.absolutePath)) {
    res.set('Cache-Control', 'private, no-store');
    if (asset.mimeType) {
      res.type(asset.mimeType);
    }
    return res.sendFile(asset.absolutePath);
  }

  return res.status(404).json({ success: false, error: { code: 'MANUAL_PROOF_NOT_FOUND', message: 'Bukti pembayaran tidak ditemukan.' } });
}));

// Get payment by ID
router.get('/:paymentId', requireAppRole(['admin', 'student']), asyncHandler(async (req, res) => {
  const payment = await paymentsService.getAccessiblePayment(req.params.paymentId, {
    actor: req.actor,
  });
  if (!payment) {
    return res.status(404).json({ success: false, error: { code: 'PAYMENT_NOT_FOUND', message: 'Pembayaran tidak ditemukan.' } });
  }
  ok(res, payment);
}));

// Submit proof for manual transfer review
router.post('/:paymentId/proof', asyncHandler(async (req, res) => {
  const payment = await paymentsService.submitManualPaymentProof(req.params.paymentId, {
    ...(req.body || {}),
    actor: await loadOptionalActor(req),
  });
  if (!payment) {
    return res.status(404).json({ success: false, error: { code: 'PAYMENT_NOT_FOUND', message: 'Pembayaran tidak ditemukan.' } });
  }
  ok(res, payment);
}));

// Check/refresh payment status
router.post('/:paymentId/status', asyncHandler(async (req, res) => {
  await paymentsService.getAccessiblePayment(req.params.paymentId, {
    actor: await loadOptionalActor(req),
    accessToken: req.body?.accessToken || req.query?.token || '',
  });
  const result = await paymentsService.checkPaymentStatus(req.params.paymentId);
  if (!result) {
    return res.status(404).json({ success: false, error: { code: 'PAYMENT_NOT_FOUND', message: 'Pembayaran tidak ditemukan.' } });
  }
  ok(res, result);
}));

// Get payment by enrollment
router.get('/enrollment/:enrollmentId', asyncHandler(async (req, res) => {
  const payment = await paymentsService.getAccessiblePaymentByEnrollment(req.params.enrollmentId, {
    actor: await loadOptionalActor(req),
    accessToken: req.query?.token || '',
  });
  if (!payment) {
    return res.status(404).json({ success: false, error: { code: 'PAYMENT_NOT_FOUND', message: 'Pembayaran tidak ditemukan.' } });
  }
  ok(res, payment);
}));

// Get payments by student
router.get('/student/:studentId', requireAppRole(['admin', 'student']), asyncHandler(async (req, res) => {
  if (String(req.actor?.role || '').toLowerCase() === 'student' && String(req.actor?.studentId || '') !== String(req.params.studentId)) {
    return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Anda tidak memiliki akses ke data pembayaran ini.' } });
  }
  const payments = await paymentsService.getPaymentsByStudent(req.params.studentId);
  ok(res, payments);
}));

adminRouter.use(requireAppRole('admin'));

adminRouter.get('/manual', asyncHandler(async (req, res) => {
  ok(res, await paymentsService.listManualPayments(req.query || {}));
}));

adminRouter.get('/:paymentId/proof', asyncHandler(async (req, res) => {
  const asset = await paymentsService.getManualPaymentProofAsset(req.params.paymentId, {
    actor: req.actor,
  });
  if (!asset) {
    return res.status(404).json({ success: false, error: { code: 'PAYMENT_NOT_FOUND', message: 'Pembayaran tidak ditemukan.' } });
  }

  if (asset.absolutePath && existsSync(asset.absolutePath)) {
    res.set('Cache-Control', 'private, no-store');
    if (asset.mimeType) {
      res.type(asset.mimeType);
    }
    return res.sendFile(asset.absolutePath);
  }

  return res.status(404).json({ success: false, error: { code: 'MANUAL_PROOF_NOT_FOUND', message: 'Bukti pembayaran tidak ditemukan.' } });
}));

adminRouter.patch('/:paymentId/verify', asyncHandler(async (req, res) => {
  const payment = await paymentsService.verifyManualPayment(req.params.paymentId, req.body || {});
  if (!payment) {
    return res.status(404).json({ success: false, error: { code: 'PAYMENT_NOT_FOUND', message: 'Pembayaran tidak ditemukan.' } });
  }
  ok(res, payment);
}));

adminRouter.patch('/:paymentId/reject', asyncHandler(async (req, res) => {
  const payment = await paymentsService.rejectManualPayment(req.params.paymentId, req.body || {});
  if (!payment) {
    return res.status(404).json({ success: false, error: { code: 'PAYMENT_NOT_FOUND', message: 'Pembayaran tidak ditemukan.' } });
  }
  ok(res, payment);
}));

export { adminRouter };
export default router;
