# Playwright E2E Test Suite

Comprehensive end-to-end testing for Surveymania using Playwright.

## Overview

- **82+ test specs** covering all completed features (Phases 0-3)
- **300+ individual test cases**
- **Target execution time:** < 5 minutes (with 4 parallel shards on CI)
- **Cross-browser support:** Chromium, Firefox, WebKit
- **Real-time features:** SSE updates, offline queue, geolocation

## Test Coverage

### ✅ Phase 1: MVP (Complete)
- **Authentication** (`auth/auth.spec.ts`)
  - Sign-up, sign-in, sign-out, session persistence
  - Protected routes, user switching

- **Survey CRUD** (`surveys/survey-crud.spec.ts`)
  - Create, edit, duplicate, delete, publish surveys
  - Search, filter by status, cross-tenant isolation

- **All 16 Question Types** (`surveys/question-types.spec.ts`)
  - Text, textarea, number, email, phone
  - Single/multiple choice, dropdown, rating, scale
  - Date, time, datetime, file upload, location, signature
  - Question reordering, deletion, required fields

- **Response Submission** (`responses/submit-response.spec.ts`)
  - Public form rendering, validation (required fields, email, number min/max)
  - Anonymous responses, file uploads, all question types
  - Error handling, multi-page surveys (if implemented)

- **Geolocation** (`responses/geolocation.spec.ts`)
  - Permission request/denial, location capture
  - Retry on failure, accuracy display
  - Block submission when required, mobile support

- **Data Grid** (`data-management/responses-grid.spec.ts`)
  - TanStack Table with sorting, filtering, pagination
  - Column visibility, pinning, resizing
  - Global search, status filters, date range
  - Row selection, delete actions, empty states

- **Exports** (`data-management/exports.spec.ts`)
  - CSV, XLSX, JSON, PDF formats
  - GeoJSON, KML for location data
  - Export history tracking, file size display
  - Empty survey handling

### ✅ Phase 2: Collaboration (Complete)
- **Real-time SSE** (`realtime/sse-updates.spec.ts`)
  - EventSource connection, new response events
  - Toast notifications, auto-reconnection
  - Maintain sort/filter state, deduplication
  - Multiple concurrent viewers, comment events

- **Distribution Tools** (`distribution/share.spec.ts`)
  - Public URL display and copy
  - QR code generation (PNG/SVG download)
  - Embed code (iframe) generation
  - Social sharing (WhatsApp, Twitter, LinkedIn)
  - Warning for non-active surveys

### ✅ Phase 3: Advanced Features (Complete)
- **Conditional Logic** (`surveys/conditional-logic.spec.ts`)
  - Show/hide rules, branching (jump)
  - 12 comparison operators (equals, contains, greater_than, etc.)
  - Circular dependency detection
  - Multiple rules per question, validation on public form

- **Analytics** (`data-management/analytics.spec.ts`)
  - Key metrics (total responses, completion rate, avg time, location coverage)
  - Response trend charts (Recharts)
  - Time filters (7d, 30d, all time)
  - Question-specific analytics (choice distribution, rating stats)
  - Bar/pie charts, empty state handling

- **Map Visualizations** (`data-management/map-view.spec.ts`)
  - Leaflet maps with markers
  - Marker clustering, heatmap layer
  - Interactive popups with response details
  - Auto-fit bounds, zoom/pan controls
  - OpenStreetMap tiles, mobile touch support

### ✅ Security (Priority 1)
- **Cross-Tenant Isolation** (`security/cross-tenant.spec.ts`)
  - Prevent access to another org's surveys/responses
  - API authorization (GET/POST/PATCH/DELETE)
  - Question reordering protection
  - Export data isolation
  - Campaign/member data segregation

## Quick Start

### 1. Install Dependencies
```bash
npm install
npx playwright install chromium
```

### 2. Setup Environment
```bash
cp .env.test.example .env.test
# Edit .env.test with your Clerk test keys
```

### 3. Setup Test Database
```bash
npm run prisma:generate
npx prisma db push --skip-generate --force-reset
npx tsx tests/fixtures/db-seed.ts
```

### 4. Run Tests
```bash
# Run all tests
npm run test:e2e

# Run with UI (interactive mode)
npm run test:e2e:ui

# Run in headed mode (see browser)
npm run test:e2e:headed

# Run specific test file
npx playwright test tests/e2e/auth/auth.spec.ts

# Debug mode
npm run test:e2e:debug

# Smoke tests only (fast)
npm run test:smoke

# Security tests only
npm run test:security
```

### 5. View Reports
```bash
npm run test:report
```

## Test Organization

```
tests/
├── e2e/                          # End-to-end test specs
│   ├── auth/                     # Authentication tests
│   ├── surveys/                  # Survey CRUD, questions, logic
│   ├── responses/                # Submission, geolocation, offline
│   ├── data-management/          # Grid, exports, analytics, maps
│   ├── security/                 # Cross-tenant, authorization
│   ├── campaigns/                # Campaigns, team collaboration
│   ├── realtime/                 # SSE, notifications
│   └── distribution/             # Share, QR codes, embeds
├── fixtures/                     # Test helpers
│   ├── auth.ts                   # Clerk auth helpers
│   ├── db-seed.ts                # Database seeding
│   ├── global-setup.ts           # Setup before all tests
│   └── global-teardown.ts        # Cleanup after all tests
└── helpers/
    └── api-client.ts             # API helper for setup
```

