import { config } from 'dotenv';
config({ path: '.env.local' });
import bcrypt from 'bcryptjs';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq } from 'drizzle-orm';
import * as schema from '../src/lib/db/schema';

const TEST_USER = {
  email: 'test@housingiq.com',
  password: 'TestPassword123!',
  name: 'Test User',
};

async function seedTestUser() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    console.error('DATABASE_URL environment variable is not set');
    process.exit(1);
  }

  const client = postgres(connectionString);
  const db = drizzle(client, { schema });

  try {
    // Check if test user already exists
    const existingUser = await db.query.users.findFirst({
      where: eq(schema.users.email, TEST_USER.email),
    });

    if (existingUser) {
      console.log('Test user already exists. Updating password...');
      const passwordHash = await bcrypt.hash(TEST_USER.password, 12);
      await db
        .update(schema.users)
        .set({
          passwordHash,
          name: TEST_USER.name,
          updatedAt: new Date(),
        })
        .where(eq(schema.users.email, TEST_USER.email));
      console.log('Test user password updated successfully!');
    } else {
      console.log('Creating test user...');
      const passwordHash = await bcrypt.hash(TEST_USER.password, 12);
      await db.insert(schema.users).values({
        email: TEST_USER.email,
        name: TEST_USER.name,
        passwordHash,
      });
      console.log('Test user created successfully!');
    }

    console.log('\n--- Test User Credentials ---');
    console.log(`Email: ${TEST_USER.email}`);
    console.log(`Password: ${TEST_USER.password}`);
    console.log('-----------------------------\n');
  } catch (error) {
    console.error('Error seeding test user:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

seedTestUser();
