# Secrets Configuration Guide

Complete guide for configuring all secrets required for deployment.

## Overview

Secrets are stored in two locations:
1. **GitHub Secrets** - Used during CI/CD build and deployment
2. **Cloudflare Workers Secrets** - Available at runtime in the worker

## Required Secrets

### 1. Cloudflare Credentials

#### `CLOUDFLARE_API_TOKEN`
- **Where**: GitHub Secrets only
- **Purpose**: Deploy to Cloudflare Workers and manage D1 migrations
- **How to get**:
  1. Go to https://dash.cloudflare.com/profile/api-tokens
  2. Click "Create Token"
  3. Use "Edit Cloudflare Workers" template
  4. Add D1 permissions: D1:Edit
  5. Copy token immediately (shown only once)

#### `CLOUDFLARE_ACCOUNT_ID`
- **Where**: GitHub Secrets only
- **Purpose**: Identify your Cloudflare account
- **How to get**: Run `wrangler whoami` or find in Cloudflare dashboard URL

### 2. Clerk Authentication

#### `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- **Where**: GitHub Secrets + wrangler.toml vars
- **Purpose**: Client-side Clerk initialization
- **How to get**: Clerk Dashboard → API Keys → Publishable Key
- **Note**: Prefix `pk_test_` for development, `pk_live_` for production

#### `CLERK_SECRET_KEY`
- **Where**: GitHub Secrets + Cloudflare Workers Secrets
- **Purpose**: Server-side Clerk API authentication
- **How to get**: Clerk Dashboard → API Keys → Secret Key
- **Security**: NEVER commit to code, NEVER expose client-side
- **Add to Cloudflare**:
  ```bash
  wrangler secret put CLERK_SECRET_KEY
  # Paste value when prompted
  ```

#### `CLERK_WEBHOOK_SECRET`
- **Where**: GitHub Secrets + Cloudflare Workers Secrets
- **Purpose**: Verify webhook signatures from Clerk
- **How to get**: Clerk Dashboard → Webhooks → Add Endpoint → Copy signing secret
- **Add to Cloudflare**:
  ```bash
  wrangler secret put CLERK_WEBHOOK_SECRET
  # Paste value when prompted
  ```

### 3. Sentry Error Tracking

#### `NEXT_PUBLIC_SENTRY_DSN`
- **Where**: GitHub Secrets + wrangler.toml vars (optional)
- **Purpose**: Send error reports to Sentry
- **How to get**:
  1. Create account at https://sentry.io
  2. Create new project (select Next.js)
  3. Copy DSN from project settings
  4. Format: `https://[key]@o[org].ingest.sentry.io/[project]`
- **Add to GitHub**:
  1. Go to GitHub repo → Settings → Secrets and variables → Actions
  2. Click "New repository secret"
  3. Name: `NEXT_PUBLIC_SENTRY_DSN`
  4. Value: Your Sentry DSN
- **Add to wrangler.toml** (optional, for local dev):
  ```toml
  [vars]
  NEXT_PUBLIC_SENTRY_DSN = "https://[key]@o[org].ingest.sentry.io/[project]"
  ```

### 4. Application URLs

#### `NEXT_PUBLIC_APP_URL`
- **Where**: GitHub Secrets + wrangler.toml vars
- **Purpose**: Base URL for absolute links, redirects, CORS
- **Value**:
  - Production: `https://surveymania.omarshabab55.workers.dev`
  - Staging: `https://surveymania-staging.omarshabab55.workers.dev`
  - Local: `http://localhost:3000`

### 5. Database (Legacy/Optional)

#### `DATABASE_URL`
- **Where**: GitHub Secrets (legacy, not actively used)
- **Purpose**: Prisma Client generation (uses SQLite provider, not this URL)
- **Status**: Can be removed once confirmed not needed
- **Note**: D1 uses binding (`env.DB`), not connection string

## Setup Checklist

### Initial Setup (One-time)

- [ ] **Create Clerk Application**
  - [ ] Get publishable key
  - [ ] Get secret key
  - [ ] Configure webhook endpoint
  - [ ] Get webhook secret

- [ ] **Create Sentry Project**
  - [ ] Sign up at sentry.io
  - [ ] Create Next.js project
  - [ ] Copy DSN
  - [ ] Configure alert rules

- [ ] **Get Cloudflare Credentials**
  - [ ] Create API token with Workers + D1 permissions
  - [ ] Note account ID

### GitHub Secrets Configuration

Add these in: GitHub Repo → Settings → Secrets and variables → Actions

```bash
# Required
CLOUDFLARE_API_TOKEN=<from Cloudflare dashboard>
CLOUDFLARE_ACCOUNT_ID=<from wrangler whoami>
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_SENTRY_DSN=https://...@sentry.io/...
NEXT_PUBLIC_APP_URL=https://surveymania.omarshabab55.workers.dev

# Optional/Legacy
DATABASE_URL=file:./dev.db
```

