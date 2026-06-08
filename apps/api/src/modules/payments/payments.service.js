import { and, desc, eq } from 'drizzle-orm';
import { createHash } from 'node:crypto';
import { paymentConfig } from '../../config/payment.js';
import { requireDb } from '../../db/client.js';
import {
  courses as coursesTable,
  enrollments as enrollmentsTable,
  mediaAssets,
  payments as paymentsTable,
  students as studentsTable,
} from '../../db/schema/index.js';
import { createShortId } from '../../utils/ids.js';
import { createBackendContext } from '../../runtime/backend-context.js';
import { ensure } from '../../runtime/errors.js';
import { persistDataUrlMediaAsset, resolveStoredMediaPath } from '../media/media.storage.js';

const MANUAL_PROOF_MAX_BYTES = 2.5 * 1024 * 1024;
const MANUAL_PROOF_ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
]);
const MANUAL_PROOF_UPLOADABLE_STATUSES = new Set([
  'pending',
  'failed',
  'expired',
]);

function parseDataUrlPayload(dataUrl = '') {
  const match = String(dataUrl || '').match(/^data:([^;,]+)?(?:;charset=[^;,]+)?;base64,(.+)$/i);
  if (!match) {
    return null;
  }

  return {
    mimeType: String(match[1] || 'application/octet-stream').trim().toLowerCase(),
    buffer: Buffer.from(match[2], 'base64'),
  };
}

function validateManualProofUpload(dataUrl) {
  const parsed = parseDataUrlPayload(dataUrl);
  ensure(parsed, 'Format file bukti pembayaran tidak valid.', 400, 'MANUAL_PROOF_INVALID');
  ensure(
    MANUAL_PROOF_ALLOWED_MIME_TYPES.has(parsed.mimeType),
    'Tipe file bukti pembayaran harus JPG, PNG, WEBP, atau PDF.',
    400,
    'MANUAL_PROOF_MIME_NOT_ALLOWED',
  );
  ensure(
    parsed.buffer.length > 0 && parsed.buffer.length <= MANUAL_PROOF_MAX_BYTES,
    'Ukuran file bukti pembayaran maksimal 2.5 MB.',
    400,
    'MANUAL_PROOF_TOO_LARGE',
  );
}

function canUploadManualProof(payment) {
  if (!MANUAL_PROOF_UPLOADABLE_STATUSES.has(String(payment?.status || ''))) {
    return false;
  }

  if (payment?.status === 'pending' && payment?.paymentChannel === 'manual_transfer' && payment?.manualSubmittedAt) {
    return false;
  }

  return true;
}

function buildManualProofUrl(paymentId) {
  return `/api/v1/payments/${encodeURIComponent(paymentId)}/proof/file`;
}

function normalizeActorRole(actor = {}) {
  return String(actor?.role || '').toLowerCase();
}

function isPaymentOwner(payment, actor = {}) {
  return normalizeActorRole(actor) === 'student'
    && String(actor.studentId || '') === String(payment?.studentId || '');
}

function hasPaymentAccess(payment, actor = null, accessToken = '') {
  if (!payment) {
    return false;
  }

  if (normalizeActorRole(actor) === 'admin') {
    return true;
  }

  if (isPaymentOwner(payment, actor)) {
    return true;
  }

  return Boolean(accessToken) && String(payment.publicAccessToken || '') === String(accessToken);
}

function isManualPaymentInReview(payment) {
  return payment?.paymentChannel === 'manual_transfer'
    && payment?.status === 'pending'
    && Boolean(payment?.manualSubmittedAt)
    && Boolean(payment?.manualProofMediaId)
    && !payment?.manualReviewedAt;
}

function generatePaymentId(payments) {
  const currentYear = new Date().getFullYear();
  const latestNumber = payments.reduce((highest, payment) => {
    const match = String(payment.id || '').match(/(\d{3,})$/);
    return Math.max(highest, Number(match?.[1] || 0));
  }, 0);

  return `pay-${currentYear}-${String(latestNumber + 1).padStart(3, '0')}`;
}

function computeMidtransSignature(orderId, statusCode, grossAmount, serverKey) {
  const hash = createHash('sha512')
    .update(`${orderId}${statusCode}${grossAmount}${serverKey}`)
    .digest('hex');
  return hash;
}

