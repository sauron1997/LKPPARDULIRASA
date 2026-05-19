import { startServer } from './server.js';

try {
  const { url } = await startServer();
  console.log(`Backend listening on ${url}`);
} catch (error) {
  console.error('Failed to start backend server.');
  console.error(error);
  process.exitCode = 1;
}
