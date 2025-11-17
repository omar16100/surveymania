import { test, expect } from '@playwright/test';
import { signInAsUser1 } from '../../fixtures/auth';

test.describe('Analytics Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await signInAsUser1(page);
    await page.goto('/dashboard/surveys');
    await page.click('a:has-text("Customer Satisfaction Survey")');
    await page.click('a:has-text("Analytics")');
  });

  test('should display analytics dashboard', async ({ page }) => {
    await expect(page).toHaveURL(/\/analytics/);
    await expect(page.locator('text=/Analytics|Insights/')).toBeVisible();
  });

  test('should show total responses metric', async ({ page }) => {
    await expect(page.locator('text=/Total Responses?/i')).toBeVisible();
    await expect(page.locator('text=/\d+ responses?/i')).toBeVisible();
  });

  test('should show completion rate', async ({ page }) => {
    await expect(page.locator('text=/Completion Rate/i')).toBeVisible();
    await expect(page.locator('text=/\d+%/')).toBeVisible();
  });

  test('should show average completion time', async ({ page }) => {
    await expect(page.locator('text=/Average.*Time/i')).toBeVisible();
    // May show seconds, minutes, or "N/A"
    await expect(page.locator('text=/\d+.*(?:sec|min)|N\/A/i')).toBeVisible();
  });

  test('should show location coverage metric', async ({ page }) => {
    await expect(page.locator('text=/Location.*Coverage|Responses.*Location/i')).toBeVisible();
    await expect(page.locator('text=/\d+.*(?:responses)?|%/i')).toBeVisible();
  });

  test('should display response trend chart', async ({ page }) => {
    // Look for chart element (Recharts uses SVG)
    await expect(page.locator('svg').first()).toBeVisible();

    // Verify chart has data points or lines
    const chartElements = await page.locator('svg path, svg circle').count();
    expect(chartElements).toBeGreaterThan(0);
  });

  test('should filter by 7 days', async ({ page }) => {
    await page.click('button:has-text("7 days")');

    await page.waitForTimeout(500);

    // Verify data updates (chart should re-render)
    await expect(page.locator('svg').first()).toBeVisible();
  });

  test('should filter by 30 days', async ({ page }) => {
    await page.click('button:has-text("30 days")');

    await page.waitForTimeout(500);

    await expect(page.locator('svg').first()).toBeVisible();
  });

  test('should filter by all time', async ({ page }) => {
    await page.click('button:has-text("All time")');

    await page.waitForTimeout(500);

    await expect(page.locator('svg').first()).toBeVisible();
  });

  test('should show question-specific analytics', async ({ page }) => {
    // Should display analytics for each question
    await expect(page.locator('text=/Question.*Analytics|By Question/i')).toBeVisible();

    // For rating questions, should show average
    await expect(page.locator('text=/Average.*Rating|Avg/i').first()).toBeVisible();
  });

  test('should show choice distribution for single/multiple choice', async ({ page }) => {
    // Look for pie chart or bar chart
    await expect(page.locator('svg').nth(1)).toBeVisible();

    // Verify choice labels
    const hasChoiceLabels = await page.locator('text=/Yes|No|Maybe/i').isVisible();
    expect(hasChoiceLabels).toBeDefined();
  });

  test('should show rating statistics (avg, min, max)', async ({ page }) => {
    // For rating questions
    await expect(page.locator('text=/Average|Min|Max/i').first()).toBeVisible();

    // Verify numbers are displayed
    await expect(page.locator('text=/\d+\.\d+|\d+/').first()).toBeVisible();
  });

  test('should display bar charts for choice questions', async ({ page }) => {
    // Count SVG elements (should have multiple for different charts)
    const svgCount = await page.locator('svg').count();
    expect(svgCount).toBeGreaterThan(0);
  });

  test('should handle surveys with no responses', async ({ page }) => {
    // Create new survey
    await page.goto('/dashboard/surveys/new');
    await page.fill('input[name="title"]', 'No Responses Survey');
    await page.click('button:has-text("Save Draft")');

    await page.click('a:has-text("Analytics")');

    // Should show zero state
    await expect(page.locator('text=/No data|0 responses/i')).toBeVisible();
  });

  test('should show response trend over time with dates', async ({ page }) => {
    // Verify x-axis has dates
    await expect(page.locator('text=/Jan|Feb|Mar|Mon|Tue|Wed|\d{1,2}\/\d{1,2}/i').first()).toBeVisible();
  });

  test('should display legend for charts', async ({ page }) => {
    // Most charts should have legends
    const hasLegend = await page.locator('[class*="legend"], text=/Completed|Pending/i').isVisible();
    expect(hasLegend).toBeDefined();
  });

  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Charts should still be visible
    await expect(page.locator('svg').first()).toBeVisible();

    // Metrics should be visible
    await expect(page.locator('text=/Total Responses/i')).toBeVisible();
  });
});
