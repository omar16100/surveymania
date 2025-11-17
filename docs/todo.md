# Survey Platform Development Todo

**Last Updated:** 2025-11-17
**Current Phase:** Phase 6 - Deployment & DevOps (IN PROGRESS)

## Recent Changes

### Deployment Hardening Sprint (2025-11-17) ✅
**Status:** Complete - All P0/P1 deployment issues resolved

**Summary:** Addressed critical deployment gaps identified in production readiness review. Implemented automated database migrations, documented D1 workflow, configured secrets management, added quality checks, and integrated Sentry error tracking.

**Changes Made:**
1. **D1 Migration Strategy** ✅
   - Created `scripts/migrate-d1.sh` - Migration helper script using wrangler d1 migrations
   - Updated `.github/workflows/deploy.yml` - Added automated migration job after deployment
   - Workflow uses `wrangler d1 migrations apply --remote` with Cloudflare credentials
   - Migration approach: Prisma schema → `prisma migrate diff` → D1 SQL files

2. **Secret Management** ✅
   - Created `scripts/setup-secrets.sh` - Interactive script for Cloudflare Workers secrets
   - Documented which secrets go where (GitHub Secrets vs wrangler secrets)
   - CLERK_SECRET_KEY and CLERK_WEBHOOK_SECRET must be added via `wrangler secret put`
   - DATABASE_URL not needed (D1 uses binding, not connection string)

3. **Documentation** ✅
   - Created `docs/cloudflare-deployment.md` - Comprehensive D1 deployment guide
   - Updated `docs/database-setup.md` - Added deprecation notice (PostgreSQL → D1)
   - Created `docs/technical-debt.md` - TypeScript errors, testing gaps, monitoring needs
   - Created `docs/sentry-setup.md` - Error tracking configuration guide

4. **Build Quality Gates** ✅
   - Created `.github/workflows/quality-check.yml` - Separate CI workflow
   - Runs ESLint and TypeScript checks (continue-on-error: true)
   - Reports issues but doesn't block deployment
   - Documents 25+ TypeScript errors in technical-debt.md
   - Quality gates remain disabled in next.config.mjs until errors fixed

5. **Sentry Integration** ✅
   - Installed `@sentry/nextjs` package
   - Created `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`
   - Created `instrumentation.ts` with register() and onRequestError() hooks
   - Updated `next.config.mjs` - Added experimentalInstrumentationHook: true
   - Session replay configured (10% sample rate, 100% on errors)
   - Performance monitoring enabled (100% trace sample rate)
   - Requires NEXT_PUBLIC_SENTRY_DSN environment variable

**Files Created (9):**
- `scripts/migrate-d1.sh`
- `scripts/setup-secrets.sh`
- `docs/cloudflare-deployment.md`
- `docs/technical-debt.md`
- `docs/sentry-setup.md`
- `.github/workflows/quality-check.yml`
- `sentry.client.config.ts`
- `sentry.server.config.ts`
- `sentry.edge.config.ts`
- `instrumentation.ts`

**Files Modified (3):**
- `.github/workflows/deploy.yml` - Uncommented and updated migration job
- `docs/database-setup.md` - Added deprecation notice
- `next.config.mjs` - Added experimentalInstrumentationHook: true

**Next Actions Required:**
1. Add NEXT_PUBLIC_SENTRY_DSN to GitHub Secrets
2. Run `./scripts/setup-secrets.sh` to add Cloudflare Workers secrets
3. Fix TypeScript errors incrementally (documented in technical-debt.md)
4. Create staging environment (separate D1 database)
5. Setup Sentry project and configure alerting rules

**Deployment Status:**
- ✅ Automated migrations configured
- ✅ Secrets management documented
- ✅ D1 deployment workflow complete
- ✅ Error tracking installed
- ✅ Quality checks reporting (non-blocking)
- ⚠️ TypeScript errors need fixing (25+ errors)
- ⚠️ Secrets need manual configuration
- ⚠️ Sentry DSN needs setup

## Progress Overview

| Phase | Status | Progress | Timeline |
|-------|--------|----------|----------|
| Phase 0: Foundation | ✅ Complete | 100% | Complete |
| Phase 1: MVP | ✅ Complete | 98% | 4-6 weeks |
| Phase 2: Collaboration | ✅ Complete | 100% | 3-4 weeks |
| Phase 3: Advanced Features | ✅ Complete | 100% | 4-5 weeks |
| Phase 4: Enterprise | ⚪ Not Started | 0% | 3-4 weeks |

---

## Security Hotfix: Authorization Gaps (P1) ✅ COMPLETED

**Completed:** 2025-11-11
**Status:** All P1 issues resolved. Ready for QA testing.

Tracking remediation for critical cross-tenant authorization issues identified in docs/review.md.

### S1. Questions Reorder Endpoint ✅
- [x] Gate `POST /api/questions/reorder` with identity + org auth
  - [x] Call `requireUser()` and `canManageSurvey(user, surveyId)`
  - [x] Accept `surveyId` + `questionIds`; verify all belong to `surveyId`
  - [x] Apply a single DB transaction to reorder; validate uniqueness and order completeness
  - [x] Reject mixed-survey payloads with `400`
  - [x] Update handler at `app/api/questions/reorder/route.ts`
- [x] Tests
  - [x] Test specification created in `tests/security-hotfix.test.md`
  - [x] Covers authorized user, cross-tenant (403), mixed-survey (400)

### S2. Question PATCH/DELETE Endpoints ✅
- [x] Enforce ownership checks on `PATCH`/`DELETE /api/questions/[id]`
  - [x] Load question → resolve parent `surveyId`
  - [x] `requireUser()` + `canManageSurvey(user, surveyId)` before mutation
  - [x] Return 404 for nonexistent questions
  - [x] Update handler at `app/api/questions/[id]/route.ts`
- [x] Tests
  - [x] Test specification created in `tests/security-hotfix.test.md`
  - [x] Covers authorized, cross-tenant (403), not found (404)

### S3. Survey Responses Read Endpoint ✅
- [x] Protect `GET /api/surveys/[id]/responses`
  - [x] `requireUser()` + `canReadSurveyInOrg(user, params.id)` before returning any data
  - [x] POST remains public (intentional for respondents)
  - [x] Update handler at `app/api/surveys/[id]/responses/route.ts`
- [x] Tests
  - [x] Test specification created in `tests/security-hotfix.test.md`
  - [x] Covers authorized read, cross-tenant (403), public POST still works

### S4. Shared AuthZ Helper ✅
- [x] Created `assertCanManageSurvey(user, surveyId)` in `lib/rbac.ts`
- [x] Created `canManageQuestion(userId, questionId)` helper
- [x] Applied to questions/reorder and questions/POST endpoints

### S5. Hardening (Recommended) - Future Work
- [ ] Add audit logs for denied cross-tenant access
- [ ] Rate-limit mutating endpoints
- [ ] Consider opaque public IDs for questions/responses to reduce enumeration risk

### S6. Release Checklist
- [x] Create comprehensive test specification (`tests/security-hotfix.test.md`)
- [x] Update docs/review.md with resolution notes
- [ ] Manual QA of affected endpoints (authn/authz happy/negative paths)
- [ ] Announce fix in changelog/release notes

### Bonus Fixes (Discovered During Implementation)
- [x] Fixed `GET /api/surveys/[id]/export` - Added authorization (canReadSurveyInOrg)
- [x] Fixed `POST /api/surveys/[id]/questions` - Added auth + authz (requireUser + assertCanManageSurvey)

### Files Modified
1. `lib/rbac.ts` - Added helper functions (lines 50-64)
2. `app/api/questions/reorder/route.ts` - Full auth/authz implementation
3. `app/api/questions/[id]/route.ts` - PATCH/DELETE secured
4. `app/api/surveys/[id]/responses/route.ts` - GET secured
5. `app/api/surveys/[id]/export/route.ts` - Authorization added
6. `app/api/surveys/[id]/questions/route.ts` - POST secured
7. `tests/security-hotfix.test.md` - Test specification created
8. `docs/review.md` - Resolution notes added

---

## Phase 0: Foundation Setup ✅

### Infrastructure
- [x] Initialize Next.js 14 project with TypeScript
- [x] Configure Tailwind CSS
- [x] Setup Prisma ORM
- [x] Define complete database schema with all models
- [x] Configure Prisma client with singleton pattern
- [x] Setup basic project dependencies (React Hook Form, Zod, Zustand)
- [x] Create .env.example with required environment variables

---

## Phase 1: MVP (4-6 weeks) 🟡

**Goal:** Basic survey creation, response collection, and data viewing

### 1.1 Project Structure & Setup ✅
- [x] Create Next.js App Router structure (`app/` directory)
- [x] Setup folder organization:
  - [ ] `app/(auth)/` - Authentication pages
  - [x] `app/(dashboard)/` - Protected dashboard pages
  - [x] `app/(public)/` - Public survey pages
  - [x] `app/api/` - API routes (16+ routes implemented)
  - [x] `components/` - Reusable UI components
  - [x] `lib/` - Utilities and helpers (auth, db, utils, rbac)
  - [x] `lib/components/ui/` - shadcn/ui components
  - [ ] `hooks/` - Custom React hooks
  - [ ] `types/` - TypeScript type definitions
  - [x] `stores/` - Zustand state management
- [x] Install shadcn/ui CLI and configure
- [x] Add core shadcn/ui components (button, input, card, dialog, form, label, select, textarea, badge, separator)
- [x] Create component exports (components/ui/index.ts)
- [x] Update existing components with shadcn
- [x] Setup error boundary and loading states:
  - [x] Created ErrorBoundary component
  - [x] Created LoadingSpinner component
  - [x] Added error.tsx files for key routes (app, dashboard)
  - [x] Added loading.tsx files (dashboard, surveys, responses)
  - [x] Improved error/loading UI in pages
