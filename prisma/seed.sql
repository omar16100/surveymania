-- Seed data for D1 database

-- Create dev user
INSERT INTO User (clerkId, email, firstName, lastName, avatar, organizationId, createdAt, updatedAt)
VALUES ('dev-user', 'dev@surveymania.com', 'Dev', 'User', 'https://api.dicebear.com/7.x/avataaars/svg?seed=dev', NULL, datetime('now'), datetime('now'));

-- Create organization
INSERT INTO Organization (id, name, slug, ownerId, settings, createdAt, updatedAt)
VALUES ('org-1', 'Development Organization', 'dev-org', 'dev-user', '{}', datetime('now'), datetime('now'));

-- Update user with organization
UPDATE User SET organizationId = 'org-1' WHERE clerkId = 'dev-user';

-- Create sample survey
INSERT INTO Survey (id, title, description, organizationId, createdBy, status, settings, createdAt, updatedAt, publishedAt, closedAt)
VALUES (
  'survey-1',
  'Customer Satisfaction Survey',
  'Help us improve our services by sharing your feedback',
  'org-1',
  'dev-user',
  'active',
  '{"isPublic":true,"requireAuth":false,"allowAnonymous":true,"multipleResponses":false,"locationRequired":true,"locationAccuracy":50}',
  datetime('now'),
  datetime('now'),
  datetime('now'),
  NULL
);

-- Create questions
INSERT INTO SurveyQuestion (id, surveyId, "order", type, question, description, required, validation, options, logic, createdAt, updatedAt)
VALUES
  ('q1', 'survey-1', 1, 'text', 'What is your name?', NULL, 1, NULL, NULL, NULL, datetime('now'), datetime('now')),
  ('q2', 'survey-1', 2, 'single_choice', 'How satisfied are you with our service?', NULL, 1, NULL, '["Very Satisfied","Satisfied","Neutral","Dissatisfied","Very Dissatisfied"]', NULL, datetime('now'), datetime('now')),
  ('q3', 'survey-1', 3, 'multiple_choice', 'Which features do you use most? (Select all that apply)', NULL, 0, NULL, '["Dashboard","Reports","Analytics","Exports","API Access"]', NULL, datetime('now'), datetime('now')),
  ('q4', 'survey-1', 4, 'textarea', 'What can we do to improve?', NULL, 0, NULL, NULL, NULL, datetime('now'), datetime('now')),
  ('q5', 'survey-1', 5, 'number', 'How likely are you to recommend us? (0-10)', NULL, 1, '{"min":0,"max":10}', NULL, NULL, datetime('now'), datetime('now'));

-- Create sample responses
INSERT INTO SurveyResponse (id, surveyId, respondentId, sessionId, status, latitude, longitude, locationAccuracy, ipAddress, userAgent, metadata, startedAt, completedAt, submittedAt)
VALUES
  ('resp-1', 'survey-1', NULL, 'session-abc123', 'completed', 1.3521, 103.8198, 10.5, '127.0.0.1', 'Mozilla/5.0', '{}', datetime('now', '-5 minutes'), datetime('now'), datetime('now')),
  ('resp-2', 'survey-1', NULL, 'session-def456', 'completed', 1.2897, 103.8501, 10.5, '127.0.0.1', 'Mozilla/5.0', '{}', datetime('now', '-5 minutes'), datetime('now'), datetime('now')),
  ('resp-3', 'survey-1', NULL, 'session-ghi789', 'completed', 1.4437, 103.8005, 10.5, '127.0.0.1', 'Mozilla/5.0', '{}', datetime('now', '-5 minutes'), datetime('now'), datetime('now')),
  ('resp-4', 'survey-1', NULL, 'session-jkl012', 'completed', 1.3048, 103.8318, 10.5, '127.0.0.1', 'Mozilla/5.0', '{}', datetime('now', '-5 minutes'), datetime('now'), datetime('now')),
  ('resp-5', 'survey-1', NULL, 'session-mno345', 'completed', 1.3644, 103.9915, 10.5, '127.0.0.1', 'Mozilla/5.0', '{}', datetime('now', '-5 minutes'), datetime('now'), datetime('now'));

