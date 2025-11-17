# Staging Environment Setup

Complete guide for setting up and using the staging environment.

## Overview

Staging environment provides a production-like environment for testing before deploying to production.

**Staging URL**: `https://surveymania-staging.omarshabab55.workers.dev`

## Initial Setup

### 1. Create Staging D1 Database

```bash
# Create staging database
wrangler d1 create surveymania-staging
```

**Expected output:**
```
✅ Successfully created DB 'surveymania-staging'

[[d1_databases]]
binding = "DB"
database_name = "surveymania-staging"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

**Copy the `database_id`** - you'll need it in the next step.

### 2. Update wrangler.toml

Edit `wrangler.toml` and replace the staging database_id:

```toml
[env.staging]
name = "surveymania-staging"

[[env.staging.d1_databases]]
binding = "DB"
database_name = "surveymania-staging"
database_id = "PASTE_YOUR_STAGING_DB_ID_HERE"  # ← Replace this
```

### 3. Create Staging R2 Bucket

```bash
# Create staging cache bucket
wrangler r2 bucket create surveymania-cache-staging
```

### 4. Add Staging Secrets

```bash
# Same secrets as production (for testing)
# Or use separate test values

wrangler secret put CLERK_SECRET_KEY --env staging
wrangler secret put CLERK_WEBHOOK_SECRET --env staging
```

### 5. Create develop Branch

```bash
# Create develop branch from main
git checkout -b develop
git push -u origin develop
```

### 6. Run Initial Migration

```bash
# Apply migrations to staging database
wrangler d1 migrations apply surveymania-staging --remote
```

## Deployment Workflow

### Automatic Deployment

Pushes to `develop` branch automatically deploy to staging:

```bash
git checkout develop
git add .
git commit -m "Test new feature"
git push origin develop
```

GitHub Actions will:
1. Build the application
2. Deploy to staging environment
3. Run database migrations

Monitor deployment: https://github.com/[your-repo]/actions

### Manual Deployment

Trigger deployment manually:

```bash
# Via GitHub Actions
# Go to Actions → Deploy to Staging → Run workflow

# Or via CLI
npm run build
wrangler deploy --env staging
```

## Testing on Staging

### Access Staging Environment

Visit: https://surveymania-staging.omarshabab55.workers.dev

### Testing Checklist

- [ ] **Authentication**
  - [ ] Sign up new user
  - [ ] Sign in existing user
  - [ ] Sign out

- [ ] **Survey Creation**
  - [ ] Create new survey
  - [ ] Add 5 different question types
  - [ ] Publish survey

- [ ] **Response Submission**
  - [ ] Submit response with location
  - [ ] Submit response without location
  - [ ] Test offline submission (if applicable)

- [ ] **Data Viewing**
  - [ ] View responses in data grid
  - [ ] Sort and filter responses
  - [ ] Export CSV/XLSX

- [ ] **Campaign Management**
  - [ ] Create campaign
  - [ ] Invite team member
  - [ ] Assign territories

- [ ] **Error Tracking**
  - [ ] Check Sentry for any errors
  - [ ] Verify error details are captured

## Database Management

### View Staging Data

```bash
# Query staging database
wrangler d1 execute surveymania-staging --remote \
  --command="SELECT * FROM User LIMIT 5"
```

### Run Migrations

```bash
# Apply pending migrations
wrangler d1 migrations apply surveymania-staging --remote

# List applied migrations
wrangler d1 migrations list surveymania-staging --remote
```

### Reset Staging Database (if needed)

```bash
# WARNING: This deletes all data!

# List tables
wrangler d1 execute surveymania-staging --remote \
  --command="SELECT name FROM sqlite_master WHERE type='table'"

# Drop all tables (manual - run for each table)
wrangler d1 execute surveymania-staging --remote \
  --command="DROP TABLE IF EXISTS [TableName]"

# Re-run migrations
wrangler d1 migrations apply surveymania-staging --remote
```

## Logs and Debugging

### View Live Logs

```bash
# Tail staging logs
wrangler tail --env staging

