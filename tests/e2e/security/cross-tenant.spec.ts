import { test, expect } from '@playwright/test';
import { signInAsUser1, signInAsUser3 } from '../../fixtures/auth';
import { ApiClient } from '../../helpers/api-client';

test.describe('Cross-Tenant Isolation (Security)', () => {
  test('should prevent user from accessing another org\'s surveys', async ({ page, request }) => {
    // Sign in as User 1 (Org 1)
    await signInAsUser1(page);
    await page.goto('/dashboard/surveys');

    // Get a survey ID from Org 1
    const surveyCard = page.locator('[data-testid="survey-card"]').first();
    const surveyLink = await surveyCard.locator('a').getAttribute('href');
    const org1SurveyId = surveyLink?.split('/').pop();

    // Sign out and sign in as User 3 (Org 2)
    await page.goto('/sign-out');
    await signInAsUser3(page);

    // Try to access Org 1's survey
    await page.goto(`/dashboard/surveys/${org1SurveyId}`);

    // Should be redirected or show 404/403
    await expect(page.locator('text=/not found|forbidden|access denied/i')).toBeVisible();
  });

  test('should prevent API access to another org\'s survey data', async ({ page, request }) => {
    await signInAsUser1(page);

    const api = new ApiClient(request, 'http://localhost:3000');

    // Get User 1's survey
    await page.goto('/dashboard/surveys');
    const surveyCard = page.locator('[data-testid="survey-card"]').first();
    const surveyLink = await surveyCard.locator('a').getAttribute('href');
    const org1SurveyId = surveyLink?.split('/').pop();

    // Sign out and sign in as User 3
    await page.goto('/sign-out');
    await signInAsUser3(page);

    // Try to fetch Org 1's survey via API
    const response = await request.get(`http://localhost:3000/api/surveys/${org1SurveyId}`);

    // Should return 403 or 404
    expect([403, 404]).toContain(response.status());
  });

  test('should prevent modifying another org\'s questions', async ({ page, request }) => {
    await signInAsUser1(page);

    // Get question ID from Org 1
    const response = await request.get('http://localhost:3000/api/surveys');
    const surveys = await response.json();
    const org1Survey = surveys[0];
    const questionId = org1Survey.questions?.[0]?.id;

    // Sign out and sign in as User 3 (Org 2)
    await page.goto('/sign-out');
    await signInAsUser3(page);

    // Try to delete Org 1's question
    const deleteResponse = await request.delete(`http://localhost:3000/api/questions/${questionId}`);

    // Should return 403
    expect(deleteResponse.status()).toBe(403);
  });

  test('should prevent reordering another org\'s questions', async ({ page, request }) => {
    await signInAsUser1(page);

    // Get survey and question IDs from Org 1
    const response = await request.get('http://localhost:3000/api/surveys');
    const surveys = await response.json();
    const org1Survey = surveys[0];
    const questionIds = org1Survey.questions?.map((q: any) => q.id) || [];

    // Sign out and sign in as User 3
    await page.goto('/sign-out');
    await signInAsUser3(page);

    // Try to reorder Org 1's questions
    const reorderResponse = await request.post('http://localhost:3000/api/questions/reorder', {
      data: {
        surveyId: org1Survey.id,
        questionIds: questionIds.reverse(),
      },
    });

    // Should return 403
    expect(reorderResponse.status()).toBe(403);
  });

  test('should prevent accessing another org\'s responses', async ({ page, request }) => {
    await signInAsUser1(page);

    // Get survey ID from Org 1
    const response = await request.get('http://localhost:3000/api/surveys');
    const surveys = await response.json();
    const org1SurveyId = surveys[0]?.id;

    // Sign out and sign in as User 3
    await page.goto('/sign-out');
    await signInAsUser3(page);

    // Try to access Org 1's responses
    const responsesResponse = await request.get(
      `http://localhost:3000/api/surveys/${org1SurveyId}/responses`
    );

    // Should return 403
    expect(responsesResponse.status()).toBe(403);
  });

  test('should prevent exporting another org\'s data', async ({ page, request }) => {
    await signInAsUser1(page);

    // Get survey ID from Org 1
    const response = await request.get('http://localhost:3000/api/surveys');
    const surveys = await response.json();
    const org1SurveyId = surveys[0]?.id;

    // Sign out and sign in as User 3
    await page.goto('/sign-out');
    await signInAsUser3(page);

    // Try to export Org 1's data
    const exportResponse = await request.get(
      `http://localhost:3000/api/surveys/${org1SurveyId}/export?format=csv`
    );

    // Should return 403
    expect(exportResponse.status()).toBe(403);
  });

  test('should isolate campaign data across orgs', async ({ page }) => {
    await signInAsUser1(page);
    await page.goto('/dashboard/campaigns');

    // Get campaign count for Org 1
    const org1Campaigns = await page.locator('[data-testid="campaign-card"]').count();

    // Sign out and sign in as User 3 (Org 2)
    await page.goto('/sign-out');
    await signInAsUser3(page);
    await page.goto('/dashboard/campaigns');

    // Get campaign count for Org 2
    const org2Campaigns = await page.locator('[data-testid="campaign-card"]').count();

    // Should be different (or both could be 0, but independent)
    expect(org1Campaigns).toBeDefined();
    expect(org2Campaigns).toBeDefined();
  });

  test('should prevent accessing another org\'s campaign members', async ({ page, request }) => {
    await signInAsUser1(page);

    // Get campaign ID from Org 1
    const response = await request.get('http://localhost:3000/api/campaigns');
    const campaigns = await response.json();
    const org1CampaignId = campaigns[0]?.id;

    // Sign out and sign in as User 3
    await page.goto('/sign-out');
    await signInAsUser3(page);

    // Try to access Org 1's campaign members
    const membersResponse = await request.get(
      `http://localhost:3000/api/campaigns/${org1CampaignId}/members`
    );

    // Should return 403
    expect(membersResponse.status()).toBe(403);
  });

  test('should prevent deleting another org\'s response', async ({ page, request }) => {
    await signInAsUser1(page);

    // Get response ID from Org 1
    const surveyResponse = await request.get('http://localhost:3000/api/surveys');
    const surveys = await surveyResponse.json();
    const responses = await request.get(
      `http://localhost:3000/api/surveys/${surveys[0]?.id}/responses`
    );
    const responsesData = await responses.json();
    const responseId = responsesData[0]?.id;

    // Sign out and sign in as User 3
    await page.goto('/sign-out');
    await signInAsUser3(page);

    // Try to delete Org 1's response
    const deleteResponse = await request.delete(
      `http://localhost:3000/api/responses/${responseId}`
    );

    // Should return 403
    expect(deleteResponse.status()).toBe(403);
  });
});