- [x] Create global layout with shadcn styling

### 1.2 Authentication & User Management ✅
- [x] Install and configure Clerk
  - [x] Add Clerk middleware
  - [x] Setup sign-in/sign-up pages
  - [x] Configure Clerk providers in root layout
- [x] Create user sync webhook (Clerk → Database)
  - [x] Created `/api/webhooks/clerk` route with signature verification
  - [x] Handles user.created, user.updated, user.deleted events
  - [x] Updated middleware to exclude /webhooks from auth
  - [x] Uses svix for webhook signature verification
  - [ ] Configure webhook endpoint in Clerk Dashboard (post-deployment)
- [x] Implement organization creation flow (basic: owner creates; user switches)
- [x] Create protected route middleware (Clerk-based)
- [x] Build user profile page:
  - [x] Created `/dashboard/profile` page
  - [x] Display account information (name, email, ID, created date)
  - [x] Show current organization details
  - [x] Link to organization management
  - [x] Created `/api/user/me` endpoint
- [x] Add session management utilities (Clerk-backed in lib/auth.ts with dev fallback)

### 1.3 Database & Migrations ✅
- [x] Fix Prisma schema (added Campaign.exports relation)
- [x] Create database seeding script for development (prisma/seed.ts)
- [x] Add seed script to package.json with tsx
- [x] Create comprehensive database setup guide (docs/database-setup.md)
- [x] Sample data: 1 survey, 5 questions, 5 responses with answers
- [ ] Run initial Prisma migration (user needs PostgreSQL)
- [x] Add database indexes (already defined in schema)
- [ ] Setup connection pooling (for production)
- [ ] Configure PostgreSQL on development environment (documented)
- [ ] Setup database backup strategy (documented for production)

### 1.4 Basic Survey Builder
- [x] Create survey creation page (`/surveys/new`)
- [x] Build survey settings form:
  - [x] Title and description
  - [x] Basic settings (public/private, anonymous responses)
  - [x] Location requirements toggle
- [x] Implement 5 basic question types:
  - [x] Text (short answer)
  - [x] Textarea (long answer)
  - [x] Single choice (radio buttons)
  - [x] Multiple choice (checkboxes)
  - [x] Number input
- [x] Create question builder component (QuestionEditor.tsx)
- [x] Add question reordering (up/down buttons)
- [x] Implement required field toggle
- [x] Add question delete functionality
- [x] Save survey as draft functionality
- [x] Survey preview mode
- [x] Publish survey action (API exists, UI wired in dashboard)

### 1.5 Response Submission (Public Surveys)
- [x] Create public survey page (`/s/[surveyId]`)
- [x] Build response form renderer:
  - [x] Dynamic question rendering based on type (5 basic types)
  - [x] Client-side validation with Zod
  - [ ] Progress indicator for multi-page surveys
- [x] Implement response submission API validations:
  - [x] Validate survey is active/published (server-side)
  - [x] Generate session ID for anonymous users
  - [x] Store response with timestamp
- [x] Add "Thank you" confirmation page
- [x] Handle offline submission (basic queue)
  - [x] Service worker registration and Background Sync (`sm-sync-submissions`)
  - [x] Queue storage in IndexedDB with retries counter
  - [x] Auto-process on `online` event and on sync
  - [ ] Exponential backoff and max retry policy
  - [ ] Thank-you page indicator when response was queued
- [x] Capture basic metadata (user agent)

### 1.6 Basic Location Capture
- [x] Add geolocation permission request (when required by survey)
- [x] Implement browser Geolocation API integration
- [x] Store latitude, longitude, and accuracy
- [ ] Display simple map pin on confirmation (optional)
- [x] Handle location permission denied gracefully
  - [x] Retry Location button
  - [x] Block submit when required and no fix; show error
  - [ ] Optional diagnostics (accuracy, timestamp) display
- [ ] Add location as optional question type

### 1.7 Response Viewing & Management ✅
- [x] Create responses list page (`/surveys/[id]/responses`)
- [x] Build enhanced data table:
  - [x] Display all responses in table format
  - [x] Show one column per question with answers
  - [x] Add timestamp columns (formatted)
  - [x] Sticky first column for scrolling
  - [x] Row hover states
  - [x] Implement basic pagination (50 rows per page)
- [x] Add response count summary (stats dashboard)
- [x] Show completion rate metric
- [x] Dynamic question columns
- [x] Format answers by type (text, number, choices)
- [x] Location display (lat/lng)
- [x] Status badges (color-coded)
- [x] Implement column sorting:
  - [x] Click headers to toggle sort direction
  - [x] Visual indicators (▲▼) for sort state
  - [x] Default sort by submittedAt descending
  - [x] Sortable columns: Submitted, Status, all question columns
- [x] Add single response detail view:
  - [x] Created `/dashboard/surveys/[id]/responses/[responseId]` page
  - [x] Display response metadata (status, timestamps, session ID)
  - [x] Show technical details (IP, location, user agent)
  - [x] Display all answers sorted by question order
  - [x] Format answers by type
  - [x] Action buttons (back, delete)
- [x] Delete response action:
  - [x] Enhanced DELETE `/api/responses/[id]` with RBAC
  - [x] Added delete buttons in responses table
  - [x] Confirmation dialog before deletion
  - [x] Updates stats after deletion
  - [x] Error handling

### 1.8 CSV Export ✅
- [x] Create export API endpoint (`GET /api/surveys/[id]/export-csv`)
- [x] Implement CSV generation:
  - [x] Include all response data (responses + all question answers)
  - [x] UTF-8 with BOM for Excel compatibility
  - [x] Proper escaping for special characters (quotes, commas, newlines)
- [x] Add download button in UI (responses page)
- [x] Handle proper filename with survey title and timestamp
- [ ] Handle large datasets (stream or background job) - currently loads all in memory

### 1.9 Survey Management ✅
- [x] Create surveys dashboard (`/surveys`)
- [x] Display survey list with card-based UI:
  - [x] Title, description, status dropdown
  - [x] Created date
  - [x] Question and response counts
  - [x] Quick actions (view, responses, map, delete)
- [x] Implement survey search/filter:
  - [x] Search by title and description
  - [x] Filter by status (all/draft/active/paused/closed)
  - [x] Optimized with useMemo
- [x] Add survey duplication (API exists)
- [x] Survey deletion (with confirmation) (API exists)
- [x] Survey status toggle:
  - [x] Status dropdown on each card (draft/active/paused/closed)
  - [x] Inline status updates via PATCH API
  - [x] Error handling with alerts
  - [x] Removed old "Publish" button

### 1.11 Organization & RBAC (MVP)
- [x] Organization API
  - [x] GET `/api/organizations` - List organizations (owned + current)
  - [x] POST `/api/organizations` - Create organization and set as current
  - [x] GET `/api/organizations/current` - Get current organization
  - [x] POST `/api/organizations/current` - Switch organization (owner-only)
- [x] Scope survey list/create by current organization
- [x] Protect mutating survey routes with RBAC (owner/creator)
- [x] Dashboard page to switch/create org (`/dashboard/org`)
- [x] Organization members
  - [x] DB model: OrganizationMember with roles (admin/member/viewer)
  - [x] GET `/api/organizations/:id/members` - List members
  - [x] POST `/api/organizations/:id/members` - Add/Update member
  - [x] PATCH `/api/organizations/:id/members/:memberId` - Change role
  - [x] DELETE `/api/organizations/:id/members/:memberId` - Remove member
  - [x] RBAC: Admins and owners can manage members
  - [x] Members page: `/dashboard/org/members`

### 1.10 API Routes (MVP)
- [x] POST `/api/surveys` - Create survey
- [x] GET `/api/surveys` - List surveys
- [x] GET `/api/surveys/[id]` - Get survey details
- [x] PATCH `/api/surveys/[id]` - Update survey
- [x] DELETE `/api/surveys/[id]` - Delete survey
- [x] POST `/api/surveys/[id]/publish` - Publish survey
- [x] POST `/api/surveys/[id]/duplicate` - Duplicate survey
- [x] POST `/api/surveys/[id]/questions` - Add question
- [x] POST `/api/questions/reorder` - Reorder questions
- [x] PATCH `/api/questions/[id]` - Update question
- [x] DELETE `/api/questions/[id]` - Delete question
- [x] POST `/api/surveys/[id]/responses` - Submit response
- [x] GET `/api/surveys/[id]/responses` - List responses
- [x] GET `/api/responses/[id]` - Get response details
- [x] GET `/api/responses/[id]/location` - Get response location
- [x] DELETE `/api/responses/[id]` - Delete response
- [x] Campaign APIs (all routes implemented)

---

## Phase 2: Collaboration (3-4 weeks) 🟡

**Goal:** Team collaboration, campaigns, real-time updates, and improved data interface

**Progress:** 100% - Campaign Management, Team Collaboration, Distribution Tools, Real-time Updates, Comments System, Email Invitations Complete

### 2.1 Campaign Management ✅
- [x] Create campaign model implementation (Prisma schema with Campaign, CampaignMember models)
- [x] Campaign creation flow:
  - [x] Created `/dashboard/campaigns/new` page
  - [x] Link to existing survey (dropdown of active surveys)
  - [x] Set target response count
  - [ ] Define collection period (start/end dates) - future enhancement
  - [ ] Set geographic boundaries (basic polygon) - future enhancement