### Cloudflare Workers Secrets Configuration

Run these commands locally (one-time setup):

```bash
# Authenticate with Cloudflare
wrangler login

# Add secrets (will prompt for values)
wrangler secret put CLERK_SECRET_KEY
# Paste secret key from Clerk Dashboard

wrangler secret put CLERK_WEBHOOK_SECRET
# Paste webhook secret from Clerk Dashboard

# Verify secrets are set
wrangler secret list
```

**Expected output:**
```
┌───────────────────────┬────────────┐
│ Name                  │ Value      │
├───────────────────────┼────────────┤
│ CLERK_SECRET_KEY      │ ***        │
│ CLERK_WEBHOOK_SECRET  │ ***        │
└───────────────────────┴────────────┘
```

### Local Development (.env.local)

Create `.env.local` in project root:

```env
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...

# Sentry (optional for local dev)
NEXT_PUBLIC_SENTRY_DSN=https://...@sentry.io/...

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Database (local D1 or file-based SQLite)
DATABASE_URL=file:./dev.db
```

## Verification

### Verify GitHub Secrets

1. Go to GitHub repo → Settings → Secrets and variables → Actions
2. Should see all 7 secrets listed
3. Values hidden with *** (security feature)

### Verify Cloudflare Secrets

```bash
wrangler secret list
```

Should show:
- CLERK_SECRET_KEY
- CLERK_WEBHOOK_SECRET

### Test Deployment

```bash
# Trigger deployment
git push origin main

# Monitor GitHub Actions
# Go to Actions tab in GitHub repo

# Check for successful deployment
# Verify no errors related to missing secrets
```

### Test Runtime

After deployment:

1. **Visit app**: https://surveymania.omarshabab55.workers.dev
2. **Test Clerk auth**: Sign in/sign up should work
3. **Test Sentry**: Trigger error (temporary test endpoint), check Sentry dashboard
4. **Check logs**: `wrangler tail` should show no secret-related errors

## Troubleshooting

### Error: "CLERK_SECRET_KEY is undefined"

**Cause**: Secret not added to Cloudflare Workers

**Fix**:
```bash
wrangler secret put CLERK_SECRET_KEY
```

### Error: "Invalid Sentry DSN"

**Cause**: Incorrect DSN format or typo

**Fix**:
1. Verify DSN format: `https://[key]@o[org].ingest.sentry.io/[project]`
2. Check for extra spaces or quotes
3. Re-copy from Sentry dashboard

### Error: "Failed to deploy: Unauthorized"

**Cause**: Invalid or missing CLOUDFLARE_API_TOKEN

**Fix**:
1. Create new API token with correct permissions
2. Update GitHub Secret
3. Re-run deployment

### Webhook 401 Errors

**Cause**: Missing or incorrect CLERK_WEBHOOK_SECRET

**Fix**:
1. Get correct secret from Clerk Dashboard → Webhooks
2. Update Cloudflare secret:
   ```bash
   wrangler secret put CLERK_WEBHOOK_SECRET
   ```

## Security Best Practices

### DO:
- ✅ Store secrets in password manager (1Password, LastPass)
- ✅ Rotate secrets every 90 days
- ✅ Use different secrets for staging vs production
- ✅ Verify secrets after adding (run test deployment)
- ✅ Delete secrets when decommissioning environment

### DON'T:
- ❌ Commit secrets to Git
- ❌ Share secrets via email/Slack
- ❌ Use production secrets in development
- ❌ Store secrets in code comments
- ❌ Expose secrets in client-side code

## Secret Rotation

To rotate secrets:

1. **Clerk Secrets**:
   - Clerk Dashboard → API Keys → Regenerate
   - Update GitHub Secret
   - Update Cloudflare secret: `wrangler secret put CLERK_SECRET_KEY`
   - Re-deploy

2. **Cloudflare API Token**:
   - Cloudflare Dashboard → Create new token
   - Update GitHub Secret
   - Re-deploy
   - Revoke old token

3. **Sentry DSN**:
   - Generally stable, rotation not required unless compromised
   - If needed: Sentry → Project Settings → Client Keys → Create new DSN

## Automated Setup Script

Use the provided script for Cloudflare secrets:

```bash
./scripts/setup-secrets.sh
```

This will interactively prompt for:
- CLERK_SECRET_KEY
- CLERK_WEBHOOK_SECRET

And automatically add them to Cloudflare Workers.

## References

- [Clerk API Keys](https://clerk.com/docs/deployments/clerk-environment-variables)
- [Cloudflare Workers Secrets](https://developers.cloudflare.com/workers/configuration/secrets/)
- [Sentry DSN Configuration](https://docs.sentry.io/product/sentry-basics/dsn-explainer/)
- [GitHub Actions Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