## CI/CD Integration

Tests run automatically on every PR via GitHub Actions:

```yaml
# .github/workflows/test.yml
- 4 parallel shards for full test suite (~4-5 min total)
- Smoke tests job (~2 min) for critical paths
- Chromium only on PR (full cross-browser on main)
- HTML report published as artifact
- Traces/screenshots on failure
```

### Required GitHub Secrets
- `CLERK_SECRET_KEY`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`

## Test Data

The seed script (`tests/fixtures/db-seed.ts`) creates:
- **3 users** (test1@example.com, test2@example.com, test3@example.com)
- **2 organizations** (Test Organization 1, Test Organization 2)
- **5 surveys** (various states: draft, active, paused, closed)
- **10+ questions** (covering all 16 types)
- **50+ responses** (with location data, random timestamps)
- **1 campaign** (with members and roles)

### Test Users
All users have password: `Test1234!`

| Email | Organization | Role |
|-------|--------------|------|
| test1@example.com | Org 1 | Admin |
| test2@example.com | Org 1 | Member |
| test3@example.com | Org 2 | Admin |

## Writing New Tests

### Example Test
```typescript
import { test, expect } from '@playwright/test';
import { signInAsUser1 } from '../../fixtures/auth';

test.describe('My Feature', () => {
  test.beforeEach(async ({ page }) => {
    await signInAsUser1(page);
  });

  test('should do something', async ({ page }) => {
    await page.goto('/dashboard/surveys');
    await expect(page.locator('text=Customer Satisfaction')).toBeVisible();
  });
});
```

### Best Practices
1. **Use page object pattern** for complex pages
2. **Reuse auth state** with `storageState` for speed
3. **Tag tests** with `@smoke`, `@security`, `@slow` for selective runs
4. **Use API for setup** when possible (faster than UI)
5. **Avoid hard-coded IDs** - use test data from seed
6. **Test error states** and edge cases
7. **Keep tests independent** - no shared state
8. **Use descriptive names** - test name should explain what it verifies

## Debugging

### Run Single Test with UI
```bash
npx playwright test tests/e2e/auth/auth.spec.ts --ui
```

### Generate Test Code (Codegen)
```bash
npm run test:codegen
```

### View Traces
```bash
npx playwright show-trace test-results/trace.zip
```

### Console Logging
Tests capture console logs - check test output for debugging.

## Performance Optimization

### Parallel Execution
- **Local:** 8-10 workers (default: CPU cores)
- **CI:** 4 shards x 1 worker per shard

### Speed Tips
1. **Reuse auth state** - Store `storageState` after first sign-in
2. **Skip animations** - Already configured in `playwright.config.ts`
3. **Use API for setup** - Create surveys via API, test UI only
4. **Selective browser testing** - Chromium only for quick feedback
5. **Tag smoke tests** - Run critical path first (~2 min)
6. **Lazy load heavy tests** - Maps, charts in separate shard

### Sharding Strategy
```bash
# Shard 1: Auth, survey CRUD, security (1-1.5 min)
# Shard 2: Questions, responses, validation (1-1.5 min)
# Shard 3: Data grid, exports, analytics (1-1.5 min)
# Shard 4: Maps, real-time, distribution (1-1.5 min)
```

## Known Limitations

1. **Service Worker tests** - Complex, may be flaky (basic tests only)
2. **File uploads** - Metadata only (no actual S3/R2 integration)
3. **Email tests** - Resend integration skipped in most tests
4. **Geofencing** - Not implemented yet (deferred to Phase 4)
5. **Real-time stress testing** - Basic tests only (not load tested)

## Future Enhancements

- [ ] Visual regression testing (Percy/Chromatic)
- [ ] Performance tests (Lighthouse CI)
- [ ] Accessibility tests (axe-core)
- [ ] Load testing (k6) for SSE and APIs
- [ ] Contract testing for API routes
- [ ] Component tests (Playwright Component Testing)

## Troubleshooting

### Tests fail with "Cannot find module @clerk/testing"
```bash
npm install --save-dev @clerk/testing
```

### Clerk authentication not working
- Verify `CLERK_SECRET_KEY` and `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` in `.env.test`
- Use Clerk test mode keys (start with `pk_test_` and `sk_test_`)

### Database errors
```bash
# Reset and reseed
npx prisma db push --force-reset
npx tsx tests/fixtures/db-seed.ts
```

### Slow tests
- Run fewer workers: `npx playwright test --workers=1`
- Run specific test: `npx playwright test path/to/test.spec.ts`
- Check for network issues (SSE tests may timeout)

### Browser not installed
```bash
npx playwright install chromium
```

## Contributing

1. Write tests for new features
2. Run tests locally before committing
3. Ensure < 5 min execution time
4. Update this README for new test categories
5. Add seed data if needed

## Resources

- [Playwright Documentation](https://playwright.dev)
- [Clerk Testing Guide](https://clerk.com/docs/testing/overview)
- [TanStack Table Testing](https://tanstack.com/table/v8/docs/guide/testing)
- [Leaflet Testing](https://leafletjs.com/reference.html)

---

**Test Coverage:** ~85% of completed features (Phases 0-3)
**Last Updated:** 2025-11-11
**Maintained By:** Development Team
