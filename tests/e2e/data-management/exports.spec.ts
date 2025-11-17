import { test, expect } from '@playwright/test';
import { signInAsUser1 } from '../../fixtures/auth';

test.describe('Export Formats', () => {
  test.beforeEach(async ({ page }) => {
    await signInAsUser1(page);
  });

  test('should export responses as CSV', async ({ page }) => {
    await page.goto('/dashboard/surveys');

    // Navigate to responses page
    await page.click('a:has-text("Customer Satisfaction Survey")');
    await page.click('a:has-text("Responses")');

    // Click export button
    const downloadPromise = page.waitForEvent('download');
    await page.click('button:has-text("Export")');
    await page.click('button:has-text("CSV")');

    const download = await downloadPromise;

    // Verify download
    expect(download.suggestedFilename()).toMatch(/\.csv$/);

    // Verify file content
    const path = await download.path();
    const fs = require('fs');
    const content = fs.readFileSync(path, 'utf8');

    // Should have headers
    expect(content).toContain('Submitted');
    expect(content).toContain('Status');
  });

  test('should export responses as XLSX', async ({ page }) => {
    await page.goto('/dashboard/surveys');
    await page.click('a:has-text("Customer Satisfaction Survey")');
    await page.click('a:has-text("Responses")');

    const downloadPromise = page.waitForEvent('download');
    await page.click('button:has-text("Export")');
    await page.click('button:has-text("Excel")');

    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.xlsx$/);
  });

  test('should export responses as JSON', async ({ page }) => {
    await page.goto('/dashboard/surveys');
    await page.click('a:has-text("Customer Satisfaction Survey")');
    await page.click('a:has-text("Responses")');

    const downloadPromise = page.waitForEvent('download');
    await page.click('button:has-text("Export")');
    await page.click('button:has-text("JSON")');

    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.json$/);

    // Verify valid JSON
    const path = await download.path();
    const fs = require('fs');
    const content = fs.readFileSync(path, 'utf8');
    const json = JSON.parse(content);

    expect(json.survey).toBeDefined();
    expect(json.responses).toBeInstanceOf(Array);
  });

  test('should export responses as PDF', async ({ page }) => {
    await page.goto('/dashboard/surveys');
    await page.click('a:has-text("Customer Satisfaction Survey")');
    await page.click('a:has-text("Responses")');

    const downloadPromise = page.waitForEvent('download');
    await page.click('button:has-text("Export")');
    await page.click('button:has-text("PDF")');

    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.pdf$/);
  });

  test('should export responses as GeoJSON (with location data)', async ({ page }) => {
    await page.goto('/dashboard/surveys');
    await page.click('a:has-text("Customer Satisfaction Survey")');
    await page.click('a:has-text("Responses")');

    const downloadPromise = page.waitForEvent('download');
    await page.click('button:has-text("Export")');
    await page.click('button:has-text("GeoJSON")');

    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.geojson$/);

    // Verify GeoJSON format
    const path = await download.path();
    const fs = require('fs');
    const content = fs.readFileSync(path, 'utf8');
    const geojson = JSON.parse(content);

    expect(geojson.type).toBe('FeatureCollection');
    expect(geojson.features).toBeInstanceOf(Array);

    if (geojson.features.length > 0) {
      expect(geojson.features[0].geometry.type).toBe('Point');
      expect(geojson.features[0].geometry.coordinates).toHaveLength(2);
    }
  });

  test('should export responses as KML (Google Earth format)', async ({ page }) => {
    await page.goto('/dashboard/surveys');
    await page.click('a:has-text("Customer Satisfaction Survey")');
    await page.click('a:has-text("Responses")');

    const downloadPromise = page.waitForEvent('download');
    await page.click('button:has-text("Export")');
    await page.click('button:has-text("KML")');

    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.kml$/);

    // Verify KML format (XML)
    const path = await download.path();
    const fs = require('fs');
    const content = fs.readFileSync(path, 'utf8');

    expect(content).toContain('<?xml');
    expect(content).toContain('<kml');
    expect(content).toContain('</kml>');
  });

  test('should track export history', async ({ page }) => {
    await page.goto('/dashboard/surveys');
    await page.click('a:has-text("Customer Satisfaction Survey")');

    // Trigger export
    await page.click('a:has-text("Responses")');
    const downloadPromise = page.waitForEvent('download');
    await page.click('button:has-text("Export")');
    await page.click('button:has-text("CSV")');
    await downloadPromise;

    // Navigate to export history
    await page.click('a:has-text("Exports")');

    // Verify export is logged
    await expect(page.locator('text=/CSV|csv/i')).toBeVisible();
    await expect(page.locator('text=/today|just now|ago/i')).toBeVisible();
  });

  test('should show file size in export history', async ({ page }) => {
    await page.goto('/dashboard/surveys');
    await page.click('a:has-text("Customer Satisfaction Survey")');
    await page.click('a:has-text("Exports")');

    // If there are exports, verify file size is shown
    const exportRow = page.locator('[data-testid="export-row"]').first();
    if (await exportRow.isVisible()) {
      await expect(exportRow.locator('text=/KB|MB|bytes/i')).toBeVisible();
    }
  });

  test('should export with survey title in filename', async ({ page }) => {
    await page.goto('/dashboard/surveys');
    await page.click('a:has-text("Customer Satisfaction Survey")');
    await page.click('a:has-text("Responses")');

    const downloadPromise = page.waitForEvent('download');
    await page.click('button:has-text("Export")');
    await page.click('button:has-text("CSV")');

    const download = await downloadPromise;
    const filename = download.suggestedFilename();

    // Should contain survey title or ID
    expect(filename).toMatch(/customer.*satisfaction|survey.*\d+/i);
  });

  test('should handle empty survey export gracefully', async ({ page }) => {
    // Create new survey with no responses
    await page.goto('/dashboard/surveys/new');
    await page.fill('input[name="title"]', 'Empty Survey');
    await page.click('button:has-text("Save Draft")');

    await page.click('a:has-text("Responses")');

    const downloadPromise = page.waitForEvent('download');
    await page.click('button:has-text("Export")');
    await page.click('button:has-text("CSV")');

    const download = await downloadPromise;

    // Should still export (with just headers)
    expect(download).toBeDefined();
  });
});
