import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

// Load .env.local for local development
import { config } from 'dotenv';
config({ path: '.env.local' });

export default defineConfig({
  schema: './src/lib/db/schema.ts',
  out: './src/lib/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
