# SurveyMania Local Development Issues

## Session Date: 2025-11-17

### Issues Found

#### 1. **CRITICAL** - Invalid Next.js Configuration
**File:** `next.config.mjs:11`
**Severity:** HIGH
**Status:** Active (causing server restarts)

**Issue:**
`outputFileTracingExcludes` is placed at top-level config but should be inside `experimental` block.

**Current:**
```javascript
const nextConfig = {
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  outputFileTracingExcludes: {  // ❌ WRONG LOCATION
    '*': [
      'node_modules/.prisma/client/libquery_engine-*',
      'node_modules/@prisma/engines/**',
      'node_modules/.bin/prisma',
    ],
  },
  experimental: {
    serverActions: { bodySizeLimit: '2mb' },
    instrumentationHook: true
  }
}
```

**Expected:**
```javascript
const nextConfig = {
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  experimental: {
    serverActions: { bodySizeLimit: '2mb' },
    instrumentationHook: true,
    outputFileTracingExcludes: {  // ✅ CORRECT LOCATION
      '*': [
        'node_modules/.prisma/client/libquery_engine-*',
        'node_modules/@prisma/engines/**',
        'node_modules/.bin/prisma',
      ],
    }
  }
}
```

**Impact:**
- Server continuously restarts
- Warning logged on every compilation
- Config option is ignored

---

#### 2. **WARNING** - Schema Drift (RESOLVED)
**Files:** `prisma/schema.prisma`, `prisma/migrations/20251111001117_init_d1/migration.sql`
**Severity:** MEDIUM
**Status:** ✅ FIXED

**Issue:**
Initial migration missing columns: `address`, `city`, `country`, `geocodedAt` in `SurveyResponse` table, and `Dashboard`, `DashboardWidget`, `Territory` tables were completely missing.

**Resolution:**
- Created migration `20251117095624_add_geocoding_fields`
- Applied successfully
- Database now in sync with schema

---

#### 3. **WARNING** - Prisma Configuration Deprecations
**Files:** `package.json`, `prisma/schema.prisma`
**Severity:** LOW
**Status:** Active (non-blocking)

**Issues:**
1. `package.json#prisma` configuration property deprecated (Prisma 7)
2. Preview feature `driverAdapters` is deprecated

**Impact:**
- Non-breaking warnings
- Will require migration before Prisma 7 upgrade

---

#### 4. **WARNING** - OpenTelemetry/Sentry Critical Dependencies
**Files:** Multiple dependency chain via `sentry.server.config.ts`
**Severity:** LOW
**Status:** Active (expected webpack warnings)

**Issue:**
Critical dependency warnings from:
- `@prisma/instrumentation`
- `@opentelemetry/instrumentation`
- `require-in-the-middle`

**Impact:**
- Non-blocking webpack warnings
- Common issue with instrumentation libraries
- Does not affect functionality

---

#### 5. **INFO** - API Route Refactoring
**Files:**
- `app/api/campaigns/route.ts`
- `app/api/organizations/route.ts`
- `app/api/invites/[id]/route.ts`
- Other API routes (7 files)

**Severity:** INFO
**Status:** Uncommitted changes

**Changes:**
- Spread operators replaced with explicit field listing
- Safer approach for Prisma operations
- Changed unique constraint name from `uniq_org_member` to `organizationId_userId`

**Example:**
```typescript
// Before
const created = await prisma.organization.create({
  data: { ...body, ownerId: user.id, settings: '{}' }
})

// After
const created = await prisma.organization.create({
  data: {
    name: body.name,
    slug: body.slug,
    ownerId: user.id,
    settings: '{}'
  }
})
```

**Impact:**
- Improved type safety
- Explicit field control
- Prevents accidental field injection

---

### Environment Status

**✅ WORKING:**
- Database: SQLite `dev.db` initialized and seeded
- Next.js Dev Server: Running on http://localhost:3000
- Clerk Auth: Configured with test keys
- Prisma Client: Generated and working
- Home Page: Loads successfully (200 OK)

