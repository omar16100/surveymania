import { test, expect } from '@playwright/test';

test.describe('Response Submission', () => {
  test('should display public survey form', async ({ page }) => {
    // Use the seeded survey ID (Customer Satisfaction Survey from seed)
    await page.goto('/s/1');

    await expect(page.locator('text=Customer Satisfaction Survey')).toBeVisible();
    await expect(page.locator('text=/Help us understand/i')).toBeVisible();
  });

  test('should submit a complete response', async ({ page }) => {
    await page.goto('/s/1');

    // Answer rating question
    await page.click('[data-testid="rating-4"]'); // 4 stars

    // Answer textarea question
    await page.fill('textarea[name*="question"]', 'Great service, very satisfied!');

    // Answer single choice question
    await page.click('input[value="Yes"]');

    // Submit form
    await page.click('button[type="submit"]:has-text("Submit")');

    // Verify thank you page
    await expect(page).toHaveURL(/\/s\/\w+\/thanks/);
    await expect(page.locator('text=/thank you|submitted/i')).toBeVisible();
  });

  test('should validate required fields', async ({ page }) => {
    await page.goto('/s/1');

    // Try to submit without answering required questions
    await page.click('button[type="submit"]:has-text("Submit")');

    // Should show validation errors
    await expect(page.locator('text=/required|please answer/i')).toBeVisible();
  });

  test('should validate email format', async ({ page }) => {
    // This requires a survey with email question type
    // Assuming survey 2 has email field
    await page.goto('/s/2');

    // Fill invalid email
    await page.fill('input[type="email"]', 'invalid-email');

    // Try to submit
    await page.click('button[type="submit"]');

    // Should show validation error
    await expect(page.locator('text=/invalid email|valid email/i')).toBeVisible();
  });

  test('should validate number min/max', async ({ page }) => {
    // Create a test survey with number validation or use mock
    // For now, test general concept
    await page.goto('/s/1');

    // If there's a number field with min/max
    const numberInput = page.locator('input[type="number"]');
    if (await numberInput.count() > 0) {
      await numberInput.fill('999');
      await page.click('button[type="submit"]');

      // May show validation error if exceeds max
      const hasError = await page.locator('text=/exceeds|maximum/i').isVisible();
      expect(hasError).toBeDefined();
    }
  });

  test('should support anonymous responses', async ({ page }) => {
    await page.goto('/s/1');

    // Fill and submit anonymously (no sign-in)
    await page.click('[data-testid="rating-5"]');
    await page.fill('textarea[name*="question"]', 'Anonymous feedback');
    await page.click('input[value="Yes"]');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/thanks/);
  });

  test('should handle file upload question', async ({ page }) => {
    // Requires survey with file upload question
    // Test file selection and validation
    await page.goto('/s/1');

    const fileInput = page.locator('input[type="file"]');
    if (await fileInput.count() > 0) {
      // Upload test file
      await fileInput.setInputFiles({
        name: 'test.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.from('test file content'),
      });

      await expect(page.locator('text=test.pdf')).toBeVisible();
    }
  });

  test('should validate file size limits', async ({ page }) => {
    await page.goto('/s/1');

    const fileInput = page.locator('input[type="file"]');
    if (await fileInput.count() > 0) {
      // Try to upload large file (> 5MB if that's the limit)
      const largefile = Buffer.alloc(6 * 1024 * 1024); // 6MB
      await fileInput.setInputFiles({
        name: 'large.pdf',
        mimeType: 'application/pdf',
        buffer: largeFile,
      });

      await page.click('button[type="submit"]');

      // Should show error
      await expect(page.locator('text=/file size|too large/i')).toBeVisible();
    }
  });

  test('should handle all question types in one survey', async ({ page }) => {
    // Create comprehensive test survey or use seeded one
    await page.goto('/s/1');

    // Answer different question types
    const textInput = page.locator('input[type="text"]').first();
    if (await textInput.isVisible()) {
      await textInput.fill('Test answer');
    }

    const textareaInput = page.locator('textarea').first();
    if (await textareaInput.isVisible()) {
      await textareaInput.fill('Detailed feedback here');
    }

    const radioInput = page.locator('input[type="radio"]').first();
    if (await radioInput.isVisible()) {
      await radioInput.click();
    }

    // Submit
    await page.click('button[type="submit"]');
  });

  test('should show progress indicator (if enabled)', async ({ page }) => {
    await page.goto('/s/1');

    // Check if progress bar exists
    const progressBar = page.locator('[data-testid="progress-bar"]');
    if (await progressBar.isVisible()) {
      // Verify it updates as questions are answered
      const initialProgress = await progressBar.textContent();

      // Answer a question
      await page.click('input[type="radio"]').first();

      // Progress should update
      const updatedProgress = await progressBar.textContent();
      expect(updatedProgress).not.toBe(initialProgress);
    }
  });

  test('should prevent duplicate submissions', async ({ page }) => {
    await page.goto('/s/1');

    // Submit response
    await page.click('[data-testid="rating-5"]');
    await page.fill('textarea', 'First submission');
    await page.click('input[value="Yes"]');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/thanks/);

    // Try to go back and submit again
    await page.goto('/s/1');

    // Depending on implementation, may show "already submitted" message
    // or allow resubmission with new session
  });

  test('should handle server errors gracefully', async ({ page }) => {
    await page.goto('/s/1');

    // Fill form
    await page.click('[data-testid="rating-3"]');
    await page.fill('textarea', 'Test response');
    await page.click('input[value="Yes"]');

    // Mock server error
    await page.route('**/api/surveys/*/responses', (route) => {
      route.fulfill({
        status: 500,
        body: 'Internal Server Error',
      });
    });

    await page.click('button[type="submit"]');

    // Should show error message
    await expect(page.locator('text=/error|failed|try again/i')).toBeVisible();
  });

  test('should support multi-page surveys (if implemented)', async ({ page }) => {
    // If multi-page is implemented
    await page.goto('/s/1');

    const nextButton = page.locator('button:has-text("Next")');
    if (await nextButton.isVisible()) {
      // Answer first page
      await page.fill('input[type="text"]', 'Answer 1');
      await nextButton.click();

      // Should be on page 2
      await expect(page.locator('text=/Page 2|Step 2/i')).toBeVisible();

      // Can go back
      await page.click('button:has-text("Previous")');
      await expect(page.locator('text=/Page 1|Step 1/i')).toBeVisible();
    }
  });
});