-- Create answers for response 1 (Alice Johnson)
INSERT INTO SurveyAnswer (id, responseId, questionId, answerType, answerText, answerNumber, answerChoices, answerFile, createdAt, updatedAt)
VALUES
  ('a1-1', 'resp-1', 'q1', 'text', 'Alice Johnson', NULL, '[]', NULL, datetime('now'), datetime('now')),
  ('a1-2', 'resp-1', 'q2', 'choice', 'Very Satisfied', NULL, '[]', NULL, datetime('now'), datetime('now')),
  ('a1-3', 'resp-1', 'q3', 'choices', NULL, NULL, '["Dashboard","Reports","Analytics"]', NULL, datetime('now'), datetime('now')),
  ('a1-4', 'resp-1', 'q4', 'text', 'Great platform! Love the intuitive interface.', NULL, '[]', NULL, datetime('now'), datetime('now')),
  ('a1-5', 'resp-1', 'q5', 'number', NULL, 9, '[]', NULL, datetime('now'), datetime('now'));

-- Create answers for response 2 (Bob Smith)
INSERT INTO SurveyAnswer (id, responseId, questionId, answerType, answerText, answerNumber, answerChoices, answerFile, createdAt, updatedAt)
VALUES
  ('a2-1', 'resp-2', 'q1', 'text', 'Bob Smith', NULL, '[]', NULL, datetime('now'), datetime('now')),
  ('a2-2', 'resp-2', 'q2', 'choice', 'Satisfied', NULL, '[]', NULL, datetime('now'), datetime('now')),
  ('a2-3', 'resp-2', 'q3', 'choices', NULL, NULL, '["Dashboard","Exports"]', NULL, datetime('now'), datetime('now')),
  ('a2-4', 'resp-2', 'q4', 'text', 'Good overall, but could use better documentation.', NULL, '[]', NULL, datetime('now'), datetime('now')),
  ('a2-5', 'resp-2', 'q5', 'number', NULL, 7, '[]', NULL, datetime('now'), datetime('now'));

-- Create answers for response 3 (Carol White)
INSERT INTO SurveyAnswer (id, responseId, questionId, answerType, answerText, answerNumber, answerChoices, answerFile, createdAt, updatedAt)
VALUES
  ('a3-1', 'resp-3', 'q1', 'text', 'Carol White', NULL, '[]', NULL, datetime('now'), datetime('now')),
  ('a3-2', 'resp-3', 'q2', 'choice', 'Neutral', NULL, '[]', NULL, datetime('now'), datetime('now')),
  ('a3-3', 'resp-3', 'q3', 'choices', NULL, NULL, '["Analytics","API Access"]', NULL, datetime('now'), datetime('now')),
  ('a3-4', 'resp-3', 'q4', 'text', 'Works fine but lacks some advanced features.', NULL, '[]', NULL, datetime('now'), datetime('now')),
  ('a3-5', 'resp-3', 'q5', 'number', NULL, 6, '[]', NULL, datetime('now'), datetime('now'));

-- Create answers for response 4 (David Lee)
INSERT INTO SurveyAnswer (id, responseId, questionId, answerType, answerText, answerNumber, answerChoices, answerFile, createdAt, updatedAt)
VALUES
  ('a4-1', 'resp-4', 'q1', 'text', 'David Lee', NULL, '[]', NULL, datetime('now'), datetime('now')),
  ('a4-2', 'resp-4', 'q2', 'choice', 'Very Satisfied', NULL, '[]', NULL, datetime('now'), datetime('now')),
  ('a4-3', 'resp-4', 'q3', 'choices', NULL, NULL, '["Dashboard","Reports","Analytics","Exports"]', NULL, datetime('now'), datetime('now')),
  ('a4-4', 'resp-4', 'q4', 'text', 'Exactly what we needed for our research project!', NULL, '[]', NULL, datetime('now'), datetime('now')),
  ('a4-5', 'resp-4', 'q5', 'number', NULL, 10, '[]', NULL, datetime('now'), datetime('now'));

-- Create answers for response 5 (Eva Martinez)
INSERT INTO SurveyAnswer (id, responseId, questionId, answerType, answerText, answerNumber, answerChoices, answerFile, createdAt, updatedAt)
VALUES
  ('a5-1', 'resp-5', 'q1', 'text', 'Eva Martinez', NULL, '[]', NULL, datetime('now'), datetime('now')),
  ('a5-2', 'resp-5', 'q2', 'choice', 'Dissatisfied', NULL, '[]', NULL, datetime('now'), datetime('now')),
  ('a5-3', 'resp-5', 'q3', 'choices', NULL, NULL, '["Dashboard"]', NULL, datetime('now'), datetime('now')),
  ('a5-4', 'resp-5', 'q4', 'text', 'Too slow when dealing with large datasets.', NULL, '[]', NULL, datetime('now'), datetime('now')),
  ('a5-5', 'resp-5', 'q5', 'number', NULL, 4, '[]', NULL, datetime('now'), datetime('now'));
