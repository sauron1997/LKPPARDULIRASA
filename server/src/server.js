import { env } from './config/env.js';
import { createApp } from './app.js';

export async function startServer() {
  const app = await createApp();

  const server = await new Promise((resolve, reject) => {
    const instance = app.listen(env.port, env.host);
    instance.once('error', reject);
    instance.once('listening', () => {
      instance.off('error', reject);
      resolve(instance);
    });
  });

  const host = env.host === '0.0.0.0' ? 'localhost' : env.host;

  return {
    app,
    server,
    url: `http://${host}:${env.port}`,
  };
}
