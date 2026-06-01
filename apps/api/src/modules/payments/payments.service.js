import { eq } from 'drizzle-orm';
import { createHash } from 'node:crypto';
import { paymentConfig } from '../../config/payment.js';
import { requireDb } from '../../db/client.js';
import { payments as paymentsTable, enrollments as enrollmentsTable } from '../../db/schema/index.js';
import { createAdminService } from '../admin/admin.service.js';

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

export function createPaymentsService(options = {}) {
  const adminService = createAdminService(options);
  const context = adminService.getContext();
  const { repositories } = context;

  async function createPaymentTransaction({ enrollmentId, studentId, amount, itemDetails, customerDetails }) {
    const database = requireDb();
    const persistedPayments = database ? await database.select().from(paymentsTable) : [];
    const memoryPayments = repositories.payments ? repositories.payments.raw() : [];
    const allPayments = [...persistedPayments, ...memoryPayments];
    const paymentId = generatePaymentId(allPayments);

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
      transactionId,
      redirectUrl,
      status: 'pending',
      paymentMethod: null,
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
      payment: paymentRecord,
    };
  }

  async function handleMidtransNotification(notificationPayload) {
    const { order_id: orderId, transaction_status: transactionStatus, status_code: statusCode, gross_amount: grossAmount, signature_key: signatureKey, payment_type: paymentType, transaction_id: transactionId, transaction_time: _transactionTime } = notificationPayload;

    if (!orderId) {
      throw new Error('Missing order_id in notification');
    }

    const database = requireDb();

    if (!paymentConfig.isMockMode && signatureKey) {
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

    await database
      .update(paymentsTable)
      .set(updates)
      .where(eq(paymentsTable.id, orderId));

    // Update enrollment paymentStatus if paid
    if (newStatus === 'paid') {
      await database
        .update(enrollmentsTable)
        .set({
          paymentStatus: 'verified',
          paymentDate: now,
        })
        .where(eq(enrollmentsTable.id, existingPayment.enrollmentId));
    }

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
      .orderBy(paymentsTable.createdAt)
      .limit(1);

    return results[0] || null;
  }

  async function checkPaymentStatus(paymentId) {
    const payment = await getPayment(paymentId);
    if (!payment) {
      return null;
    }

    if (!paymentConfig.isMockMode && payment.transactionId && payment.status === 'pending') {
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
    getPaymentsByStudent,
    getPaymentsByEnrollment,
    checkPaymentStatus,
  };
}

export default createPaymentsService;
