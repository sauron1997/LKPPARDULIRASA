import cors from 'cors';
import express from 'express';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { toNodeHandler } from 'better-auth/node';
import { env } from './config/env.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { ok, sendError } from './utils/http.js';
import healthRouter from './modules/health/health.routes.js';

const defaultRouteModules = [
  {
    basePath: env.apiBasePath,
    importPath: './routes/index.js',
  },
];

function resolveAuthExport(authModule) {
  return authModule?.auth || authModule?.default || null;
}

async function importOptionalModule(importPath) {
  const moduleUrl = new URL(importPath, env.serverRootUrl);

  if (!existsSync(fileURLToPath(moduleUrl))) {
    return null;
  }

  return import(moduleUrl.href);
}

function mountAuthHandler(app, authHandler) {
  app.all(env.authBasePath, authHandler);
  app.all(`${env.authBasePath}/*splat`, authHandler);
}

async function createAuthHandler() {
  const authModule = await importOptionalModule(env.authModulePath);
  const auth = resolveAuthExport(authModule);

  if (auth) {
    return toNodeHandler(auth);
  }

  return function authPlaceholder(req, res) {
    return sendError(res, 501, 'Better Auth is not configured yet.', {
      code: 'AUTH_NOT_CONFIGURED',
      details: `Expected ${env.authModulePath} to export auth or default.`,
    });
  };
}

async function mountRouteModules(app, routeModules) {
  for (const routeModule of routeModules) {
    const loadedModule = await importOptionalModule(routeModule.importPath);

    if (!loadedModule) {
      continue;
    }

    if (typeof loadedModule.registerRoutes === 'function') {
      await loadedModule.registerRoutes(app);
      continue;
    }

    const router = loadedModule.router || loadedModule.default;

    if (typeof router === 'function') {
      app.use(routeModule.basePath, router);
      continue;
    }

    throw new TypeError(
      `Route module ${routeModule.importPath} must export default/router middleware or registerRoutes(app).`,
    );
  }
}

export async function createApp(options = {}) {
  const app = express();
  const routeModules = options.routeModules || defaultRouteModules;
  const authHandler = await createAuthHandler();

  app.disable('x-powered-by');
  if (env.isProduction) {
    // Respect forwarded protocol/host when running behind Nginx on the VPS.
    app.set('trust proxy', 1);
  }

  app.use(cors({
    origin: env.corsOrigins.length > 0 ? env.corsOrigins : env.clientOrigin,
    credentials: true,
  }));

  // Health, readiness, and diagnostics endpoints
  app.use('/', healthRouter);
  app.use(env.apiBasePath, healthRouter);

  mountAuthHandler(app, authHandler);

  app.use(express.json({ limit: '1mb' }));

  await mountRouteModules(app, routeModules);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

export const createExpressApp = createApp;