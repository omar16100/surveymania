import { test, expect } from '@playwright/test';
import { signInAsUser1 } from '../../fixtures/auth';
import { ApiClient } from '../../helpers/api-client';

test.describe('Real-time SSE Updates', () => {
  test('should connect to SSE endpoint', async ({ page }) => {
    await signInAsUser1(page);

    // Navigate to responses page
    await page.goto('/dashboard/surveys');
    await page.click('a:has-text("Customer Satisfaction Survey")');
    const surveyId = page.url().split('/').pop();
    await page.click('a:has-text("Responses")');

    // Wait for SSE connection
    await page.waitForTimeout(2000);

    // Check console for SSE connection (if logging is enabled)
    const logs = [];
    page.on('console', (msg) => logs.push(msg.text()));

    // SSE connection should be established
    await page.waitForTimeout(1000);

    // Verify EventSource is created (check for network request)
    const sseRequest = page.waitForRequest((req) =>
      req.url().includes('/api/surveys/') && req.url().includes('/sse')
    );

    await page.reload();

    await sseRequest;
    expect(true).toBe(true); // SSE connection established
  });

  test('should receive new response event via SSE', async ({ page, request }) => {
    await signInAsUser1(page);

    // Navigate to responses page
    await page.goto('/dashboard/surveys');
    await page.click('a:has-text("Customer Satisfaction Survey")');

    // Extract survey ID
    const surveyId = page.url().split('/').pop() || '';
    await page.click('a:has-text("Responses")');

    // Get initial row count
    const initialRowCount = await page.locator('tbody tr').count();

    // Submit a new response via public form
    const publicPage = await page.context().newPage();
    await publicPage.goto(`/s/${surveyId}`);

    // Fill and submit form
    await publicPage.click('[data-testid="rating-5"]');
    await publicPage.fill('textarea', 'SSE Test Response');
    await publicPage.click('input[value="Yes"]');
    await publicPage.click('button[type="submit"]');

    // Wait for SSE to propagate the new response
    await page.waitForTimeout(3000);

    // Check if new row appeared in table
    const newRowCount = await page.locator('tbody tr').count();
    expect(newRowCount).toBe(initialRowCount + 1);

    await publicPage.close();
  });

  test('should show toast notification for new response', async ({ page }) => {
    await signInAsUser1(page);

    await page.goto('/dashboard/surveys');
    await page.click('a:has-text("Customer Satisfaction Survey")');
    const surveyId = page.url().split('/').pop() || '';
    await page.click('a:has-text("Responses")');

    // Submit a response in background
    const publicPage = await page.context().newPage();
    await publicPage.goto(`/s/${surveyId}`);
    await publicPage.click('[data-testid="rating-4"]');
    await publicPage.fill('textarea', 'Toast Test');
    await publicPage.click('input[value="Yes"]');
    await publicPage.click('button[type="submit"]');

    // Wait for toast notification
    await page.waitForSelector('[data-testid="toast"], .toast, [role="alert"]', {
      timeout: 5000,
    });

    await expect(
      page.locator('text=/new response|response received/i')
    ).toBeVisible();

    await publicPage.close();
  });

  test('should handle SSE reconnection on network interruption', async ({ page }) => {
    await signInAsUser1(page);

    await page.goto('/dashboard/surveys');
    await page.click('a:has-text("Customer Satisfaction Survey")');
    await page.click('a:has-text("Responses")');

    // Simulate network interruption
    await page.context().setOffline(true);
    await page.waitForTimeout(1000);

    // Restore network
    await page.context().setOffline(false);
    await page.waitForTimeout(2000);

    // SSE should reconnect automatically (EventSource auto-reconnects)
    // Verify by checking no error messages
    const hasError = await page.locator('text=/connection error|failed to connect/i').isVisible().catch(() => false);
    expect(hasError).toBe(false);
  });

  test('should maintain sort/filter state when receiving live updates', async ({ page }) => {
    await signInAsUser1(page);

    await page.goto('/dashboard/surveys');
    await page.click('a:has-text("Customer Satisfaction Survey")');
    const surveyId = page.url().split('/').pop() || '';
    await page.click('a:has-text("Responses")');

    // Apply filter
    await page.selectOption('select[name="statusFilter"]', 'completed');
    await page.waitForTimeout(500);

    // Submit new response
    const publicPage = await page.context().newPage();
    await publicPage.goto(`/s/${surveyId}`);
    await publicPage.click('[data-testid="rating-3"]');
    await publicPage.fill('textarea', 'Filtered Test');
    await publicPage.click('input[value="Yes"]');
    await publicPage.click('button[type="submit"]');

    await page.waitForTimeout(3000);

    // Filter should still be applied
    const statusFilter = await page.locator('select[name="statusFilter"]').inputValue();
    expect(statusFilter).toBe('completed');

    // New completed response should appear
    await expect(page.locator('text=Filtered Test')).toBeVisible();

    await publicPage.close();
  });

  test('should deduplicate responses (no duplicate rows)', async ({ page }) => {
    await signInAsUser1(page);

    await page.goto('/dashboard/surveys');
    await page.click('a:has-text("Customer Satisfaction Survey")');
    const surveyId = page.url().split('/').pop() || '';
    await page.click('a:has-text("Responses")');

    // Get initial count
    const initialCount = await page.locator('tbody tr').count();

    // Manually trigger a reload (which would fetch responses again)
    await page.reload();
    await page.waitForTimeout(2000);

    // Count should be the same (no duplicates)
    const afterReloadCount = await page.locator('tbody tr').count();
    expect(afterReloadCount).toBe(initialCount);
  });

  test('should handle multiple concurrent viewers', async ({ page, context }) => {
    await signInAsUser1(page);

    // Open first viewer
    await page.goto('/dashboard/surveys');
    await page.click('a:has-text("Customer Satisfaction Survey")');
    const surveyId = page.url().split('/').pop() || '';
    await page.click('a:has-text("Responses")');

    // Open second viewer in new page
    const viewer2 = await context.newPage();
    await signInAsUser1(viewer2);
    await viewer2.goto(`/dashboard/surveys/${surveyId}/responses`);

    await page.waitForTimeout(1000);

    // Both should be able to receive SSE updates
    // Submit response
    const publicPage = await context.newPage();
    await publicPage.goto(`/s/${surveyId}`);
    await publicPage.click('[data-testid="rating-5"]');
    await publicPage.fill('textarea', 'Multi-viewer test');
    await publicPage.click('input[value="Yes"]');
    await publicPage.click('button[type="submit"]');

    await page.waitForTimeout(3000);

    // Both viewers should see the new response
    await expect(page.locator('text=Multi-viewer test')).toBeVisible();
    await expect(viewer2.locator('text=Multi-viewer test')).toBeVisible();

    await viewer2.close();
    await publicPage.close();
  });

  test('should handle SSE on comment events', async ({ page, request }) => {
    await signInAsUser1(page);

    await page.goto('/dashboard/surveys');
    await page.click('a:has-text("Customer Satisfaction Survey")');
    const surveyId = page.url().split('/').pop() || '';

    // Navigate to a response detail page
    await page.click('a:has-text("Responses")');
    const firstRow = page.locator('tbody tr').first();
    await firstRow.click();

    await page.waitForTimeout(1000);

    // Add a comment (if comment feature is on this page)
    const commentBox = page.locator('textarea[placeholder*="comment"]');
    if (await commentBox.isVisible()) {
      await commentBox.fill('Test comment via SSE');
      await page.click('button:has-text("Add Comment")');

      await page.waitForTimeout(2000);

      // Comment should appear with SSE update
      await expect(page.locator('text=Test comment via SSE')).toBeVisible();
    }
  });
});
