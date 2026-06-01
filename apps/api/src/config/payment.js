import { env } from './env.js';

export const paymentConfig = Object.freeze({
  isProduction: env.isProduction,
  midtransServerKey: process.env.MIDTRANS_SERVER_KEY || '',
  midtransClientKey: process.env.MIDTRANS_CLIENT_KEY || '',
  isMockMode: !process.env.MIDTRANS_SERVER_KEY,
  snapBaseUrl: process.env.MIDTRANS_IS_PRODUCTION === 'true'
    ? 'https://app.midtrans.com/snap/v1'
    : 'https://app.sandbox.midtrans.com/snap/v1',
  webhookBaseUrl: process.env.WEBHOOK_BASE_URL || `${env.clientOrigin}/api`,
  paymentPrefix: 'pay',
  paymentExpiryMinutes: 60,
  merchantName: env.appName,
});
