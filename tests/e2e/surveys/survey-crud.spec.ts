import { test, expect } from '@playwright/test';
import { signInAsUser1, signInAsUser3 } from '../../fixtures/auth';

test.describe('Survey CRUD Operations', () => {
  test.beforeEach(async ({ page }) => {
    await signInAsUser1(page);
  });

  test('should display surveys dashboard', async ({ page }) => {
    await page.goto('/dashboard/surveys');
    await expect(page).toHaveTitle(/Surveys/i);
    await expect(page.locator('text=Customer Satisfaction Survey')).toBeVisible();
  });

  test('should create a new survey', async ({ page }) => {
    await page.goto('/dashboard/surveys/new');

    // Fill in survey details
    await page.fill('input[name="title"]', 'New Test Survey');
    await page.fill('textarea[name="description"]', 'This is a test survey description');

    // Toggle settings
    await page.check('input[name="isPublic"]');
    await page.check('input[name="allowAnonymous"]');

    // Save draft
    await page.click('button:has-text("Save Draft")');

    // Verify redirect and success
    await expect(page).toHaveURL(/\/dashboard\/surveys\/\w+/);
    await expect(page.locator('text=New Test Survey')).toBeVisible();
  });

  test('should edit an existing survey', async ({ page }) => {
    await page.goto('/dashboard/surveys');

    // Click on first survey to edit
    await page.click('a:has-text("Customer Satisfaction Survey")');

    // Wait for survey editor to load
    await expect(page.locator('input[name="title"]')).toBeVisible();

    // Update title
    await page.fill('input[name="title"]', 'Updated Survey Title');

    // Save changes
    await page.click('button:has-text("Save")');

    // Verify update
    await expect(page.locator('text=Updated Survey Title')).toBeVisible();
  });

  test('should duplicate a survey', async ({ page }) => {
    await page.goto('/dashboard/surveys');

    // Find survey card and click duplicate button
    const surveyCard = page.locator('text=Customer Satisfaction Survey').locator('..');
    await surveyCard.locator('button[title="Duplicate"]').click();

    // Wait for duplication to complete
    await page.waitForTimeout(1000);

    // Verify duplicate exists
    await expect(page.locator('text=Customer Satisfaction Survey (Copy)')).toBeVisible();
  });

  test('should delete a survey', async ({ page }) => {
    // Create a survey to delete
    await page.goto('/dashboard/surveys/new');
    await page.fill('input[name="title"]', 'Survey to Delete');
    await page.click('button:has-text("Save Draft")');

    // Go back to surveys list
    await page.goto('/dashboard/surveys');

    // Find the survey and click delete
    const surveyCard = page.locator('text=Survey to Delete').locator('..');
    await surveyCard.locator('button[title="Delete"]').click();

    // Confirm deletion in dialog
    await page.click('button:has-text("Delete")');

    // Verify survey is removed
    await expect(page.locator('text=Survey to Delete')).not.toBeVisible();
  });

  test('should change survey status', async ({ page }) => {
    await page.goto('/dashboard/surveys');

    // Find survey and change status to active
    const surveyCard = page.locator('text=Employee Feedback Survey').locator('..');
    await surveyCard.locator('select').selectOption('active');

    // Wait for update
    await page.waitForTimeout(500);

    // Verify status changed (badge or status indicator)
    await expect(surveyCard.locator('text=/active/i')).toBeVisible();
  });

  test('should search surveys', async ({ page }) => {
    await page.goto('/dashboard/surveys');

    // Type in search box
    await page.fill('input[placeholder*="Search"]', 'Customer');

    // Verify filtered results
    await expect(page.locator('text=Customer Satisfaction Survey')).toBeVisible();
    await expect(page.locator('text=Employee Feedback Survey')).not.toBeVisible();
  });

  test('should filter surveys by status', async ({ page }) => {
    await page.goto('/dashboard/surveys');

    // Select status filter
    await page.selectOption('select[name="statusFilter"]', 'active');

    // Verify only active surveys shown
    await expect(page.locator('text=Customer Satisfaction Survey')).toBeVisible();
    await expect(page.locator('text=Employee Feedback Survey')).not.toBeVisible(); // draft
  });

  test('should publish a survey', async ({ page }) => {
    // Create draft survey
    await page.goto('/dashboard/surveys/new');
    await page.fill('input[name="title"]', 'Survey to Publish');
    await page.click('button:has-text("Save Draft")');

    // Change status to active (published)
    const surveyId = page.url().split('/').pop();
    await page.goto('/dashboard/surveys');

    const surveyCard = page.locator('text=Survey to Publish').locator('..');
    await surveyCard.locator('select').selectOption('active');

    // Verify published
    await expect(surveyCard.locator('text=/active/i')).toBeVisible();
  });

  test('should enforce cross-tenant isolation', async ({ page }) => {
    // Sign in as user 1 (org 1)
    await signInAsUser1(page);
    await page.goto('/dashboard/surveys');
    const org1SurveyCount = await page.locator('[data-testid="survey-card"]').count();

    // Sign out and sign in as user 3 (org 2)
    await page.goto('/sign-out');
    await signInAsUser3(page);
    await page.goto('/dashboard/surveys');
    const org2SurveyCount = await page.locator('[data-testid="survey-card"]').count();

    // Verify different survey lists
    expect(org1SurveyCount).not.toBe(org2SurveyCount);
  });

  test('should show survey metadata (question count, response count)', async ({ page }) => {
    await page.goto('/dashboard/surveys');

    // Verify survey card shows metadata
    const surveyCard = page.locator('text=Customer Satisfaction Survey').locator('..');
    await expect(surveyCard.locator('text=/\d+ questions/i')).toBeVisible();
    await expect(surveyCard.locator('text=/\d+ responses/i')).toBeVisible();
  });

  test('should navigate to responses from survey card', async ({ page }) => {
    await page.goto('/dashboard/surveys');

    // Click responses link
    const surveyCard = page.locator('text=Customer Satisfaction Survey').locator('..');
    await surveyCard.locator('a[href*="/responses"]').click();

    // Verify navigation
    await expect(page).toHaveURL(/\/dashboard\/surveys\/\w+\/responses/);
    await expect(page.locator('text=Responses')).toBeVisible();
  });

  test('should show created date', async ({ page }) => {
    await page.goto('/dashboard/surveys');

    // Verify created date is displayed
    await expect(page.locator('text=/Created.*ago|Created on/i').first()).toBeVisible();
  });
});
