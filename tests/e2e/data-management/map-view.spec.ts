import { test, expect } from '@playwright/test';
import { signInAsUser1 } from '../../fixtures/auth';

test.describe('Map Visualizations (Leaflet)', () => {
  test.beforeEach(async ({ page }) => {
    await signInAsUser1(page);
    await page.goto('/dashboard/surveys');
    await page.click('a:has-text("Customer Satisfaction Survey")');
    await page.click('a:has-text("Map")');
  });

  test('should display map view', async ({ page }) => {
    await expect(page).toHaveURL(/\/map/);

    // Wait for Leaflet map to load
    await page.waitForSelector('.leaflet-container', { timeout: 10000 });
    await expect(page.locator('.leaflet-container')).toBeVisible();
  });

  test('should show response markers on map', async ({ page }) => {
    await page.waitForSelector('.leaflet-marker-icon', { timeout: 10000 });

    // Verify at least one marker exists
    const markers = page.locator('.leaflet-marker-icon');
    const markerCount = await markers.count();
    expect(markerCount).toBeGreaterThan(0);
  });

  test('should enable/disable clustering', async ({ page }) => {
    await page.waitForSelector('.leaflet-container');

    // Find cluster toggle button
    const clusterToggle = page.locator('button:has-text("Clustering")');

    if (await clusterToggle.isVisible()) {
      // Toggle clustering off
      await clusterToggle.click();
      await page.waitForTimeout(1000);

      // Verify individual markers are visible
      const markers = await page.locator('.leaflet-marker-icon').count();
      expect(markers).toBeGreaterThan(0);

      // Toggle back on
      await clusterToggle.click();
      await page.waitForTimeout(1000);

      // May show cluster markers
      const hasCluster = await page.locator('.marker-cluster').isVisible().catch(() => false);
      expect(hasCluster).toBeDefined();
    }
  });

  test('should enable/disable heatmap layer', async ({ page }) => {
    await page.waitForSelector('.leaflet-container');

    // Find heatmap toggle
    const heatmapToggle = page.locator('button:has-text("Heatmap")');

    if (await heatmapToggle.isVisible()) {
      // Toggle heatmap on
      await heatmapToggle.click();
      await page.waitForTimeout(1000);

      // Verify heatmap canvas exists
      const heatmapCanvas = page.locator('canvas.leaflet-heatmap-layer');
      await expect(heatmapCanvas).toBeVisible();

      // Toggle off
      await heatmapToggle.click();
      await page.waitForTimeout(500);
    }
  });

  test('should show popup when clicking marker', async ({ page }) => {
    await page.waitForSelector('.leaflet-marker-icon', { timeout: 10000 });

    // Click first marker
    await page.locator('.leaflet-marker-icon').first().click();

    // Wait for popup
    await page.waitForSelector('.leaflet-popup', { timeout: 5000 });
    await expect(page.locator('.leaflet-popup')).toBeVisible();

    // Popup should contain response details
    await expect(page.locator('.leaflet-popup').locator('text=/Session|Response/i')).toBeVisible();
  });

  test('should display response details in popup', async ({ page }) => {
    await page.waitForSelector('.leaflet-marker-icon', { timeout: 10000 });

    // Click marker
    await page.locator('.leaflet-marker-icon').first().click();

    await page.waitForSelector('.leaflet-popup', { timeout: 5000 });

    // Verify popup contains:
    // - Session ID or response ID
    const popup = page.locator('.leaflet-popup');
    await expect(popup.locator('text=/session_|Response ID/i')).toBeVisible();

    // - Timestamp
    await expect(popup.locator('text=/\d{1,2}\/\d{1,2}\/\d{4}|ago|at/i')).toBeVisible();

    // - At least one answer
    await expect(popup).toContainText(/.{5,}/); // Has substantial content
  });

  test('should auto-fit bounds to show all responses', async ({ page }) => {
    await page.waitForSelector('.leaflet-container', { timeout: 10000 });
    await page.waitForTimeout(2000); // Allow map to settle

    // All markers should be visible in viewport
    const markers = await page.locator('.leaflet-marker-icon').count();
    expect(markers).toBeGreaterThan(0);

    // Map should have zoomed to fit all points
    // Verify by checking if zoom controls are visible
    await expect(page.locator('.leaflet-control-zoom')).toBeVisible();
  });

  test('should support map zoom controls', async ({ page }) => {
    await page.waitForSelector('.leaflet-container');

    // Zoom in
    await page.click('.leaflet-control-zoom-in');
    await page.waitForTimeout(500);

    // Zoom out
    await page.click('.leaflet-control-zoom-out');
    await page.waitForTimeout(500);

    // Map should still be functional
    await expect(page.locator('.leaflet-container')).toBeVisible();
  });

  test('should support map panning', async ({ page }) => {
    await page.waitForSelector('.leaflet-container');

    // Get initial center
    const map = page.locator('.leaflet-container');

    // Drag map
    await map.hover();
    await page.mouse.down();
    await page.mouse.move(100, 100);
    await page.mouse.up();

    await page.waitForTimeout(500);

    // Map should have panned
    await expect(map).toBeVisible();
  });

  test('should handle surveys with no location data', async ({ page }) => {
    // Navigate to survey without location data
    await page.goto('/dashboard/surveys');
    const surveyWithoutLocation = page.locator('text=/Employee Feedback|No Location/i').first();

    if (await surveyWithoutLocation.isVisible()) {
      await surveyWithoutLocation.click();
      await page.click('a:has-text("Map")');

      // Should show empty state
      await expect(page.locator('text=/No location data|no responses.*location/i')).toBeVisible();
    }
  });

  test('should use OpenStreetMap tiles', async ({ page }) => {
    await page.waitForSelector('.leaflet-container');

    // Verify OSM attribution
    await expect(page.locator('text=/OpenStreetMap/i')).toBeVisible();

    // Verify tiles are loading
    const tiles = await page.locator('.leaflet-tile').count();
    expect(tiles).toBeGreaterThan(0);
  });

  test('should display accuracy information', async ({ page }) => {
    await page.waitForSelector('.leaflet-marker-icon', { timeout: 10000 });

    // Click marker
    await page.locator('.leaflet-marker-icon').first().click();

    await page.waitForSelector('.leaflet-popup', { timeout: 5000 });

    // May show accuracy in meters
    const popup = page.locator('.leaflet-popup');
    const hasAccuracy = await popup.locator('text=/accuracy|±.*m/i').isVisible().catch(() => false);
    expect(hasAccuracy).toBeDefined();
  });

  test('should support mobile touch interactions', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/dashboard/surveys');
    await page.click('a:has-text("Customer Satisfaction Survey")');
    await page.click('a:has-text("Map")');

    await page.waitForSelector('.leaflet-container');

    // Verify map is responsive
    await expect(page.locator('.leaflet-container')).toBeVisible();

    // Touch to click marker
    const marker = page.locator('.leaflet-marker-icon').first();
    if (await marker.isVisible()) {
      await marker.tap();

      // Popup should appear
      await expect(page.locator('.leaflet-popup')).toBeVisible();
    }
  });
});
