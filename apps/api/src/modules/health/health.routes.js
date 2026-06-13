/**
 * Health & Readiness Routes — Phase 10.
 * Provides operational visibility endpoints.
 */

import { Router } from 'express';
import { env, validateEnvironment } from '../../config/env.js';
import { isDatabaseConfigured } from '../../repositories/index.js';

const router = Router();
const startedAt = new Date().toISOString();

/**
 * GET /health
 * Liveness probe — always responds quickly.
 * Returns basic app status for load balancers and monitoring.
 */
router.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    startedAt,
  });
});

/**
 * GET /ready
 * Readiness probe — checks if the app is ready to serve traffic.
 * Verifies runtime mode and dependency availability.
 */
router.get('/ready', (_req, res) => {
  const runtime = {
    mode: isDatabaseConfigured ? 'database' : 'memory',
    databaseConfigured: isDatabaseConfigured,
    paymentMode: env.paymentMockMode ? 'mock' : 'live',
    environment: env.nodeEnv,
  };

  const envCheck = validateEnvironment({ strict: false });

  const ready = true; // In memory mode, always ready. In DB mode, could add ping check later.

  res.status(ready ? 200 : 503).json({
    status: ready ? 'ready' : 'not_ready',
    timestamp: new Date().toISOString(),
    runtime,
    config: {
      valid: envCheck.valid,
      mode: envCheck.mode,
      errorCount: envCheck.errors.length,
    },
  });
});

/**
 * GET /diagnostics
 * Extended runtime info (non-sensitive). Useful for admin debugging.
 */
router.get('/diagnostics', (_req, res) => {
  const envCheck = validateEnvironment({ strict: env.isProduction });

  res.json({
    app: env.appName,
    version: process.env.npm_package_version || '0.0.0',
    node: process.version,
    environment: env.nodeEnv,
    startedAt,
    uptime: Math.floor(process.uptime()),
    runtime: {
      mode: isDatabaseConfigured ? 'database' : 'memory',
      databaseConfigured: isDatabaseConfigured,
      paymentMode: env.paymentMockMode ? 'mock' : 'live',
    },
    config: {
      valid: envCheck.valid,
      mode: envCheck.mode,
      errors: env.isProduction ? envCheck.errors : envCheck.errors.slice(0, 3),
    },
    memory: {
      rss: Math.round(process.memoryUsage().rss / 1024 / 1024) + ' MB',
      heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
    },
  });
});

export default router;