# Filter errors only
wrangler tail --env staging --status error
```

### Check Deployment Status

```bash
# List deployments
wrangler deployments list --env staging

# View specific deployment
wrangler deployments view [deployment-id] --env staging
```

## Environment Differences

| Feature | Production | Staging |
|---------|-----------|---------|
| URL | surveymania.omarshabab55.workers.dev | surveymania-staging.omarshabab55.workers.dev |
| D1 Database | surveymania-prod | surveymania-staging |
| R2 Bucket | surveymania-cache | surveymania-cache-staging |
| Branch | main | develop |
| Clerk Keys | Same (test mode) | Same (test mode) |
| Sentry DSN | Same | Same |

## Promoting to Production

### Testing Complete

1. **Verify all tests pass**
   ```bash
   npm test
   npm run typecheck
   npm run lint
   ```

2. **Manual QA on staging**
   - Complete testing checklist above
   - No critical errors in Sentry
   - Performance acceptable

3. **Create PR: develop → main**
   ```bash
   # From GitHub UI or CLI
   gh pr create --base main --head develop \
     --title "Deploy: [Feature Name]" \
     --body "Tested on staging, ready for production"
   ```

4. **Merge PR**
   - Review changes
   - Approve and merge
   - Production deployment triggers automatically

5. **Monitor Production**
   - Watch deployment in GitHub Actions
   - Check production URL
   - Monitor Sentry for errors
   - Verify in Cloudflare dashboard

### Rollback (if needed)

If production deployment fails:

```bash
# Revert merge commit
git revert HEAD
git push origin main

# Or manual rollback
wrangler rollback --env production
```

## Troubleshooting

### Staging deployment fails

**Check GitHub Actions logs:**
1. Go to Actions tab
2. Click failed workflow
3. Review error messages

**Common issues:**
- Missing secrets
- Invalid database_id in wrangler.toml
- Build errors (check TypeScript/ESLint)

### Staging database errors

**Error: "D1 database binding not found"**

Fix:
1. Verify wrangler.toml has correct database_id
2. Check database exists: `wrangler d1 list`
3. Re-deploy: `wrangler deploy --env staging`

### Can't access staging URL

**Check deployment status:**
```bash
wrangler deployments list --env staging
```

**Verify worker is running:**
```bash
wrangler tail --env staging
# Make request to staging URL
# Check logs for errors
```

## Best Practices

### DO:
- ✅ Test all changes on staging before production
- ✅ Use staging for QA and user acceptance testing
- ✅ Keep staging in sync with production (same secrets, similar data)
- ✅ Reset staging data periodically
- ✅ Monitor staging errors in Sentry

### DON'T:
- ❌ Skip staging and deploy directly to production
- ❌ Use staging for load testing (use separate environment)
- ❌ Store sensitive real user data in staging
- ❌ Share staging credentials publicly

## Staging Data Management

### Seed Staging Data

```bash
# Option 1: Import production data snapshot
wrangler d1 execute surveymania-prod --remote \
  --command="SELECT * FROM Survey" \
  --json > surveys.json

# Import to staging (manual via SQL)

# Option 2: Use seed script
npm run prisma:seed
```

### Synthetic Test Data

Create realistic test data:
- 5-10 organizations
- 20-30 surveys
- 100-200 responses
- Test users with different roles

## Monitoring Staging

### Sentry Configuration

Staging and production share same Sentry project but with environment tags.

Verify environment tag in Sentry:
- Filter by `environment:staging`
- Separate alerts for staging vs production

### Analytics

Cloudflare Analytics tracks staging separately:
- Workers & Pages → surveymania-staging
- View requests, errors, duration

## Cost Management

Staging environment uses same Cloudflare plan as production.

**Resource usage:**
- D1: Shared quota
- R2: Shared quota
- Workers: Shared quota

**Optimization:**
- Reset staging database monthly
- Delete old R2 cache objects
- Monitor usage in Cloudflare dashboard

## Next Steps

After staging is set up:

1. Test deployment pipeline
2. Run full QA test suite
3. Document any environment-specific configurations
4. Set up automated tests in CI
5. Create runbook for common issues
