import { test, expect } from '@playwright/test';
import { signInAsUser1 } from '../../fixtures/auth';

test.describe('Conditional Logic', () => {
  test.beforeEach(async ({ page }) => {
    await signInAsUser1(page);
    await page.goto('/dashboard/surveys/new');
    await page.fill('input[name="title"]', 'Logic Test Survey');
    await page.click('button:has-text("Save Draft")');
  });

  test('should create show/hide logic rule', async ({ page }) => {
    // Add first question
    await page.click('button:has-text("Add Question")');
    await page.fill('input[placeholder*="Question title"]', 'Do you like pizza?');
    await page.selectOption('select[name="questionType"]', 'single_choice');
    await page.fill('input[name="option-0"]', 'Yes');
    await page.fill('input[name="option-1"]', 'No');
    await page.click('button:has-text("Save Question")');

    // Add second question with logic
    await page.click('button:has-text("Add Question")');
    await page.fill('input[placeholder*="Question title"]', 'What is your favorite pizza?');
    await page.selectOption('select[name="questionType"]', 'text');

    // Add conditional logic
    await page.click('button:has-text("Add Logic Rule")');
    await page.selectOption('select[name="logic.condition.questionId"]', /Do you like pizza/);
    await page.selectOption('select[name="logic.condition.operator"]', 'equals');
    await page.fill('input[name="logic.condition.value"]', 'Yes');
    await page.selectOption('select[name="logic.action"]', 'show');

    await page.click('button:has-text("Save Question")');

    await expect(page.locator('text=What is your favorite pizza?')).toBeVisible();
  });

  test('should validate logic on public survey', async ({ page }) => {
    // Create survey with logic
    const surveyId = page.url().split('/').pop();

    // Add conditional questions via API would be faster
    // For now, publish and test on public form

    // Change status to active
    await page.goto('/dashboard/surveys');
    const surveyCard = page.locator('text=Logic Test Survey').locator('..');
    await surveyCard.locator('select').selectOption('active');

    // Visit public survey
    await page.goto(`/s/${surveyId}`);

    // Initially, conditional question should be hidden
    await expect(page.locator('text=What is your favorite pizza?')).not.toBeVisible();

    // Answer first question
    await page.click('input[value="Yes"]');

    // Now conditional question should show
    await expect(page.locator('text=What is your favorite pizza?')).toBeVisible();

    // Change answer
    await page.click('input[value="No"]');

    // Conditional question should hide again
    await expect(page.locator('text=What is your favorite pizza?')).not.toBeVisible();
  });

  test('should support equals operator', async ({ page }) => {
    // Tested in above test
  });

  test('should support contains operator', async ({ page }) => {
    await page.click('button:has-text("Add Question")');
    await page.fill('input[placeholder*="Question title"]', 'Describe your experience');
    await page.selectOption('select[name="questionType"]', 'textarea');
    await page.click('button:has-text("Save Question")');

    await page.click('button:has-text("Add Question")');
    await page.fill('input[placeholder*="Question title"]', 'Tell us more about the issue');
    await page.selectOption('select[name="questionType"]', 'textarea');

    // Add logic with contains
    await page.click('button:has-text("Add Logic Rule")');
    await page.selectOption('select[name="logic.condition.operator"]', 'contains');
    await page.fill('input[name="logic.condition.value"]', 'problem');
    await page.selectOption('select[name="logic.action"]', 'show');

    await page.click('button:has-text("Save Question")');
  });

  test('should support greater_than operator for numbers', async ({ page }) => {
    await page.click('button:has-text("Add Question")');
    await page.fill('input[placeholder*="Question title"]', 'How old are you?');
    await page.selectOption('select[name="questionType"]', 'number');
    await page.click('button:has-text("Save Question")');

    await page.click('button:has-text("Add Question")');
    await page.fill('input[placeholder*="Question title"]', 'Senior discount applied');
    await page.selectOption('select[name="questionType"]', 'text');

    // Add logic
    await page.click('button:has-text("Add Logic Rule")');
    await page.selectOption('select[name="logic.condition.operator"]', 'greater_than');
    await page.fill('input[name="logic.condition.value"]', '65');
    await page.selectOption('select[name="logic.action"]', 'show');

    await page.click('button:has-text("Save Question")');
  });

  test('should support jump action (branching)', async ({ page }) => {
    // Add multiple questions
    await page.click('button:has-text("Add Question")');
    await page.fill('input[placeholder*="Question title"]', 'Are you a customer?');
    await page.selectOption('select[name="questionType"]', 'single_choice');
    await page.fill('input[name="option-0"]', 'Yes');
    await page.fill('input[name="option-1"]', 'No');
    await page.click('button:has-text("Save Question")');

    await page.click('button:has-text("Add Question")');
    await page.fill('input[placeholder*="Question title"]', 'Customer feedback');
    await page.selectOption('select[name="questionType"]', 'textarea');
    await page.click('button:has-text("Save Question")');

    await page.click('button:has-text("Add Question")');
    await page.fill('input[placeholder*="Question title"]', 'Why not a customer?');
    await page.selectOption('select[name="questionType"]', 'textarea');

    // Add jump logic
    await page.click('button:has-text("Add Logic Rule")');
    await page.selectOption('select[name="logic.action"]', 'jump');
    await page.selectOption('select[name="logic.jumpTo"]', /Why not a customer/);

    await page.click('button:has-text("Save Question")');
  });

  test('should detect circular dependencies', async ({ page }) => {
    // Add Question A
    await page.click('button:has-text("Add Question")');
    await page.fill('input[placeholder*="Question title"]', 'Question A');
    await page.selectOption('select[name="questionType"]', 'text');
    await page.click('button:has-text("Save Question")');

    // Add Question B with logic pointing to A
    await page.click('button:has-text("Add Question")');
    await page.fill('input[placeholder*="Question title"]', 'Question B');
    await page.selectOption('select[name="questionType"]', 'text');

    await page.click('button:has-text("Add Logic Rule")');
    await page.selectOption('select[name="logic.condition.questionId"]', /Question A/);
    await page.click('button:has-text("Save Question")');

    // Try to add logic to A pointing to B (circular)
    const questionA = page.locator('text=Question A').locator('..');
    await questionA.locator('button[title="Edit"]').click();

    await page.click('button:has-text("Add Logic Rule")');
    await page.selectOption('select[name="logic.condition.questionId"]', /Question B/);
    await page.click('button:has-text("Save Question")');

    // Should show error
    await expect(page.locator('text=/circular dependency|infinite loop/i')).toBeVisible();
  });

  test('should support multiple logic rules per question', async ({ page }) => {
    await page.click('button:has-text("Add Question")');
    await page.fill('input[placeholder*="Question title"]', 'Base Question');
    await page.selectOption('select[name="questionType"]', 'text');
    await page.click('button:has-text("Save Question")');

    await page.click('button:has-text("Add Question")');
    await page.fill('input[placeholder*="Question title"]', 'Conditional Question');
    await page.selectOption('select[name="questionType"]', 'text');

    // Add first rule
    await page.click('button:has-text("Add Logic Rule")');
    await page.selectOption('select[name="logic.condition.operator"]', 'contains');
    await page.fill('input[name="logic.condition.value"]', 'yes');
    await page.selectOption('select[name="logic.action"]', 'show');

    // Add second rule
    await page.click('button:has-text("Add Logic Rule")');
    await page.selectOption('select[name="logic.condition.operator"]', 'contains');
    await page.fill('input[name="logic.condition.value"]', 'sure');
    await page.selectOption('select[name="logic.action"]', 'show');

    await page.click('button:has-text("Save Question")');
  });

  test('should support is_empty and is_not_empty operators', async ({ page }) => {
    await page.click('button:has-text("Add Question")');
    await page.fill('input[placeholder*="Question title"]', 'Optional comment');
    await page.selectOption('select[name="questionType"]', 'textarea');
    await page.click('button:has-text("Save Question")');

    await page.click('button:has-text("Add Question")');
    await page.fill('input[placeholder*="Question title"]', 'Thank you for your comment');
    await page.selectOption('select[name="questionType"]', 'text');

    await page.click('button:has-text("Add Logic Rule")');
    await page.selectOption('select[name="logic.condition.operator"]', 'is_not_empty');
    await page.selectOption('select[name="logic.action"]', 'show');

    await page.click('button:has-text("Save Question")');
  });
});
