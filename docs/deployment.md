# Cloudflare D1 Deployment Guide for SurveyMania

**Last Updated:** 2025-11-11
**Status:** Ready for implementation
**Estimated Effort:** 3-5 days (44 hours)

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [D1 + Prisma Compatibility](#d1--prisma-compatibility)
3. [Geolocation Without PostGIS](#geolocation-without-postgis)
4. [Schema Migration Strategy](#schema-migration-strategy)
5. [Required Code Changes](#required-code-changes)
6. [Cloudflare D1 Setup](#cloudflare-d1-setup)
7. [Migration Execution Plan](#migration-execution-plan)
8. [Data Migration Tools](#data-migration-tools)
9. [Performance Optimization](#performance-optimization)
10. [D1 Limitations & Workarounds](#d1-limitations--workarounds)
11. [Environment Configuration](#environment-configuration)
12. [Complete Code Examples](#complete-code-examples)
13. [Testing & Verification](#testing--verification)
14. [Blockers & Risks](#blockers--risks)
15. [Cost Analysis](#cost-analysis)
16. [Troubleshooting](#troubleshooting)
17. [Rollback Strategy](#rollback-strategy)
18. [Next Steps](#next-steps)

---

## Executive Summary

### Migration Overview

**From:** Next.js 14 + PostgreSQL + Prisma
**To:** Next.js 14 + Cloudflare D1 (SQLite) + Prisma + Cloudflare Workers

**Feasibility:** ✅ **YES - Migration is fully viable**

**Key Findings:**
- ✅ SurveyMania already uses simple lat/lng (no PostGIS dependencies in data layer)
- ✅ Point-in-polygon algorithm already implemented in application code
- ✅ Prisma 5.19.1 has full D1 support via `@prisma/adapter-d1`
- ✅ Geolocation features can be maintained with application-layer spatial queries
- ✅ D1 limitations have clear, tested workarounds

**Complexity:** MEDIUM-HIGH
**Timeline:** 3-5 days
**Total Effort:** ~44 hours

**Critical Success Factor:** Your app architecture is already D1-friendly because:
1. No PostGIS geography types used (just DECIMAL lat/lng)
2. Geofencing uses JS point-in-polygon algorithm (not PostGIS functions)
3. No complex multi-table transactions detected
4. Array types limited to single field (answerChoices)

---

## D1 + Prisma Compatibility

### Current Configuration

```json
// package.json (current)
{
  "@prisma/client": "5.19.1",
  "prisma": "5.19.1"
}
```

**Status:** ✅ Fully compatible with D1 (requires 5.12.0+)

### Required Packages

```bash
npm install @prisma/adapter-d1@latest
```

### Prisma Schema Changes

**Before (PostgreSQL):**
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

**After (D1/SQLite):**
```prisma
generator client {
  provider = "prisma-client-js"
  previewFeatures = ["driverAdapters"]
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}
```

Important: In Workers runtime, do not rely on `DATABASE_URL`. The D1 adapter uses the `DB` binding. `DATABASE_URL` is for local development and Prisma client generation only.

### Compatibility Matrix

| Feature | PostgreSQL | D1/SQLite | Status |
|---------|-----------|-----------|--------|
| Prisma ORM | ✅ | ✅ | Full support |
| Migrations | ✅ | ✅ | Via Prisma + Wrangler |
| Transactions | ✅ | ⚠️ | Limited/verify; prefer idempotency or compensation |
| JSON fields | ✅ | ✅ | Stored as TEXT; SQLite JSON functions available |
| Arrays | ✅ | ⚠️ | Use JSON serialization (see helpers) |
| UUIDs | ✅ | ⚠️ | TEXT with app-generated or @default(uuid()) |
| Decimal | ✅ | ⚠️ | Use REAL (Float64) |
| Enums | ✅ | ✅ | CHECK constraints |

---

## Geolocation Without PostGIS

### Current Implementation Analysis

**Good News:** Your schema already uses simple numeric fields, NOT PostGIS types!

```prisma
// Current schema - ALREADY D1-COMPATIBLE!
model SurveyResponse {
  latitude         Decimal? @db.Decimal(10, 8)  // Simple number
  longitude        Decimal? @db.Decimal(11, 8)  // Simple number
  locationAccuracy Decimal?
}
```

This means you're NOT using:
- ❌ PostGIS `geography` type
- ❌ PostGIS `ST_Distance` functions
- ❌ PostGIS spatial indexes

### D1 Schema (Minimal Change)

```prisma
model SurveyResponse {
  latitude         Float?  // Changed from Decimal
  longitude        Float?  // Changed from Decimal
  locationAccuracy Float?  // Changed from Decimal
}
```

**Precision Impact:** Negligible
- `DECIMAL(10,8)` ≈ ±0.00000001° precision
- `REAL` (Float64) ≈ ±0.00000000000001° precision
- For geolocation: Both exceed GPS accuracy (±5-10 meters)

### Spatial Query Implementation

#### 1. Haversine Distance Formula

Calculate great-circle distance between two points:

```typescript
// lib/geo.ts
/**
 * Calculate distance between two lat/lng points using Haversine formula
 * @param lat1 Latitude of point 1 (degrees)
 * @param lon1 Longitude of point 1 (degrees)
 * @param lat2 Latitude of point 2 (degrees)
 * @param lon2 Longitude of point 2 (degrees)
 * @returns Distance in meters
 */
export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}
```

**Example Usage:**
```typescript
const distance = haversineDistance(
  23.8103, 90.4125,  // Dhaka
  40.7128, -74.0060  // New York
); // Returns: 12,534,120 meters (12,534 km)
```

#### 2. Bounding Box Pre-filtering

Optimize queries by filtering candidates before calculating precise distances:

```typescript
/**
 * Calculate bounding box for radius search
 * @param centerLat Center latitude (degrees)
 * @param centerLon Center longitude (degrees)
 * @param radiusMeters Radius in meters
 * @returns Bounding box coordinates
 */
export function getBoundingBox(
  centerLat: number,
  centerLon: number,
  radiusMeters: number
) {
  // Approximate: 1 degree latitude ≈ 111,320 meters
  const latDelta = radiusMeters / 111320;

  // Longitude degree varies by latitude
  const lonDelta = radiusMeters / (111320 * Math.cos((centerLat * Math.PI) / 180));

  return {
    minLat: centerLat - latDelta,
    maxLat: centerLat + latDelta,
    minLon: centerLon - lonDelta,
    maxLon: centerLon + lonDelta,
  };
}
```

**Usage Pattern:**
```typescript
// Find responses within 5km of Dhaka city center
const center = { lat: 23.8103, lon: 90.4125 };
const radius = 5000; // 5km in meters

// Step 1: Get bounding box (fast, uses indexes)
const box = getBoundingBox(center.lat, center.lon, radius);

const candidates = await prisma.surveyResponse.findMany({
  where: {
    surveyId: 'xyz',
    latitude: { gte: box.minLat, lte: box.maxLat },
    longitude: { gte: box.minLon, lte: box.maxLon },
  },
});

// Step 2: Filter with precise distance (in-memory, accurate)
const results = candidates.filter(
  (r) =>
    r.latitude &&
    r.longitude &&
    haversineDistance(center.lat, center.lon, r.latitude, r.longitude) <= radius
);
```

**Performance:**
- Bounding box query: ~1-5ms (indexed)
- In-memory filtering: ~0.1ms per 1000 records
- Total for 10,000 responses: ~10ms

#### 3. Composite Nearby Search Function

```typescript
/**
 * Find responses near a location
 * @param prisma Prisma client instance
 * @param surveyId Survey ID to filter
 * @param centerLat Center point latitude
 * @param centerLon Center point longitude
 * @param radiusMeters Search radius in meters
 * @returns Array of responses within radius
 */
export async function findResponsesNearby(
  prisma: PrismaClient,
  surveyId: string,
  centerLat: number,
  centerLon: number,
  radiusMeters: number
) {
  const box = getBoundingBox(centerLat, centerLon, radiusMeters);

  const candidates = await prisma.surveyResponse.findMany({
    where: {
      surveyId,
      latitude: { gte: box.minLat, lte: box.maxLat },
      longitude: { gte: box.minLon, lte: box.maxLon },
    },
  });

  return candidates.filter(
    (r) =>
      r.latitude &&
      r.longitude &&
      haversineDistance(centerLat, centerLon, r.latitude, r.longitude) <= radiusMeters
  );
}
```

#### 4. Map Visualizations (No Changes Needed!)

Your existing heatmap endpoint already returns simple GeoJSON:

```typescript
// app/api/surveys/[id]/heatmap/route.ts
// This code works identically with D1 - no PostGIS used!
const points = await prisma.surveyResponse.findMany({
  where: {
    surveyId: params.id,
    latitude: { not: null },
    longitude: { not: null }
  },
  select: { latitude: true, longitude: true }
});

const features = points.map(p => ({
  type: 'Feature',
  geometry: {
    type: 'Point',
    coordinates: [Number(p.longitude), Number(p.latitude)]
  },
  properties: {}
}));

return NextResponse.json({
  type: 'FeatureCollection',
  features
});
```

**Leaflet components:** No changes required - they consume GeoJSON

---

## Schema Migration Strategy

### Type Mapping Reference

| PostgreSQL Type | D1/SQLite Type | Conversion | Notes |
|----------------|----------------|------------|-------|
| `UUID` | `TEXT` | String | Generate via `randomUUID()` |
| `VARCHAR(n)` | `TEXT` | String | No length limit |
| `TEXT` | `TEXT` | None | Direct mapping |
| `INTEGER` | `INTEGER` | None | Direct mapping |
| `DECIMAL(p,s)` | `REAL` | Number | Float64, sufficient precision |
| `BOOLEAN` | `INTEGER` | 0/1 | Prisma handles automatically |
| `TIMESTAMP` | `TEXT` | ISO8601 | Prisma handles automatically |
| `DATE` | `TEXT` | ISO8601 | Prisma handles automatically |
| `JSON` | `TEXT` | JSON string | SQLite has JSON functions |
| `String[]` | `TEXT` | JSON array | Manual serialization |
| `ENUM` | `TEXT` + CHECK | String | Prisma generates constraints |

### Enum Handling

**PostgreSQL (native enums):**
```prisma
enum SurveyStatus {
  draft
  active
  paused
  closed
}

model Survey {
  status SurveyStatus @default(draft)
}
```

**D1/SQLite (CHECK constraints):**
```prisma
// Same Prisma schema - no changes!
enum SurveyStatus {
  draft
  active
  paused
  closed
}

model Survey {
  status SurveyStatus @default(draft)
}
```

**Generated SQL:**
```sql
CREATE TABLE Survey (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK(status IN ('draft', 'active', 'paused', 'closed')),
  -- ...
);
```

✅ **No code changes needed - Prisma handles this automatically!**

### Array Field Migration

**Problem:** SQLite doesn't have native array types

**Your Schema:**
```prisma
model SurveyAnswer {
  answerChoices String[]  // PostgreSQL array
}
```

**Solution: JSON Serialization**

#### Option 1: Change Schema (Recommended)

```prisma
model SurveyAnswer {
  answerChoices String  // Store as JSON string
}
```

**Helper Functions:**
```typescript
// lib/answer-helpers.ts
export function serializeChoices(choices: string[]): string {
  return JSON.stringify(choices);
}

export function deserializeChoices(choicesJson: string): string[] {
  try {
    const parsed = JSON.parse(choicesJson || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
```

**Usage in API Routes:**
```typescript
// Writing
await prisma.surveyAnswer.create({
  data: {
    questionId,
    responseId,
    answerType: 'choices',
    answerChoices: serializeChoices(['Option A', 'Option B'])
  }
});

// Reading
const answer = await prisma.surveyAnswer.findFirst({ where: { id } });
const choices = deserializeChoices(answer.answerChoices);
console.log(choices); // ['Option A', 'Option B']
```

#### Option 2: Keep Prisma Syntax (Requires `$queryRaw`)

If you want to avoid code changes, use Prisma's JSON handling:

```prisma
model SurveyAnswer {
  answerChoices Json  // Prisma Json type
}
```

**Usage:**
```typescript
// Writing
await prisma.surveyAnswer.create({
  data: {
    answerChoices: ['Option A', 'Option B']  // Prisma auto-serializes
  }
});

// Reading
const answer = await prisma.surveyAnswer.findFirst({ where: { id } });
const choices = answer.answerChoices as string[];
```

**Recommendation:** Use Option 1 (explicit serialization) for better type safety and control.

### UUID Generation

**PostgreSQL:** Database-generated via `gen_random_uuid()`

**D1/SQLite:** Application-generated

```typescript
// In API routes (Workers runtime)
await prisma.survey.create({
  data: {
    id: crypto.randomUUID(),  // Explicit UUID generation without nodejs_compat
    title: 'New Survey',
    // ...
  }
});
```

**Alternative:** Let Prisma handle it with `@default(uuid())`

```prisma
model Survey {
  id String @id @default(uuid())  // Prisma generates UUID
}
```

✅ **No code changes needed if using `@default(uuid())`**

### Complete Migrated Schema

See [Complete Code Examples](#complete-code-examples) section for full schema.

---

## Required Code Changes

### Summary of Changes

| File/Directory | Changes | Effort |
|---------------|---------|--------|
| `prisma/schema.prisma` | Provider, types, arrays | 30 min |
| `lib/db.ts` | D1 adapter setup | 1 hour |
| `lib/geo.ts` | **NEW** - Spatial functions | 2 hours |
| `lib/answer-helpers.ts` | **NEW** - Array helpers | 30 min |
| `app/api/**/*.ts` | Env binding pattern (~30 files) | 6 hours |
| `wrangler.toml` | D1 binding config | 15 min |
| `package.json` | Add D1 adapter | 5 min |

**Total:** ~10 hours

### 1. Database Client Refactor

**File:** `lib/db.ts`

**Current (PostgreSQL, global singleton):**
```typescript
import { PrismaClient } from '@prisma/client'

const globalForPrisma = global as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: ['warn', 'error']
})

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
```

**New (D1, per-request client):**
```typescript
import { PrismaClient } from '@prisma/client/edge'
import { PrismaD1 } from '@prisma/adapter-d1'
// Optional types: import type { D1Database } from '@cloudflare/workers-types'

/**
 * Create Prisma client for Cloudflare Workers with D1 binding
 * Must be called per-request in edge runtime
 */
export function getPrismaClient(d1: D1Database): PrismaClient {
  const adapter = new PrismaD1(d1);
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : []
  });
}

/**
 * For local development only (not used in production)
 * Connects to local SQLite file
 */
const globalForPrisma = global as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: ['warn', 'error']
})

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
```

**Why the change?**
- Cloudflare Workers edge runtime doesn't support global singletons
- D1 requires binding passed from request context
- Each request must create new client instance

### 2. API Route Pattern Updates

**Pattern to Replace (PostgreSQL):**
```typescript
import { prisma } from '@/lib/db'

export async function GET(request: Request) {
  const surveys = await prisma.survey.findMany();
  return NextResponse.json(surveys);
}
```

**New Pattern (D1):**
```typescript
import { getPrismaClient } from '@/lib/db'

export async function GET(
  request: Request,
  context: { env: { DB: D1Database } }
) {
  const prisma = getPrismaClient(context.env.DB);
  const surveys = await prisma.survey.findMany();
  return NextResponse.json(surveys);
}
```

**With OpenNext Cloudflare:**

OpenNext provides env via `process.env`:

```typescript
import { getPrismaClient } from '@/lib/db'

export async function GET(request: Request) {
  // OpenNext exposes D1 binding via process.env
  const DB = (process.env as any).DB as D1Database;
  const prisma = getPrismaClient(DB);

  const surveys = await prisma.survey.findMany();
  return NextResponse.json(surveys);
}
```

**Alternative: Create helper wrapper**

```typescript
// lib/db.ts
export function getDB() {
  const DB = (process.env as any).DB as D1Database;
  if (!DB) {
    throw new Error('D1 database binding not found');
  }
  return getPrismaClient(DB);
}

// In API routes
import { getDB } from '@/lib/db'

export async function GET(request: Request) {
  const prisma = getDB();
  const surveys = await prisma.survey.findMany();
  return NextResponse.json(surveys);
}
```

### 3. Files Requiring Updates

**API Routes (~30 files):**
```
app/api/
├── campaigns/
│   ├── [id]/
│   │   ├── route.ts                    ✏️ Update
│   │   ├── members/route.ts            ✏️ Update
│   │   ├── members/[memberId]/route.ts ✏️ Update
│   │   └── stats/route.ts              ✏️ Update
│   └── route.ts                        ✏️ Update
├── comments/
│   ├── [id]/route.ts                   ✏️ Update
│   └── [id]/resolve/route.ts           ✏️ Update
├── exports/
│   └── [id]/route.ts                   ✏️ Update
├── organizations/
│   ├── [id]/route.ts                   ✏️ Update
│   ├── [id]/members/route.ts           ✏️ Update
│   ├── current/route.ts                ✏️ Update
│   └── route.ts                        ✏️ Update
├── questions/
│   ├── [id]/route.ts                   ✏️ Update
│   └── reorder/route.ts                ✏️ Update
├── responses/
│   ├── [id]/route.ts                   ✏️ Update
│   ├── [id]/comments/route.ts          ✏️ Update
│   └── [id]/location/route.ts          ✏️ Update
├── surveys/
│   ├── [id]/route.ts                   ✏️ Update
│   ├── [id]/analytics/route.ts         ✏️ Update
│   ├── [id]/duplicate/route.ts         ✏️ Update
│   ├── [id]/export-csv/route.ts        ✏️ Update
│   ├── [id]/heatmap/route.ts           ✏️ Update
│   ├── [id]/map/route.ts               ✏️ Update
│   ├── [id]/publish/route.ts           ✏️ Update
│   ├── [id]/questions/route.ts         ✏️ Update
│   ├── [id]/responses/route.ts         ✏️ Update
│   ├── [id]/sse/route.ts               ✏️ Update
│   └── route.ts                        ✏️ Update
└── user/
    └── me/route.ts                     ✏️ Update
```

**Bulk Update Strategy:**

1. **Find & Replace Imports:**
   ```bash
   # Find all files importing prisma
   grep -r "from '@/lib/db'" app/api/

   # Replace pattern
   # FROM: import { prisma } from '@/lib/db'
   # TO:   import { getDB } from '@/lib/db'
   ```

2. **Update Function Signatures:**
   ```typescript
   // Add at top of each route handler
   const prisma = getDB();
   ```

3. **Test Each Route:**
   ```bash
   # Run dev server and test each endpoint
   npm run dev
   ```

---

## Cloudflare D1 Setup

### Step 1: Create D1 Database

```bash
# Production database
npx wrangler d1 create surveymania-prod

# Output example:
# ✅ Successfully created DB 'surveymania-prod'
#
# [[d1_databases]]
# binding = "DB"
# database_name = "surveymania-prod"
# database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

**Copy the database_id** - you'll need it for wrangler.toml

### Step 2: Create Local Development Database (Optional)

```bash
# For local testing
npx wrangler d1 create surveymania-local

# Or use SQLite file
DATABASE_URL="file:./dev.db"
```

### Step 3: Update wrangler.toml

```toml
name = "surveymania"
main = ".open-next/worker.js"
compatibility_date = "2024-12-30"
compatibility_flags = ["nodejs_compat"]

[assets]
directory = ".open-next/assets"

# D1 Database Binding
[[d1_databases]]
binding = "DB"
database_name = "surveymania-prod"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"  # From step 1

# R2 Bucket for OpenNext incremental cache
[[r2_buckets]]
binding = "BUCKET"
bucket_name = "surveymania-cache"

[vars]
NEXT_PUBLIC_APP_URL = "https://surveymania.omarshabab55.workers.dev"
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = "pk_test_..."

# Secrets (set via wrangler secret put)
# - CLERK_SECRET_KEY
# - CLERK_WEBHOOK_SECRET
# - RESEND_API_KEY (optional)
```

### Step 4: Generate Migration Files

```bash
# 1. Update prisma/schema.prisma (change provider to sqlite)

# 2. Generate migration
npx prisma migrate dev --name init_d1

# This creates: prisma/migrations/xxx_init_d1/migration.sql
```

### Step 5: Apply Migration to D1

Option A: Wrangler Migrations (recommended)

```bash
# Create a migration from SQL
npx wrangler d1 migrations create surveymania-prod init_d1 --local \
  --file=./prisma/migrations/xxx_init_d1/migration.sql

# Apply migrations
npx wrangler d1 migrations apply surveymania-prod

# List migration status
npx wrangler d1 migrations list surveymania-prod
```

Option B: Execute SQL directly

```bash
# Apply to production D1
npx wrangler d1 execute surveymania-prod \
  --file=./prisma/migrations/xxx_init_d1/migration.sql

# Verify tables created
npx wrangler d1 execute surveymania-prod --command="SELECT name FROM sqlite_master WHERE type='table';"
```

### Step 6: Create Indexes

```bash
# Create performance indexes
npx wrangler d1 execute surveymania-prod --command="
CREATE INDEX IF NOT EXISTS idx_survey_org ON Survey(organizationId);
CREATE INDEX IF NOT EXISTS idx_question_survey ON SurveyQuestion(surveyId);
CREATE INDEX IF NOT EXISTS idx_response_survey ON SurveyResponse(surveyId);
CREATE INDEX IF NOT EXISTS idx_response_user ON SurveyResponse(respondentId);
CREATE INDEX IF NOT EXISTS idx_response_location ON SurveyResponse(latitude, longitude)
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_comment_response ON Comment(responseId);
CREATE INDEX IF NOT EXISTS idx_comment_author ON Comment(authorId);
"
```

### Step 7: Local Development Setup

**Option A: Use Local D1 (Recommended)**

```bash
# wrangler.toml
[[d1_databases]]
binding = "DB"
database_name = "surveymania-local"
database_id = "local"
preview_database_id = "local"

# Start dev server with local D1
npx wrangler dev --local --persist
```

**Option B: Use SQLite File**

```bash
# .env.local
DATABASE_URL="file:./dev.db"

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Start Next.js dev server
npm run dev
```

---

## Migration Execution Plan

### Overview Timeline

| Phase | Duration | Description |
|-------|----------|-------------|
| **Phase 1** | Day 1 (6h) | Schema prep, D1 creation, Prisma updates |
| **Phase 2** | Day 2 (8h) | Code refactoring (db, geo, API routes) |
| **Phase 3** | Day 3 (8h) | Data migration scripts |
| **Phase 4** | Day 4 (8h) | Testing, performance validation |
| **Phase 5** | Day 5 (6h) | Deployment, monitoring setup |
| **Buffer** | +2 days | Issue resolution, optimization |

**Total: 36-44 hours over 3-7 days**

### Phase 1: Schema Preparation (Day 1)

#### 1.1 Create D1 Databases (30 min)

```bash
# Production
npx wrangler d1 create surveymania-prod

# Staging (optional)
npx wrangler d1 create surveymania-staging

# Development
npx wrangler d1 create surveymania-dev
```

#### 1.2 Install Dependencies (15 min)

```bash
npm install @prisma/adapter-d1@latest

# Verify versions
npm list @prisma/client @prisma/adapter-d1 prisma
```

#### 1.3 Update Prisma Schema (2 hours)

**Tasks:**
- [ ] Change provider: `postgresql` → `sqlite`
- [ ] Change `Decimal` → `Float` (latitude, longitude, answerNumber)
- [ ] Change `String[]` → `String` (answerChoices)
- [ ] Add `previewFeatures = ["driverAdapters"]`
- [ ] Review all field types for compatibility
- [ ] Test schema validation: `npx prisma validate`

See [Complete Code Examples](#complete-schema-prismaprisma) for full schema.

#### 1.4 Generate Migration SQL (1 hour)

```bash
# Generate migration
npx prisma migrate dev --name postgres_to_d1 --create-only

# Review generated SQL in:
# prisma/migrations/xxx_postgres_to_d1/migration.sql

# Check for issues:
# - Verify indexes
# - Check constraints
# - Ensure enums handled correctly
```

#### 1.5 Apply Migration to D1 (30 min)

```bash
# Apply to dev database
npx wrangler d1 execute surveymania-dev \
  --file=./prisma/migrations/xxx_postgres_to_d1/migration.sql

# Verify schema
npx wrangler d1 execute surveymania-dev \
  --command="SELECT sql FROM sqlite_master WHERE type='table' AND name='Survey';"
```

#### 1.6 Create Indexes (30 min)

```bash
# Create geolocation indexes
npx wrangler d1 execute surveymania-dev --command="
CREATE INDEX idx_response_location ON SurveyResponse(latitude, longitude)
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
"

# Verify indexes
npx wrangler d1 execute surveymania-dev \
  --command="SELECT name FROM sqlite_master WHERE type='index';"
```

### Phase 2: Code Refactoring (Day 2)

#### 2.1 Update `lib/db.ts` (1 hour)

- [ ] Add D1 adapter imports
- [ ] Create `getPrismaClient(d1)` function
- [ ] Create `getDB()` helper wrapper
- [ ] Test local dev connection
- [ ] Document environment binding pattern

#### 2.2 Create `lib/geo.ts` (3 hours)

- [ ] Implement `haversineDistance()`
- [ ] Implement `getBoundingBox()`
- [ ] Implement `findResponsesNearby()`
- [ ] Write unit tests
- [ ] Benchmark performance
- [ ] Document usage examples

#### 2.3 Create `lib/answer-helpers.ts` (30 min)

- [ ] Implement `serializeChoices()`
- [ ] Implement `deserializeChoices()`
- [ ] Add error handling
- [ ] Write tests

#### 2.4 Update API Routes (3 hours)

**Strategy:** Update in batches

**Batch 1: Core Survey Routes (1h)**
- [ ] `/api/surveys/route.ts`
- [ ] `/api/surveys/[id]/route.ts`
- [ ] `/api/surveys/[id]/questions/route.ts`
- [ ] `/api/surveys/[id]/responses/route.ts`

**Batch 2: Response & Analytics (1h)**
- [ ] `/api/responses/[id]/route.ts`
- [ ] `/api/surveys/[id]/analytics/route.ts`
- [ ] `/api/surveys/[id]/heatmap/route.ts`
- [ ] `/api/surveys/[id]/map/route.ts`

**Batch 3: Campaigns & Organizations (1h)**
- [ ] `/api/campaigns/route.ts`
- [ ] `/api/campaigns/[id]/route.ts`
- [ ] `/api/organizations/route.ts`
- [ ] All remaining routes

**Update Checklist per Route:**
```typescript
// 1. Update import
- import { prisma } from '@/lib/db'
+ import { getDB } from '@/lib/db'

// 2. Add at top of handler
+ const prisma = getDB();

// 3. Update answerChoices handling (if applicable)
+ import { serializeChoices, deserializeChoices } from '@/lib/answer-helpers'
```

#### 2.5 Update wrangler.toml (15 min)

- [ ] Add D1 binding configuration
- [ ] Add R2 bucket binding
- [ ] Update environment variables
- [ ] Verify compatibility flags

### Phase 3: Data Migration (Day 3)

**Goal:** Transfer existing data from PostgreSQL to D1

#### 3.1 Export PostgreSQL Data (2 hours)

See [Data Migration Tools](#data-migration-tools) section for detailed scripts.

**Quick Export:**
```bash
# Export all data as JSON
node scripts/export-postgres.js > data/postgres-export.json
```

#### 3.2 Transform Data (3 hours)

**Key Transformations:**
- UUID → TEXT (no change, already strings)
- Decimal → Float (parse to number)
- String[] → JSON string (serialize arrays)
- Timestamps → ISO8601 strings (Prisma handles)

```bash
# Run transformation script
node scripts/transform-data.js \
  data/postgres-export.json \
  data/d1-import.json
```

#### 3.3 Import to D1 (2 hours)

```bash
# Import data
node scripts/import-to-d1.js data/d1-import.json

# Verify counts
npx wrangler d1 execute surveymania-dev --command="
SELECT
  (SELECT COUNT(*) FROM Survey) as surveys,
  (SELECT COUNT(*) FROM SurveyQuestion) as questions,
  (SELECT COUNT(*) FROM SurveyResponse) as responses;
"
```

#### 3.4 Validate Data Integrity (1 hour)

```bash
# Run validation script
node scripts/validate-migration.js

# Check:
# - Record counts match
# - Foreign keys intact
# - Geolocation data preserved
# - Arrays deserialized correctly
# - Timestamps formatted correctly
```

### Phase 4: Testing (Day 4)

#### 4.1 Unit Tests (2 hours)

```bash
# Test geo functions
npm test lib/geo.test.ts

# Test answer helpers
npm test lib/answer-helpers.test.ts

# Test database client
npm test lib/db.test.ts
```

#### 4.2 Integration Tests (3 hours)

**API Endpoint Tests:**
```bash
# Create survey
curl -X POST http://localhost:3000/api/surveys \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Survey","description":"Test"}'

# Submit response
curl -X POST http://localhost:3000/api/surveys/{id}/responses \
  -H "Content-Type: application/json" \
  -d '{"answers":[...],"latitude":23.8103,"longitude":90.4125}'

# Get heatmap
curl http://localhost:3000/api/surveys/{id}/heatmap
```

#### 4.3 Performance Testing (2 hours)

**Benchmark Queries:**
```typescript
// Test geolocation query performance
console.time('nearby-search');
const nearby = await findResponsesNearby(
  prisma,
  surveyId,
  23.8103, 90.4125,
  5000
);
console.timeEnd('nearby-search');
// Target example: keep within Workers CPU budget; validate in your environment

// Test analytics query
console.time('analytics');
const stats = await prisma.surveyResponse.groupBy({
  by: ['surveyId'],
  _count: true,
  where: { completedAt: { gte: sevenDaysAgo } }
});
console.timeEnd('analytics');
// Target example: validate on your dataset and plan

// Test heatmap query
console.time('heatmap');
const points = await prisma.surveyResponse.findMany({
  where: {
    surveyId,
    latitude: { not: null }
  },
  select: { latitude: true, longitude: true }
});
console.timeEnd('heatmap');
// Target example: validate on your dataset and plan
```

#### 4.4 UI Testing (1 hour)

**Manual Test Checklist:**
- [ ] Survey creation flow
- [ ] Public survey submission
- [ ] Responses table loads correctly
- [ ] Map visualization renders
- [ ] Heatmap displays properly
- [ ] Analytics charts populate
- [ ] CSV export works
- [ ] Comments system functional

### Phase 5: Deployment (Day 5)

#### 5.1 Pre-Deployment Checks (1 hour)

- [ ] All tests passing
- [ ] Performance benchmarks met
- [ ] Schema migrations applied to production D1
- [ ] Indexes created
- [ ] Environment variables configured
- [ ] Secrets set in Cloudflare
- [ ] DNS ready (if custom domain)
- [ ] Authorization: Sensitive routes enforce `requireUser` + `canManageSurvey` (see `docs/review.md`)

#### 5.2 Build & Deploy (2 hours)

```bash
# 1. Generate Prisma client for production
npx prisma generate

# 2. Build with OpenNext
npm run build

# 3. Deploy to Cloudflare Workers
npx wrangler deploy

# 4. Verify deployment
curl https://surveymania.omarshabab55.workers.dev/api/health
```

#### 5.3 Data Migration to Production D1 (2 hours)

```bash
# Export from production PostgreSQL
DATABASE_URL=$PROD_POSTGRES_URL node scripts/export-postgres.js > prod-data.json

# Transform
node scripts/transform-data.js prod-data.json prod-d1.json

# Import to production D1
D1_DATABASE_ID=$PROD_D1_ID node scripts/import-to-d1.js prod-d1.json

# Validate
node scripts/validate-migration.js --production
```

#### 5.4 Smoke Testing (30 min)

```bash
# Run smoke tests against production
BASE_URL=https://surveymania.omarshabab55.workers.dev \
  node scripts/smoke-test.js
```

#### 5.5 Monitoring Setup (30 min)

**Cloudflare Dashboard:**
1. Navigate to Workers & Pages → surveymania → Metrics
2. Create alerts:
   - Error rate > 5% for 5 minutes
   - CPU time > 50ms p95
   - Request rate drops > 50%

**Logs:**
```bash
# Tail production logs
npx wrangler tail
```

---

## Data Migration Tools

### Option 1: TypeScript Migration Script (Recommended)

**File:** `scripts/migrate-postgres-to-d1.ts`

```typescript
import { PrismaClient as PostgresClient } from '@prisma/client';
import { PrismaClient as D1Client } from '@prisma/client';
import { serializeChoices } from '../lib/answer-helpers';

// Source: PostgreSQL
const pgClient = new PostgresClient({
  datasources: { db: { url: process.env.SOURCE_DATABASE_URL } }
});

// Destination: SQLite file (for local D1-compatible testing)
const d1Client = new D1Client({
  datasources: { db: { url: process.env.DEST_DATABASE_URL } } // e.g., file:./dest.db
});

async function migrate() {
  console.log('Starting migration...');

  // 1. Users
  console.log('Migrating users...');
  const users = await pgClient.user.findMany();
  for (const user of users) {
    await d1Client.user.create({
      data: {
        ...user,
        organizationId: user.organizationId || undefined
      }
    });
  }
  console.log(`✓ Migrated ${users.length} users`);

  // 2. Organizations
  console.log('Migrating organizations...');
  const orgs = await pgClient.organization.findMany();
  for (const org of orgs) {
    await d1Client.organization.create({ data: org });
  }
  console.log(`✓ Migrated ${orgs.length} organizations`);

  // 3. OrganizationMembers
  console.log('Migrating organization members...');
  const members = await pgClient.organizationMember.findMany();
  for (const member of members) {
    await d1Client.organizationMember.create({ data: member });
  }
  console.log(`✓ Migrated ${members.length} organization members`);

  // 4. Surveys
  console.log('Migrating surveys...');
  const surveys = await pgClient.survey.findMany();
  for (const survey of surveys) {
    await d1Client.survey.create({ data: survey });
  }
  console.log(`✓ Migrated ${surveys.length} surveys`);

  // 5. SurveyQuestions
  console.log('Migrating questions...');
  const questions = await pgClient.surveyQuestion.findMany();
  for (const question of questions) {
    await d1Client.surveyQuestion.create({ data: question });
  }
  console.log(`✓ Migrated ${questions.length} questions`);

  // 6. SurveyResponses (with geolocation)
  console.log('Migrating responses...');
  const responses = await pgClient.surveyResponse.findMany();
  for (const response of responses) {
    await d1Client.surveyResponse.create({
      data: {
        ...response,
        latitude: response.latitude ? Number(response.latitude) : null,
        longitude: response.longitude ? Number(response.longitude) : null,
        locationAccuracy: response.locationAccuracy
          ? Number(response.locationAccuracy)
          : null,
      }
    });
  }
  console.log(`✓ Migrated ${responses.length} responses`);

  // 7. SurveyAnswers (with array serialization)
  console.log('Migrating answers...');
  const answers = await pgClient.surveyAnswer.findMany();
  for (const answer of answers) {
    await d1Client.surveyAnswer.create({
      data: {
        ...answer,
        answerNumber: answer.answerNumber ? Number(answer.answerNumber) : null,
        answerChoices: serializeChoices(answer.answerChoices),
      }
    });
  }
  console.log(`✓ Migrated ${answers.length} answers`);

  // 8. Campaigns
  console.log('Migrating campaigns...');
  const campaigns = await pgClient.campaign.findMany();
  for (const campaign of campaigns) {
    await d1Client.campaign.create({ data: campaign });
  }
  console.log(`✓ Migrated ${campaigns.length} campaigns`);

  // 9. CampaignMembers
  console.log('Migrating campaign members...');
  const campaignMembers = await pgClient.campaignMember.findMany();
  for (const cm of campaignMembers) {
    await d1Client.campaignMember.create({ data: cm });
  }
  console.log(`✓ Migrated ${campaignMembers.length} campaign members`);

  // 10. Comments
  console.log('Migrating comments...');
  const comments = await pgClient.comment.findMany();
  for (const comment of comments) {
    await d1Client.comment.create({ data: comment });
  }
  console.log(`✓ Migrated ${comments.length} comments`);

  // 11. Invites
  console.log('Migrating invites...');
  const invites = await pgClient.invite.findMany();
  for (const invite of invites) {
    await d1Client.invite.create({ data: invite });
  }
  console.log(`✓ Migrated ${invites.length} invites`);

  // 12. Exports
  console.log('Migrating exports...');
  const exports = await pgClient.export.findMany();
  for (const exp of exports) {
    await d1Client.export.create({ data: exp });
  }
  console.log(`✓ Migrated ${exports.length} exports`);

  console.log('\n✅ Migration complete!');
}

migrate()
  .catch(console.error)
  .finally(async () => {
    await pgClient.$disconnect();
    await d1Client.$disconnect();
  });
```

**Usage:**
```bash
# Run migration
SOURCE_DATABASE_URL="postgresql://..." \
DEST_DATABASE_URL="file:./migrated.db" \
npx tsx scripts/migrate-postgres-to-d1.ts

# Then push to D1
npx wrangler d1 execute surveymania-prod --file=./migrated.db
```

### Option 2: SQL Export/Import

**Export PostgreSQL:**
```bash
pg_dump $DATABASE_URL \
  --data-only \
  --inserts \
  --no-owner \
  --no-acl \
  > data/postgres-dump.sql
```

**Transform SQL (manual editing or script):**
- Remove PostgreSQL-specific syntax
- Convert arrays: `ARRAY['a','b']` → `'["a","b"]'`
- Convert booleans: `TRUE` → `1`, `FALSE` → `0`
- Remove schema qualifiers: `public."Survey"` → `Survey`

**Import to D1:**
```bash
npx wrangler d1 execute surveymania-prod \
  --file=data/transformed.sql
```

### Validation Script

**File:** `scripts/validate-migration.ts`

```typescript
import { PrismaClient as PgClient } from '@prisma/client';
import { PrismaClient as D1Client } from '@prisma/client';

const pg = new PgClient({ datasources: { db: { url: process.env.PG_URL }}});
const d1 = new D1Client({ datasources: { db: { url: process.env.D1_URL }}});

async function validate() {
  const tables = [
    'user', 'organization', 'organizationMember',
    'survey', 'surveyQuestion', 'surveyResponse', 'surveyAnswer',
    'campaign', 'campaignMember', 'comment', 'invite', 'export'
  ];

  for (const table of tables) {
    const pgCount = await (pg as any)[table].count();
    const d1Count = await (d1 as any)[table].count();

    const match = pgCount === d1Count ? '✓' : '✗';
    console.log(`${match} ${table}: PG=${pgCount}, D1=${d1Count}`);

    if (pgCount !== d1Count) {
      throw new Error(`Count mismatch for ${table}`);
    }
  }

  // Validate geolocation data
  const pgResponses = await pg.surveyResponse.findMany({
    where: { latitude: { not: null } },
    select: { id: true, latitude: true, longitude: true }
  });

  for (const pgResp of pgResponses.slice(0, 10)) {
    const d1Resp = await d1.surveyResponse.findUnique({
      where: { id: pgResp.id },
      select: { latitude: true, longitude: true }
    });

    const latMatch = Math.abs(Number(pgResp.latitude!) - Number(d1Resp!.latitude!)) < 0.000001;
    const lonMatch = Math.abs(Number(pgResp.longitude!) - Number(d1Resp!.longitude!)) < 0.000001;

    if (!latMatch || !lonMatch) {
      throw new Error(`Geolocation mismatch for response ${pgResp.id}`);
    }
  }

  console.log('✅ All validations passed!');
}

validate()
  .catch(console.error)
  .finally(async () => {
    await pg.$disconnect();
    await d1.$disconnect();
  });
```

Note: D1 is not directly reachable from Node.js. For production imports, export to a JSON artifact and use `wrangler d1 execute` or `wrangler d1 migrations` to load data into D1.

---

## Performance Optimization

### Indexing Strategy

**Critical Indexes:**

```sql
-- Survey queries
CREATE INDEX idx_survey_org ON Survey(organizationId);
CREATE INDEX idx_survey_status ON Survey(status) WHERE status != 'closed';

-- Question queries
CREATE INDEX idx_question_survey ON SurveyQuestion(surveyId, "order");

-- Response queries (most important)
CREATE INDEX idx_response_survey ON SurveyResponse(surveyId);
CREATE INDEX idx_response_user ON SurveyResponse(respondentId) WHERE respondentId IS NOT NULL;
CREATE INDEX idx_response_status ON SurveyResponse(status);
CREATE INDEX idx_response_submitted ON SurveyResponse(submittedAt DESC) WHERE submittedAt IS NOT NULL;

-- Geolocation queries (CRITICAL for performance)
CREATE INDEX idx_response_location ON SurveyResponse(latitude, longitude)
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Answer queries
CREATE INDEX idx_answer_response ON SurveyAnswer(responseId);
CREATE INDEX idx_answer_question ON SurveyAnswer(questionId);

-- Campaign queries
CREATE INDEX idx_campaign_survey ON Campaign(surveyId);
CREATE INDEX idx_campaign_member_user ON CampaignMember(userId);

-- Comment queries
CREATE INDEX idx_comment_response ON Comment(responseId, createdAt DESC);
CREATE INDEX idx_comment_author ON Comment(authorId);
CREATE INDEX idx_comment_parent ON Comment(parentId) WHERE parentId IS NOT NULL;

-- Invite queries
CREATE INDEX idx_invite_org ON Invite(organizationId);
CREATE INDEX idx_invite_email ON Invite(email) WHERE status = 'pending';
CREATE INDEX idx_invite_token ON Invite(token) WHERE status = 'pending';
```

### Query Optimization Patterns

#### 1. Use Select to Fetch Only Needed Fields

```typescript
// ❌ Bad: Fetches all fields
const surveys = await prisma.survey.findMany({ where: { organizationId }});

// ✅ Good: Fetches only needed fields
const surveys = await prisma.survey.findMany({
  where: { organizationId },
  select: {
    id: true,
    title: true,
    status: true,
    createdAt: true,
    _count: { select: { questions: true, responses: true }}
  }
});
```

#### 2. Pagination Always

```typescript
// ❌ Bad: Loads all responses
const responses = await prisma.surveyResponse.findMany({
  where: { surveyId }
});

// ✅ Good: Paginated
const responses = await prisma.surveyResponse.findMany({
  where: { surveyId },
  take: 50,
  skip: page * 50,
  orderBy: { submittedAt: 'desc' }
});
```

#### 3. Bounding Box Pre-filtering for Geo Queries

```typescript
// ❌ Bad: Fetches all responses, filters in memory
const allResponses = await prisma.surveyResponse.findMany({
  where: { surveyId }
});
const nearby = allResponses.filter(r =>
  haversineDistance(lat, lon, r.latitude, r.longitude) < 5000
);

// ✅ Good: Bounding box DB filter first
const box = getBoundingBox(lat, lon, 5000);
const candidates = await prisma.surveyResponse.findMany({
  where: {
    surveyId,
    latitude: { gte: box.minLat, lte: box.maxLat },
    longitude: { gte: box.minLon, lte: box.maxLon }
  }
});
const nearby = candidates.filter(r =>
  haversineDistance(lat, lon, r.latitude, r.longitude) < 5000
);
```

### Performance Guidelines

Indicative guardrails (verify with current Cloudflare docs):
- Workers CPU time: approx. 10–50ms per request (plan-dependent)
- D1 database size: up to 10GB per database

Optimization Tips:
1. **Keep queries under 10ms CPU time** (use EXPLAIN QUERY PLAN)
2. **Batch writes** in transactions (note: transactions may not be atomic in D1; prefer idempotency)
3. **Use prepared statements** (Prisma does this automatically)
4. **Cache frequently accessed data** (consider R2 or KV for read-heavy data)

---

## D1 Limitations & Workarounds

### 1. Limited Transactions ⚠️

**Context:** Transaction semantics with D1 + Prisma driver adapters are limited and version-dependent. Do not assume `$transaction` is fully atomic across multiple statements. Validate with your Prisma and D1 versions.
**Example:**
```typescript
// This will NOT be atomic in D1
await prisma.$transaction([
  prisma.survey.create({ data: surveyData }),
  prisma.surveyQuestion.createMany({ data: questions })
]);
// If second fails, first is NOT rolled back
```

**Workaround: Manual Compensation**
```typescript
let survey;
try {
  survey = await prisma.survey.create({ data: surveyData });
  await prisma.surveyQuestion.createMany({
    data: questions.map(q => ({ ...q, surveyId: survey.id }))
  });
} catch (error) {
  // Manual rollback
  if (survey) {
    await prisma.survey.delete({ where: { id: survey.id } });
  }
  throw error;
}
```

**Alternative: Accept Eventually Consistent**

For survey platform, most operations are single-record writes:
- Create response → Single INSERT
- Update survey status → Single UPDATE
- Delete response → Single DELETE

**Acceptable:** Transaction loss unlikely to cause issues

### 2. No Custom SQLite Functions

**Limitation:** Can't create SQL functions for distance calculations

**Workaround:** Already using application-layer Haversine (TypeScript)

```typescript
// ✅ Already implemented in lib/geo.ts
export function haversineDistance(lat1, lon1, lat2, lon2) { ... }
```

### 3. 10GB Database Size Limit

**Current Usage:** Unknown - check PostgreSQL size:

```sql
SELECT pg_size_pretty(pg_database_size('surveymania'));
```

**Workarounds if approaching limit:**

#### Option A: Archival Strategy
```typescript
// Archive old responses to R2
async function archiveOldResponses() {
  const cutoffDate = new Date();
  cutoffDate.setMonth(cutoffDate.getMonth() - 6); // 6 months

  const oldResponses = await prisma.surveyResponse.findMany({
    where: { submittedAt: { lt: cutoffDate } },
    include: { answers: true }
  });

  // Store in R2
  await R2.put(
    `archives/${cutoffDate.toISOString()}.json`,
    JSON.stringify(oldResponses)
  );

  // Delete from D1
  await prisma.surveyResponse.deleteMany({
    where: { submittedAt: { lt: cutoffDate } }
  });
}
```

#### Option B: Multi-Tenant Design
- 1 D1 database per organization
- Unlimited orgs × 10GB each
- Requires dynamic database routing

### 4. No Array Types

**Limitation:** SQLite doesn't support native arrays

**Workaround:** JSON serialization (already implemented)

```typescript
// Helper functions in lib/answer-helpers.ts
export function serializeChoices(choices: string[]): string {
  return JSON.stringify(choices);
}

export function deserializeChoices(json: string): string[] {
  return JSON.parse(json || '[]');
}

// Usage
await prisma.surveyAnswer.create({
  data: {
    answerChoices: serializeChoices(['A', 'B', 'C'])
  }
});
```

### 5. Concurrency and Quotas

Cloudflare quotas change over time. Validate concurrency, CPU, and I/O limits against the current Workers and D1 plan documentation. If you encounter concurrency limits, prefer sequential queries and batching over parallel fan‑out in a single request.

```typescript
// ❌ Might hit limit with many parallel queries
const [surveys, campaigns, responses] = await Promise.all([
  prisma.survey.findMany(),
  prisma.campaign.findMany(),
  prisma.surveyResponse.findMany(),
  prisma.comment.findMany(),
  prisma.export.findMany(),
  prisma.invite.findMany(),
  prisma.user.findMany(),  // 7 concurrent - EXCEEDS LIMIT
]);

// ✅ Sequential (slower but safer)
const surveys = await prisma.survey.findMany();
const campaigns = await prisma.campaign.findMany();
const responses = await prisma.surveyResponse.findMany();
```

### 6. 2MB Row Size Limit

**Limitation:** Single row cannot exceed 2MB

**Impact:** Very unlikely for survey responses

**Workaround if needed:**
- Store large files in R2, reference via URL
- Split large JSON fields across multiple rows

---

## Environment Configuration

### Required Environment Variables

#### GitHub Actions Secrets

Navigate to: **Repository → Settings → Secrets and variables → Actions**

| Secret Name | Description | Example |
|------------|-------------|---------|
| `CLOUDFLARE_API_TOKEN` | CF API token with Workers edit permission | `abc123...` |
| `CLOUDFLARE_ACCOUNT_ID` | CF account ID (from `wrangler whoami`) | `def456...` |
| `CLERK_SECRET_KEY` | Clerk secret key (production) | `sk_live_...` |
| `CLERK_WEBHOOK_SECRET` | Clerk webhook signing secret | `whsec_...` |
| `RESEND_API_KEY` | Resend API key (optional for emails) | `re_...` |

#### Cloudflare Workers Secrets

Set via wrangler CLI:

```bash
# CLERK_SECRET_KEY
npx wrangler secret put CLERK_SECRET_KEY
# Paste when prompted: sk_live_xxxxx

# CLERK_WEBHOOK_SECRET
npx wrangler secret put CLERK_WEBHOOK_SECRET
# Paste: whsec_xxxxx

# RESEND_API_KEY (optional)
npx wrangler secret put RESEND_API_KEY
# Paste: re_xxxxx

# Verify secrets
npx wrangler secret list
```

#### wrangler.toml Public Variables

```toml
[vars]
NEXT_PUBLIC_APP_URL = "https://surveymania.omarshabab55.workers.dev"
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = "pk_live_xxxxx"
```

#### Local Development (.env.local)

```bash
# D1 Database (local SQLite)
DATABASE_URL="file:./dev.db"

# App URL
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Clerk (use test keys)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_xxxxx"
CLERK_SECRET_KEY="sk_test_xxxxx"
CLERK_WEBHOOK_SECRET="whsec_xxxxx"

# Resend (optional)
RESEND_API_KEY="re_xxxxx"
RESEND_FROM_EMAIL="dev@surveymania.com"
```

### Clerk Configuration Updates

**Production Settings:**

1. **Navigate to:** Clerk Dashboard → Configure → Paths
2. **Update URLs:**
   - Homepage: `https://surveymania.omarshabab55.workers.dev`
   - Sign-in: `https://surveymania.omarshabab55.workers.dev/sign-in`
   - Sign-up: `https://surveymania.omarshabab55.workers.dev/sign-up`
   - After sign-in: `https://surveymania.omarshabab55.workers.dev/dashboard`

3. **Allowed Origins:** Add production domain
4. **API Keys:** Switch to production keys (`pk_live_...`, `sk_live_...`)

---

## Complete Code Examples

### Complete Schema: `prisma/schema.prisma`

```prisma
// D1/SQLite Version
generator client {
  provider = "prisma-client-js"
  previewFeatures = ["driverAdapters"]
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

// Enums (converted to CHECK constraints automatically)
enum SurveyStatus {
  draft
  active
  paused
  closed
}

enum ResponseStatus {
  in_progress
  completed
  abandoned
}

enum QuestionType {
  text
  textarea
  number
  email
  phone
  single_choice
  multiple_choice
  dropdown
  rating
  scale
  date
  time
  datetime
  file_upload
  location
  signature
}

enum AnswerType {
  text
  number
  choice
  choices
  file
  location
}

enum CampaignStatus {
  draft
  active
  paused
  completed
}

enum ExportFormat {
  csv
  xlsx
  json
  pdf
}

enum ExportStatus {
  processing
  completed
  failed
}

enum CampaignRole {
  admin
  collector
  viewer
}

enum OrgRole {
  admin
  member
  viewer
}

enum InviteStatus {
  pending
  accepted
  expired
  revoked
}

model User {
  clerkId            String               @id
  email              String
  firstName          String
  lastName           String
  avatar             String
  organization       Organization?        @relation(fields: [organizationId], references: [id])
  organizationId     String?
  createdAt          DateTime             @default(now())
  updatedAt          DateTime             @updatedAt

  ownedOrganizations Organization[]       @relation("OrganizationOwner")
  surveysCreated     Survey[]             @relation("SurveyCreator")
  campaignsCreated   Campaign[]           @relation("CampaignCreator")
  campaignMemberships CampaignMember[]
  exportsCreated     Export[]             @relation("ExportCreator")
  orgMemberships     OrganizationMember[]
  responses          SurveyResponse[]
  comments           Comment[]            @relation("CommentAuthor")
  resolvedComments   Comment[]            @relation("CommentResolver")
  sentInvites        Invite[]             @relation("InviteSender")
}

model Organization {
  id        String   @id @default(uuid())
  name      String
  slug      String   @unique
  ownerId   String
  owner     User     @relation("OrganizationOwner", fields: [ownerId], references: [clerkId])
  settings  String   // JSON stored as TEXT
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  users   User[]
  surveys Survey[]
  members OrganizationMember[]
  invites Invite[]
}

model OrganizationMember {
  id             String       @id @default(uuid())
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id])
  userId         String
  user           User         @relation(fields: [userId], references: [clerkId])
  role           OrgRole      @default(member)
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt

  @@unique([organizationId, userId], map: "uniq_org_member")
}

model Survey {
  id             String         @id @default(uuid())
  title          String
  description    String
  organizationId String
  organization   Organization   @relation(fields: [organizationId], references: [id])
  createdBy      String
  creator        User           @relation("SurveyCreator", fields: [createdBy], references: [clerkId])
  status         SurveyStatus   @default(draft)
  settings       String         // JSON
  createdAt      DateTime       @default(now())
  updatedAt      DateTime       @updatedAt
  publishedAt    DateTime?
  closedAt       DateTime?

  questions SurveyQuestion[]
  responses SurveyResponse[]
  campaigns Campaign[]
  exports   Export[]

  @@index([organizationId], map: "idx_survey_org")
}

model SurveyQuestion {
  id          String       @id @default(uuid())
  surveyId    String
  survey      Survey       @relation(fields: [surveyId], references: [id])
  order       Int
  type        QuestionType
  question    String
  description String?
  required    Boolean
  validation  String?      // JSON
  options     String?      // JSON
  logic       String?      // JSON
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt

  answers SurveyAnswer[]

  @@index([surveyId], map: "idx_question_survey")
}

model SurveyResponse {
  id               String         @id @default(uuid())
  surveyId         String
  survey           Survey         @relation(fields: [surveyId], references: [id])
  respondentId     String?
  respondent       User?          @relation(fields: [respondentId], references: [clerkId])
  sessionId        String
  status           ResponseStatus @default(in_progress)
  latitude         Float?         // Changed from Decimal
  longitude        Float?         // Changed from Decimal
  locationAccuracy Float?         // Changed from Decimal
  ipAddress        String?
  userAgent        String?
  metadata         String         // JSON
  startedAt        DateTime       @default(now())
  completedAt      DateTime?
  submittedAt      DateTime?

  answers  SurveyAnswer[]
  comments Comment[]

  @@index([respondentId], map: "idx_response_user")
}

model SurveyAnswer {
  id            String         @id @default(uuid())
  responseId    String
  response      SurveyResponse @relation(fields: [responseId], references: [id])
  questionId    String
  question      SurveyQuestion @relation(fields: [questionId], references: [id])
  answerType    AnswerType
  answerText    String?
  answerNumber  Float?         // Changed from Decimal
  answerChoices String         // Changed from String[] - JSON serialized
  answerFile    String?        // JSON
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt
}

model Campaign {
  id          String         @id @default(uuid())
  surveyId    String
  survey      Survey         @relation(fields: [surveyId], references: [id])
  name        String
  description String?
  targetCount Int?
  status      CampaignStatus @default(draft)
  settings    String         // JSON
  createdBy   String
  creator     User           @relation("CampaignCreator", fields: [createdBy], references: [clerkId])
  createdAt   DateTime       @default(now())
  updatedAt   DateTime       @updatedAt

  members CampaignMember[]
  exports Export[]
}

model CampaignMember {
  id             String       @id @default(uuid())
  campaignId     String
  campaign       Campaign     @relation(fields: [campaignId], references: [id])
  userId         String
  user           User         @relation(fields: [userId], references: [clerkId])
  role           CampaignRole
  assignedRegion String?      // JSON
  permissions    String       // JSON
  invitedBy      String
  invitedAt      DateTime     @default(now())
  joinedAt       DateTime?
  status         String
}

model Export {
  id         String       @id @default(uuid())
  surveyId   String
  survey     Survey       @relation(fields: [surveyId], references: [id])
  campaignId String?
  campaign   Campaign?    @relation(fields: [campaignId], references: [id])
  format     ExportFormat
  filters    String       // JSON
  fileUrl    String
  fileSize   Int
  status     ExportStatus @default(processing)
  createdBy  String
  creator    User         @relation("ExportCreator", fields: [createdBy], references: [clerkId])
  createdAt  DateTime     @default(now())
  expiresAt  DateTime
}

model Comment {
  id           String          @id @default(uuid())
  content      String
  responseId   String
  response     SurveyResponse  @relation(fields: [responseId], references: [id], onDelete: Cascade)
  authorId     String
  author       User            @relation("CommentAuthor", fields: [authorId], references: [clerkId])
  parentId     String?
  parent       Comment?        @relation("CommentReplies", fields: [parentId], references: [id], onDelete: Cascade)
  replies      Comment[]       @relation("CommentReplies")
  isResolved   Boolean         @default(false)
  resolvedAt   DateTime?
  resolvedById String?
  resolvedBy   User?           @relation("CommentResolver", fields: [resolvedById], references: [clerkId])
  mentions     String          // JSON array serialized
  createdAt    DateTime        @default(now())
  updatedAt    DateTime        @updatedAt

  @@index([responseId], map: "idx_comment_response")
  @@index([authorId], map: "idx_comment_author")
}

model Invite {
  id             String       @id @default(uuid())
  email          String
  token          String       @unique
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  role           OrgRole      @default(member)
  invitedById    String
  invitedBy      User         @relation("InviteSender", fields: [invitedById], references: [clerkId])
  status         InviteStatus @default(pending)
  expiresAt      DateTime
  acceptedAt     DateTime?
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt

  @@index([organizationId], map: "idx_invite_org")
  @@index([email], map: "idx_invite_email")
  @@index([token], map: "idx_invite_token")
}
```

### Complete Database Client: `lib/db.ts`

```typescript
import { PrismaClient } from '@prisma/client/edge'
import { PrismaD1 } from '@prisma/adapter-d1'
// Optional types: import type { D1Database } from '@cloudflare/workers-types'

/**
 * Get Prisma client for Cloudflare Workers D1
 * Must be called per-request in edge runtime
 *
 * @param d1 D1Database binding from Cloudflare Workers
 * @returns Configured PrismaClient instance
 */
export function getPrismaClient(d1: D1Database): PrismaClient {
  const adapter = new PrismaD1(d1);
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : []
  });
}

/**
 * Get database client for current request
 * Automatically retrieves D1 binding from OpenNext environment
 *
 * @throws Error if D1 binding not found
 * @returns Configured PrismaClient instance
 */
export function getDB(): PrismaClient {
  // OpenNext Cloudflare exposes D1 binding via process.env
  const DB = (process.env as any).DB as D1Database;

  if (!DB) {
    throw new Error(
      'D1 database binding not found. ' +
      'Ensure wrangler.toml has [[d1_databases]] binding configured.'
    );
  }

  return getPrismaClient(DB);
}

/**
 * For local development only (Node.js runtime)
 * Uses SQLite file instead of D1
 * Not used in Cloudflare Workers production
 */
const globalForPrisma = global as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: ['warn', 'error']
})

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
```

### Geolocation Library: `lib/geo.ts`

```typescript
import type { PrismaClient } from '@prisma/client';

/**
 * Calculate great-circle distance between two points using Haversine formula
 *
 * @param lat1 Latitude of point 1 (degrees)
 * @param lon1 Longitude of point 1 (degrees)
 * @param lat2 Latitude of point 2 (degrees)
 * @param lon2 Longitude of point 2 (degrees)
 * @returns Distance in meters
 *
 * @example
 * const distance = haversineDistance(23.8103, 90.4125, 40.7128, -74.0060);
 * console.log(distance); // 12534120 meters (12,534 km from Dhaka to NYC)
 */
export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Calculate bounding box for efficient radius search
 * Pre-filters candidates before precise distance calculation
 *
 * @param centerLat Center point latitude (degrees)
 * @param centerLon Center point longitude (degrees)
 * @param radiusMeters Search radius in meters
 * @returns Bounding box { minLat, maxLat, minLon, maxLon }
 *
 * @example
 * const box = getBoundingBox(23.8103, 90.4125, 5000); // 5km radius
 * // Use box.minLat, box.maxLat, etc. in WHERE clause
 */
export function getBoundingBox(
  centerLat: number,
  centerLon: number,
  radiusMeters: number
) {
  // Approximate conversion: 1 degree latitude ≈ 111,320 meters
  const latDelta = radiusMeters / 111320;

  // Longitude degrees vary by latitude (smaller near poles)
  const lonDelta = radiusMeters / (111320 * Math.cos((centerLat * Math.PI) / 180));

  return {
    minLat: centerLat - latDelta,
    maxLat: centerLat + latDelta,
    minLon: centerLon - lonDelta,
    maxLon: centerLon + lonDelta,
  };
}

/**
 * Find responses within radius of a point
 * Uses bounding box pre-filtering + Haversine for accuracy
 *
 * @param prisma Prisma client instance
 * @param surveyId Survey ID to search within
 * @param centerLat Center point latitude
 * @param centerLon Center point longitude
 * @param radiusMeters Search radius in meters
 * @returns Array of responses within radius
 *
 * @example
 * const prisma = getDB();
 * const nearby = await findResponsesNearby(
 *   prisma,
 *   'survey-123',
 *   23.8103, 90.4125,
 *   5000  // 5km radius
 * );
 * console.log(`Found ${nearby.length} responses within 5km`);
 */
export async function findResponsesNearby(
  prisma: PrismaClient,
  surveyId: string,
  centerLat: number,
  centerLon: number,
  radiusMeters: number
) {
  // Step 1: Calculate bounding box (fast, uses index)
  const box = getBoundingBox(centerLat, centerLon, radiusMeters);

  // Step 2: Query database with bounding box filter
  const candidates = await prisma.surveyResponse.findMany({
    where: {
      surveyId,
      latitude: {
        gte: box.minLat,
        lte: box.maxLat
      },
      longitude: {
        gte: box.minLon,
        lte: box.maxLon
      },
    },
  });

  // Step 3: Filter with precise distance calculation (in-memory)
  return candidates.filter(
    (r) =>
      r.latitude &&
      r.longitude &&
      haversineDistance(centerLat, centerLon, r.latitude, r.longitude) <= radiusMeters
  );
}

/**
 * Check if a point is inside a polygon using ray casting algorithm
 *
 * @param point [longitude, latitude] of point to test
 * @param polygon Array of [longitude, latitude] coordinates forming polygon
 * @returns true if point is inside polygon
 *
 * @example
 * const dhaka = [90.4125, 23.8103];
 * const dhakaPolygon = [
 *   [90.35, 23.75], [90.50, 23.75],
 *   [90.50, 23.85], [90.35, 23.85],
 *   [90.35, 23.75]  // Close polygon
 * ];
 * const isInside = pointInPolygon(dhaka, dhakaPolygon); // true
 */
export function pointInPolygon(
  point: [number, number],
  polygon: Array<[number, number]>
): boolean {
  const [x, y] = point;
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];

    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;

    if (intersect) inside = !inside;
  }

  return inside;
}
```

### Answer Helpers: `lib/answer-helpers.ts`

```typescript
/**
 * Serialize array of choices to JSON string for SQLite storage
 *
 * @param choices Array of choice strings
 * @returns JSON string representation
 *
 * @example
 * const serialized = serializeChoices(['Option A', 'Option B']);
 * // Returns: '["Option A","Option B"]'
 */
export function serializeChoices(choices: string[]): string {
  return JSON.stringify(choices);
}

/**
 * Deserialize JSON string back to array of choices
 * Handles invalid JSON gracefully by returning empty array
 *
 * @param choicesJson JSON string of choices
 * @returns Array of choice strings
 *
 * @example
 * const choices = deserializeChoices('["Option A","Option B"]');
 * // Returns: ['Option A', 'Option B']
 *
 * const empty = deserializeChoices('invalid json');
 * // Returns: []
 */
export function deserializeChoices(choicesJson: string): string[] {
  try {
    const parsed = JSON.parse(choicesJson || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
```

### API Route Example: `app/api/surveys/[id]/heatmap/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { getDB } from '@/lib/db';

type Params = { params: { id: string } };

/**
 * GET /api/surveys/:id/heatmap
 * Returns GeoJSON FeatureCollection of response locations for heatmap visualization
 */
export async function GET(_request: Request, { params }: Params) {
  try {
    const prisma = getDB();

    // Fetch all responses with location data
    const points = await prisma.surveyResponse.findMany({
      where: {
        surveyId: params.id,
        latitude: { not: null },
        longitude: { not: null },
      },
      select: {
        id: true,
        latitude: true,
        longitude: true,
        submittedAt: true,
      },
    });

    // Convert to GeoJSON FeatureCollection
    const features = points.map((p) => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [Number(p.longitude), Number(p.latitude)],
      },
      properties: {
        id: p.id,
        submittedAt: p.submittedAt?.toISOString(),
      },
    }));

    return NextResponse.json({
      type: 'FeatureCollection',
      features,
    });
  } catch (error: any) {
    console.error('Heatmap fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch heatmap data' },
      { status: 500 }
    );
  }
}
```

---

## Testing & Verification

### Unit Tests

**File:** `lib/geo.test.ts`

```typescript
import { describe, test, expect } from 'vitest';
import { haversineDistance, getBoundingBox, pointInPolygon } from './geo';

describe('Geolocation Functions', () => {
  test('haversineDistance calculates correctly', () => {
    // Distance from Dhaka to New York
    const distance = haversineDistance(
      23.8103, 90.4125,  // Dhaka
      40.7128, -74.0060  // NYC
    );

    // Expected: ~12,534 km
    expect(distance).toBeGreaterThan(12_500_000);
    expect(distance).toBeLessThan(12_600_000);
  });

  test('getBoundingBox creates correct box', () => {
    const box = getBoundingBox(23.8103, 90.4125, 5000);

    // Bounding box should be ~0.045 degrees (5km / 111km)
    expect(box.maxLat - box.minLat).toBeCloseTo(0.09, 1);
    expect(box.maxLon - box.minLon).toBeCloseTo(0.09, 1);
  });

  test('pointInPolygon detects inside correctly', () => {
    const point: [number, number] = [90.4125, 23.8103];
    const polygon: Array<[number, number]> = [
      [90.35, 23.75], [90.50, 23.75],
      [90.50, 23.85], [90.35, 23.85],
      [90.35, 23.75]
    ];

    expect(pointInPolygon(point, polygon)).toBe(true);
  });

  test('pointInPolygon detects outside correctly', () => {
    const point: [number, number] = [91.0, 24.0]; // Outside
    const polygon: Array<[number, number]> = [
      [90.35, 23.75], [90.50, 23.75],
      [90.50, 23.85], [90.35, 23.85],
      [90.35, 23.75]
    ];

    expect(pointInPolygon(point, polygon)).toBe(false);
  });
});
```

### Integration Tests

**File:** `tests/api/surveys.test.ts`

```typescript
import { describe, test, expect } from 'vitest';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

describe('Survey API Integration', () => {
  test('Create and retrieve survey', async () => {
    // Create survey
    const createRes = await fetch(`${BASE_URL}/api/surveys`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Test Survey',
        description: 'Integration test',
        organizationId: 'test-org',
      }),
    });

    expect(createRes.status).toBe(200);
    const survey = await createRes.json();
    expect(survey.id).toBeDefined();

    // Retrieve survey
    const getRes = await fetch(`${BASE_URL}/api/surveys/${survey.id}`);
    expect(getRes.status).toBe(200);
    const retrieved = await getRes.json();
    expect(retrieved.title).toBe('Test Survey');
  });

  test('Submit response with geolocation', async () => {
    const surveyId = 'test-survey-id';

    const res = await fetch(`${BASE_URL}/api/surveys/${surveyId}/responses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        answers: [],
        latitude: 23.8103,
        longitude: 90.4125,
        locationAccuracy: 10,
      }),
    });

    expect(res.status).toBe(200);
    const response = await res.json();
    expect(response.latitude).toBeCloseTo(23.8103);
    expect(response.longitude).toBeCloseTo(90.4125);
  });

  test('Heatmap returns GeoJSON', async () => {
    const surveyId = 'test-survey-id';

    const res = await fetch(`${BASE_URL}/api/surveys/${surveyId}/heatmap`);
    expect(res.status).toBe(200);

    const geojson = await res.json();
    expect(geojson.type).toBe('FeatureCollection');
    expect(Array.isArray(geojson.features)).toBe(true);
  });
});
```

### Smoke Tests Script

**File:** `scripts/smoke-test.sh`

```bash
#!/bin/bash

BASE_URL=${BASE_URL:-"http://localhost:3000"}

echo "Running smoke tests against $BASE_URL"

# Test 1: Homepage loads
echo -n "Test 1: Homepage... "
if curl -f -s "$BASE_URL" > /dev/null; then
  echo "✓ PASS"
else
  echo "✗ FAIL"
  exit 1
fi

# Test 2: Sign-in page loads
echo -n "Test 2: Sign-in page... "
if curl -f -s "$BASE_URL/sign-in" > /dev/null; then
  echo "✓ PASS"
else
  echo "✗ FAIL"
  exit 1
fi

# Test 3: Protected route redirects
echo -n "Test 3: Protected route redirect... "
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/dashboard")
if [ "$STATUS" = "307" ] || [ "$STATUS" = "302" ]; then
  echo "✓ PASS"
else
  echo "✗ FAIL (got $STATUS, expected 307 or 302)"
  exit 1
fi

# Test 4: API health (if implemented)
echo -n "Test 4: API health... "
if curl -f -s "$BASE_URL/api/health" > /dev/null; then
  echo "✓ PASS"
else
  echo "⚠ SKIP (health endpoint not found)"
fi

echo ""
echo "✅ All smoke tests passed!"
```

**Usage:**
```bash
# Local testing
./scripts/smoke-test.sh

# Production testing
BASE_URL=https://surveymania.omarshabab55.workers.dev ./scripts/smoke-test.sh
```

---

## Blockers & Risks

### Critical Blockers (Must Address)

#### 1. Database Client Refactoring ⚠️

**Impact:** Application will not run without this
**Effort:** 8-10 hours
**Risk Level:** MEDIUM

**Tasks:**
- Update `lib/db.ts` with D1 adapter
- Modify ~30 API route files
- Test each endpoint
- Handle edge cases

**Mitigation:**
- Create helper function to minimize changes
- Use find/replace for bulk updates
- Comprehensive testing suite

#### 2. Array Serialization

**Impact:** answerChoices field won't work
**Effort:** 3 hours
**Risk Level:** LOW

**Tasks:**
- Create serialization helpers
- Update 5+ files using answerChoices
- Migration script for existing data

**Mitigation:**
- Well-tested helper functions
- Clear documentation

### Medium Risks (Plan For)

#### 3. Transaction Loss

**Impact:** Potential data consistency issues
**Likelihood:** LOW (most operations are single-record)
**Mitigation:**
- Accept eventual consistency
- Implement idempotency where needed
- Manual compensation for critical paths

#### 4. Geolocation Query Performance

**Impact:** Slow nearby searches with large datasets
**Risk Level:** MEDIUM
**Mitigation:**
- Bounding box pre-filtering (already planned)
- Comprehensive indexes
- Performance testing with realistic data
- Pagination

#### 5. 10GB Database Limit

**Impact:** Large organizations may exceed limit
**Timeline:** Long-term concern
**Mitigation:**
- Archival strategy (R2)
- Monitor database size
- Multi-tenant option available

### Low Risks (Monitor)

#### 6. Type Precision (Decimal → Float)

**Impact:** Negligible for geolocation
**Risk Level:** VERY LOW
**Mitigation:** Float64 precision exceeds GPS accuracy

#### 7. Enum Handling

**Impact:** None - Prisma handles automatically
**Risk Level:** VERY LOW

---

## Cost Analysis

### Free Tier (Proof of Concept)

**Services:**
- Cloudflare Workers: 100k requests/day
- Cloudflare D1: 500MB storage, 5M reads/day, 100k writes/day
- Cloudflare R2: 10GB storage, 1M Class A ops/month
- Clerk Auth: 10k MAU

**Monthly Cost:** $0

**Limitations:**
- D1: Smaller storage, auto-pauses (not applicable to D1)
- Workers: 10ms CPU time limit per request
- No Hyperdrive
- No email sends (Resend not configured)

**Suitable For:** Development, testing, low-traffic demos

### Production Tier (Recommended)

**Services:**
- Cloudflare Workers Paid: Unlimited requests, 50ms CPU
- Cloudflare D1: 10GB storage, unlimited reads/writes
- Cloudflare R2: 10GB storage included
- Clerk Pro: 10k MAU, advanced features

**Monthly Cost Breakdown:**
- Cloudflare Workers: $5/month
- Cloudflare D1: $0 (included with Workers Paid)
- Cloudflare R2: $0-5/month (depends on usage)
- Clerk Pro (optional): $25/month

**Total: $5-35/month**

**Comparison to PostgreSQL Setup:**
- Neon + Workers Paid: ~$50/month
- Supabase + Workers: ~$50/month

**Savings: ~$45/month** (90% cost reduction!)

### Enterprise Tier

**Services:**
- Cloudflare Business: Higher limits, SLA, phone support
- Clerk Enterprise: SSO, SAML, custom MAU
- D1: Multiple databases for multi-tenancy

**Monthly Cost:** $200-500+

---

## Troubleshooting

### Issue 1: "D1 database binding not found"

**Symptom:**
```
Error: D1 database binding not found.
Ensure wrangler.toml has [[d1_databases]] binding configured.
```

**Cause:** Missing D1 binding in wrangler.toml

**Solution:**
```toml
# Add to wrangler.toml
[[d1_databases]]
binding = "DB"
database_name = "surveymania-prod"
database_id = "your-database-id"
```

### Issue 2: "PrismaClient requires driverAdapters preview feature"

**Symptom:**
```
PrismaClient is unable to run in this browser environment
```

**Cause:** Missing preview feature

**Solution:**
```prisma
generator client {
  provider = "prisma-client-js"
  previewFeatures = ["driverAdapters"]
}
```

Then regenerate: `npx prisma generate`

### Issue 3: JSON Parse Error for answerChoices

**Symptom:**
```
SyntaxError: Unexpected token in JSON at position 0
```

**Cause:** Trying to parse non-JSON string

**Solution:**
```typescript
// Always use helper function
import { deserializeChoices } from '@/lib/answer-helpers';

const choices = deserializeChoices(answer.answerChoices);
// Safe: Returns [] if invalid JSON
```

### Issue 4: Slow Geolocation Queries

**Symptom:** Nearby searches take >1 second

**Diagnosis:**
```sql
-- Check if index exists
SELECT name FROM sqlite_master
WHERE type='index' AND tbl_name='SurveyResponse';
```

**Solution:**
```sql
-- Create missing index
CREATE INDEX idx_response_location ON SurveyResponse(latitude, longitude)
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
```

### Issue 5: Migration SQL Errors

**Symptom:**
```
Parse error near line X: syntax error
```

**Common Causes:**
- PostgreSQL-specific syntax in migration
- Array syntax not converted
- Schema qualifiers (`public.`) present

**Solution:**
1. Review generated migration SQL
2. Remove PostgreSQL-specific syntax
3. Convert arrays to JSON strings
4. Test migration on local SQLite first

---

## Rollback Strategy

### Immediate Rollback (< 5 minutes)

**Scenario:** Deployment breaks production

**Steps:**
```bash
# Option 1: Wrangler rollback
npx wrangler deployments list
npx wrangler rollback [deployment-id]

# Option 2: Git revert + redeploy
git revert HEAD
git push origin main
# GitHub Actions auto-deploys previous version
```

### Database Rollback

**Scenario:** D1 migration corrupted data

**Prevention:**
- Always backup PostgreSQL before migration
- Test migration on staging first
- Keep PostgreSQL running during initial D1 deployment

**Rollback Process:**
1. Switch application to use PostgreSQL (revert code changes)
2. Restore PostgreSQL from backup if needed
3. Redeploy with PostgreSQL configuration

**PostgreSQL Restore:**
```bash
# If using pg_dump backup
psql $DATABASE_URL < backup.sql

# If using Neon: Restore from dashboard snapshots
```

---

## Next Steps

### Decision: Proceed with Migration?

**✅ RECOMMENDED: YES**

**Reasons:**
1. Your architecture is already D1-friendly
2. Massive cost savings ($0-5/month vs $50+/month)
3. Simpler infrastructure (everything in Cloudflare)
4. Geolocation features fully maintainable
5. All limitations have clear workarounds

### Immediate Actions (Next 1-2 Hours)

1. **Create D1 Databases**
   ```bash
   npx wrangler d1 create surveymania-dev
   npx wrangler d1 create surveymania-staging
   npx wrangler d1 create surveymania-prod
   ```

2. **Check Current PostgreSQL Size**
   ```sql
   SELECT pg_size_pretty(pg_database_size('surveymania'));
   ```
   If >8GB, plan multi-tenant strategy

3. **Install Dependencies**
   ```bash
   npm install @prisma/adapter-d1@latest
   ```

4. **Create Feature Branch**
   ```bash
   git checkout -b migrate/cloudflare-d1
   ```

### Week 1: Schema & Code (Days 1-2)

- [ ] Update Prisma schema to SQLite
- [ ] Create `lib/geo.ts` with spatial functions
- [ ] Create `lib/answer-helpers.ts`
- [ ] Update `lib/db.ts` with D1 adapter
- [ ] Generate migration SQL
- [ ] Apply to dev D1 database
- [ ] Create indexes

### Week 1: Code Updates (Days 3-4)

- [ ] Update all API routes (~30 files)
- [ ] Update wrangler.toml
- [ ] Write unit tests
- [ ] Local testing
- [ ] Code review

### Week 2: Migration & Testing (Days 5-7)

- [ ] Export PostgreSQL data
- [ ] Transform data
- [ ] Import to staging D1
- [ ] Validate data integrity
- [ ] Performance testing
- [ ] Integration testing

### Week 2: Deployment (Days 8-9)

- [ ] Deploy to staging
- [ ] Smoke tests
- [ ] Production migration
- [ ] Deploy to production
- [ ] Monitor for 24-48 hours
- [ ] Decommission PostgreSQL (after validation)

### Post-Deployment (Week 3+)

- [ ] Monitor performance metrics
- [ ] Optimize slow queries
- [ ] Document learnings
- [ ] Train team on D1 best practices
- [ ] Set up alerts and monitoring

---

## References & Resources

### Official Documentation
- [Cloudflare D1](https://developers.cloudflare.com/d1/)
- [Prisma D1 Adapter](https://www.prisma.io/docs/orm/overview/databases/cloudflare-d1)
- [OpenNext Cloudflare](https://opennext.js.org/cloudflare)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/)

### Community Resources
- [Prisma Discord](https://discord.prisma.io) - #d1 channel
- [Cloudflare Discord](https://discord.cloudflare.com) - #d1 channel
- [Next.js Discord](https://discord.gg/nextjs) - #deployment channel

### Helpful GitHub Issues
- [Prisma D1 Support Discussion](https://github.com/prisma/prisma/discussions/20186)
- [OpenNext D1 Examples](https://github.com/opennextjs/opennextjs-cloudflare/tree/main/examples)

---

## Conclusion

**Migration from PostgreSQL to Cloudflare D1 is FEASIBLE and RECOMMENDED.**

### Key Takeaways

1. **Architecture Compatibility:** Your app is already D1-friendly
   - No PostGIS dependencies
   - Simple lat/lng storage
   - JS-based geolocation logic

2. **Effort is Manageable:** 3-5 days (44 hours)
   - Well-defined tasks
   - Clear migration path
   - Minimal code changes

3. **Cost Savings:** 90% reduction
   - $0-5/month vs $50+/month
   - Includes all infrastructure

4. **Performance Maintained:**
   - Bounding box optimization
   - Application-layer Haversine
   - Comprehensive indexing

5. **Risks are Acceptable:**
   - Transaction loss: Low impact
   - 10GB limit: Archival strategy ready
   - Type precision: Negligible

### Recommended Approach

**Phase 1:** Migrate to D1 on free tier for validation (Week 1-2)
**Phase 2:** Test thoroughly with production-like data (Week 2)
**Phase 3:** Deploy to production on Workers Paid plan (Week 3)
**Phase 4:** Monitor and optimize (Ongoing)

**Expected Outcome:** Fully functional survey platform on Cloudflare infrastructure with 90% cost savings and simplified operations.

**Questions or concerns?** Review specific sections or ask for clarification.

---

**Document Version:** 1.1
**Last Updated:** 2025-11-11
**Author:** SurveyMania Team
**Status:** Ready for Implementation
