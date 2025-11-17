# Security Hotfix Test Specification

## Test Environment Setup
- Requires: PostgreSQL database, Clerk auth configured
- Test users:
  - User A (org1) - owner of Survey1
  - User B (org2) - no access to Survey1
  - Unauthenticated user

## S1: Questions Reorder Endpoint Tests

### Endpoint: POST /api/questions/reorder

#### Test 1.1: Unauthorized - No Auth Token
**Setup:** No auth headers
**Request:**
```json
{
  "surveyId": "survey1-id",
  "orders": [{"id": "q1", "order": 1}, {"id": "q2", "order": 2}]
}
```
**Expected:** 401 Unauthorized

#### Test 1.2: Forbidden - Cross-Tenant Access
**Setup:** User B authenticated (owns Survey2)
**Request:**
```json
{
  "surveyId": "survey1-id",
  "orders": [{"id": "q1", "order": 1}, {"id": "q2", "order": 2}]
}
```
**Expected:** 403 Forbidden

#### Test 1.3: Bad Request - Mixed Survey Questions
**Setup:** User A authenticated (owns Survey1)
**Request:**
```json
{
  "surveyId": "survey1-id",
  "orders": [{"id": "q1-from-survey1", "order": 1}, {"id": "q2-from-survey2", "order": 2}]
}
```
**Expected:** 400 "Cannot reorder questions from different surveys"

#### Test 1.4: Success - Valid Reorder
**Setup:** User A authenticated (owns Survey1)
**Request:**
```json
{
  "surveyId": "survey1-id",
  "orders": [{"id": "q1", "order": 2}, {"id": "q2", "order": 1}]
}
```
**Expected:** 200 { "ok": true }
**Verify:** Questions reordered in database

---

## S2: Question PATCH/DELETE Tests

### Endpoint: PATCH /api/questions/[id]

#### Test 2.1: Unauthorized - No Auth Token
**Setup:** No auth headers
**Request:** PATCH /api/questions/q1-id
```json
{"question": "Updated question text"}
```
**Expected:** 401 Unauthorized

#### Test 2.2: Forbidden - Cross-Tenant Access
**Setup:** User B authenticated, Question q1 belongs to Survey1 (owned by User A)
**Request:** PATCH /api/questions/q1-id
```json
{"question": "Updated question text"}
```
**Expected:** 403 Forbidden

#### Test 2.3: Not Found - Invalid Question ID
**Setup:** User A authenticated
**Request:** PATCH /api/questions/nonexistent-id
```json
{"question": "Updated question text"}
```
**Expected:** 404 Not Found

#### Test 2.4: Success - Valid Update
**Setup:** User A authenticated, Question q1 belongs to Survey1 (owned by User A)
**Request:** PATCH /api/questions/q1-id
```json
{"question": "Updated question text", "required": true}
```
**Expected:** 200 with updated question object
**Verify:** Question updated in database

### Endpoint: DELETE /api/questions/[id]

#### Test 2.5: Unauthorized - No Auth Token
**Setup:** No auth headers
**Request:** DELETE /api/questions/q1-id
**Expected:** 401 Unauthorized

#### Test 2.6: Forbidden - Cross-Tenant Access
**Setup:** User B authenticated, Question q1 belongs to Survey1 (owned by User A)
**Request:** DELETE /api/questions/q1-id
**Expected:** 403 Forbidden

#### Test 2.7: Success - Valid Delete
**Setup:** User A authenticated, Question q1 belongs to Survey1 (owned by User A)
**Request:** DELETE /api/questions/q1-id
**Expected:** 200 { "ok": true }
**Verify:** Question deleted from database

---

## S3: Survey Responses GET Tests

### Endpoint: GET /api/surveys/[id]/responses

#### Test 3.1: Unauthorized - No Auth Token
**Setup:** No auth headers
**Request:** GET /api/surveys/survey1-id/responses
**Expected:** 401 Unauthorized

#### Test 3.2: Forbidden - Cross-Tenant Access
**Setup:** User B authenticated, Survey1 owned by User A (org1)
**Request:** GET /api/surveys/survey1-id/responses
**Expected:** 403 Forbidden

#### Test 3.3: Success - Org Owner Access
**Setup:** User A authenticated (org1 owner), Survey1 in org1
**Request:** GET /api/surveys/survey1-id/responses
**Expected:** 200 with survey, responses, stats
**Verify:** All response data returned including PII

#### Test 3.4: Success - Org Member Access
**Setup:** User C authenticated (org1 member/viewer), Survey1 in org1
**Request:** GET /api/surveys/survey1-id/responses
**Expected:** 200 with survey, responses, stats

#### Test 3.5: POST Still Public
**Setup:** No auth headers
**Request:** POST /api/surveys/survey1-id/responses
```json
{
  "sessionId": "session123",
  "answers": [{"questionId": "q1", "answerType": "text", "answerText": "Response"}]
}
```
**Expected:** 201 with response ID
**Verify:** Response submission still works publicly

---

## Bonus: Export Endpoint Tests

### Endpoint: GET /api/surveys/[id]/export?format=xlsx

