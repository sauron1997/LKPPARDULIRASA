import { env } from './env.js';

export const paymentConfig = Object.freeze({
  isProduction: env.isProduction,
  midtransServerKey: env.midtransServerKey,
  midtransClientKey: env.midtransClientKey,
  isMockMode: env.paymentMockMode,
  snapBaseUrl: env.midtransIsProduction
    ? 'https://app.midtrans.com/snap/v1'
    : 'https://app.sandbox.midtrans.com/snap/v1',
  webhookBaseUrl: env.webhookBaseUrl || `${env.clientOrigin}/api`,
  paymentPrefix: 'pay',
  paymentExpiryMinutes: 60,
  merchantName: env.appName,
});
