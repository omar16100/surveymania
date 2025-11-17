# Cloudflare Deployment Guide

## Overview

SurveyMania is deployed on Cloudflare Workers using:
- **Runtime**: Cloudflare Workers (Edge)
- **Database**: Cloudflare D1 (SQLite)
- **Cache**: Cloudflare R2
- **Auth**: Clerk
- **Framework**: Next.js 14 with OpenNext Cloudflare adapter

## Prerequisites

1. Cloudflare account with Workers enabled
2. Wrangler CLI installed: `npm install -g wrangler`
3. Authenticated with Cloudflare: `wrangler login`
4. GitHub repository with required secrets configured

## Initial Setup

### 1. Create D1 Database

```bash
# Create production database
wrangler d1 create surveymania-prod

# Note the database_id from output and update wrangler.toml
```

### 2. Create R2 Bucket

```bash
# Create cache bucket for OpenNext
wrangler r2 bucket create surveymania-cache
```

### 3. Configure Secrets

Run the setup script to add required secrets:

```bash
./scripts/setup-secrets.sh
```

Or manually add secrets:

```bash
# Clerk authentication secrets
wrangler secret put CLERK_SECRET_KEY
wrangler secret put CLERK_WEBHOOK_SECRET
```

**Note**: `DATABASE_URL` is NOT needed - we use D1 binding directly.

### 4. Configure GitHub Secrets

Add the following secrets to your GitHub repository (Settings > Secrets and variables > Actions):

Required secrets:
- `CLOUDFLARE_API_TOKEN` - API token with Workers and D1 permissions
- `CLOUDFLARE_ACCOUNT_ID` - Your Cloudflare account ID
- `CLERK_SECRET_KEY` - Clerk secret key
- `CLERK_WEBHOOK_SECRET` - Clerk webhook signing secret
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - Clerk publishable key
- `NEXT_PUBLIC_APP_URL` - Your app URL (e.g., https://surveymania.omarshabab55.workers.dev)

**Deprecated**:
- `DATABASE_URL` - Not used in D1 deployment (can be removed)

## Database Migrations

### Migration Workflow

We use Cloudflare D1's native migration system with Prisma schema as the source of truth.

#### Option 1: Automated (GitHub Actions)

Migrations run automatically after deployment:
1. Push to `main` branch
2. GitHub Actions builds and deploys
3. Migration job applies pending migrations to production D1

#### Option 2: Manual Migration

Create and apply migrations manually:

```bash
# 1. Update prisma/schema.prisma with your changes

# 2. Generate migration using helper script
./scripts/migrate-d1.sh "migration_description" --remote

# Or manually:
# 2a. Create empty migration file
wrangler d1 migrations create surveymania-prod "description"

# 2b. Generate SQL from Prisma schema
npx prisma migrate diff \
  --from-empty \
  --to-schema-datamodel ./prisma/schema.prisma \
  --script > migrations/XXXX_description.sql

# 2c. Apply to production
wrangler d1 migrations apply surveymania-prod --remote
```

#### Local Development Migrations

```bash
# Apply to local D1 instance
./scripts/migrate-d1.sh "migration_description"

# Or manually
wrangler d1 migrations apply surveymania-prod --local
```

### Migration Best Practices

1. **Always generate SQL from Prisma schema** using `prisma migrate diff`
2. **Test locally first** with `--local` flag before applying to production
3. **Review generated SQL** before applying
4. **No transactions**: D1 doesn't support transactions - each statement runs independently
5. **Foreign keys**: Use `PRAGMA defer_foreign_keys = true` if needed

## Deployment Process

### Automatic Deployment (Recommended)

1. Push changes to `main` branch
2. GitHub Actions workflow triggers:
   - Install dependencies
   - Generate Prisma Client
   - Build with OpenNext
   - Deploy to Cloudflare Workers
   - Run database migrations

### Manual Deployment

```bash
# 1. Install dependencies
npm ci

# 2. Generate Prisma Client
npx prisma generate

# 3. Build with OpenNext
npx opennextjs-cloudflare build

# 4. Deploy to Cloudflare
wrangler deploy

# 5. Apply migrations (if needed)
wrangler d1 migrations apply surveymania-prod --remote
```

## Environment Configuration

### wrangler.toml

Core configuration file defining:
- Worker entry point (`.open-next/worker.js`)
- D1 database binding (`DB`)
- R2 bucket binding (`BUCKET`)
- Public environment variables

**DO NOT** add secrets to `wrangler.toml` - use `wrangler secret put` instead.

### Runtime Environment

Secrets are accessed via Cloudflare's `env` binding in the worker runtime:
- Database: `env.DB` (D1Database binding)
- Cache: `env.BUCKET` (R2Bucket binding)
- Secrets: `env.CLERK_SECRET_KEY`, `env.CLERK_WEBHOOK_SECRET`

See `lib/db.ts` for database client initialization.

## Verification

### Check Deployment Status

```bash
# View recent deployments
wrangler deployments list

# Check worker logs
wrangler tail
```

### Verify Database

```bash
# List applied migrations
wrangler d1 migrations list surveymania-prod --remote

# Execute SQL query
wrangler d1 execute surveymania-prod --remote --command="SELECT name FROM sqlite_master WHERE type='table'"
```

### Verify Secrets

```bash
# List configured secrets (values hidden)
wrangler secret list
```

## Troubleshooting

### Migration Failures

If migrations fail:
1. Check migration SQL for D1 compatibility (no PostgreSQL-specific syntax)
2. Verify foreign key constraints are valid
3. Check logs: `wrangler tail`
4. Rollback if needed (D1 doesn't auto-rollback - manual intervention required)

### Build Failures

Common issues:
- TypeScript errors: Check `next.config.mjs` - quality gates may be disabled
- Missing dependencies: Run `npm ci`
- Prisma Client not generated: Run `npx prisma generate`

### Runtime Errors

Check Cloudflare Workers logs:
```bash
wrangler tail
```

Common issues:
- D1 binding not found: Verify `wrangler.toml` configuration
- Secret not found: Verify secrets are set with `wrangler secret list`
- Clerk auth errors: Verify `CLERK_SECRET_KEY` is correct

## Architecture

```
Developer → GitHub → GitHub Actions →
  npm install → prisma generate → opennextjs-cloudflare build →
  wrangler deploy → Cloudflare Workers (Edge) + D1 + R2
```

**Edge Runtime**: Code runs on Cloudflare's edge network globally
**D1 Database**: SQLite database replicated across Cloudflare's network
**R2 Cache**: Object storage for Next.js incremental static regeneration

## Staging Environment

**Status**: Not yet configured

To add staging:
1. Create separate D1 database: `wrangler d1 create surveymania-staging`
2. Create separate R2 bucket: `wrangler r2 bucket create surveymania-cache-staging`
3. Add environment configuration to `wrangler.toml`:
   ```toml
   [env.staging]
   [[env.staging.d1_databases]]
   binding = "DB"
   database_id = "staging-db-id"
   ```
4. Deploy to staging: `wrangler deploy --env staging`

## References

- [Cloudflare D1 Docs](https://developers.cloudflare.com/d1/)
- [D1 Migrations](https://developers.cloudflare.com/d1/reference/migrations/)
- [Prisma with D1](https://www.prisma.io/docs/orm/overview/databases/cloudflare-d1)
- [OpenNext Cloudflare](https://opennext.js.org/cloudflare)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/)
