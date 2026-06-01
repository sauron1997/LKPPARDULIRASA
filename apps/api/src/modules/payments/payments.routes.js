import { Router } from 'express';
import { createPaymentsService } from './payments.service.js';
import { asyncHandler, created, ok } from '../../utils/http.js';

const router = Router();
const paymentsService = createPaymentsService();

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

// Get payment by ID
router.get('/:paymentId', asyncHandler(async (req, res) => {
  const payment = await paymentsService.getPayment(req.params.paymentId);
  if (!payment) {
    return res.status(404).json({ success: false, error: { code: 'PAYMENT_NOT_FOUND', message: 'Pembayaran tidak ditemukan.' } });
  }
  ok(res, payment);
}));

// Midtrans webhook endpoint
router.post('/webhook/midtrans', asyncHandler(async (req, res) => {
  const result = await paymentsService.handleMidtransNotification(req.body || {});
  ok(res, result);
}));

// Check/refresh payment status
router.post('/:paymentId/status', asyncHandler(async (req, res) => {
  const result = await paymentsService.checkPaymentStatus(req.params.paymentId);
  if (!result) {
    return res.status(404).json({ success: false, error: { code: 'PAYMENT_NOT_FOUND', message: 'Pembayaran tidak ditemukan.' } });
  }
  ok(res, result);
}));

// Get payment by enrollment
router.get('/enrollment/:enrollmentId', asyncHandler(async (req, res) => {
  const payment = await paymentsService.getPaymentsByEnrollment(req.params.enrollmentId);
  if (!payment) {
    return res.status(404).json({ success: false, error: { code: 'PAYMENT_NOT_FOUND', message: 'Pembayaran tidak ditemukan.' } });
  }
  ok(res, payment);
}));

// Get payments by student
router.get('/student/:studentId', asyncHandler(async (req, res) => {
  const payments = await paymentsService.getPaymentsByStudent(req.params.studentId);
  ok(res, payments);
}));

export default router;
