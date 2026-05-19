import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: './server/src/db/schema/index.js',
  out: './server/drizzle',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/lkp_parduli_rasa',
  },
  strict: true,
  verbose: true,
});
