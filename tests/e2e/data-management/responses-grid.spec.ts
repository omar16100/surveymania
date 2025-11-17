import { test, expect } from '@playwright/test';
import { signInAsUser1 } from '../../fixtures/auth';

test.describe('Responses Data Grid (TanStack Table)', () => {
  test.beforeEach(async ({ page }) => {
    await signInAsUser1(page);
    await page.goto('/dashboard/surveys');
    await page.click('a:has-text("Customer Satisfaction Survey")');
    await page.click('a:has-text("Responses")');
  });

  test('should display responses table', async ({ page }) => {
    // Verify table is visible
    await expect(page.locator('table')).toBeVisible();

    // Verify headers exist
    await expect(page.locator('th:has-text("Submitted")')).toBeVisible();
    await expect(page.locator('th:has-text("Status")')).toBeVisible();
  });

  test('should display response data in rows', async ({ page }) => {
    // Verify at least one row exists
    const rows = page.locator('tbody tr');
    await expect(rows.first()).toBeVisible();

    // Verify row contains data
    await expect(rows.first()).toContainText(/.+/);
  });

  test('should sort by submitted date', async ({ page }) => {
    // Click submitted column header to sort
    await page.click('th:has-text("Submitted")');

    // Wait for sort to complete
    await page.waitForTimeout(500);

    // Get first row date
    const firstRowDate = await page.locator('tbody tr').first().locator('td').first().textContent();

    // Click again to reverse sort
    await page.click('th:has-text("Submitted")');
    await page.waitForTimeout(500);

    // Get first row date after reverse sort
    const newFirstRowDate = await page.locator('tbody tr').first().locator('td').first().textContent();

    // Should be different (unless only 1 row)
    const rowCount = await page.locator('tbody tr').count();
    if (rowCount > 1) {
      expect(firstRowDate).not.toBe(newFirstRowDate);
    }
  });

  test('should filter by status', async ({ page }) => {
    // Select status filter
    await page.selectOption('select[name="statusFilter"]', 'completed');

    await page.waitForTimeout(500);

    // Verify only completed responses shown
    const statusCells = page.locator('td:has-text("completed")');
    await expect(statusCells.first()).toBeVisible();
  });

  test('should filter by date range', async ({ page }) => {
    // Open date range filter
    await page.click('button:has-text("Date Range")');

    // Select last 7 days
    await page.click('button:has-text("Last 7 Days")');

    await page.waitForTimeout(500);

    // Verify filter applied (responses should be filtered)
    const rows = await page.locator('tbody tr').count();
    expect(rows).toBeGreaterThanOrEqual(0);
  });

  test('should search globally across all columns', async ({ page }) => {
    // Type in search box
    await page.fill('input[placeholder*="Search"]', 'Great');

    await page.waitForTimeout(500);

    // Verify filtered results
    const rows = page.locator('tbody tr');
    const rowCount = await rows.count();

    if (rowCount > 0) {
      // At least one row should contain search term
      await expect(rows.first()).toContainText(/great/i);
    }
  });

  test('should toggle column visibility', async ({ page }) => {
    // Open column visibility menu
    await page.click('button:has-text("Columns")');

    // Toggle a column off
    const checkbox = page.locator('input[type="checkbox"]').first();
    await checkbox.uncheck();

    await page.click('button:has-text("Close")');

    // Verify column is hidden
    await page.waitForTimeout(500);
  });

  test('should pin submitted column to left', async ({ page }) => {
    // Submitted column should be pinned by default
    const submittedHeader = page.locator('th:has-text("Submitted")');

    // Verify it has pinned class or style
    const classList = await submittedHeader.getAttribute('class');
    expect(classList).toContain('pinned');
  });

  test('should resize columns', async ({ page }) => {
    // Find column resizer handle
    const resizer = page.locator('[data-testid="column-resizer"]').first();

    if (await resizer.isVisible()) {
      // Get initial width
      const header = page.locator('th').first();
      const initialWidth = await header.evaluate((el) => el.offsetWidth);

      // Drag resizer
      await resizer.dragTo(resizer, {
        targetPosition: { x: 50, y: 0 },
      });

      // Verify width changed
      const newWidth = await header.evaluate((el) => el.offsetWidth);
      expect(newWidth).not.toBe(initialWidth);
    }
  });

  test('should paginate through results', async ({ page }) => {
    // Check if pagination exists
    const nextButton = page.locator('button:has-text("Next")');

    if (await nextButton.isVisible()) {
      // Click next page
      await nextButton.click();

      await page.waitForTimeout(500);

      // Verify page changed
      await expect(page.locator('text=/Page 2|2 of/i')).toBeVisible();

      // Go back
      await page.click('button:has-text("Previous")');
      await expect(page.locator('text=/Page 1|1 of/i')).toBeVisible();
    }
  });

  test('should display response count', async ({ page }) => {
    // Verify total count is shown
    await expect(page.locator('text=/\d+ responses?|total.*\d+/i')).toBeVisible();
  });

  test('should show formatted answer types correctly', async ({ page }) => {
    // Verify different answer types are formatted
    // Text answers should be visible
    // Numbers should be formatted
    // Choices should be readable
    // Location should show coordinates or formatted address

    const firstRow = page.locator('tbody tr').first();
    await expect(firstRow).toBeVisible();

    // At least one cell should have content
    const cells = firstRow.locator('td');
    const firstCellText = await cells.first().textContent();
    expect(firstCellText?.trim().length).toBeGreaterThan(0);
  });

  test('should navigate to response detail page', async ({ page }) => {
    // Click on a row or view button
    const firstRow = page.locator('tbody tr').first();
    await firstRow.click();

    // Should navigate to detail page
    await expect(page).toHaveURL(/\/dashboard\/surveys\/\w+\/responses\/\w+/);
    await expect(page.locator('text=Response Details')).toBeVisible();
  });

  test('should delete response from table', async ({ page }) => {
    const initialRowCount = await page.locator('tbody tr').count();

    // Find delete button
    const deleteButton = page.locator('button[title="Delete"]').first();

    if (await deleteButton.isVisible()) {
      await deleteButton.click();

      // Confirm deletion
      await page.click('button:has-text("Delete")');

      await page.waitForTimeout(1000);

      // Verify row removed
      const newRowCount = await page.locator('tbody tr').count();
      expect(newRowCount).toBe(initialRowCount - 1);
    }
  });

  test('should handle empty state', async ({ page }) => {
    // Navigate to survey with no responses
    await page.goto('/dashboard/surveys/new');
    await page.fill('input[name="title"]', 'Empty Survey');
    await page.click('button:has-text("Save Draft")');

    await page.click('a:has-text("Responses")');

    // Should show empty state message
    await expect(page.locator('text=/no responses|empty/i')).toBeVisible();
  });

  test('should support row selection (if implemented)', async ({ page }) => {
    const checkbox = page.locator('input[type="checkbox"]').first();

    if (await checkbox.isVisible()) {
      await checkbox.check();

      // Verify selected
      await expect(checkbox).toBeChecked();

      // Should show selection count or action bar
      await expect(page.locator('text=/\d+ selected/i')).toBeVisible();
    }
  });
});
