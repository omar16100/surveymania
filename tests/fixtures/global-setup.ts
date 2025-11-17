import { chromium, FullConfig } from '@playwright/test';
import { execSync } from 'child_process';
import path from 'path';
import dotenv from 'dotenv';
import { clerkSetup } from '@clerk/testing/playwright';
import { createClerkTestUsers } from './create-clerk-users';

// Load test environment variables (override existing)
dotenv.config({ path: '.env.test', override: true });
dotenv.config({ path: '.env' });

/**
 * Global setup runs once before all tests
 * - Resets and seeds the test database
 * - Prepares test environment
 */
async function globalSetup(config: FullConfig) {
  console.log('\n🚀 Starting global setup...\n');

  // 1. Reset database (use SQLite in-memory for speed)
  console.log('📦 Resetting test database...');
  process.env.DATABASE_URL = process.env.DATABASE_URL || 'file:./test.db';

  try {
    // Generate Prisma client
    execSync('npx prisma generate', { stdio: 'inherit' });

    // Push schema to test DB (faster than migrate for tests)
    // Note: Using force-reset on TEST database only
    execSync('npx prisma db push --skip-generate --force-reset', {
      stdio: 'inherit',
      env: {
        ...process.env,
        DATABASE_URL: process.env.DATABASE_URL,
        PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION: 'yes'
      }
    });

    console.log('✅ Database reset complete\n');
  } catch (error) {
    console.error('❌ Database setup failed:', error);
    throw error;
  }

  // 2. Seed test data
  console.log('🌱 Seeding test database...');
  try {
    execSync('npx tsx tests/fixtures/db-seed.ts', {
      stdio: 'inherit',
      env: {
        ...process.env,
        DATABASE_URL: process.env.DATABASE_URL
      }
    });
    console.log('✅ Database seeding complete\n');
  } catch (error) {
    console.error('❌ Database seeding failed:', error);
    throw error;
  }

  // 3. Setup Clerk test environment
  console.log('🔐 Setting up Clerk test environment...');
  if (!process.env.CLERK_SECRET_KEY || !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    console.error('❌ Clerk keys not found in environment');
    throw new Error('CLERK_SECRET_KEY and NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY are required');
  }

  // Create test users in Clerk (if they don't exist)
  try {
    await createClerkTestUsers();
  } catch (error) {
    console.error('❌ Failed to create Clerk test users:', error);
    throw error;
  }

  // Setup Clerk testing - this configures the testing token
  await clerkSetup();
  console.log('✅ Clerk testing configured\n');

  // 4. Verify app is running
  const baseURL = config.use?.baseURL || 'http://localhost:3000';
  console.log(`🌐 Verifying app at ${baseURL}...`);

  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    await page.goto(baseURL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    console.log('✅ App is running\n');
  } catch (error) {
    console.error(`❌ Failed to reach app at ${baseURL}`);
    throw error;
  } finally {
    await browser.close();
  }

  console.log('🎉 Global setup complete!\n');
}

export default globalSetup;
