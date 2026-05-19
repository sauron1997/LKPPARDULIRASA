import { betterAuth } from 'better-auth';
import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { username } from 'better-auth/plugins';
import { env } from '../config/env.js';
import { db, isDatabaseConfigured } from '../db/client.js';

const database = isDatabaseConfigured
  ? drizzleAdapter(db, { provider: 'pg' })
  : null;

const authOptions = {
  appName: env.appName,
  baseURL: env.betterAuthUrl,
  secret: env.betterAuthSecret,
  trustedOrigins: env.corsOrigins.length > 0 ? env.corsOrigins : [env.clientOrigin],
  emailAndPassword: {
    enabled: true,
    autoSignIn: false,
    minPasswordLength: 6,
  },
  user: {
    additionalFields: {
      role: {
        type: 'string',
        required: false,
        defaultValue: 'student',
      },
      studentId: {
        type: 'string',
        required: false,
      },
      nis: {
        type: 'string',
        required: false,
      },
      accountId: {
        type: 'string',
        required: false,
      },
      courseId: {
        type: 'string',
        required: false,
      },
      enrollmentId: {
        type: 'string',
        required: false,
      },
    },
  },
  plugins: [
    username({
      minUsernameLength: 3,
      maxUsernameLength: 64,
      usernameValidator(value) {
        return /^[a-zA-Z0-9_.-]+$/.test(String(value || ''));
      },
    }),
  ],
};

if (database) {
  authOptions.database = database;
}

export const auth = betterAuth(authOptions);

export default auth;