- [x] Campaign dashboard (`/dashboard/campaigns`)
  - [x] Card-based UI showing all campaigns
  - [x] Search and filter by status
  - [x] Display target count and member count
- [x] Campaign detail page with stats:
  - [x] Created `/dashboard/campaigns/[id]` page
  - [x] Response count and progress tracking
  - [x] Completion percentage with progress bar
  - [x] Team members list with roles and status
  - [x] Quick links to responses and member management
- [x] Campaign status management (draft/active/paused/completed):
  - [x] Status dropdown on list page
  - [x] Status dropdown on detail page
  - [x] PATCH API for status updates
- [x] Progress tracking (responses vs target):
  - [x] Stats API integration
  - [x] Visual progress bar
  - [x] Percentage calculation

### 2.2 Team Collaboration 🟡
- [x] Campaign member management:
  - [x] Created `/dashboard/campaigns/[id]/members` page
  - [x] Add members via email invitation form
  - [x] Remove members with confirmation dialog
  - [x] Assign roles (admin/collector/viewer) inline
  - [x] Display member status (invited/active)
  - [x] Show invitation and join dates
  - [x] Team member list with roles and status badges
  - [ ] Assign geographic territories - future enhancement
- [x] Role-based access control (RBAC) - Core roles defined:
  - [x] Admin role (full control over campaign)
  - [x] Collector role (can submit responses)
  - [x] Viewer role (read-only access)
  - [x] Role descriptions in UI
  - [x] Role selection in invite form
  - [x] Inline role updates with dropdown
- [x] Campaign member APIs enhanced:
  - [x] POST `/api/campaigns/[id]/members` - Invite member
  - [x] PATCH `/api/campaigns/[id]/members/[memberId]` - Update role/status
  - [x] DELETE `/api/campaigns/[id]/members/[memberId]` - Remove member
  - [x] Zod validation for member operations
- [x] Email invitation system:
  - [x] Email invitation flow with templates (Resend)
  - [x] Generate secure invite tokens (crypto.randomBytes)
  - [x] Invite acceptance page for new users (/invite/[token])
  - [x] Email notifications via Resend
  - [x] Invite management UI (send, list, revoke)
  - [x] Email validation and expiry handling (7 days)
- [ ] Permission middleware on campaign API routes

**Email Invitation Implementation Summary (2025-10-27):**
- Created Invite model in Prisma schema (token, email, role, status, expiresAt)
- Installed Resend for email delivery
- Email template with gradient header and responsive design
- API routes: POST/GET invites, DELETE revoke, POST/GET accept
- Invite acceptance page with Clerk integration and email validation
- Updated org members page with invite form and pending invites table
- Graceful degradation if Resend not configured
- Security: secure token generation, expiry checks, email matching

### 2.3 Excel-like Data Grid
- [x] Install TanStack Table
- [x] Replace responses table with grid scaffolding:
  - [x] Multi-column sorting (Submitted default desc)
  - [x] Global search filter
  - [x] Column visibility toggles (base + dynamic question columns)
  - [x] Client-side pagination controls
- [ ] Virtualized scrolling (handle 100k+ rows)
- [x] Virtualized scrolling (rows)
- [x] Column resizing (drag resizer in header)
- [x] Column pinning (Submitted pinned left by default, toggleable)
- [x] Advanced filters (initial):
  - [x] Global search
  - [x] Status dropdown filter
  - [x] Submitted date range filter
  - [ ] Per-question dropdown filters (for choices)
  - [ ] Number/date specialized filters per type
- [ ] Column reordering (drag headers)
- [ ] Cell renderers: map preview link for location, file links
- [ ] Export filtered/selected data
- [ ] Quick stats footer (count, sum, avg)

#### 2.3.1 Next Sprint Focus
- [ ] Implement column reordering via header drag
- [ ] Add per-question dropdown filters for choice-based questions
- [ ] Enable export of filtered/selected rows in CSV
- [ ] Prepare grid to accept real-time row inserts (adapter for Pusher/Supabase)

#### 2.3.3 Per-question Filters (Plan)
- [ ] Detect question types to drive filter UI
  - [ ] Choice questions → single/multi-select dropdown
  - [ ] Number questions → min/max inputs
  - [ ] Date/datetime questions → from/to pickers
  - [ ] Text/textarea → contains/startsWith match
- [ ] Map filter values to TanStack `columnFilters`
- [ ] Persist filters to URL query (shareable links)
- [ ] Clear-all filters control
- [ ] Save/restore filters per survey (localStorage)

#### 2.3.4 Export Filtered/Selected (Plan)
- [ ] Row selection (checkbox column)
- [ ] Maintain `rowSelection` state in table
- [ ] Export options modal: All, Filtered, Selected
- [ ] POST export with server-side validation of filters/selection
- [ ] Stream large CSVs; fall back to async job for >50k rows
- [ ] Include metadata in filename (filters applied, timestamp)

#### 2.3.2 Column Reordering (Plan)
- [ ] Add drag handle to headers (mouse + touch)
- [ ] Update column order state via table.setColumnOrder
- [ ] Persist column order per-survey in localStorage (keyed by surveyId)
- [ ] Reset-to-default order action
- [ ] Keyboard accessibility for reordering (optional)

#### 2.3.5 Column Reordering UX Spec
- [ ] Drag Handle: small grabbable area in header (≡ icon) that appears on hover/focus
- [ ] Visual Cues: placeholder line between columns + dragged header opacity
- [ ] Drop Targets: only between visible, non-pinned columns; pinned group boundaries respected
- [ ] A11y: header focus with ArrowLeft/ArrowRight + Space to “pick up”, Escape to cancel, Enter to drop
- [ ] Persistence: store `columnOrder` in localStorage under `sm:responses:{surveyId}:colOrder`
- [ ] Reset: “Reset columns” button clears persisted order and restores server-defined order

### 2.4 Real-time Updates ✅
- [x] Choose real-time solution (Server-Sent Events / SSE selected)
- [x] Setup WebSocket/SSE connection (EventSource configured)
- [x] Implement real-time events:
  - [x] `survey:response:new` - New response submitted
  - [ ] `survey:response:updated` - Response modified (future)
  - [ ] `campaign:member:joined` - Member joined campaign (future)
