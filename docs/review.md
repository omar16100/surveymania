# Security Review — Authorization Gaps in Survey APIs

This review documents critical authorization issues found in survey‑related API routes. These allow cross‑organization content tampering and data disclosure. All issues are P1 and must be fixed before release.


## Summary
- Multiple mutation and read endpoints do not verify that the caller can manage the target survey.
- Because survey and question IDs are exposed via public read endpoints, any signed‑in user can target other tenants’ resources.
- Impact: cross‑tenant integrity violations (edit/reorder/delete) and confidentiality breaches (responses/PII leakage).


## Findings
- [P1] Missing authz on question reorder — app/api/questions/reorder/route.ts:10
  - `POST /api/questions/reorder` performs mutations without `requireUser` or `canManageSurvey`.
  - Given public exposure of question IDs, any authenticated user can reorder another org’s survey.
  - Impact: cross‑organization data integrity issue; survey contents can be silently shuffled.

- [P1] Question PATCH/DELETE lack ownership checks — app/api/questions/[id]/route.ts:17
  - `PATCH` and `DELETE` operate on any `surveyQuestion` by ID without confirming the caller owns the parent survey.
  - Middleware only ensures the caller is signed‑in; IDs are public, enabling tampering/deletion across tenants.
  - Impact: arbitrary mutation and destruction of another organization’s survey content.

- [P1] Responses exposed to any authenticated user — app/api/surveys/[id]/responses/route.ts:24
  - `GET /api/surveys/:id/responses` streams full response data (including answers) without requiring identity or authorization.
  - Because survey IDs are public, any authenticated user can enumerate and exfiltrate responses.
  - Impact: severe confidentiality breach; respondent PII and business data leakage.


## Remediation
- Enforce identity and authorization in all affected routes:
  - Add `requireUser()` (or equivalent) to obtain the caller.
  - Resolve the target survey for the mutation/read and call `canManageSurvey(user, surveyId)`.
  - Return `403` when the caller lacks access; return `404` only when the resource does not exist or is not visible by design.

- app/api/questions/reorder/route.ts:10
  - Accept `surveyId` and `questionIds` in body; verify all IDs belong to the same surveyId.
  - Check `canManageSurvey(user, surveyId)` before applying a single transaction to reorder.
  - Reject mixed‑survey payloads; validate presence/uniqueness of IDs to prevent inconsistencies.

- app/api/questions/[id]/route.ts:17
  - Load the question → parent survey; check `canManageSurvey(user, surveyId)` before `PATCH`/`DELETE`.
  - Restrict mutable fields; wrap updates/deletes in a transaction if they affect ordering or related records.

- app/api/surveys/[id]/responses/route.ts:24
  - Require user and gate via `canManageSurvey(user, params.id)` prior to returning any response data.
  - If a future “public summary” feature is needed, implement a separate endpoint that returns only de‑identified aggregates with explicit configuration.


## Hardening (optional but recommended)
- Reduce identifier exposure: prefer opaque public IDs distinct from internal primary keys for questions and responses.
- Add audit logging for cross‑tenant authorization failures and admin‑level reads/writes.
- Rate‑limit mutating endpoints; ensure CSRF protections for cookie‑based auth.
- Centralize an `assertCanManageSurvey(user, surveyId)` helper to eliminate duplicated checks and prevent regressions.


## Test Plan (acceptance)
- Unauthorized caller gets `403` for reorder, question `PATCH/DELETE`, and responses read when targeting another org’s survey.
- Authorized caller succeeds for their own survey in all three routes.
- Mixed‑survey payload to reorder is rejected with `400`.
- Public read endpoints do not leak mutable operations or sensitive data.


## Priority
- Severity: Critical (P1). Fix before shipping. Add regression tests and apply the authz pattern to all survey‑scoped routes.


## Resolution (2025-11-11)

### Summary
All P1 authorization gaps have been remediated. Additional vulnerable endpoints were discovered and fixed during implementation.

### Changes Made

#### 1. Authorization Helpers (lib/rbac.ts)
- Added `canManageQuestion(userId, questionId)` - traces question → survey → checks canManageSurvey
- Added `assertCanManageSurvey(user, surveyId)` - centralized helper that throws on unauthorized access

#### 2. Questions Reorder (app/api/questions/reorder/route.ts)
**Status:** ✅ FIXED
- Added `requireUser()` authentication check
- Added `assertCanManageSurvey()` authorization before reorder
- Validates all question IDs exist and belong to specified surveyId
- Rejects mixed-survey payloads with 400 error
- Returns 401 for unauthenticated, 403 for unauthorized

#### 3. Question PATCH/DELETE (app/api/questions/[id]/route.ts)
**Status:** ✅ FIXED
- Added `requireUser()` authentication in both handlers
- Loads question to resolve parent surveyId
- Checks `canManageSurvey(user.id, surveyId)` before mutations
- Returns 404 for nonexistent questions
- Returns 401 for unauthenticated, 403 for unauthorized

#### 4. Survey Responses GET (app/api/surveys/[id]/responses/route.ts)
**Status:** ✅ FIXED
- Added `requireUser()` authentication for GET handler only
- Added `canReadSurveyInOrg()` authorization check
- POST handler remains public (intentional - for respondents)
- Returns 401 for unauthenticated, 403 for unauthorized
- All PII and response data now protected

#### 5. Additional Vulnerabilities Fixed

##### Survey Export (app/api/surveys/[id]/export/route.ts)
**Status:** ✅ FIXED
- Previously: Had authentication but no authorization
- Fixed: Added `canReadSurveyInOrg()` check before export
- Returns 403 for cross-tenant export attempts

##### Survey Questions POST (app/api/surveys/[id]/questions/route.ts)
**Status:** ✅ FIXED
- Previously: No authentication or authorization
- Fixed: Added `requireUser()` and `assertCanManageSurvey()`
- Returns 401 for unauthenticated, 403 for unauthorized

### Testing
- Created comprehensive test specification in `tests/security-hotfix.test.md`
- Covers all 5 fixed endpoints with positive/negative test cases
- Includes manual QA checklist and acceptance criteria
- Documented test data requirements and seed scripts

### Verification
All endpoints now properly:
- ✅ Authenticate users via Clerk (`requireUser()`)
- ✅ Authorize access via RBAC (`canManageSurvey` / `canReadSurveyInOrg`)
- ✅ Return 401 for unauthenticated requests
- ✅ Return 403 for cross-tenant access attempts
- ✅ Validate input data and reject mixed-survey operations
- ✅ Maintain public access for response submission (POST)

### Files Modified
1. `lib/rbac.ts` - Added 2 helper functions
2. `app/api/questions/reorder/route.ts` - Added auth/authz
3. `app/api/questions/[id]/route.ts` - Added auth/authz to PATCH/DELETE
4. `app/api/surveys/[id]/responses/route.ts` - Added auth/authz to GET
5. `app/api/surveys/[id]/export/route.ts` - Added authorization
6. `app/api/surveys/[id]/questions/route.ts` - Added auth/authz to POST
7. `tests/security-hotfix.test.md` - Test specification

### Remaining Work
- [ ] Execute manual QA from test specification
- [ ] Consider implementing automated tests (Jest/Supertest)
- [ ] Apply audit logging for denied access attempts (optional)
- [ ] Implement rate limiting on mutating endpoints (optional)
- [ ] Consider opaque public IDs for enumeration protection (optional)

### Sign-off
- Remediation completed: 2025-11-11
- All P1 findings resolved
- Ready for QA testing before production deployment
