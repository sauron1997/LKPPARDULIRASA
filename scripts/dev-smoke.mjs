import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');
const apiPort = 3311;
const webPort = 4173;
const host = '127.0.0.1';
const logLimit = 6_000;
const readinessTimeoutMs = 60_000;
const readinessIntervalMs = 500;

const modes = new Set(['api', 'web', 'full']);
const mode = process.argv[2] || 'full';

if (!modes.has(mode)) {
  console.error(`Unknown smoke mode "${mode}". Use one of: ${Array.from(modes).join(', ')}.`);
  process.exit(1);
}

class RingLog {
  constructor(limit) {
    this.limit = limit;
    this.value = '';
  }

  append(prefix, chunk) {
    const text = `${prefix}${chunk.toString()}`;
    this.value = `${this.value}${text}`.slice(-this.limit);
  }

  toString() {
    return this.value.trim();
  }
}

function createCleanEnv(extra = {}) {
  const env = {};
  let pathValue = '';

  for (const [key, value] of Object.entries(process.env)) {
    if (key.toLowerCase() === 'path') {
      pathValue = pathValue || value;
      continue;
    }

    env[key] = value;
  }

  env.Path = pathValue;

  return {
    ...env,
    ...extra,
  };
}

function spawnService(name, args, env) {
  const log = new RingLog(logLimit);
  const child = spawn(process.execPath, args, {
    cwd: repoRoot,
    env,
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  child.stdout.on('data', (chunk) => log.append(`[${name}] `, chunk));
  child.stderr.on('data', (chunk) => log.append(`[${name}] `, chunk));

  const exit = new Promise((resolveExit) => {
    child.once('exit', (code, signal) => resolveExit({ code, signal }));
  });

  return {
    child,
    exit,
    log,
    name,
  };
}

async function sleep(ms) {
  await new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

async function requestOk(url) {
  try {
    const response = await fetch(url, { cache: 'no-store' });
    return response.status >= 200 && response.status < 300;
  } catch {
    return false;
  }
}

async function waitForUrl(url, services) {
  const deadline = Date.now() + readinessTimeoutMs;

  while (Date.now() < deadline) {
    for (const service of services) {
      if (service.child.exitCode !== null) {
        const { code, signal } = await service.exit;
        throw new Error(`${service.name} exited before ${url} was ready (code=${code}, signal=${signal}).`);
      }
    }

    if (await requestOk(url)) {
      return;
    }

    await sleep(readinessIntervalMs);
  }

  throw new Error(`Timed out waiting for ${url}.`);
}

async function stopService(service) {
  if (service.child.exitCode !== null) {
    return;
  }

  service.child.kill('SIGTERM');

  const stopped = await Promise.race([
    service.exit.then(() => true),
    sleep(2_500).then(() => false),
  ]);

  if (!stopped && process.platform === 'win32') {
    await new Promise((resolveKill) => {
      const killer = spawn('taskkill.exe', ['/PID', String(service.child.pid), '/F'], {
        windowsHide: true,
        stdio: 'ignore',
      });
      killer.once('exit', resolveKill);
    });
  } else if (!stopped) {
    service.child.kill('SIGKILL');
  }
}

async function stopServices(services) {
  await Promise.allSettled(services.map((service) => stopService(service)));
}

function getViteCliPath() {
  const viteCliPath = resolve(repoRoot, 'node_modules', 'vite', 'bin', 'vite.js');

  if (!existsSync(viteCliPath)) {
    throw new Error('Vite CLI was not found. Run npm install before running the smoke harness.');
  }

  return viteCliPath;
}

function createApiService() {
  return spawnService(
    'api',
    [resolve(repoRoot, 'apps', 'api', 'src', 'index.js')],
    createCleanEnv({
      HOST: host,
      PORT: String(apiPort),
      CLIENT_ORIGIN: `http://${host}:${webPort}`,
      CORS_ORIGINS: `http://${host}:${webPort}`,
      BETTER_AUTH_URL: `http://${host}:${apiPort}/api/auth`,
    }),
  );
}

function createWebService() {
  return spawnService(
    'web',
    [
      getViteCliPath(),
      '--config',
      resolve(repoRoot, 'apps', 'web', 'vite.config.js'),
      '--host',
      host,
      '--port',
      String(webPort),
      '--strictPort',
    ],
    createCleanEnv({
      VITE_API_PROXY_TARGET: `http://${host}:${apiPort}`,
    }),
  );
}

const services = [];

try {
  if (mode === 'api' || mode === 'full') {
    services.push(createApiService());
  }

  if (mode === 'web' || mode === 'full') {
    services.push(createWebService());
  }

  if (mode === 'api') {
    await waitForUrl(`http://${host}:${apiPort}/health`, services);
    await waitForUrl(`http://${host}:${apiPort}/api/health`, services);
  }

  if (mode === 'web') {
    await waitForUrl(`http://${host}:${webPort}/`, services);
    await waitForUrl(`http://${host}:${webPort}/@vite/client`, services);
  }

  if (mode === 'full') {
    await waitForUrl(`http://${host}:${apiPort}/health`, services);
    await waitForUrl(`http://${host}:${apiPort}/api/health`, services);
    await waitForUrl(`http://${host}:${webPort}/`, services);
    await waitForUrl(`http://${host}:${webPort}/@vite/client`, services);
    await waitForUrl(`http://${host}:${webPort}/api/health`, services);
  }

  console.log(`dev smoke (${mode}) passed`);
} catch (error) {
  console.error(`dev smoke (${mode}) failed: ${error.message}`);

  for (const service of services) {
    const logs = service.log.toString();
    if (logs) {
      console.error(`\nLast ${service.name} logs:\n${logs}`);
    }
  }

  process.exitCode = 1;
} finally {
  await stopServices(services);
}
