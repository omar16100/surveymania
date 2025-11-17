import { Page } from '@playwright/test';
import { clerk } from '@clerk/testing/playwright';

/**
 * Test user credentials
 */
export const TEST_USERS = {
  user1: {
    email: 'test1@example.com',
    password: 'Test1234!',
    clerkId: 'user_test1',
    firstName: 'Test',
    lastName: 'User 1',
    get name() { return `${this.firstName} ${this.lastName}`; }
  },
  user2: {
    email: 'test2@example.com',
    password: 'Test1234!',
    clerkId: 'user_test2',
    firstName: 'Test',
    lastName: 'User 2',
    get name() { return `${this.firstName} ${this.lastName}`; }
  },
  user3: {
    email: 'test3@example.com',
    password: 'Test1234!',
    clerkId: 'user_test3',
    firstName: 'Test',
    lastName: 'User 3',
    get name() { return `${this.firstName} ${this.lastName}`; }
  },
};

/**
 * Sign in with Clerk using test mode
 * Uses clerk.signIn() helper which bypasses UI and signs in programmatically
 */
export async function signIn(page: Page, email: string, password: string) {
  await page.goto('/sign-in');

  // Use Clerk's programmatic sign-in helper
  // This internally calls setupClerkTestingToken()
  await clerk.signIn({
    page,
    signInParams: {
      strategy: 'password',
      identifier: email,
      password: password,
    },
  });

  // Wait for redirect to dashboard
  await page.waitForURL('/dashboard', { timeout: 15000 });
}

/**
 * Sign in as test user 1 (default)
 */
export async function signInAsUser1(page: Page) {
  await signIn(page, TEST_USERS.user1.email, TEST_USERS.user1.password);
}

/**
 * Sign in as test user 2
 */
export async function signInAsUser2(page: Page) {
  await signIn(page, TEST_USERS.user2.email, TEST_USERS.user2.password);
}

/**
 * Sign in as test user 3 (from org 2)
 */
export async function signInAsUser3(page: Page) {
  await signIn(page, TEST_USERS.user3.email, TEST_USERS.user3.password);
}

/**
 * Sign out current user
 */
export async function signOut(page: Page) {
  // Use Clerk's programmatic sign-out helper
  await clerk.signOut({ page });

  // Wait for redirect to home or sign-in
  await page.waitForURL(/\/(sign-in|$)/, { timeout: 5000 });
}

/**
 * Get authentication storage state for session reuse
 * This allows us to skip sign-in for most tests (speed optimization)
 */
export async function getAuthState(page: Page, email: string, password: string) {
  await signIn(page, email, password);
  return await page.context().storageState();
}

/**
 * Setup authenticated session by loading storage state
 */
export async function useAuthState(page: Page, storageState: any) {
  await page.context().addCookies(storageState.cookies);
  await page.context().addInitScript((storage) => {
    for (const [key, value] of Object.entries(storage.localStorage)) {
      window.localStorage.setItem(key, value);
    }
    for (const [key, value] of Object.entries(storage.sessionStorage)) {
      window.sessionStorage.setItem(key, value);
    }
  }, storageState);
}
