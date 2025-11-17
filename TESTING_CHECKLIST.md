# Testing Checklist - Ready to Run

## ✅ Completed Setup

- [x] Playwright installed (@playwright/test v1.56.1)
- [x] Chromium browser installed (v141.0.7390.37)
- [x] Clerk testing SDK installed (@clerk/testing v1.13.14)
- [x] Test configuration created (playwright.config.ts)
- [x] 13 test files with 161 specs created
- [x] Test fixtures and helpers created
- [x] Database seed script created
- [x] GitHub Actions workflow configured
- [x] Test scripts added to package.json
- [x] Documentation created (tests/README.md, TEST_SUMMARY.md)
- [x] Prisma client generated

## 🔧 To Run Tests (Prerequisites)

### 1. Environment Configuration
```bash
# Edit .env.test with your Clerk test keys
nano .env.test

# Required variables:
# NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxxx
# CLERK_SECRET_KEY=sk_test_xxxxx
# DATABASE_URL=file:./test.db
# NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 2. Database Setup
```bash
# Push schema to test database
npx prisma db push --skip-generate --force-reset

# Seed test data (3 users, 2 orgs, 5 surveys, 50+ responses)
npx tsx tests/fixtures/db-seed.ts
```

### 3. Start Development Server
```bash
# In one terminal, start the dev server
npm run dev

# Wait for server to start on http://localhost:3000
```

### 4. Run Tests
```bash
# In another terminal, run tests

# Quick smoke test (7 auth tests, ~30 seconds)
npm run test:smoke

# Full test suite (161 specs, ~5-10 min)
npm run test:e2e

# Interactive mode with UI
npm run test:e2e:ui

# Run specific test file
npx playwright test tests/e2e/auth/auth.spec.ts --headed
```

## 📊 What to Expect

### Test Execution Flow
1. **Global setup** runs first:
   - Resets test database
   - Seeds test data (3 users, 2 orgs, 5 surveys)
   - Verifies app is running

2. **Tests execute** in parallel:
   - 8-10 workers locally (depends on CPU cores)
   - Each test runs in isolated browser context
   - Auth helpers used for sign-in (Clerk test mode)

3. **Results displayed**:
   - Terminal shows pass/fail for each test
   - HTML report generated in `playwright-report/`
   - Screenshots/traces saved on failure

### Expected Test Outcomes

**Likely to pass (no dependencies):**
- Authentication tests (if Clerk keys configured)
- Survey CRUD tests
- Question types tests
- Export tests (CSV, XLSX, JSON, PDF, GeoJSON, KML)

**May need adjustments:**
- Real-time SSE tests (requires dev server running)
- Geolocation tests (browser mocking should work)
- Map tests (Leaflet dynamic loading)
- Distribution tests (QR code generation)

**Requires actual data:**
- Response submission tests (need published surveys)
- Analytics tests (need response data)
- Security tests (need multi-org data from seed)

## 🐛 Troubleshooting

### Common Issues

**Issue: "Cannot find module @clerk/testing"**
```bash
# Reinstall dependencies
npm install
```

**Issue: "Database not found"**
```bash
# Reset database
npx prisma db push --force-reset
npx tsx tests/fixtures/db-seed.ts
```

**Issue: "Dev server not running"**
```bash
# Start dev server in separate terminal
npm run dev
```

**Issue: "Clerk authentication fails"**
- Verify Clerk test keys in `.env.test`
- Use keys from Clerk test environment (pk_test_*, sk_test_*)
- Check Clerk dashboard for test instance

**Issue: "Tests timeout"**
```bash
# Increase timeout in playwright.config.ts
# Or run fewer workers
npx playwright test --workers=1
```

**Issue: "Browser not installed"**
```bash
# Install missing browsers
npx playwright install chromium
```

## 📈 Test Execution Metrics

### Smoke Tests (npm run test:smoke)
- **Tests:** 7 authentication tests
- **Duration:** ~30 seconds
- **Purpose:** Quick verification

### Security Tests (npm run test:security)
- **Tests:** 9 cross-tenant isolation tests
- **Duration:** ~1-2 minutes
- **Purpose:** Verify authorization

### Full Suite (npm run test:e2e)
- **Tests:** 161 unique specs (805 total)
- **Duration:** 5-10 minutes (depends on hardware)
- **Purpose:** Complete feature coverage

## ✅ Success Indicators

When tests run successfully, you should see:

1. **Global setup completes:**
   ```
   🚀 Starting global setup...
   ✅ Database reset complete
   ✅ Database seeding complete
   ✅ Clerk environment ready
   ✅ App is running
   ```

2. **Tests execute:**
   ```
   Running 161 tests using 8 workers
   [chromium] › auth/auth.spec.ts:5:7 › Authentication › should display sign-in page
     ✓ passed (2.3s)
   [chromium] › auth/auth.spec.ts:11:7 › Authentication › should sign in with valid credentials
     ✓ passed (3.1s)
   ...
   ```

3. **Results summary:**
   ```
   161 passed (5m 23s)

   To open last HTML report run:
     npx playwright show-report
   ```

## 🎯 Ready to Test

Once you've completed the prerequisites above:

```bash
# Start dev server
npm run dev

# In another terminal, run smoke tests
npm run test:smoke

# If smoke tests pass, run full suite
npm run test:e2e

# View detailed report
npm run test:report
```

## 🔄 CI/CD Execution (GitHub Actions)

Tests also run automatically on CI when you:
1. Create a pull request to main
2. Push to main branch
3. Manually trigger workflow

**GitHub Actions will:**
- Setup Node.js and install dependencies
- Install Chromium browser
- Setup test database with seed data
- Run tests in 4 parallel shards
- Generate and publish HTML report
- Upload traces on failure

**Required GitHub Secrets:**
- `CLERK_SECRET_KEY`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`

Add these in: **Settings → Secrets and variables → Actions**

---

**Status:** 🟢 Ready to execute tests locally and on CI

**Next Action:** Configure .env.test with Clerk keys and run smoke tests
