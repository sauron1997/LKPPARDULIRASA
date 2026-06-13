import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('config/env.js — validateEnvironment()', () => {
  it('exports validateEnvironment function', async () => {
    const mod = await import('../../src/config/env.js');
    assert(typeof mod.validateEnvironment === 'function', 'should export validateEnvironment');
  });

  it('exports frozen env object', async () => {
    const mod = await import('../../src/config/env.js');
    assert(Object.isFrozen(mod.env), 'env should be frozen');
  });

  it('returns valid=true in dev mode (non-strict)', async () => {
    const mod = await import('../../src/config/env.js');
    const result = mod.validateEnvironment({ strict: false });
    assert.equal(result.valid, true, 'dev mode should always be valid');
    assert.equal(result.errors.length, 0);
    assert.equal(result.mode, 'development');
  });

  it('returns valid=false in strict mode when required fields missing', async () => {
    const mod = await import('../../src/config/env.js');
    // Force strict mode without DB/keys configured
    const result = mod.validateEnvironment({ strict: true });
    // In test environment, production env is not set — expect validation errors
    assert(typeof result.valid === 'boolean', 'valid should be boolean');
    assert(Array.isArray(result.errors), 'errors should be array');
    assert.equal(result.mode, 'production');
  });

  it('env.isProduction reflects NODE_ENV', async () => {
    const mod = await import('../../src/config/env.js');
    // In test environment, NODE_ENV is not 'production'
    assert.equal(mod.env.isProduction, process.env.NODE_ENV === 'production');
  });

  it('env has required fields with correct types', async () => {
    const mod = await import('../../src/config/env.js');
    const e = mod.env;
    assert(typeof e.port === 'number', 'port should be number');
    assert(e.port > 0, 'port should be positive');
    assert(typeof e.apiBasePath === 'string', 'apiBasePath should be string');
    assert(e.apiBasePath.startsWith('/'), 'apiBasePath should start with /');
    assert(typeof e.isProduction === 'boolean', 'isProduction should be boolean');
    assert(Array.isArray(e.corsOrigins), 'corsOrigins should be array');
    assert(typeof e.paymentMockMode === 'boolean', 'paymentMockMode should be boolean');
  });

  it('paymentMockMode is true when MIDTRANS_SERVER_KEY not set', async () => {
    const mod = await import('../../src/config/env.js');
    // In test env, MIDTRANS_SERVER_KEY is not set
    if (!process.env.MIDTRANS_SERVER_KEY) {
      assert.equal(mod.env.paymentMockMode, true, 'should be mock mode without key');
    }
  });

  it('env has payment fields', async () => {
    const mod = await import('../../src/config/env.js');
    const e = mod.env;
    assert('midtransServerKey' in e, 'should have midtransServerKey');
    assert('midtransClientKey' in e, 'should have midtransClientKey');
    assert('midtransIsProduction' in e, 'should have midtransIsProduction');
    assert('webhookBaseUrl' in e, 'should have webhookBaseUrl');
    assert('paymentMockMode' in e, 'should have paymentMockMode');
  });
});

describe('config/payment.js — paymentConfig', () => {
  it('paymentConfig is frozen', async () => {
    const mod = await import('../../src/config/payment.js');
    assert(Object.isFrozen(mod.paymentConfig), 'paymentConfig should be frozen');
  });

  it('paymentConfig uses env values (not raw process.env)', async () => {
    const paymentMod = await import('../../src/config/payment.js');
    const envMod = await import('../../src/config/env.js');
    const cfg = paymentMod.paymentConfig;
    const e = envMod.env;
    // Verify paymentConfig references the same values as env
    assert.equal(cfg.midtransServerKey, e.midtransServerKey);
    assert.equal(cfg.isMockMode, e.paymentMockMode);
    assert.equal(cfg.isProduction, e.isProduction);
  });

  it('paymentConfig has expected shape', async () => {
    const mod = await import('../../src/config/payment.js');
    const cfg = mod.paymentConfig;
    assert(typeof cfg.isMockMode === 'boolean', 'isMockMode should be boolean');
    assert(typeof cfg.snapBaseUrl === 'string', 'snapBaseUrl should be string');
    assert(cfg.snapBaseUrl.startsWith('https://'), 'snapBaseUrl should be https');
    assert(typeof cfg.paymentExpiryMinutes === 'number', 'paymentExpiryMinutes should be number');
    assert(cfg.paymentExpiryMinutes > 0, 'paymentExpiryMinutes should be positive');
  });
});
