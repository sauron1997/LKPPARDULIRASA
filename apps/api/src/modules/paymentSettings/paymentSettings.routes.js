import { Router } from 'express';
import { createPaymentSettingsService } from './paymentSettings.service.js';
import { asyncHandler, ok } from '../../utils/http.js';
import { requireAppRole } from '../../auth/session.js';

const publicRouter = Router();
const adminRouter = Router();
const service = createPaymentSettingsService();

function toAdminPayload(settings) {
  if (!settings) {
    return {
      isActive: false,
      hasManualPayment: false,
      qrisImageUrl: null,
      bankName: null,
      accountNumber: null,
      accountHolderName: null,
      paymentNotes: null,
      createdAt: null,
      updatedAt: null,
    };
  }

  return {
    isActive: Boolean(settings.isActive),
    hasManualPayment: Boolean(settings.isActive),
    qrisImageUrl: settings.qrisImageUrl || null,
    bankName: settings.bankName || null,
    accountNumber: settings.accountNumber || null,
    accountHolderName: settings.accountHolderName || null,
    paymentNotes: settings.paymentNotes || null,
    createdAt: settings.createdAt || null,
    updatedAt: settings.updatedAt || null,
  };
}

// Public: anyone can GET active payment settings
publicRouter.get('/', asyncHandler(async (req, res) => {
  const settings = await service.getPaymentSettings();
  if (!settings || !settings.isActive) {
    return ok(res, { isActive: false, hasManualPayment: false });
  }

  ok(res, {
    isActive: true,
    hasManualPayment: true,
    qrisImageUrl: settings.qrisImageUrl || null,
    bankName: settings.bankName || null,
    accountNumber: settings.accountNumber || null,
    accountHolderName: settings.accountHolderName || null,
    paymentNotes: settings.paymentNotes || null,
  });
}));

adminRouter.get('/', requireAppRole('admin'), asyncHandler(async (req, res) => {
  const settings = await service.getPaymentSettings();
  ok(res, toAdminPayload(settings));
}));

adminRouter.put('/', requireAppRole('admin'), asyncHandler(async (req, res) => {
  const result = await service.updatePaymentSettings(req.body || {});
  ok(res, toAdminPayload(result));
}));

export { adminRouter };
export default publicRouter;