- [x] Update data grid in real-time (responses page updates automatically)
- [x] Show notification toast on new responses (Toast system implemented)
- [ ] Presence indicators (who's viewing) (optional, deferred)
- [x] Optimize for concurrent viewers (SSE in-memory pub/sub)

#### 2.4.1 Realtime Implementation Plan ✅
- [x] Pick provider and install SDK (Server-Sent Events / SSE - built into browsers, no external service)
- [x] No env vars needed (SSE runs natively on Next.js API routes)
- [x] Server: emit `survey:response:new` on POST /responses (publishToChannel in route.ts)
- [x] Client: subscribe on responses page to survey channel (EventSource in useEffect)
- [x] Update TanStack Table state on event (prepend new row with deduplication)
- [x] Maintain filters/sort on updates (state updates optimized)
- [x] Display toast notification (ToastContainer in layout, showToast on event)
- [x] Connection management (EventSource auto-reconnects, heartbeat keeps connection alive)

#### 2.4.2 Provider Decision Matrix ✅
- Server-Sent Events / SSE (SELECTED)
  - Pros: built into browsers, no external service, no cost, simple architecture, native browser support
  - Cons: one-way communication only (server to client), requires keeping connections open
- Pusher
  - Pros: easy client API, presence channels, good docs, solid reliability
  - Cons: paid tiers, external service dependency
- Supabase Realtime
  - Pros: integrated with Supabase, Postgres CDC option, generous free tier
  - Cons: more moving parts, row-level security configuration
- **Decision:** SSE selected for simplicity, zero cost, and no external dependencies

**Implementation Summary (2025-10-27):**
- Created `lib/sse.ts` - In-memory pub/sub system with channel subscriptions
- Created `app/api/surveys/[id]/sse/route.ts` - SSE endpoint that streams events to clients
- Created `components/Toast.tsx` - Toast notification system (success/error/info/warning)
- Modified `app/api/surveys/[id]/responses/route.ts` - Publishes `survey:response:new` event after response creation
- Modified `app/dashboard/surveys/[id]/responses/page.tsx` - EventSource subscription with deduplication
- Modified `app/layout.tsx` - Added ToastContainer for global notifications
- No environment variables needed - SSE runs natively in Next.js
- Heartbeat mechanism keeps connections alive (30s intervals)

#### 2.4.3 Channel + Event Schema
- Channel Names
  - `survey.{surveyId}` main channel per survey
  - `campaign.{campaignId}` for campaign member events
- Events
  - `survey:response:new` { id, surveyId, sessionId, status, submittedAt, latitude?, longitude?, answers: [{ questionId, answerType, … }] }
  - `survey:response:updated` { id, ...partial fields changed }
  - `campaign:member:joined` { id, campaignId, userId, role }
- Auth
  - Public read on `survey.{surveyId}` only if survey is public; else require authenticated org membership
  - Signed channel auth endpoint `/api/realtime/auth` to authorize private/presence channels

#### 2.4.4 Client State Updates
- Prepend new rows while keeping current filters/sort active
- De-duplicate by `id` (skip if already present)
- Maintain a max buffer (e.g., 10k rows) to avoid memory blowup; older rows trimmed if over cap
- Pause live updates when heavy filters are applied; show a “new data” indicator to apply

#### 2.4.5 Server Emission Points
- POST `/api/surveys/:id/responses` after DB commit → emit `survey:response:new`
- PATCH `/api/responses/:id` (future) → emit `survey:response:updated`
- POST `/api/campaigns/:id/members` → emit `campaign:member:joined`

#### 2.4.6 Security + Limits
- Rate limit client connections per IP/user
- Validate survey visibility and org membership before issuing channel auth
- Backoff/retry on socket disconnect
- Consider message size limits; truncate large payloads (e.g., long text answers)

### 2.7 Phase 1 Exit Criteria (Remaining)
- [ ] Survey preview mode
- [ ] Offline submission queue (basic)
- [ ] Handle location permission denied gracefully
- [ ] Initial Prisma migration run on dev DB
- [ ] Minimum CRUD happy path manual QA checklist
  - [ ] Create survey with 3+ questions → publish
  - [ ] Submit 2+ responses (one with location)
  - [ ] Verify responses table renders and CSV downloads
  - [ ] Duplicate survey and delete original
  - [ ] Create org, switch, ensure isolation across orgs

---

## Appendix A: Implementation Plans (MVP)

### A1. Survey Preview Mode (Plan)
- [ ] Route: `/dashboard/surveys/:id/preview` (or toggle on edit page)
- [ ] Render with same public form renderer but without submission
- [ ] Mock sessionId and geolocation; show banner "Preview – not collecting responses"
- [ ] Respect conditional logic once implemented
- [ ] Guard: creator/owner/org-admin only

### A2. Offline Submission Queue (Plan)
- [ ] Service Worker + Background Sync (fallback to IndexedDB polling)
- [ ] Queue schema in IndexedDB: { surveyId, payload, createdAt, retries }
- [ ] Retry policy: exponential backoff up to N attempts
- [ ] Network status indicator on public form
- [ ] Conflict handling: de-dupe by sessionId + client nonce
- [ ] UX: Toasts for queued and successfully synced submissions

### A3. Location Permission Handling (Plan)
- [ ] Prompt only when locationRequired is true
- [ ] If denied or timeout, show clear message and allow retry
- [ ] Graceful degradation: allow submit when optional; block when required
- [ ] Diagnostics: show accuracy and timestamp of fix
- [ ] QA matrix: iOS Safari, Android Chrome, Desktop browsers

### A4. Streaming/Background CSV (Plan)
- [ ] Server: Node stream with `Transform` for row-to-CSV, backpressure-aware
- [ ] Pagination cursor on DB query to avoid loading all rows in memory
- [ ] For large datasets (>50k rows), enqueue background job and return 202 with export id
- [ ] Storage: upload to S3/R2 and expose signed URL via `/api/exports/:id/download`
- [ ] Filename includes survey slug, filter hash, and timestamp

### A5. User Profile Page (Plan)
- [ ] Route: `/dashboard/profile`
- [ ] Show Clerk-managed fields (name, email, image) + platform fields (org, roles)
- [ ] Allow editing display name/avatar (persist in Clerk)
- [ ] Security section: active sessions, sign out all

### A6. Invitation Flow (Plan)
- [ ] Invite model: token, email, role, organizationId, expiresAt, invitedBy
- [ ] API: create invite (admin/owner), accept invite (sets OrganizationMember)
- [ ] Email delivery via provider (Resend/SES)
- [ ] Accept page: `/invite/:token` with Clerk sign-in/up continuation
- [ ] Revocation and list of pending invites in org members page

### 2.5 Comments & Annotations ✅
- [x] Create comment model (extend schema)
  - [x] Added Comment model with parentId for threading
  - [x] Relations to User (author, resolver) and SurveyResponse
  - [x] Support for mentions array and resolve tracking
- [x] Add comment thread component
  - [x] Created CommentThread.tsx with full UI
  - [x] Reply, edit, delete, resolve functionality
  - [x] Nested comment display
- [x] Comment on specific responses
  - [x] POST /api/responses/[id]/comments
  - [x] GET /api/responses/[id]/comments
- [x] Thread discussions
  - [x] Support for parent/child comment relationships
  - [x] Reply UI with cancel/submit
- [x] Resolve/unresolve comments
  - [x] PATCH /api/comments/[id]/resolve
  - [x] Resolve button on each comment
  - [x] Visual indicator for resolved comments
- [x] Comment notifications
  - [x] Real-time SSE updates for new comments
  - [x] Toast notifications for comment events
- [x] Tag team members (@mentions)
  - [x] Mentions array in Comment model
  - [ ] @mention autocomplete UI (future enhancement)
- [ ] Activity feed (deferred to Phase 3)

**Implementation Summary (2025-10-27):**
- Created Comment model in Prisma schema with threading, resolution, mentions support
- API routes: POST/GET comments, PATCH/DELETE individual comments, PATCH resolve endpoint
- CommentThread component with full CRUD operations
- Real-time updates via SSE for comment events
- Integrated into response detail page
- All comment operations authenticated with Clerk

### 2.6 Distribution Tools ✅
- [x] Generate public survey links:
  - [x] Created `/dashboard/surveys/[id]/share` page
  - [x] Display public URL with copy functionality
  - [x] Warning for non-active surveys
- [x] Create QR code generator:
  - [x] Installed qrcode and @types/qrcode packages
  - [x] Canvas-based QR code generation
  - [x] Real-time QR code display (300x300px)
- [x] QR code download (PNG/SVG):
  - [x] Download as PNG button
  - [x] Download as SVG button
  - [x] Proper file naming (survey-{id}-qr.{ext})
- [x] Embeddable widget generator:
  - [x] Generate iframe embed code
  - [x] Copy embed code button
  - [x] Usage instructions
  - [x] Customizable width/height
- [x] Copy link button with toast:
  - [x] Copy to clipboard functionality
  - [x] Visual feedback (button state change)
  - [x] 2-second confirmation
- [x] Social media share buttons:
  - [x] WhatsApp share with pre-filled message
  - [x] Twitter share with text and URL
  - [x] LinkedIn share integration
  - [x] Icons for each platform
  - [x] Opens in popup window
- [x] Added "Share" button to survey cards in list view

---

## Phase 3: Advanced Features (4-5 weeks) 🟡

**Goal:** Advanced question types, conditional logic, mapping, analytics, and design system

**Progress:** 67% (6 of 9 features complete)

### 3.1 Advanced Question Types ✅
- [x] Implement remaining question types:
  - [x] Number input (with min/max validation)
  - [x] Email (with validation)
  - [x] Phone (with formatting)
  - [x] Dropdown/select
  - [x] Date picker
  - [x] Time picker
  - [x] Date-time picker
  - [x] File upload (basic - metadata only, S3/R2 integration deferred)
  - [x] Signature pad (text-based signature)
  - [x] Scale/slider (configurable min/max/step with labels)
  - [x] Rating (1-5 stars)
  - [x] Location (separate from response geolocation)
- [x] Question validation rules:
  - [x] Custom regex patterns with error messages
  - [x] Min/max length for text fields
  - [x] Min/max value for number fields
  - [x] File size/type restrictions
  - [x] Scale configuration (min, max, step, labels)
- [x] Question piping (use previous answers in questions) ✅ 2025-11-12

**Implementation Summary (2025-10-28):**
- Updated Zustand store with 16 question types and ValidationRule type
- Extended QuestionEditor component with all question types organized by groups (Text, Choice, Scale, Date/Time, Special)
- Added validation UI for each type: text/textarea (min/max length, regex), number (min/max value), scale (min/max/step/labels), file (size, types)
- Updated public survey form with full rendering for all 16 types
- Implemented client-side Zod validation with type-specific rules (email validation, phone regex, file size/type, number min/max, etc.)
- Added server-side validation in API to enforce all validation rules
- Responses table already handles all answer types via existing formatAnswer function
- All validation rules stored in question.validation JSON field
- Question types: text, textarea, number, email, phone, single_choice, multiple_choice, dropdown, rating (1-5), scale (customizable), date, time, datetime, file_upload, location, signature

### 3.2 Conditional Logic ✅
- [x] Design logic rules engine
- [x] Skip logic (show/hide questions based on answers)
- [x] Branching (jump to specific question)
- [x] Logic builder UI:
  - [x] Visual rule builder
  - [x] IF-THEN conditions
  - [x] Support for 12 comparison operators
- [ ] Multiple conditions with AND/OR (deferred - simple conditions only for now)
- [ ] Test logic preview mode (deferred)
- [x] Logic validation (circular dependency detection)

**Implementation Summary (2025-10-28):**
- Created lib/logic-engine.ts with comprehensive logic evaluation system
- Support for 12 comparison operators: equals, not_equals, contains, not_contains, greater_than, less_than, greater_than_or_equal, less_than_or_equal, is_empty, is_not_empty, in_list, not_in_list
- Three action types: show (reveal question), hide (conceal question), jump (branch to specific question)
- LogicBuilder component with visual rule creation interface
- Integrated into QuestionEditor - each question can have multiple logic rules
- Public survey form evaluates logic in real-time using form.watch()
- Questions dynamically show/hide based on user responses
- Circular dependency detection algorithm using DFS graph traversal
- Logic rules stored in question.logic JSON field
- Rules evaluated in order - first matching rule's action is applied
- Simple condition structure: questionId + operator + value
- Compound conditions (AND/OR) scaffolded but deferred to Phase 4

### 3.3 Geofencing ✅
- [x] Implement geofence model (extend Campaign settings)
- [x] Create geofence drawing tool:
  - [x] Draw polygon on map
  - [x] Draw circle with radius
  - [x] Support GeoJSON format
- [x] Validate response location against geofence:
  - [x] Point-in-polygon algorithm (@turf/boolean-point-in-polygon)
  - [x] Reject responses outside boundaries
- [x] Territory assignment for collectors ✅ Sprint 2
- [x] Visualize geofences on map (via GeofenceDrawer component)

**Implementation Summary (2025-11-11):**
- Added `geofence` (String?, GeoJSON) field to Campaign model in schema.prisma
- Installed dependencies: @turf/boolean-point-in-polygon, @turf/circle, leaflet-draw, @types/leaflet-draw
- Created `lib/geofence.ts` validation library:
  - parseGeofence/serializeGeofence for JSON storage
  - isPointInGeofence for validation (supports polygon and circle)
  - validateResponseLocation for response validation with error messages
  - getGeofenceCenter and getGeofenceBounds for map utilities
- Created `components/GeofenceDrawer.tsx`:
  - Leaflet map with drawing tools (polygon and circle)
  - Edit and delete functionality
  - Purple theme (#673ab7) matching design system
  - Instructions and usage hints
- Updated campaign API endpoints:
  - POST /api/campaigns - accepts geofence field (nullable)
  - PATCH /api/campaigns/[id] - accepts geofence field (nullable)
- Updated response submission (POST /api/surveys/[id]/responses):
  - Checks for active campaign with geofence
  - Validates location against geofence before accepting response
  - Returns 403 error with message if outside geofence
- Files created/modified:
  - prisma/schema.prisma (Campaign.geofence added)
  - lib/geofence.ts (new)
  - components/GeofenceDrawer.tsx (new)
  - app/api/campaigns/route.ts (geofence support)
  - app/api/campaigns/[id]/route.ts (geofence support)
  - app/api/surveys/[id]/responses/route.ts (geofence validation)

### 3.4 Map Visualizations ✅
- [x] Install Leaflet (React-Leaflet 4.x for React 18 compatibility)
- [x] Create map component library
- [x] Response location map:
  - [x] Pin markers for each response
  - [x] Cluster markers for dense areas
  - [x] Heat map layer (leaflet.heat)
- [x] Interactive map features:
  - [x] Click marker to view response details in popup
  - [x] Toggle clustering on/off
  - [x] Toggle heat map on/off
  - [ ] Filter responses by map bounds (deferred)
  - [x] Draw to filter (polygon/rectangle tool) ✅ Sprint 2
- [x] Territory coverage map ✅ Sprint 2
- [x] Export map as image (PNG) ✅ Sprint 1

**Implementation Summary (2025-10-28):**
- Installed Leaflet, React-Leaflet 4.x, leaflet.markercluster, leaflet.heat
- Created ResponseMap component with dynamic loading to avoid SSR issues
- Created MapInner component with full Leaflet integration
- API endpoint `/api/surveys/[id]/map` returns GeoJSON FeatureCollection
- Features:
  - Marker clustering with leaflet.markercluster (configurable)
  - Heat map layer with intensity gradient (blue→yellow→red)
  - Interactive popups showing response details (first 5 answers + metadata)
  - Auto-fit bounds to display all responses
  - OpenStreetMap tiles (no API key required)
  - Map controls: cluster toggle, heatmap toggle
- Updated map page with full implementation
- Graceful handling of no location data (empty state)
- Response popups include: session ID, timestamp, accuracy, answers
- Fixed default marker icons with CDN URLs

### 3.5 Geocoding Integration ✅
- [x] Choose geocoding provider (Nominatim - free, open-source)
- [x] Implement forward geocoding (address → coordinates):
  - [x] POST `/api/geocode/forward`
  - [ ] Address autocomplete (deferred)
- [x] Implement reverse geocoding (coordinates → address):
  - [x] POST `/api/geocode/reverse`
  - [x] Display address in response table
  - [x] Per-response geocoding via button
- [x] Cache geocoding results (stored in database)
- [x] Handle rate limits (1 req/sec delay in batch operations)

**Implementation Summary (2025-11-11):**
- Extended SurveyResponse model in schema.prisma:
  - Added `address`, `city`, `country` (String?, nullable)
  - Added `geocodedAt` (DateTime?, timestamp)
- Created `lib/geocoding.ts` service library:
  - reverseGeocode(lat, lng) → address, city, country
  - forwardGeocode(address, limit) → array of coordinates
  - batchReverseGeocode with progress callback and rate limiting
  - shouldGeocode helper to check if geocoding is needed
  - Uses Nominatim API (free, no API key required)
- Created geocoding API endpoints:
  - POST /api/geocode/reverse - reverse geocode coordinates
  - POST /api/geocode/forward - forward geocode address
  - POST /api/responses/[id]/geocode - geocode specific response (with authz)
- Updated response table UI (app/dashboard/surveys/[id]/responses/page.tsx):
  - Extended Response type with address fields
  - Location column shows address (city/country) when available, coordinates otherwise
  - Added "Geocode" button in actions column for responses with coordinates but no address
  - Real-time UI update after geocoding
  - Toast notification on success
- Files created/modified:
  - prisma/schema.prisma (SurveyResponse fields added)
  - lib/geocoding.ts (new)
  - app/api/geocode/reverse/route.ts (new)
  - app/api/geocode/forward/route.ts (new)
  - app/api/responses/[id]/geocode/route.ts (new)
  - app/dashboard/surveys/[id]/responses/page.tsx (geocoding UI)

### 3.6 Analytics Dashboard ✅
- [x] Create analytics page (`/surveys/[id]/analytics`)
- [x] Response metrics:
  - [x] Total responses
  - [x] Completion rate
  - [x] Average completion time
  - [x] Responses with location count
  - [ ] Abandonment rate (deferred)
  - [ ] Drop-off by question (deferred)
- [x] Question analytics:
  - [x] Choice distribution (pie charts, bar charts)
  - [x] Rating averages (avg, min, max)
  - [x] Response trends over time (line chart)
  - [x] Word clouds for text responses ✅ Sprint 2
- [ ] Geographic analytics (deferred to 3.4 Map Visualizations):
  - [ ] Responses by region
  - [ ] Heat map of activity
  - [ ] Distance calculations
- [x] Time-based filters (7 days, 30 days, all time)
- [ ] Comparison mode (compare time periods) (deferred to Phase 4)

**Implementation Summary (2025-10-28):**
- Created `/dashboard/surveys/[id]/analytics` page with comprehensive visualizations
- Installed Recharts library for charting
- API endpoint `/api/surveys/[id]/analytics` with time range filtering
- Key metrics cards: total responses, completion rate, avg completion time, location coverage
- Response trend line chart showing daily response counts
- Question-specific analytics:
  - Choice-based (single/multiple/dropdown): pie chart + bar chart distribution
  - Numeric (number/rating/scale): average, min, max statistics + distribution charts
  - Rating questions show distribution visualization
- Time series with gap-filling for consistent 7-day and 30-day views
- Analytics button added to survey dashboard
- Supports filtering by 7d, 30d, or all time
- Responsive layout with grid-based metric cards

### 3.7 Custom Dashboards ✅
- [x] Drag-and-drop dashboard builder (react-grid-layout)
- [x] Widget library:
  - [x] Metric cards (total responses, completion rate, avg time, location count)
  - [x] Charts (bar, line, pie with Recharts)
  - [x] Tables (mini response table)
  - [x] Maps (integrated with ResponseMap component) ✅ 2025-11-12
  - [x] Text/markdown (react-markdown + remark-gfm) ✅ 2025-11-12
- [x] Save custom dashboard layouts (stored in database)
- [x] Share dashboard with public link (token-based public URLs)
- [x] Real-time dashboard updates (SSE via useSSE hook) ✅ 2025-11-12
- [x] Map PNG export (html2canvas integration) ✅ 2025-11-12
- [ ] Export dashboard as PDF (deferred to Phase 4)

**Implementation Summary (2025-11-11):**
- Created Dashboard and DashboardWidget models in Prisma schema:
  - Dashboard: id, surveyId, userId, organizationId, name, description, layout (JSON), isPublic, publicToken
  - DashboardWidget: id, dashboardId, type, config (JSON), gridPosition (JSON), order
  - Cascade delete on dashboard removal
- API routes created:
  - POST/GET /api/surveys/[id]/dashboards - Create and list dashboards
  - GET/PATCH/DELETE /api/dashboards/[dashboardId] - Manage specific dashboard
  - GET /api/dashboards/public/[token] - Public dashboard view (no auth)
  - All with proper auth/authz (requireUser + canManageSurvey/canReadSurveyInOrg)
- Components created:
  - widgets/MetricCard.tsx - Single metric display with real-time data fetching
  - widgets/ChartWidget.tsx - Line/bar/pie charts using Recharts
  - widgets/TableWidget.tsx - Mini response table with column selection
  - WidgetContainer.tsx - Wrapper with edit/delete controls
  - DashboardBuilder.tsx - Main builder with react-grid-layout integration
- Zustand store (stores/dashboardStore.ts):
  - Dashboard and Widget state management
  - Layout updates, widget CRUD operations
  - Dirty state tracking for auto-save
- Utility functions (lib/dashboard-utils.ts):
  - Grid configuration and widget sizes
  - Serialization/deserialization for layout and config
  - API format conversions, default configs
  - Layout validation
- Dashboard pages:
  - /dashboard/surveys/[id]/dashboards - List all dashboards
  - /dashboard/surveys/[id]/dashboards/new - Create new dashboard
  - /dashboard/surveys/[id]/dashboards/[dashboardId] - View/edit dashboard
- Features:
  - Drag and drop widgets to reposition
  - Resize widgets with handles
  - Add widgets via toolbar (Metric Card, Chart, Table)
  - Edit/delete widgets in edit mode
  - Save layout and widgets to database
  - Public sharing with unique tokens
  - Copy public link to clipboard
- Grid configuration:
  - 12 columns, 60px row height
  - 16px margins, responsive breakpoints
  - Vertical compaction, collision prevention
  - Purple theme (#673ab7) matching design system
- Dependencies installed:
  - react-grid-layout ^1.4.4
  - @types/react-grid-layout ^1.3.5
- Files created/modified (17 total):
  1. prisma/schema.prisma (Dashboard/DashboardWidget models)
  2. app/api/surveys/[id]/dashboards/route.ts
  3. app/api/dashboards/[dashboardId]/route.ts
  4. app/api/dashboards/public/[token]/route.ts
  5. components/dashboard/widgets/MetricCard.tsx
  6. components/dashboard/widgets/ChartWidget.tsx
  7. components/dashboard/widgets/TableWidget.tsx
  8. components/dashboard/WidgetContainer.tsx
  9. components/dashboard/DashboardBuilder.tsx
  10. stores/dashboardStore.ts
  11. lib/dashboard-utils.ts
  12. app/dashboard/surveys/[id]/dashboards/page.tsx
  13. app/dashboard/surveys/[id]/dashboards/new/page.tsx
  14. app/dashboard/surveys/[id]/dashboards/[dashboardId]/page.tsx

**Sprint 1 Enhancements (2025-11-12):**
- Map Widget Integration:
  - Created components/dashboard/widgets/MapWidget.tsx - Wrapper around ResponseMap
  - Dynamic import to avoid SSR issues with Leaflet
  - Configurable showClusters and showHeatmap toggles
  - Integrated into WidgetContainer and DashboardBuilder toolbar
- Text Widget Implementation:
  - Created components/dashboard/widgets/TextWidget.tsx - Markdown editor/viewer
  - Edit mode: textarea for markdown input + alignment controls (left/center/right)
  - View mode: ReactMarkdown with remark-gfm (tables, strikethrough, task lists)
  - Prose styling with purple theme links and headings
  - Installed react-markdown ^10.1.0 and remark-gfm ^4.0.1
- Map PNG Export:
  - Created lib/map-export.ts with html2canvas integration
  - exportMapAsImage() function with configurable format/quality/scale
  - copyMapToClipboard() for clipboard support
  - getMapAsDataURL() for base64 encoding
  - Added export button to ResponseMap component with loading state
  - Exports at 2x scale for high-DPI displays
- Real-time Dashboard Updates:
  - Created hooks/useSSE.ts - React hook for Server-Sent Events
  - Generic useSSE() hook with auto-reconnect and exponential backoff
  - Specialized useSurveySSE() hook for survey-specific events
  - Connection state tracking (isConnected, error)
  - Added SSE to MetricCard, ChartWidget, TableWidget
  - Widgets auto-refetch data on survey:response:new events
  - Max 5 reconnection attempts with 3s base interval
- Question Piping:
  - Created lib/piping.ts - Template string replacement library
  - Syntax: {{Q1}}, {{Q2}} (position-based) or {{question_id}} (ID-based)
  - applyPiping() replaces placeholders with actual answer values
  - validatePiping() checks for self-references and forward references
  - extractPlaceholders() for analysis
  - Integrated into survey form at app/(public)/s/[id]/page.tsx
  - Piping context built from form values with questionOrder
  - Applied to both question text and description fields
  - Support for all answer types (text, number, arrays, boolean)
- Files created:
  15. components/dashboard/widgets/MapWidget.tsx
  16. components/dashboard/widgets/TextWidget.tsx
  17. lib/map-export.ts
  18. hooks/useSSE.ts
  19. lib/piping.ts
- Files modified:
  - components/ResponseMap.tsx - Added export button and state
  - components/dashboard/WidgetContainer.tsx - Integrated new widgets
  - components/dashboard/DashboardBuilder.tsx - Added to toolbar
  - lib/dashboard-utils.ts - Already had configs for map/text
  - app/(public)/s/[id]/page.tsx - Applied piping to questions

**Sprint 2 Enhancements (2025-11-12):**
- Word Clouds for Text Responses:
  - Created lib/text-processing.ts - Text processing utilities
  - processTextForWordCloud() with stop words filtering (150+ common words)
  - calculateTextStatistics() for metrics (total words, unique words, avg)
  - Created components/WordCloud.tsx - d3-cloud integration
  - Interactive SVG word cloud with color scheme and rotation
  - Modified app/api/surveys/[id]/analytics/route.ts - Added textResponses field
  - Modified app/dashboard/surveys/[id]/analytics/page.tsx - Word cloud visualization + 5 stats cards
  - Installed d3-cloud ^1.2.7 and @types/d3-cloud ^1.2.9
- Map Draw-to-Filter with Polygon Selection:
  - Created lib/map-filter.ts - Geographic filtering utilities
  - leafletToGeoJSON() coordinate conversion (Leaflet [lat,lng] to GeoJSON [lng,lat])
  - isPointInPolygon() using @turf/boolean-point-in-polygon
  - filterResponsesByPolygon() for filtering responses
  - getBounds(), getPolygonCenter(), getPolygonArea(), formatArea() utilities
  - Created components/FilterableMap.tsx - Interactive map with Leaflet.draw
  - Polygon and rectangle drawing tools
  - Real-time filtering callback with filteredIds
  - Filter info overlay showing area and count
  - Edit and delete polygon functionality
- Territory Assignment Component:
  - Modified prisma/schema.prisma - Added Territory model
  - Fields: id, campaignId, name, description, boundary (GeoJSON), color, assignedToId, createdById
  - Relations: Campaign.territories, User.assignedTerritories, User.createdTerritories
  - Indexes on campaignId and assignedToId
  - Created app/api/campaigns/[id]/territories/route.ts - GET (list), POST (create)
  - Created app/api/territories/[id]/route.ts - GET (details), PATCH (update), DELETE (remove)
  - Zod validation schemas for create and update
  - Created components/TerritoryAssigner.tsx - Complex territory management UI
  - Split-screen layout: map (2/3) + territory list (1/3)
  - Leaflet map with draw controls (polygon, rectangle)
  - Load and render existing territories as colored polygons
  - Click territory to select and edit
  - Form: name, description, 8 preset colors, assignment dropdown
  - Real-time area calculation (formatArea)
  - Save (create/update) and delete with confirmation
  - Territory list sidebar with click-to-zoom
  - Created app/dashboard/campaigns/[id]/territories/page.tsx - Territory management page
  - Modified app/dashboard/campaigns/[id]/page.tsx - Added "Manage Territories" button
- Dashboard PDF Export:
  - Created lib/dashboard-export.ts - PDF export utilities
  - exportDashboardToPDF() using jsPDF and html2canvas
  - Capture widgets as images with html2canvas (scale 2x)
  - Multi-page PDF layout with automatic pagination
  - Dashboard metadata header (title, description, date, page numbers)
  - calculatePDFLayout() for widget positioning
  - exportWidgetToPNG() for single widget export
  - Modified components/dashboard/WidgetContainer.tsx - Added data-widget-id attribute
  - Modified app/dashboard/surveys/[id]/dashboards/[dashboardId]/page.tsx - Export button
  - Export button with loading state (disabled when no widgets)
  - Uses existing jsPDF and html2canvas dependencies
- Files created:
  20. lib/text-processing.ts
  21. components/WordCloud.tsx
  22. lib/map-filter.ts
  23. components/FilterableMap.tsx
  24. app/api/campaigns/[id]/territories/route.ts
  25. app/api/territories/[id]/route.ts
  26. components/TerritoryAssigner.tsx
  27. app/dashboard/campaigns/[id]/territories/page.tsx
  28. lib/dashboard-export.ts
- Files modified:
  - prisma/schema.prisma - Territory model and relations
  - app/api/surveys/[id]/analytics/route.ts - textResponses extraction
  - app/dashboard/surveys/[id]/analytics/page.tsx - Word cloud + stats
  - app/dashboard/campaigns/[id]/page.tsx - Territory management link
  - components/dashboard/WidgetContainer.tsx - data-widget-id attribute
  - app/dashboard/surveys/[id]/dashboards/[dashboardId]/page.tsx - PDF export

### 3.8 Multiple Export Formats ✅
- [x] XLSX export (Excel with formatting):
  - [x] Multiple sheets (responses, summary, questions)
  - [x] Column formatting and auto-sizing
  - [x] JSON to sheet conversion with proper types
- [x] JSON export (nested structure)
  - [x] Survey, questions, responses with nested answers
  - [x] Proper type handling (choices, numbers, text)
- [x] PDF export (formatted report):
  - [x] Survey details and description
  - [x] Summary statistics table
  - [x] Questions list with types
  - [x] First 20 responses table
  - [x] Page numbering and export timestamp
- [x] GeoJSON export (location data)
  - [x] FeatureCollection format
  - [x] Point geometries for each response
  - [x] Properties include all answers
- [x] KML export (Google Earth)
  - [x] Placemarks for each response
  - [x] Descriptions with formatted answers
  - [x] Compatible with Google Earth
- [x] Export UI with format selection
  - [x] Visual format picker with icons
  - [x] Format descriptions
  - [x] One-click download
- [x] Export history tracking
  - [x] Database tracking with Export model
  - [x] Export history page
  - [x] File size, creator, timestamps
  - [x] 7-day expiry
- [ ] Export with custom column selection (deferred)
- [ ] Scheduled exports (daily, weekly) (deferred to Phase 4)

**Implementation Summary (2025-10-27):**
- Created `lib/exports.ts` with 5 export generators
- Installed: xlsx, jspdf, jspdf-autotable, @types/geojson
- Updated `/api/surveys/[id]/export` - GET with format query param
- Created `ExportMenu` component with visual format picker
- Added export tracking to database (non-blocking)
- Created export history page at `/dashboard/surveys/[id]/exports`
- API: GET `/api/surveys/[id]/exports` for history
- All exports download immediately, no storage needed
- XLSX: 3 sheets (Responses, Summary, Questions) with auto-sizing
- PDF: Tables with autoTable, pagination, formatted headers
- GeoJSON/KML: Filter responses with location data only

### 3.9 Google Forms Design System ✅

**Goal:** Implement comprehensive Google Forms-inspired design system for consistent UI/UX

**Progress:** 100% - Foundation and Builder Experience Complete

#### 3.9.1 Design System Documentation ✅
- [x] Created comprehensive design system specification (docs/design.md)
- [x] Section 1-23: Core design patterns, tokens, components, accessibility
- [x] Section 24: Implementation guide for current codebase
  - [x] Current state analysis (gaps identified)
  - [x] CSS class definitions (.btn, .input, .card, etc.)
  - [x] Tailwind config updates
  - [x] Component refactoring checklist
  - [x] Migration path with time estimates
  - [x] Testing guidelines
  - [x] Reference implementation examples

#### 3.9.2 Phase 1: Foundation (Complete) ✅
- [x] Design tokens added to `app/globals.css`:
  - [x] Purple primary colors (#673ab7, #9575cd, #512da8)
  - [x] Elevation system (3 shadow levels: elevation-1/2/3)
  - [x] Spacing scale (4px base: 4px, 8px, 12px, 16px, 20px, 24px, 32px, 48px, 64px)
  - [x] Typography tokens (font family, weights: 400/500/700)
  - [x] Semantic colors (success #188038, warning #f9ab00, error #d93025, focus #1a73e8)
  - [x] Updated Tailwind HSL variables (--primary: purple, --ring: blue, --background: light gray)
- [x] Component CSS classes defined (@layer components):
  - [x] `.btn` with variants (btn-primary, btn-secondary, btn-text)
  - [x] `.input` with focus states
  - [x] `.card` with elevation variants (card-hover, card-selected)
  - [x] `.card-selected::before` (3px purple left bar)
  - [x] `.form-header` (accent color band for surveys)
  - [x] `.drag-handle` (reorderable affordance)
  - [x] `.progress-bar` and `.progress-bar__fill`
- [x] Updated `tailwind.config.ts`:
  - [x] Added purple color palette (50, 100, DEFAULT, light, dark)
  - [x] Added elevation shadow utilities (elevation-1/2/3)
  - [x] Added card/control border radius utilities
  - [x] Added display/title/subtitle font sizes
  - [x] Added surface/surface-alt colors
- [x] Enhanced `components/ui/index.tsx`:
  - [x] Button: 5 variants (default/primary, secondary, outline, destructive, text)
  - [x] Button: 3 sizes (sm, default, lg)
  - [x] Card: Added `.card` class with elevation-1 shadow
  - [x] Badge: Changed from brand-600 to purple
  - [x] Input: Uses `.input` class (now properly defined)

**Implementation Summary (2025-11-11):**
- Fixed Next.js hydration error (broken Select wrapper)
- Replaced custom Select with proper Radix UI re-export
- Primary color: Black → Purple #673ab7
- All cards have subtle shadows (elevation-1)
- Focus states use Google Blue #1a73e8
- Background: White → Light gray #f5f5f5
- Build tested successfully - no errors

#### 3.9.3 Phase 2-3: Builder Experience (Complete) ✅
- [x] QuestionEditor major enhancements (`components/QuestionEditor.tsx`):
  - [x] Selection state management (`selectedQuestionId` state)
  - [x] Purple 3px left bar on selected cards (`.card-selected`)
  - [x] Drag handles with `GripVertical` icon (lucide-react)
  - [x] Hover elevation on non-selected cards (`.card-hover`)
  - [x] Improved spacing: `space-y-6` between cards (24px)
  - [x] Click-to-select functionality
  - [x] Stop propagation on action buttons
  - [x] Drag handle has grab cursor with hover states
- [x] Validation section styling:
  - [x] All validation backgrounds: `bg-gray-50` → `bg-purple-50`
  - [x] Text/textarea validation (min/max length, regex)
  - [x] Number validation (min/max value)
  - [x] Scale validation (min/max/step/labels)
  - [x] File upload validation (size/type limits)
- [x] LogicBuilder improvements (`components/LogicBuilder.tsx`):
  - [x] Background: `bg-gray-50` → `bg-purple-50`
  - [x] Consistent purple theme
- [x] Build tested successfully

**Visual Impact:**
- Question cards have interactive states (default → hover → selected)
- Purple left bar provides strong visual feedback
- Drag handles signal reorderable content
- Purple-tinted backgrounds create visual hierarchy
- Consistent Google Forms aesthetic throughout builder

**User Experience Improvements:**
- Clear visual feedback for active question
- Obvious drag affordance
- Elevated depth on hover/selection
- Better spacing reduces visual clutter

#### 3.9.4 Phase 4: Survey Taking (Planned)
- [ ] Header band component with `.form-header`
- [ ] Card-based question layout (wrap each question in Card)
- [ ] Progress bar if `survey.settings.showProgressBar`
- [ ] Large primary submit button
- [ ] Consistent `space-y-6` spacing between question cards

#### 3.9.5 Phase 5: Polish (Planned)
- [ ] App bar for builder pages
- [ ] Floating composer toolbar
- [ ] Autosave indicator
- [ ] Keyboard shortcuts implementation
- [ ] Toast component color refinement

**Files Modified:**
- `app/globals.css` - Design tokens + component classes
- `tailwind.config.ts` - Purple palette + utilities
- `components/ui/index.tsx` - Enhanced Button/Card/Badge
- `lib/components/ui/select.tsx` - Radix UI (proper implementation)
- `components/QuestionEditor.tsx` - Selection + drag handles
- `components/LogicBuilder.tsx` - Purple backgrounds
- `app/dashboard/campaigns/new/page.tsx` - Fixed hydration error
- `docs/design.md` - Comprehensive design system specification

**Design System Resources:**
- `docs/design.md` - Complete specification (23 sections + implementation guide)
- Design tokens, component patterns, accessibility guidelines
- Implementation checklist with priorities
- Testing guidelines and common pitfalls
- Reference examples with code snippets

---

## Phase 4: Enterprise (3-4 weeks) ⚪

**Goal:** SSO, advanced permissions, audit logs, white-labeling, and API access

### 4.1 SSO Integration
- [ ] Clerk SSO configuration
- [ ] Support SAML 2.0
- [ ] Support OIDC (OpenID Connect)
- [ ] Test with common providers (Okta, Azure AD, Google Workspace)
- [ ] SSO admin configuration UI
- [ ] Force SSO for organization

### 4.2 Advanced Permissions
- [ ] Granular permission system:
  - [ ] Survey permissions (view, edit, delete, share)
  - [ ] Response permissions (view, export, delete)
  - [ ] Campaign permissions (manage, view stats)
  - [ ] Organization permissions (admin, billing)
- [ ] Custom role builder
- [ ] Permission groups
- [ ] Permission inheritance
- [ ] Permission audit (who has access to what)

### 4.3 Audit Logs
- [ ] Create audit log model
- [ ] Track all actions:
  - [ ] Survey created/edited/deleted
  - [ ] Response submitted/deleted
  - [ ] User invited/removed
  - [ ] Export generated
  - [ ] Settings changed
- [ ] Audit log viewer page
- [ ] Filter logs by:
  - [ ] User
  - [ ] Action type
  - [ ] Date range
  - [ ] Resource (survey, campaign)
- [ ] Export audit logs
- [ ] Retention policy configuration

### 4.4 White-labeling
- [ ] Custom branding settings:
  - [ ] Organization logo
  - [ ] Primary/secondary colors
  - [ ] Custom CSS injection
- [ ] Custom domain support:
  - [ ] CNAME configuration
  - [ ] SSL certificate management
- [ ] Email customization:
  - [ ] Custom email templates
  - [ ] Logo in emails
- [ ] Public survey page customization:
  - [ ] Hide platform branding
  - [ ] Custom footer
  - [ ] Custom thank you page

### 4.5 Public API
- [ ] API key generation and management
- [ ] API documentation (OpenAPI/Swagger)
- [ ] Rate limiting per API key
- [ ] Webhook system:
  - [ ] Configure webhook URLs
  - [ ] Webhook events (response.created, survey.completed)
  - [ ] Webhook signature verification
  - [ ] Retry logic for failed webhooks
- [ ] API usage analytics
- [ ] API versioning strategy

### 4.6 Integration Marketplace
- [ ] Zapier integration
- [ ] Make (Integromat) integration
- [ ] Slack notifications
- [ ] Microsoft Teams notifications
- [ ] Google Sheets sync
- [ ] Airtable sync
- [ ] Salesforce integration
- [ ] HubSpot integration

---

## Phase 5: Testing & Quality Assurance

### 5.1 Unit Tests
- [ ] Setup Jest and React Testing Library
- [ ] Test utilities and helpers
- [ ] Test API route handlers
- [ ] Test components:
  - [ ] Survey builder components
  - [ ] Form components
  - [ ] Data grid components
- [ ] Achieve >80% code coverage

### 5.2 Integration Tests
- [ ] Setup Playwright or Cypress
- [ ] Test critical flows:
  - [ ] User registration and login
  - [ ] Survey creation and publishing
  - [ ] Response submission
  - [ ] Export generation
  - [ ] Campaign creation and invitation
- [ ] Test API endpoints
- [ ] Test database operations

### 5.3 E2E Tests
- [ ] Complete user journey tests:
  - [ ] Create account → Create survey → Submit response → View data
  - [ ] Invite team member → Collaborate on campaign
- [ ] Test across browsers (Chrome, Firefox, Safari)
- [ ] Test mobile responsive design
- [ ] Test accessibility (WCAG 2.1 AA)

### 5.4 Performance Testing
- [ ] Load testing with k6 or Artillery:
  - [ ] 1000+ concurrent response submissions
  - [ ] Large dataset export (10k+ responses)
  - [ ] Real-time updates under load
- [ ] Database query performance:
  - [ ] EXPLAIN ANALYZE slow queries
  - [ ] Optimize indexes
- [ ] Frontend performance:
  - [ ] Lighthouse audit (>90 score)
  - [ ] Core Web Vitals optimization

### 5.5 Security Testing
- [ ] OWASP Top 10 checks
- [ ] SQL injection testing
- [ ] XSS vulnerability testing
- [ ] CSRF protection verification
- [ ] Rate limiting validation
- [ ] Authentication/authorization edge cases
- [ ] Data encryption verification
- [ ] Security headers (CSP, HSTS, etc.)

---

## Phase 6: Deployment & DevOps

---

## Appendix B: Known Limitations & Follow‑ups (POC)

### B1. Offline Queue
- Background Sync is not supported in all browsers; we fall back to `online` event processing
- No exponential backoff yet; retries counter is stored but not used for backoff
- No duplicate prevention on server; consider client nonce + server idempotency key
- Storage quota limits may evict IDB on low–storage devices; provide manual "Retry now" in UI
- SW lifecycle: ensure updates trigger `skipWaiting` safely; verify no request loss across activation
- Consider a manual flush button on the public form and a queued count indicator

### B2. Geolocation
- Accuracy varies widely; consider displaying accuracy and fix timestamp optionally
- Permission "denied forever" requires browser settings; provide guidance link
- No fallback geolocation (e.g., IP-based) implemented
- Add max age + minimum accuracy rules if surveys demand it

### B3. Real‑time
- Not wired yet; decide between Pusher/Supabase and implement adapter
- Table growth: introduce a max buffer and archival pagination to prevent memory growth
- Sort stability: inserting live rows while sorted/filtered requires careful state updates

### B4. Data Grid
- Row virtualization only; column virtualization not implemented
- Column reordering not implemented yet (see plan)
- Advanced per-question filters (dropdown/number/date) pending
- No export of filtered/selected rows yet

### B5. Security & Privacy
- DB RLS not configured; add RLS policies if using Supabase
- Rate limiting missing on public endpoints; add per-IP/user rate limits
- No CSRF protection for non-RESTful interactions (App Router usually safe for same-origin); verify
- PII handling and retention policies not enforced yet

### B6. Observability & Testing
- Sentry not wired; add DSN and error boundaries to capture exceptions
- No automated tests yet; add Jest/RTL and Playwright smoke tests
- Performance budget/metrics not tracked; add Vercel Analytics and custom metrics

---

## Appendix C: Env & Deployment Checklist (POC)
- Provision Postgres (Supabase/Railway) and set `DATABASE_URL`
- Run `npm install && npm run prisma:generate && npm run prisma:migrate -- --name init`
- Set Clerk envs: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`
- (Optional) Configure domain settings for Clerk
- Deploy to Vercel, add env vars, enable Edge for static where relevant
- Verify service worker served from `/public/sw.js` and HTTPS is used
- Sanity test: create survey → preview → publish → submit (online + offline) → see responses → export CSV

### 6.1 Infrastructure Setup
- [ ] Choose hosting provider (Vercel/AWS/Railway)
- [ ] Setup production database:
  - [ ] PostgreSQL with PostGIS
  - [ ] Connection pooling (PgBouncer)
  - [ ] Automated backups
  - [ ] Point-in-time recovery
- [ ] Setup Redis for caching
- [ ] Configure CDN (Cloudflare/Vercel Edge)
- [ ] Setup object storage (S3/R2) for file uploads

### 6.2 CI/CD Pipeline ✅
- [x] GitHub Actions workflow:
  - [x] Setup Node.js build environment
  - [x] Install dependencies
  - [x] Generate Prisma Client
  - [x] Build with OpenNext adapter
  - [x] Deploy to Cloudflare Workers via wrangler
  - [ ] Lint and type check
  - [ ] Run unit tests
  - [ ] Run integration tests
  - [ ] Deploy to staging
- [x] Cloudflare deployment with OpenNext:
  - [x] Installed @opennextjs/cloudflare package
  - [x] Configured wrangler.toml for OpenNext
    - [x] Set main: .open-next/worker.js
    - [x] Enabled nodejs_compat flag
    - [x] Set compatibility_date: 2024-12-30
    - [x] Configured assets directory
  - [x] Modified next.config.mjs with initOpenNextCloudflareForDev
  - [x] Updated package.json scripts (preview, deploy)
  - [x] Created .github/workflows/deploy.yml for automated deployments
  - [x] Environment variables configuration via GitHub Secrets
  - [x] Removed Docker files (not needed with OpenNext)
- [ ] Automated database migrations
- [ ] Environment-specific configurations
- [ ] Deployment rollback strategy

**Deployment Setup Instructions:**
1. Configure GitHub Secrets:
   - `CLOUDFLARE_API_TOKEN` - Cloudflare API token (create at dash.cloudflare.com/profile/api-tokens)
   - `CLOUDFLARE_ACCOUNT_ID` - Cloudflare account ID (run: wrangler whoami)
   - `DATABASE_URL` - Neon PostgreSQL connection string
   - `NEXT_PUBLIC_APP_URL` - Production app URL
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - Clerk public key
   - `CLERK_SECRET_KEY` - Clerk secret key
   - `CLERK_WEBHOOK_SECRET` - Clerk webhook secret
2. Push to main branch to trigger deployment
3. Manual deployments available via workflow_dispatch or `npm run deploy`
4. Local preview: `npm run preview`

**Deployment Method:** OpenNext Cloudflare adapter - optimized for Next.js on Cloudflare Workers
- Supports all Next.js features: SSR, ISR, middleware, server actions
- Size limits: 3MB (Free plan), 10MB (Paid plan)
- No containerization needed

### 6.3 Monitoring & Observability
- [ ] Setup Sentry for error tracking
- [ ] Configure Vercel Analytics or custom analytics
- [ ] Database monitoring:
  - [ ] Slow query log
  - [ ] Connection pool metrics
  - [ ] Disk usage alerts
- [ ] Uptime monitoring (Pingdom/UptimeRobot)
- [ ] Setup log aggregation (Datadog/CloudWatch)
- [ ] Create alerting rules (email/Slack)

### 6.4 Performance Optimization
- [ ] Enable caching strategies:
  - [ ] Survey configurations in Redis
  - [ ] Aggregated statistics caching
  - [ ] CDN caching for static assets
- [ ] Database optimization:
  - [ ] Review and optimize indexes
  - [ ] Query optimization
  - [ ] Implement connection pooling
- [ ] Frontend optimization:
  - [ ] Code splitting
  - [ ] Image optimization (Next.js Image)
  - [ ] Lazy loading
  - [ ] Service worker for offline support

---

## Additional Features (Future)

### Survey Templates
- [ ] Create template library
- [ ] Common survey types (satisfaction, feedback, registration)
- [ ] Template categorization
- [ ] Template preview
- [ ] Create survey from template

### Multi-language Support
- [ ] i18n setup (next-i18next)
- [ ] Survey localization (multiple languages)
- [ ] UI language switcher
- [ ] RTL support

### Mobile Apps
- [ ] React Native app for data collection
- [ ] Offline response submission
- [ ] Push notifications
- [ ] Camera integration for photo uploads

### Advanced Analytics
- [ ] Sentiment analysis (AI-powered)
- [ ] Response quality scoring
- [ ] Anomaly detection
- [ ] Predictive analytics
- [ ] Cross-survey analysis

### Gamification
- [ ] Collector leaderboards
- [ ] Achievement badges
- [ ] Response milestones
- [ ] Team competitions

---

## Notes

### Dependencies to Add
```bash
# UI Components
npx shadcn-ui@latest init
npx shadcn-ui@latest add button input card dialog form

# Data Grid
npm install ag-grid-react ag-grid-community
# OR
npm install @tanstack/react-table

# Maps
npm install mapbox-gl @mapbox/mapbox-gl-geocoder
# OR
npm install leaflet react-leaflet

# Authentication
npm install @clerk/nextjs

# Charts
npm install recharts

# File Upload
npm install @aws-sdk/client-s3

# Real-time
npm install pusher pusher-js
# OR use Supabase

# Export
npm install xlsx pdf-lib

# Forms & Validation
# Already installed: react-hook-form, zod

# QR Codes
npm install qrcode

# Date/Time
npm install date-fns
```

### Database Setup
```bash
# Run migrations
npm run prisma:migrate

# Generate Prisma Client
npm run prisma:generate

# Seed database (development)
npm run prisma:seed

# Open Prisma Studio
npm run prisma:studio
```

### Git Workflow
- Main branch: `main`
- Feature branches: `feature/[feature-name]`
- Commit format: `type: description` (e.g., `feat: add survey builder`)
- No direct commits to main (use PRs)

---

**Legend:**
- ✅ Complete
- 🟡 In Progress
- ⚪ Not Started
- [ ] Task checkbox
