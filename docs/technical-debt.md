# Technical Debt

## Build Quality Issues

### TypeScript Errors (P1 - High Priority)

**Status**: ~25 TypeScript errors currently ignored via `ignoreBuildErrors: true`

**Impact**: Type safety compromised, potential runtime errors

**Common Issues**:
- Prisma type mismatches (Zod schemas, unique constraints)
- Missing properties on relations
- Type incompatibilities in API routes
- String vs string[] mismatches in JSON fields

**Files Affected**:
- `app/(public)/s/[id]/page.tsx` - Zod schema issues
- `app/api/campaigns/**` - Prisma type mismatches
- `app/api/invites/**` - Unique constraint issues
- `app/api/organizations/**` - Type incompatibilities
- `app/api/responses/[id]/comments/**` - Relation property issues
- `app/api/surveys/[id]/export/**` - answerChoices string vs array

**Action Required**:
1. Fix TypeScript errors incrementally
2. Remove `ignoreBuildErrors` from next.config.mjs
3. Add typecheck to pre-commit hook

### ESLint Warnings

**Status**: Ignored via `ignoreDuringBuilds: true`

**Action Required**:
1. Run `npx eslint . --ext .js,.jsx,.ts,.tsx`
2. Fix critical warnings
3. Remove `ignoreDuringBuilds` flag

## Current Mitigations

### Quality Check Workflow

A separate GitHub Actions workflow (`quality-check.yml`) runs linting and type checking:
- Runs on PRs and pushes to main
- Reports issues but doesn't block deployment (`continue-on-error: true`)
- Provides visibility without breaking CI/CD

### Recommended Fix Priority

1. **High**: Prisma type mismatches in API routes (may cause runtime errors)
2. **Medium**: Zod schema type issues (affects form validation)
3. **Low**: ESLint warnings (code quality/consistency)

## Database Migration Technical Debt

### D1 Limitations

**No Transaction Support**: D1 doesn't support transactions
- Impact: Multi-statement migrations run independently
- Risk: Partial migration failures leave database in inconsistent state
- Mitigation: Keep migrations small and atomic

**No Rollback**: D1 doesn't support automatic rollback
- Impact: Failed migrations require manual intervention
- Mitigation: Test migrations locally first, have rollback SQL ready

## Monitoring Gaps

### No Error Tracking (P0 - Critical)

**Status**: Sentry not configured

**Impact**: Production errors undetected

**Action**: See deployment hardening plan - Sentry setup in progress

### No Uptime Monitoring

**Status**: Not configured

**Recommended**: Cloudflare Analytics + external uptime monitor (UptimeRobot, Pingdom)

### No Performance Monitoring

**Status**: Not configured

**Recommended**: Cloudflare Analytics, Web Vitals tracking

## Testing Gaps

### Unit Tests

**Status**: Test files may exist but not comprehensive

**Coverage**: Unknown - needs assessment

### Integration Tests

**Status**: Not configured for D1 environment

**Issue**: Tests use file-based SQLite, not D1

**Action**: Configure test environment to match production D1

### E2E Tests

**Status**: Not configured

**Recommended**: Playwright or Cypress for critical user flows

## Security

### Build-time Secret Exposure

**Issue**: Secrets passed as env vars to build step in deploy.yml

**Impact**: Secrets potentially embedded in build artifacts if referenced in client code

**Mitigation**: Ensure secrets only used server-side, verify build output

### No Staging Environment

**Issue**: Changes deploy directly to production

**Risk**: Untested changes reach users

**Action**: Create staging environment (separate D1 database, separate worker)

## Documentation Debt

### Outdated PostgreSQL Docs

**Status**: database-setup.md marked as deprecated ✅

**Action**: Completed - deprecation notice added

### Missing Runbooks

**Needed**:
- Rollback procedure
- Incident response
- Database restore process
- Secret rotation process

## Performance

### No Caching Strategy

**Status**: R2 bucket configured for OpenNext cache, but no custom caching

**Opportunity**: Cache survey definitions, user data, analytics

### No Database Optimization

**Status**: No query optimization, no indexes beyond basic ones

**Action**: Analyze slow queries, add indexes as needed

### No CDN Configuration

**Status**: Using Cloudflare Workers (edge by default)

**Note**: Workers already run at edge, minimal additional CDN needed

## Refactoring Opportunities

### Large API Route Files

**Issue**: Some API routes handle multiple operations, may exceed 200 LOC

**Action**: Split into smaller, focused handlers

### Repeated Code Patterns

**Issue**: Database client initialization, error handling repeated across routes

**Action**: Create shared utilities/middleware

### JSON String Fields

**Issue**: Several fields stored as JSON strings (settings, metadata, etc.)

**Risk**: No type safety, parsing errors

**Alternative**: Consider JSON columns or separate tables for structured data

## Priority Matrix

| Item | Priority | Effort | Impact |
|------|----------|--------|--------|
| Fix TypeScript errors | P1 | High | High |
| Setup Sentry | P0 | Low | High |
| Create staging env | P1 | Medium | High |
| Add integration tests | P2 | High | Medium |
| Optimize database queries | P2 | Medium | Medium |
| Add E2E tests | P3 | High | Medium |
| Fix ESLint warnings | P3 | Low | Low |
