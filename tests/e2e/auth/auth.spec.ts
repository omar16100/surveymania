import { test, expect } from '@playwright/test';
import { signInAsUser1, signInAsUser2, signOut, TEST_USERS } from '../../fixtures/auth';

test.describe('Authentication', () => {
  test('should display sign-in page', async ({ page }) => {
    await page.goto('/sign-in');
    await expect(page).toHaveTitle(/SurveyMania/i);
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('text=Sign in to')).toBeVisible();
  });

  test('should sign in with valid credentials', async ({ page }) => {
    await signInAsUser1(page);

    // Verify redirect to dashboard
    await expect(page).toHaveURL('/dashboard');

    // Verify user is signed in (check for user button or name)
    await expect(page.locator(`text=${TEST_USERS.user1.name}`)).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/sign-in');

    // Wait for form to load
    await page.waitForSelector('input[type="email"]');

    // Fill in invalid credentials
    await page.fill('input[type="email"]', 'invalid@example.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button:has-text("Continue")');

    // Wait for error message
    await expect(page.locator('text=/invalid|error|incorrect|wrong/i')).toBeVisible({ timeout: 10000 });
  });

  test('should sign out successfully', async ({ page }) => {
    // Sign in first
    await signInAsUser1(page);

    // Sign out
    await signOut(page);

    // Verify redirect to sign-in or home
    await expect(page.url()).toMatch(/\/(sign-in|$)/);
  });

  test('should persist session after page reload', async ({ page }) => {
    await signInAsUser1(page);

    // Reload page
    await page.reload();

    // Verify still signed in
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator(`text=${TEST_USERS.user1.name}`)).toBeVisible();
  });

  test('should redirect to sign-in when accessing protected routes', async ({ page }) => {
    // Try to access dashboard without authentication
    await page.goto('/dashboard/surveys');

    // Should redirect to sign-in
    await expect(page).toHaveURL(/sign-in/);
  });

  test('should allow switching between users', async ({ page }) => {
    // Sign in as user 1
    await signInAsUser1(page);
    await expect(page.locator(`text=${TEST_USERS.user1.name}`)).toBeVisible();

    // Sign out
    await signOut(page);

    // Sign in as user 2
    await signInAsUser2(page);
    await expect(page.locator(`text=${TEST_USERS.user2.name}`)).toBeVisible();
  });
});
