import { APIRequestContext } from '@playwright/test';

/**
 * API client helper for making authenticated API calls in tests
 */
export class ApiClient {
  constructor(private request: APIRequestContext, private baseURL: string) {}

  /**
   * Create a new survey via API (faster than UI for setup)
   */
  async createSurvey(data: {
    title: string;
    description?: string;
    organizationId: string;
    isPublic?: boolean;
  }) {
    const response = await this.request.post(`${this.baseURL}/api/surveys`, {
      data,
    });
    return response.json();
  }

  /**
   * Get survey by ID
   */
  async getSurvey(id: string) {
    const response = await this.request.get(`${this.baseURL}/api/surveys/${id}`);
    return response.json();
  }

  /**
   * Create a question via API
   */
  async createQuestion(surveyId: string, data: {
    title: string;
    type: string;
    order: number;
    required?: boolean;
    options?: string[];
  }) {
    const response = await this.request.post(
      `${this.baseURL}/api/surveys/${surveyId}/questions`,
      { data }
    );
    return response.json();
  }

  /**
   * Submit a response via API
   */
  async submitResponse(surveyId: string, data: {
    answers: Array<{
      questionId: string;
      answerType: string;
      textAnswer?: string;
      numberAnswer?: number;
      choiceAnswer?: string;
      multipleChoiceAnswer?: string[];
    }>;
    latitude?: number;
    longitude?: number;
  }) {
    const response = await this.request.post(
      `${this.baseURL}/api/surveys/${surveyId}/responses`,
      { data }
    );
    return response.json();
  }

  /**
   * Get responses for a survey
   */
  async getResponses(surveyId: string) {
    const response = await this.request.get(
      `${this.baseURL}/api/surveys/${surveyId}/responses`
    );
    return response.json();
  }

  /**
   * Delete a survey
   */
  async deleteSurvey(id: string) {
    const response = await this.request.delete(`${this.baseURL}/api/surveys/${id}`);
    return response.status;
  }

  /**
   * Create a campaign via API
   */
  async createCampaign(data: {
    name: string;
    description?: string;
    surveyId: string;
    organizationId: string;
    targetResponseCount?: number;
  }) {
    const response = await this.request.post(`${this.baseURL}/api/campaigns`, {
      data,
    });
    return response.json();
  }

  /**
   * Export survey responses
   */
  async exportSurvey(surveyId: string, format: 'csv' | 'xlsx' | 'json' | 'pdf' | 'geojson' | 'kml') {
    const response = await this.request.get(
      `${this.baseURL}/api/surveys/${surveyId}/export?format=${format}`
    );
    return {
      status: response.status(),
      body: await response.body(),
      headers: response.headers(),
    };
  }
}