async function persistManualProof(paymentId, dataUrl, fileName) {
  ensure(dataUrl, 'Bukti pembayaran wajib diunggah.', 400, 'MANUAL_PROOF_REQUIRED');
  validateManualProofUpload(dataUrl);

  const mediaId = `manual-proof-${paymentId}-${Date.now()}`;
  const result = await persistDataUrlMediaAsset({
    dataUrl,
    fileName: fileName || `bukti-transfer-${paymentId}`,
    mediaId,
    ownerType: 'manual-payment',
    ownerId: paymentId,
  });

  ensure(result, 'File bukti pembayaran tidak valid.', 400, 'MANUAL_PROOF_INVALID');

  const database = requireDb();
  await database.insert(mediaAssets).values({
    id: mediaId,
    visibility: 'private',
    storageKey: result.storageKey,
    publicUrl: result.publicUrl,
    originalName: result.originalName,
    mimeType: result.mimeType,
    ownerType: 'manual-payment',
    ownerId: paymentId,
    metadata: result.metadata || {},
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  return {
    mediaId,
    storageKey: result.storageKey,
    mimeType: result.mimeType,
  };
}

function buildManualPaymentItem(payment, lookup = {}) {
  const enrollment = lookup.enrollments?.get(String(payment.enrollmentId)) || null;
  const student = lookup.students?.get(String(payment.studentId)) || null;
  const course = enrollment ? lookup.courses?.get(String(enrollment.courseId)) || null : null;

  return {
    ...payment,
    studentName: student?.name || '-',
    studentEmail: student?.email || null,
    studentPhone: student?.phone || null,
    program: course?.title || enrollment?.programSnapshot || '-',
    enrollment: enrollment ? {
      id: enrollment.id,
      paymentStatus: enrollment.paymentStatus,
      paymentDate: enrollment.paymentDate,
      registrationDate: enrollment.registrationDate,
    } : null,
  };
}

function buildPublicPaymentDto(payment) {
  if (!payment) {
    return null;
  }

  return {
    id: payment.id,
    enrollmentId: payment.enrollmentId,
    amount: payment.amount,
    status: payment.status,
    paymentChannel: payment.paymentChannel,
    paymentMethod: payment.paymentMethod,
    redirectUrl: payment.redirectUrl,
    expiryAt: payment.expiryAt,
    paidAt: payment.paidAt,
    manualProofUrl: payment.manualProofUrl,
    manualSubmittedAt: payment.manualSubmittedAt,
    manualReviewNote: payment.manualReviewNote,
    manualReviewedAt: payment.manualReviewedAt,
  };
}

export function createPaymentsService(options = {}) {
  const context = createBackendContext(options);
  const { repositories } = context;

  async function createPaymentTransaction({ enrollmentId, studentId, amount, itemDetails, customerDetails }) {
    const database = requireDb();
    const persistedPayments = database ? await database.select().from(paymentsTable) : [];
    const memoryPayments = repositories.payments ? repositories.payments.raw() : [];
    const allPayments = [...persistedPayments, ...memoryPayments];
    const paymentId = generatePaymentId(allPayments);
    const publicAccessToken = createShortId('paytok', 24);

    const now = new Date();
    const expiryAt = new Date(now.getTime() + paymentConfig.paymentExpiryMinutes * 60 * 1000);

    let redirectUrl = '';
    let transactionId = null;
    let rawResponse = null;

    if (paymentConfig.isMockMode) {
      redirectUrl = `https://simulate.midtrans.com/pay/mock-${paymentId}`;
      transactionId = `mock-txn-${paymentId}`;
    } else {
      const authString = Buffer.from(`${paymentConfig.midtransServerKey}:`).toString('base64');
      const body = {
        transaction_details: {
          order_id: paymentId,
          gross_amount: amount,
        },
        credit_card: { secure: true },
        customer_details: customerDetails || {},
        item_details: itemDetails || [],
        callbacks: {
          finish: `${paymentConfig.webhookBaseUrl}/v1/payments/${paymentId}/status`,
        },
        expiry: {
          start_time: now.toISOString().replace(/\.\d{3}Z$/, '+07:00'),
          unit: 'minute',
          duration: paymentConfig.paymentExpiryMinutes,
        },
      };

      const snapResponse = await fetch(`${paymentConfig.snapBaseUrl}/transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${authString}`,
          Accept: 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!snapResponse.ok) {
        const errorText = await snapResponse.text().catch(() => 'Unknown error');
        throw new Error(`Midtrans API error (${snapResponse.status}): ${errorText}`);
      }

      const snapData = await snapResponse.json();
      redirectUrl = snapData.redirect_url || '';
      transactionId = snapData.transaction_id || snapData.order_id || null;
      rawResponse = JSON.stringify(snapData);
    }

    const paymentRecord = {
      id: paymentId,
      enrollmentId,
      studentId,
      amount,
      publicAccessToken,
      transactionId,
      redirectUrl,
      status: 'pending',
      paymentChannel: 'midtrans',
      paymentMethod: null,
      manualProofMediaId: null,
      manualProofUrl: null,
      manualSubmittedAt: null,
      manualReferenceNote: null,
      manualReviewNote: null,
      manualReviewedAt: null,
      paidAt: null,
      expiryAt: expiryAt.toISOString(),
      rawResponse,
      createdAt: now,
      updatedAt: now,
    };

    if (database) {
      await database.insert(paymentsTable).values(paymentRecord);
    }

    if (repositories.payments) {
      repositories.payments.insert(paymentRecord);
    }

    return {
      paymentId,
      redirectUrl,
      token: transactionId,
      publicAccessToken,
      payment: paymentRecord,
    };
  }

  async function handleMidtransNotification(notificationPayload) {
    const { order_id: orderId, transaction_status: transactionStatus, status_code: statusCode, gross_amount: grossAmount, signature_key: signatureKey, payment_type: paymentType, transaction_id: transactionId, transaction_time: _transactionTime } = notificationPayload;

    if (!orderId) {
      throw new Error('Missing order_id in notification');
    }

    const database = requireDb();

    if (!paymentConfig.isMockMode) {
      if (!signatureKey) {
        throw new Error('Missing signature key from Midtrans notification');
      }
      const computedSignature = computeMidtransSignature(
        orderId,
        String(statusCode || ''),
        String(grossAmount || '0'),
        paymentConfig.midtransServerKey,
      );

      if (computedSignature !== signatureKey) {
        throw new Error('Invalid signature key');
      }
    }

    const [existingPayment] = await database
      .select()
      .from(paymentsTable)
      .where(eq(paymentsTable.id, orderId))
      .limit(1);

    if (!existingPayment) {
      throw new Error(`Payment not found: ${orderId}`);
    }

    if (existingPayment.paymentChannel === 'manual_transfer') {
      return { orderId, status: existingPayment.status };
    }

    let newStatus = existingPayment.status;
    if (transactionStatus === 'settlement' || transactionStatus === 'capture') {
      newStatus = 'paid';
    } else if (transactionStatus === 'expire') {
      newStatus = 'expired';
    } else if (['deny', 'cancel', 'failure'].includes(transactionStatus)) {
      newStatus = 'failed';
    }

    const now = new Date().toISOString();
    const updates = {
      status: newStatus,
      transactionId: transactionId || existingPayment.transactionId,
      paymentMethod: paymentType || existingPayment.paymentMethod,
      paidAt: newStatus === 'paid' ? now : existingPayment.paidAt,
      rawResponse: JSON.stringify(notificationPayload),
      updatedAt: now,
    };

    await database.transaction(async (tx) => {
      await tx
        .update(paymentsTable)
        .set(updates)
        .where(eq(paymentsTable.id, orderId));

      if (newStatus === 'paid') {
        await tx
          .update(enrollmentsTable)
          .set({
            paymentStatus: 'verified',
            paymentDate: now,
          })
          .where(eq(enrollmentsTable.id, existingPayment.enrollmentId));
      }
    });

    return { orderId, status: newStatus };
  }

  async function getPayment(paymentId) {
    const database = requireDb();
    const [payment] = await database
      .select()
      .from(paymentsTable)
      .where(eq(paymentsTable.id, paymentId))
      .limit(1);

    if (!payment) {
      return null;
    }

    return payment;
  }

  async function getPaymentsByStudent(studentId) {
    const database = requireDb();
    return database
      .select()
      .from(paymentsTable)
      .where(eq(paymentsTable.studentId, studentId))
      .orderBy(paymentsTable.createdAt);
  }

  async function getPaymentsByEnrollment(enrollmentId) {
    const database = requireDb();
    const results = await database
      .select()
      .from(paymentsTable)
      .where(eq(paymentsTable.enrollmentId, enrollmentId))
      .orderBy(desc(paymentsTable.updatedAt), desc(paymentsTable.createdAt))
      .limit(1);

    return results[0] || null;
  }

  async function getPaymentByEnrollmentAndAccessToken(enrollmentId, accessToken) {
    const database = requireDb();
    const results = await database
      .select()
      .from(paymentsTable)
      .where(and(
        eq(paymentsTable.enrollmentId, enrollmentId),
        eq(paymentsTable.publicAccessToken, accessToken),
      ))
      .limit(1);

    return results[0] || null;
  }

  async function getAccessiblePayment(paymentId, access = {}) {
    const payment = await getPayment(paymentId);
    if (!payment) {
      return null;
    }

    ensure(
      hasPaymentAccess(payment, access.actor, access.accessToken),
      'Anda tidak memiliki akses ke pembayaran ini.',
      403,
      'PAYMENT_ACCESS_FORBIDDEN',
    );

    return payment;
  }

  async function getAccessiblePaymentByEnrollment(enrollmentId, access = {}) {
    const accessToken = String(access.accessToken || '');
    const payment = accessToken
      ? await getPaymentByEnrollmentAndAccessToken(enrollmentId, accessToken)
      : await getPaymentsByEnrollment(enrollmentId);
    if (!payment) {
      return null;
    }

    ensure(
      hasPaymentAccess(payment, access.actor, access.accessToken),
      'Anda tidak memiliki akses ke pembayaran ini.',
      403,
      'PAYMENT_ACCESS_FORBIDDEN',
    );

    return buildPublicPaymentDto(payment);
  }

  async function submitManualPaymentProof(paymentId, payload = {}) {
    const database = requireDb();
    const payment = await getPayment(paymentId);
    if (!payment) {
      return null;
    }

    ensure(
      hasPaymentAccess(payment, payload.actor, payload.accessToken),
      'Anda tidak memiliki akses untuk mengunggah bukti pembayaran ini.',
      403,
      'PAYMENT_ACCESS_FORBIDDEN',
    );

    ensure(
      canUploadManualProof(payment),
      'Bukti pembayaran tidak dapat diunggah pada status pembayaran saat ini.',
      409,
      'MANUAL_PROOF_UPLOAD_NOT_ALLOWED',
    );

    const proof = await persistManualProof(payment.id, payload.proofDataUrl, payload.proofFileName);
    const now = new Date().toISOString();
    const updates = {
      status: 'pending',
      paymentChannel: 'manual_transfer',
      paymentMethod: 'Transfer Manual',
      manualProofMediaId: proof.mediaId,
      manualProofUrl: buildManualProofUrl(payment.id),
      manualSubmittedAt: now,
      manualReferenceNote: payload.referenceNote || null,
      manualReviewNote: null,
      manualReviewedAt: null,
      redirectUrl: null,
      transactionId: null,
      updatedAt: now,
    };

    await database.transaction(async (tx) => {
      await tx
        .update(paymentsTable)
        .set(updates)
        .where(eq(paymentsTable.id, payment.id));

      await tx
        .update(enrollmentsTable)
        .set({
          paymentStatus: 'pending',
          paymentDate: null,
        })
        .where(eq(enrollmentsTable.id, payment.enrollmentId));
    });

    return buildPublicPaymentDto(await getPayment(payment.id));
  }

  async function getManualPaymentProofAsset(paymentId, access = {}) {
    const database = requireDb();
    const payment = await getAccessiblePayment(paymentId, access);
    if (!payment) {
      return null;
    }

    ensure(payment.manualProofMediaId, 'Bukti pembayaran tidak ditemukan.', 404, 'MANUAL_PROOF_NOT_FOUND');

    const [asset] = await database
      .select()
      .from(mediaAssets)
      .where(and(
        eq(mediaAssets.id, String(payment.manualProofMediaId)),
        eq(mediaAssets.ownerId, String(payment.id)),
      ))
      .limit(1);

    ensure(asset, 'Bukti pembayaran tidak ditemukan.', 404, 'MANUAL_PROOF_NOT_FOUND');

    return {
      ...asset,
      absolutePath: asset.storageKey ? resolveStoredMediaPath(asset.storageKey) : '',
    };
  }

  async function listManualPayments() {
    const database = requireDb();
    const [manualPayments, enrollments, students, courses] = await Promise.all([
      database
        .select()
        .from(paymentsTable)
        .where(eq(paymentsTable.paymentChannel, 'manual_transfer'))
        .orderBy(desc(paymentsTable.updatedAt)),
      database.select().from(enrollmentsTable),
      database.select().from(studentsTable),
      database.select().from(coursesTable),
    ]);

    const lookup = {
      enrollments: new Map(enrollments.map((item) => [String(item.id), item])),
      students: new Map(students.map((item) => [String(item.id), item])),
      courses: new Map(courses.map((item) => [String(item.id), item])),
    };

    return manualPayments
      .filter((payment) => payment.manualSubmittedAt)
      .map((payment) => buildManualPaymentItem(payment, lookup));
  }

  async function verifyManualPayment(paymentId, payload = {}) {
    const database = requireDb();
    const payment = await getPayment(paymentId);
    if (!payment) {
      return null;
    }

    ensure(
      isManualPaymentInReview(payment),
      'Pembayaran manual ini tidak dalam status review yang dapat diverifikasi.',
      409,
      'MANUAL_PAYMENT_REVIEW_LOCKED',
    );

    const now = new Date().toISOString();
    await database.transaction(async (tx) => {
      const updatedPayments = await tx
        .update(paymentsTable)
        .set({
          status: 'paid',
          paymentChannel: 'manual_transfer',
          paymentMethod: 'Transfer Manual',
          paidAt: now,
          redirectUrl: null,
          transactionId: null,
          manualReviewNote: payload.reviewNote || null,
          manualReviewedAt: now,
          updatedAt: now,
        })
        .where(and(
          eq(paymentsTable.id, payment.id),
          eq(paymentsTable.paymentChannel, 'manual_transfer'),
          eq(paymentsTable.status, 'pending'),
          eq(paymentsTable.manualSubmittedAt, String(payment.manualSubmittedAt)),
        ))
        .returning({ id: paymentsTable.id });

      ensure(
        updatedPayments.length === 1,
        'Pembayaran manual ini tidak lagi dalam status review yang dapat diverifikasi.',
        409,
        'MANUAL_PAYMENT_REVIEW_LOCKED',
      );

      await tx
        .update(enrollmentsTable)
        .set({
          paymentStatus: 'verified',
          paymentDate: now,
        })
        .where(eq(enrollmentsTable.id, payment.enrollmentId));
    });

    return getPayment(payment.id);
  }

  async function rejectManualPayment(paymentId, payload = {}) {
    const database = requireDb();
    const payment = await getPayment(paymentId);
    if (!payment) {
      return null;
    }

    ensure(
      isManualPaymentInReview(payment),
      'Pembayaran manual ini tidak dalam status review yang dapat ditolak.',
      409,
      'MANUAL_PAYMENT_REVIEW_LOCKED',
    );

    const now = new Date().toISOString();
    await database.transaction(async (tx) => {
      const updatedPayments = await tx
        .update(paymentsTable)
        .set({
          status: 'failed',
          paymentChannel: 'manual_transfer',
          paymentMethod: 'Transfer Manual',
          redirectUrl: null,
          transactionId: null,
          manualReviewNote: payload.reviewNote || 'Bukti pembayaran ditolak admin.',
          manualReviewedAt: now,
          updatedAt: now,
        })
        .where(and(
          eq(paymentsTable.id, payment.id),
          eq(paymentsTable.paymentChannel, 'manual_transfer'),
          eq(paymentsTable.status, 'pending'),
          eq(paymentsTable.manualSubmittedAt, String(payment.manualSubmittedAt)),
        ))
        .returning({ id: paymentsTable.id });

      ensure(
        updatedPayments.length === 1,
        'Pembayaran manual ini tidak lagi dalam status review yang dapat ditolak.',
        409,
        'MANUAL_PAYMENT_REVIEW_LOCKED',
      );

      await tx
        .update(enrollmentsTable)
        .set({
          paymentStatus: 'rejected',
          paymentDate: null,
        })
        .where(eq(enrollmentsTable.id, payment.enrollmentId));
    });

    return getPayment(payment.id);
  }

  async function checkPaymentStatus(paymentId) {
    const payment = await getPayment(paymentId);
    if (!payment) {
      return null;
    }

    if (!paymentConfig.isMockMode && payment.transactionId && payment.status === 'pending' && payment.paymentChannel !== 'manual_transfer') {
      try {
        const authString = Buffer.from(`${paymentConfig.midtransServerKey}:`).toString('base64');
        const statusResponse = await fetch(
          `${paymentConfig.snapBaseUrl}/${payment.transactionId}/status`,
          {
            headers: {
              Authorization: `Basic ${authString}`,
              Accept: 'application/json',
            },
          },
        );

        if (statusResponse.ok) {
          const statusData = await statusResponse.json();
          return handleMidtransNotification({
            order_id: paymentId,
            transaction_status: statusData.transaction_status,
            status_code: statusData.status_code,
            gross_amount: statusData.gross_amount,
            signature_key: statusData.signature_key,
            payment_type: statusData.payment_type,
            transaction_id: statusData.transaction_id,
            transaction_time: statusData.transaction_time,
          });
        }
      } catch {
        // Silently fail on status check - webhook will handle it
      }
    }

    return { orderId: paymentId, status: payment.status };
  }

  return {
    createPaymentTransaction,
    handleMidtransNotification,
    getPayment,
    getAccessiblePayment,
    getAccessiblePaymentByEnrollment,
    getPaymentsByStudent,
    getPaymentsByEnrollment,
    submitManualPaymentProof,
    getManualPaymentProofAsset,
    listManualPayments,
    verifyManualPayment,
    rejectManualPayment,
    checkPaymentStatus,
  };
}

export default createPaymentsService;
