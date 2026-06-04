import { env } from './config/env.js';
import { startServer } from './server.js';

// Production guard: Midtrans config wajib diisi di production
if (env.isProduction && !process.env.MIDTRANS_SERVER_KEY) {
  console.error('FATAL: MIDTRANS_SERVER_KEY is required in production. Sistem akan berjalan di Mock Mode (tidak aman).');
  console.error('Set MIDTRANS_SERVER_KEY dan MIDTRANS_CLIENT_KEY di environment variables.');
  process.exit(1);
}

try {
  const { url } = await startServer();
  console.log(`Backend listening on ${url}`);
} catch (error) {
  const host = env.host === '0.0.0.0' ? 'localhost' : env.host;
  console.error(`Failed to start backend server on http://${host}:${env.port}.`);

  if (error?.code === 'EADDRINUSE') {
    console.error(
      `Port ${env.port} is already in use. Start the app once with \`npm run dev\` from the repo root, or run \`npm run dev:api\` only when the root dev command is not already running.`,
    );
    console.error(`Stop the existing process on port ${env.port}, then try again.`);
  }

  console.error(error);
  process.exitCode = 1;
}
