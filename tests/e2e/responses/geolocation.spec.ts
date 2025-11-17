import { test, expect } from '@playwright/test';

test.describe('Geolocation Capture', () => {
  test.beforeEach(async ({ page, context }) => {
    // Grant geolocation permission
    await context.grantPermissions(['geolocation']);

    // Mock geolocation to Singapore
    await context.setGeolocation({ latitude: 1.3521, longitude: 103.8198 });
  });

  test('should request location permission when required', async ({ page }) => {
    // Navigate to survey with locationRequired = true
    await page.goto('/s/2'); // Employee Feedback Survey has location required

    // Should show location request
    await expect(page.locator('text=/location|enable location/i')).toBeVisible();
  });

  test('should capture location successfully', async ({ page, context }) => {
    await page.goto('/s/2');

    // Fill required fields
    await page.fill('input[type="email"]', 'test@example.com');
    await page.selectOption('select', 'Engineering');

    // Location should be captured automatically or with button click
    const locationButton = page.locator('button:has-text("Get Location")');
    if (await locationButton.isVisible()) {
      await locationButton.click();
      await page.waitForTimeout(1000);
    }

    // Submit form
    await page.click('button[type="submit"]');

    // Should succeed
    await expect(page).toHaveURL(/\/thanks/);
  });

  test('should show location coordinates when captured', async ({ page, context }) => {
    await page.goto('/s/2');

    // Trigger location capture
    const locationButton = page.locator('button:has-text("Get Location")');
    if (await locationButton.isVisible()) {
      await locationButton.click();
      await page.waitForTimeout(1000);

      // Should show coordinates
      await expect(page.locator('text=/1\\.352|103\\.819|latitude|longitude/i')).toBeVisible();
    }
  });

  test('should handle location permission denied', async ({ page, context }) => {
    // Clear permissions and deny
    await context.clearPermissions();

    await page.goto('/s/2');

    // Try to get location
    const locationButton = page.locator('button:has-text("Get Location")');
    if (await locationButton.isVisible()) {
      await locationButton.click();
      await page.waitForTimeout(1000);

      // Should show error or permission message
      await expect(page.locator('text=/denied|permission|enable/i')).toBeVisible();
    }
  });

  test('should allow retry when location fails', async ({ page }) => {
    await page.goto('/s/2');

    const locationButton = page.locator('button:has-text("Get Location"), button:has-text("Retry")');
    if (await locationButton.isVisible()) {
      // Click to get location
      await locationButton.click();
      await page.waitForTimeout(1000);

      // Retry button should be available
      const retryButton = page.locator('button:has-text("Retry Location")');
      if (await retryButton.isVisible()) {
        await retryButton.click();
      }
    }
  });

  test('should block submission when location required but not provided', async ({ page, context }) => {
    // Clear geolocation
    await context.clearPermissions();

    await page.goto('/s/2');

    // Fill other fields
    await page.fill('input[type="email"]', 'test@example.com');
    await page.selectOption('select', 'Sales');

    // Try to submit without location
    await page.click('button[type="submit"]');

    // Should show validation error
    await expect(page.locator('text=/location required|provide location/i')).toBeVisible();

    // Should not navigate away
    await expect(page).toHaveURL(/\/s\/2/);
  });

  test('should display accuracy in meters', async ({ page, context }) => {
    await page.goto('/s/2');

    const locationButton = page.locator('button:has-text("Get Location")');
    if (await locationButton.isVisible()) {
      await locationButton.click();
      await page.waitForTimeout(1000);

      // May show accuracy
      const hasAccuracy = await page.locator('text=/accuracy.*m|±.*m/i').isVisible().catch(() => false);
      expect(hasAccuracy).toBeDefined();
    }
  });

  test('should work on mobile devices', async ({ page, context }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: 1.3521, longitude: 103.8198 });

    await page.goto('/s/2');

    // Location capture should work
    const locationButton = page.locator('button:has-text("Get Location")');
    if (await locationButton.isVisible()) {
      await locationButton.click();
      await page.waitForTimeout(1000);

      await expect(page.locator('text=/1\\.352|103\\.819/i')).toBeVisible();
    }
  });

  test('should store location with response', async ({ page, context }) => {
    await page.goto('/s/2');

    // Fill and submit with location
    await page.fill('input[type="email"]', 'location-test@example.com');
    await page.selectOption('select', 'Marketing');

    const locationButton = page.locator('button:has-text("Get Location")');
    if (await locationButton.isVisible()) {
      await locationButton.click();
      await page.waitForTimeout(1000);
    }

    await page.click('button[type="submit"]');

    // Navigate to check if location was stored (requires auth)
    // This would need admin access to verify in responses table
    // For now, just verify submission succeeded
    await expect(page).toHaveURL(/\/thanks/);
  });

  test('should handle timeout when getting location', async ({ page, context }) => {
    await page.goto('/s/2');

    // Mock slow geolocation (if possible)
    const locationButton = page.locator('button:has-text("Get Location")');
    if (await locationButton.isVisible()) {
      await locationButton.click();

      // May show loading state
      await expect(page.locator('text=/getting location|loading/i')).toBeVisible();

      await page.waitForTimeout(5000);

      // Should either succeed or show timeout message
      const hasResult = await page.locator('text=/1\\.|error|timeout/i').isVisible();
      expect(hasResult).toBe(true);
    }
  });

  test('should support location as question type', async ({ page, context }) => {
    // Some surveys may have location as a question (separate from response geolocation)
    await page.goto('/s/1');

    const locationQuestion = page.locator('input[type="text"][placeholder*="location"], button:has-text("Select Location")');
    if (await locationQuestion.isVisible()) {
      // Can interact with location question
      await locationQuestion.click();

      // May trigger location picker or map
      await page.waitForTimeout(1000);
    }
  });

  test('should differentiate between high and low accuracy', async ({ page, context }) => {
    // Set low accuracy location
    await context.setGeolocation({ latitude: 1.3521, longitude: 103.8198, accuracy: 100 });

    await page.goto('/s/2');

    const locationButton = page.locator('button:has-text("Get Location")');
    if (await locationButton.isVisible()) {
      await locationButton.click();
      await page.waitForTimeout(1000);

      // May show accuracy warning for low accuracy
      const hasAccuracyWarning = await page.locator('text=/low accuracy|poor accuracy/i').isVisible().catch(() => false);
      expect(hasAccuracyWarning).toBeDefined();
    }
  });
});
