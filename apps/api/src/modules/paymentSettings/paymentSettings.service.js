import { eq } from 'drizzle-orm';
import { persistDataUrlMediaAsset } from '../media/media.storage.js';
import { requireDb } from '../../db/client.js';
import {
  mediaAssets,
  paymentSettings as paymentSettingsTable,
} from '../../db/schema/index.js';

const SINGLETON_ID = 'payment-settings-001';

export function createPaymentSettingsService() {

  async function persistQrisImage(dataUrl) {
    if (!dataUrl) return null;

    const mediaId = `qris-payment-${Date.now()}`;
    const result = await persistDataUrlMediaAsset({
      dataUrl,
      fileName: `qris-${mediaId}`,
      mediaId,
      ownerType: 'payment',
      ownerId: SINGLETON_ID,
    });

    if (!result) return null;

    const database = requireDb();
    if (database) {
      await database.insert(mediaAssets).values({
        id: mediaId,
        visibility: 'public',
        storageKey: result.storageKey,
        publicUrl: result.publicUrl,
        originalName: result.originalName,
        mimeType: result.mimeType,
        ownerType: 'payment',
        ownerId: SINGLETON_ID,
        metadata: result.metadata || {},
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    return result.publicUrl;
  }

  async function getPaymentSettings() {
    const database = requireDb();
    if (!database) {
      return null;
    }

    const [settings] = await database
      .select()
      .from(paymentSettingsTable)
      .where(eq(paymentSettingsTable.id, SINGLETON_ID))
      .limit(1);

    return settings || null;
  }

  async function updatePaymentSettings(payload = {}) {
    const {
      isActive,
      bankName,
      accountNumber,
      accountHolderName,
      paymentNotes,
      qrisDataUrl,
    } = payload;

    const database = requireDb();
    if (!database) {
      throw new Error('Database tidak tersedia.');
    }

    let qrisImageUrl = undefined;
    if (qrisDataUrl) {
      qrisImageUrl = await persistQrisImage(qrisDataUrl);
    }

    const now = new Date();
    const updateFields = {
      updatedAt: now,
    };

    if (typeof isActive === 'boolean') updateFields.isActive = isActive;
    if (bankName !== undefined) updateFields.bankName = bankName;
    if (accountNumber !== undefined) updateFields.accountNumber = accountNumber;
    if (accountHolderName !== undefined) updateFields.accountHolderName = accountHolderName;
    if (paymentNotes !== undefined) updateFields.paymentNotes = paymentNotes;
    if (qrisImageUrl !== undefined) updateFields.qrisImageUrl = qrisImageUrl;

    const existing = await getPaymentSettings();

    if (existing) {
      await database
        .update(paymentSettingsTable)
        .set(updateFields)
        .where(eq(paymentSettingsTable.id, SINGLETON_ID));
    } else {
      await database.insert(paymentSettingsTable).values({
        id: SINGLETON_ID,
        isActive: typeof isActive === 'boolean' ? isActive : false,
        qrisImageUrl: qrisImageUrl || null,
        bankName: bankName || null,
        accountNumber: accountNumber || null,
        accountHolderName: accountHolderName || null,
        paymentNotes: paymentNotes || null,
        createdAt: now,
        updatedAt: now,
      });
    }

    return getPaymentSettings();
  }

  return {
    getPaymentSettings,
    updatePaymentSettings,
  };
}

export default createPaymentSettingsService;