#### Test 4.1: Unauthorized - No Auth Token
**Setup:** No auth headers
**Request:** GET /api/surveys/survey1-id/export?format=xlsx
**Expected:** 401 Unauthorized

#### Test 4.2: Forbidden - Cross-Tenant Access
**Setup:** User B authenticated, Survey1 owned by User A
**Request:** GET /api/surveys/survey1-id/export?format=xlsx
**Expected:** 403 Forbidden

#### Test 4.3: Success - Valid Export
**Setup:** User A authenticated (owns Survey1)
**Request:** GET /api/surveys/survey1-id/export?format=xlsx
**Expected:** 200 with XLSX file download
**Verify:** Export tracking record created in database

---

## Bonus: Survey Questions POST Tests

### Endpoint: POST /api/surveys/[id]/questions

#### Test 5.1: Unauthorized - No Auth Token
**Setup:** No auth headers
**Request:** POST /api/surveys/survey1-id/questions
```json
{
  "order": 3,
  "type": "text",
  "question": "New question",
  "required": false
}
```
**Expected:** 401 Unauthorized

#### Test 5.2: Forbidden - Cross-Tenant Access
**Setup:** User B authenticated, Survey1 owned by User A
**Request:** POST /api/surveys/survey1-id/questions
```json
{
  "order": 3,
  "type": "text",
  "question": "New question",
  "required": false
}
```
**Expected:** 403 Forbidden

#### Test 5.3: Success - Valid Question Creation
**Setup:** User A authenticated (owns Survey1)
**Request:** POST /api/surveys/survey1-id/questions
```json
{
  "order": 3,
  "type": "text",
  "question": "New question",
  "required": false
}
```
**Expected:** 201 with created question object
**Verify:** Question created in database with correct surveyId

---

## Manual QA Checklist

### Pre-Test Setup
- [ ] Create User A in org1, User B in org2
- [ ] Create Survey1 in org1 with 2-3 questions
- [ ] Create Survey2 in org2 with 1-2 questions
- [ ] Add 2-3 responses to Survey1
- [ ] Get auth tokens for User A, User B

### Test Execution
- [ ] Run all S1 tests (Questions Reorder)
- [ ] Run all S2 tests (Question PATCH/DELETE)
- [ ] Run all S3 tests (Survey Responses GET)
- [ ] Run all Test 4 tests (Export)
- [ ] Run all Test 5 tests (Questions POST)

### Verification
- [ ] All unauthorized requests return 401
- [ ] All cross-tenant requests return 403
- [ ] All valid requests succeed with 200/201
- [ ] No data leakage between organizations
- [ ] Public response submission still works

---

## Test Data Requirements

### Database Seed Script
```sql
-- User A (org1 owner)
INSERT INTO "User" (id, "clerkId", email, "firstName", "lastName", "organizationId")
VALUES ('user-a-id', 'clerk-user-a', 'usera@example.com', 'User', 'A', 'org1-id');

-- User B (org2 owner)
INSERT INTO "User" (id, "clerkId", email, "firstName", "lastName", "organizationId")
VALUES ('user-b-id', 'clerk-user-b', 'userb@example.com', 'User', 'B', 'org2-id');

-- Organization 1
INSERT INTO "Organization" (id, name, "ownerId", "createdAt", "updatedAt")
VALUES ('org1-id', 'Org 1', 'user-a-id', NOW(), NOW());

-- Organization 2
INSERT INTO "Organization" (id, name, "ownerId", "createdAt", "updatedAt")
VALUES ('org2-id', 'Org 2', 'user-b-id', NOW(), NOW());

-- Survey 1 (org1)
INSERT INTO "Survey" (id, title, description, status, "organizationId", "createdBy", "createdAt", "updatedAt")
VALUES ('survey1-id', 'Survey 1', 'Test survey', 'active', 'org1-id', 'user-a-id', NOW(), NOW());

-- Questions for Survey 1
INSERT INTO "SurveyQuestion" (id, "surveyId", "order", type, question, required)
VALUES
  ('q1-id', 'survey1-id', 1, 'text', 'Question 1', true),
  ('q2-id', 'survey1-id', 2, 'text', 'Question 2', false);
```

---

## Automated Test Implementation (Future)

To implement automated tests, use:
- **Framework:** Jest + Supertest
- **Database:** Test PostgreSQL instance or SQLite in-memory
- **Auth:** Mock Clerk auth responses
- **Setup:** beforeEach seed database, afterEach cleanup
- **Run:** `npm test`

Example test structure:
```typescript
describe('POST /api/questions/reorder', () => {
  it('should return 401 without auth', async () => {
    const res = await request(app)
      .post('/api/questions/reorder')
      .send({ surveyId: 'survey1-id', orders: [] })
    expect(res.status).toBe(401)
  })

  it('should return 403 for cross-tenant access', async () => {
    // Mock User B auth
    const res = await request(app)
      .post('/api/questions/reorder')
      .set('Authorization', 'Bearer user-b-token')
      .send({ surveyId: 'survey1-id', orders: [] })
    expect(res.status).toBe(403)
  })
})
```