**⚠️  WARNINGS:**
- Next.js config causing server restarts (needs fix)
- Deprecated Prisma features (non-blocking)
- Webpack warnings from instrumentation libs (expected)

**🔧 UNCOMMITTED CHANGES:**
- 11 modified files (10 API routes + next.config.mjs + migration lock)

---

### Seeded Data

**User:**
- Email: dev@surveymania.com
- Clerk ID: dev-user

**Organization:**
- Name: Development Organization
- Slug: dev-org

**Survey:**
- Title: Customer Satisfaction Survey
- Questions: 5
- Responses: 5 sample responses with geocoded locations (Singapore)

---

### Recommendations

1. **IMMEDIATE:** Fix `next.config.mjs` by moving `outputFileTracingExcludes` to `experimental` block
2. **SOON:** Commit the 11 modified files or revert if unintended
3. **LATER:** Plan migration strategy for Prisma 7 deprecations
4. **OPTIONAL:** Consider suppressing Sentry/OpenTelemetry webpack warnings if they're noisy

---

### Testing Notes

**Tested:**
- ✅ Home page loads (GET / returns 200)
- ✅ Database queries work (seeding successful)
- ✅ Clerk integration active (script loaded)
- ❌ Auth flow not tested (requires manual browser testing)
- ❌ API routes not tested (would need authenticated requests)

**Next Steps for Full Testing:**
1. Test sign-in flow through browser
2. Test survey creation
3. Test survey response submission
4. Test data export functionality
5. Test geolocation features

---

## Session Date: 2025-11-17 (Additional Tasks)

### Bangladesh Election Map Presentation

**File:** `bangladesh-election-map-presentation.html`
**Status:** ✅ COMPLETED

**Task:**
Created HTML presentation with 7 slides for Bangladesh Parliamentary Election Map data analysis.

**Content:**
1. Title slide - Bangladesh Parliamentary Election Map
2. Overview - 350 constituencies, 8 divisions, key statistics
3. Geographic Distribution - Division-level breakdown and voter statistics
4. Electoral Landscape - Political parties and candidate tracking
5. Data & Technology - Platform features and architecture
6. Key Insights - Data coverage and value propositions
7. Summary - Project value and next steps

**Data Source:**
- `/Users/3001927/personal/rajniti.app/maps/election/constituencies_data.py`
- 300 geographical constituencies + 50 reserved women's seats
- ~93 million registered voters across 8 divisions

**Conversion to PDF:**
- Open `bangladesh-election-map-presentation.html` in browser
- File > Print > Save as PDF
- Enable "Background graphics" in print settings

---

## Session Date: 2025-11-26

### Fix: JSON Parsing Error "Unexpected end of JSON input"

**Status:** ✅ COMPLETED

**Root Cause:**
Client-side code calling `.json()` on fetch response before checking if response is valid. When API returns empty/non-JSON response, parsing fails with "Unexpected end of JSON input".

**Fixes Applied:**

#### 1. `lib/auth.ts` - Fix Clerk auth() await (Critical for Workers)
- Line 12: `const { userId } = auth()` → `const { userId } = await auth()`
- Line 47: Same fix in `optionalUser()`
- **Impact:** Clerk auth() must be awaited in Cloudflare Workers environment

#### 2. `app/api/campaigns/route.ts` - Add auth to GET endpoint
- Added `await requireUser()` to GET handler (was only on POST)
- Added proper 401 status code for auth errors
- Fixed indentation issues

#### 3. `app/dashboard/campaigns/page.tsx` - Safer JSON parsing
- Lines 34-40: Check `res.ok` BEFORE calling `.json()`
- Line 68: Added `.catch(() => ({}))` fallback for error responses
- **Pattern:**
```typescript
// Before (broken):
const data = await res.json()
if (!res.ok) throw new Error(data?.error)

// After (fixed):
if (!res.ok) {
  const data = await res.json().catch(() => ({}))
  throw new Error(data?.error || 'Failed to load')
}
const data = await res.json()
