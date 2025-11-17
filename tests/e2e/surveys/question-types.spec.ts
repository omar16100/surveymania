import { test, expect } from '@playwright/test';
import { signInAsUser1 } from '../../fixtures/auth';

test.describe('Question Types - All 16 Types', () => {
  let surveyId: string;

  test.beforeEach(async ({ page }) => {
    await signInAsUser1(page);

    // Create a new survey for testing
    await page.goto('/dashboard/surveys/new');
    await page.fill('input[name="title"]', 'Question Types Test Survey');
    await page.click('button:has-text("Save Draft")');

    // Extract survey ID from URL
    surveyId = page.url().split('/').pop() || '';
  });

  test('should add text question', async ({ page }) => {
    await page.click('button:has-text("Add Question")');

    await page.fill('input[placeholder*="Question title"]', 'What is your name?');
    await page.selectOption('select[name="questionType"]', 'text');
    await page.click('button:has-text("Save Question")');

    await expect(page.locator('text=What is your name?')).toBeVisible();
  });

  test('should add textarea question', async ({ page }) => {
    await page.click('button:has-text("Add Question")');

    await page.fill('input[placeholder*="Question title"]', 'Tell us your story');
    await page.selectOption('select[name="questionType"]', 'textarea');
    await page.click('button:has-text("Save Question")');

    await expect(page.locator('text=Tell us your story')).toBeVisible();
  });

  test('should add number question with min/max validation', async ({ page }) => {
    await page.click('button:has-text("Add Question")');

    await page.fill('input[placeholder*="Question title"]', 'How old are you?');
    await page.selectOption('select[name="questionType"]', 'number');

    // Set validation rules
    await page.fill('input[name="validation.min"]', '18');
    await page.fill('input[name="validation.max"]', '100');

    await page.click('button:has-text("Save Question")');

    await expect(page.locator('text=How old are you?')).toBeVisible();
  });

  test('should add email question', async ({ page }) => {
    await page.click('button:has-text("Add Question")');

    await page.fill('input[placeholder*="Question title"]', 'What is your email?');
    await page.selectOption('select[name="questionType"]', 'email');
    await page.click('button:has-text("Save Question")');

    await expect(page.locator('text=What is your email?')).toBeVisible();
  });

  test('should add phone question', async ({ page }) => {
    await page.click('button:has-text("Add Question")');

    await page.fill('input[placeholder*="Question title"]', 'Contact number');
    await page.selectOption('select[name="questionType"]', 'phone');
    await page.click('button:has-text("Save Question")');

    await expect(page.locator('text=Contact number')).toBeVisible();
  });

  test('should add single choice question with options', async ({ page }) => {
    await page.click('button:has-text("Add Question")');

    await page.fill('input[placeholder*="Question title"]', 'What is your favorite color?');
    await page.selectOption('select[name="questionType"]', 'single_choice');

    // Add options
    await page.fill('input[name="option-0"]', 'Red');
    await page.click('button:has-text("Add Option")');
    await page.fill('input[name="option-1"]', 'Blue');
    await page.click('button:has-text("Add Option")');
    await page.fill('input[name="option-2"]', 'Green');

    await page.click('button:has-text("Save Question")');

    await expect(page.locator('text=What is your favorite color?')).toBeVisible();
  });

  test('should add multiple choice question', async ({ page }) => {
    await page.click('button:has-text("Add Question")');

    await page.fill('input[placeholder*="Question title"]', 'Select your hobbies');
    await page.selectOption('select[name="questionType"]', 'multiple_choice');

    // Add options
    await page.fill('input[name="option-0"]', 'Reading');
    await page.click('button:has-text("Add Option")');
    await page.fill('input[name="option-1"]', 'Sports');
    await page.click('button:has-text("Add Option")');
    await page.fill('input[name="option-2"]', 'Music');

    await page.click('button:has-text("Save Question")');

    await expect(page.locator('text=Select your hobbies')).toBeVisible();
  });

  test('should add dropdown question', async ({ page }) => {
    await page.click('button:has-text("Add Question")');

    await page.fill('input[placeholder*="Question title"]', 'Select your country');
    await page.selectOption('select[name="questionType"]', 'dropdown');

    // Add options
    await page.fill('input[name="option-0"]', 'USA');
    await page.click('button:has-text("Add Option")');
    await page.fill('input[name="option-1"]', 'UK');

    await page.click('button:has-text("Save Question")');

    await expect(page.locator('text=Select your country')).toBeVisible();
  });

  test('should add rating question (1-5 stars)', async ({ page }) => {
    await page.click('button:has-text("Add Question")');

    await page.fill('input[placeholder*="Question title"]', 'Rate our service');
    await page.selectOption('select[name="questionType"]', 'rating');
    await page.click('button:has-text("Save Question")');

    await expect(page.locator('text=Rate our service')).toBeVisible();
  });

  test('should add scale question with custom min/max/step', async ({ page }) => {
    await page.click('button:has-text("Add Question")');

    await page.fill('input[placeholder*="Question title"]', 'On a scale of 0-10');
    await page.selectOption('select[name="questionType"]', 'scale');

    // Configure scale
    await page.fill('input[name="validation.min"]', '0');
    await page.fill('input[name="validation.max"]', '10');
    await page.fill('input[name="validation.step"]', '1');
    await page.fill('input[name="validation.minLabel"]', 'Not likely');
    await page.fill('input[name="validation.maxLabel"]', 'Very likely');

    await page.click('button:has-text("Save Question")');

    await expect(page.locator('text=On a scale of 0-10')).toBeVisible();
  });

  test('should add date question', async ({ page }) => {
    await page.click('button:has-text("Add Question")');

    await page.fill('input[placeholder*="Question title"]', 'What is your birth date?');
    await page.selectOption('select[name="questionType"]', 'date');
    await page.click('button:has-text("Save Question")');

    await expect(page.locator('text=What is your birth date?')).toBeVisible();
  });

  test('should add time question', async ({ page }) => {
    await page.click('button:has-text("Add Question")');

    await page.fill('input[placeholder*="Question title"]', 'Preferred appointment time');
    await page.selectOption('select[name="questionType"]', 'time');
    await page.click('button:has-text("Save Question")');

    await expect(page.locator('text=Preferred appointment time')).toBeVisible();
  });

  test('should add datetime question', async ({ page }) => {
    await page.click('button:has-text("Add Question")');

    await page.fill('input[placeholder*="Question title"]', 'Event date and time');
    await page.selectOption('select[name="questionType"]', 'datetime');
    await page.click('button:has-text("Save Question")');

    await expect(page.locator('text=Event date and time')).toBeVisible();
  });

  test('should add file upload question', async ({ page }) => {
    await page.click('button:has-text("Add Question")');

    await page.fill('input[placeholder*="Question title"]', 'Upload your resume');
    await page.selectOption('select[name="questionType"]', 'file_upload');

    // Set file restrictions
    await page.fill('input[name="validation.maxSize"]', '5');
    await page.fill('input[name="validation.allowedTypes"]', 'pdf,doc,docx');

    await page.click('button:has-text("Save Question")');

    await expect(page.locator('text=Upload your resume')).toBeVisible();
  });

  test('should add location question', async ({ page }) => {
    await page.click('button:has-text("Add Question")');

    await page.fill('input[placeholder*="Question title"]', 'Where do you live?');
    await page.selectOption('select[name="questionType"]', 'location');
    await page.click('button:has-text("Save Question")');

    await expect(page.locator('text=Where do you live?')).toBeVisible();
  });

  test('should add signature question', async ({ page }) => {
    await page.click('button:has-text("Add Question")');

    await page.fill('input[placeholder*="Question title"]', 'Sign here');
    await page.selectOption('select[name="questionType"]', 'signature');
    await page.click('button:has-text("Save Question")');

    await expect(page.locator('text=Sign here')).toBeVisible();
  });

  test('should reorder questions using up/down buttons', async ({ page }) => {
    // Add two questions
    await page.click('button:has-text("Add Question")');
    await page.fill('input[placeholder*="Question title"]', 'First Question');
    await page.selectOption('select[name="questionType"]', 'text');
    await page.click('button:has-text("Save Question")');

    await page.click('button:has-text("Add Question")');
    await page.fill('input[placeholder*="Question title"]', 'Second Question');
    await page.selectOption('select[name="questionType"]', 'text');
    await page.click('button:has-text("Save Question")');

    // Move second question up
    const secondQuestion = page.locator('text=Second Question').locator('..');
    await secondQuestion.locator('button[title="Move up"]').click();

    // Verify order changed
    const questions = await page.locator('[data-testid="question-card"]').allTextContents();
    expect(questions[0]).toContain('Second Question');
    expect(questions[1]).toContain('First Question');
  });

  test('should delete a question', async ({ page }) => {
    // Add a question
    await page.click('button:has-text("Add Question")');
    await page.fill('input[placeholder*="Question title"]', 'Question to Delete');
    await page.selectOption('select[name="questionType"]', 'text');
    await page.click('button:has-text("Save Question")');

    // Delete the question
    const question = page.locator('text=Question to Delete').locator('..');
    await question.locator('button[title="Delete"]').click();

    // Confirm deletion
    await page.click('button:has-text("Delete")');

    // Verify deleted
    await expect(page.locator('text=Question to Delete')).not.toBeVisible();
  });

  test('should mark question as required', async ({ page }) => {
    await page.click('button:has-text("Add Question")');
    await page.fill('input[placeholder*="Question title"]', 'Required Question');
    await page.selectOption('select[name="questionType"]', 'text');

    // Mark as required
    await page.check('input[name="required"]');

    await page.click('button:has-text("Save Question")');

    // Verify required indicator
    await expect(page.locator('text=Required Question').locator('..')).toContainText('*');
  });
});
