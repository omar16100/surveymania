import { test, expect } from '@playwright/test';
import { signInAsUser1 } from '../../fixtures/auth';

test.describe('Distribution & Sharing Tools', () => {
  test.beforeEach(async ({ page }) => {
    await signInAsUser1(page);
    await page.goto('/dashboard/surveys');
    await page.click('a:has-text("Customer Satisfaction Survey")');
  });

  test('should display share page', async ({ page }) => {
    await page.click('a:has-text("Share")');

    await expect(page).toHaveURL(/\/share/);
    await expect(page.locator('text=/Share|Distribution/i')).toBeVisible();
  });

  test('should show public survey URL', async ({ page }) => {
    await page.click('a:has-text("Share")');

    // Verify URL is displayed
    const urlInput = page.locator('input[value*="/s/"]');
    await expect(urlInput).toBeVisible();

    // Verify it's a full URL
    const url = await urlInput.inputValue();
    expect(url).toMatch(/^https?:\/\/.+\/s\/\w+$/);
  });

  test('should copy public link to clipboard', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

    await page.click('a:has-text("Share")');

    // Click copy button
    await page.click('button:has-text("Copy Link")');

    // Wait for copy animation/toast
    await page.waitForTimeout(500);

    // Verify copy confirmation (button text change or toast)
    await expect(page.locator('text=/Copied|Copied!/i')).toBeVisible();

    // Verify clipboard contains the URL
    const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboardText).toMatch(/\/s\/\w+/);
  });

  test('should generate QR code', async ({ page }) => {
    await page.click('a:has-text("Share")');

    // Verify QR code is displayed (canvas or image)
    const qrCode = page.locator('canvas, img[alt*="QR"]');
    await expect(qrCode).toBeVisible();

    // Verify it has dimensions
    const box = await qrCode.boundingBox();
    expect(box?.width).toBeGreaterThan(100);
    expect(box?.height).toBeGreaterThan(100);
  });

  test('should download QR code as PNG', async ({ page }) => {
    await page.click('a:has-text("Share")');

    // Click download PNG button
    const downloadPromise = page.waitForEvent('download');
    await page.click('button:has-text("Download PNG")');

    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.png$/);
  });

  test('should download QR code as SVG', async ({ page }) => {
    await page.click('a:has-text("Share")');

    // Click download SVG button
    const downloadPromise = page.waitForEvent('download');
    await page.click('button:has-text("Download SVG")');

    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.svg$/);
  });

  test('should generate embed code (iframe)', async ({ page }) => {
    await page.click('a:has-text("Share")');

    // Find embed code section
    await expect(page.locator('text=/Embed|Widget/i')).toBeVisible();

    // Verify iframe code is shown
    const embedCode = page.locator('textarea, code').filter({ hasText: 'iframe' });
    await expect(embedCode).toBeVisible();

    // Code should contain survey URL
    const codeText = await embedCode.textContent();
    expect(codeText).toContain('/s/');
    expect(codeText).toContain('iframe');
  });

  test('should copy embed code', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

    await page.click('a:has-text("Share")');

    // Click copy embed code button
    await page.click('button:has-text("Copy Embed Code")');

    await page.waitForTimeout(500);

    // Verify copied
    await expect(page.locator('text=/Copied/i')).toBeVisible();

    const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboardText).toContain('iframe');
  });

  test('should share on WhatsApp', async ({ page, context }) => {
    await page.click('a:has-text("Share")');

    // Click WhatsApp share button
    const [newPage] = await Promise.all([
      context.waitForEvent('page'),
      page.click('a[href*="whatsapp"], button:has-text("WhatsApp")'),
    ]);

    // Verify WhatsApp URL
    expect(newPage.url()).toContain('whatsapp.com');
    expect(newPage.url()).toContain('text=');

    await newPage.close();
  });

  test('should share on Twitter', async ({ page, context }) => {
    await page.click('a:has-text("Share")');

    // Click Twitter share button
    const [newPage] = await Promise.all([
      context.waitForEvent('page'),
      page.click('a[href*="twitter"], button:has-text("Twitter")'),
    ]);

    // Verify Twitter URL
    expect(newPage.url()).toContain('twitter.com');
    expect(newPage.url()).toContain('text=');

    await newPage.close();
  });

  test('should share on LinkedIn', async ({ page, context }) => {
    await page.click('a:has-text("Share")');

    // Click LinkedIn share button
    const [newPage] = await Promise.all([
      context.waitForEvent('page'),
      page.click('a[href*="linkedin"], button:has-text("LinkedIn")'),
    ]);

    // Verify LinkedIn URL
    expect(newPage.url()).toContain('linkedin.com');
    expect(newPage.url()).toContain('url=');

    await newPage.close();
  });

  test('should show warning for non-active surveys', async ({ page }) => {
    // Navigate to draft survey
    await page.goto('/dashboard/surveys');
    const draftSurvey = page.locator('text=/Employee Feedback/i').first();

    if (await draftSurvey.isVisible()) {
      await draftSurvey.click();
      await page.click('a:has-text("Share")');

      // Should show warning
      await expect(
        page.locator('text=/not active|not published|draft/i')
      ).toBeVisible();
    }
  });

  test('should access share page from survey card', async ({ page }) => {
    await page.goto('/dashboard/surveys');

    // Click share button on survey card
    const shareButton = page.locator('button[title="Share"]').first();

    if (await shareButton.isVisible()) {
      await shareButton.click();

      // Should navigate to share page
      await expect(page).toHaveURL(/\/share/);
    }
  });

  test('should update QR code when survey URL changes', async ({ page }) => {
    await page.click('a:has-text("Share")');

    // Get initial QR code
    const qrCode = page.locator('canvas');
    await expect(qrCode).toBeVisible();

    const initialDataUrl = await qrCode.evaluate((canvas: HTMLCanvasElement) =>
      canvas.toDataURL()
    );

    // Change survey (navigate to different survey)
    await page.goto('/dashboard/surveys');
    const anotherSurvey = page.locator('[data-testid="survey-card"]').nth(1);

    if (await anotherSurvey.isVisible()) {
      await anotherSurvey.click();
      await page.click('a:has-text("Share")');

      // QR code should be different
      const newDataUrl = await qrCode.evaluate((canvas: HTMLCanvasElement) =>
        canvas.toDataURL()
      );

      expect(newDataUrl).not.toBe(initialDataUrl);
    }
  });

  test('should support custom embed dimensions (if implemented)', async ({ page }) => {
    await page.click('a:has-text("Share")');

    // Look for width/height inputs
    const widthInput = page.locator('input[name="width"], input[placeholder*="width"]');
    const heightInput = page.locator('input[name="height"], input[placeholder*="height"]');

    if ((await widthInput.isVisible()) && (await heightInput.isVisible())) {
      // Change dimensions
      await widthInput.fill('800');
      await heightInput.fill('600');

      await page.waitForTimeout(500);

      // Embed code should update
      const embedCode = await page.locator('textarea, code').filter({ hasText: 'iframe' }).textContent();
      expect(embedCode).toContain('800');
      expect(embedCode).toContain('600');
    }
  });
});
