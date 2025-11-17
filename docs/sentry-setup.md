# Sentry Error Tracking Setup

## Overview

Sentry is configured for error tracking and performance monitoring across:
- Client-side (browser)
- Server-side (Node.js)
- Edge runtime (Cloudflare Workers)

## Configuration

### 1. Create Sentry Project

1. Sign up at [sentry.io](https://sentry.io)
2. Create new project (select Next.js)
3. Copy your DSN (Data Source Name)

### 2. Configure Environment Variables

#### For Cloudflare Workers (Production)

Add to `wrangler.toml` vars section:

```toml
[vars]
NEXT_PUBLIC_SENTRY_DSN = "https://your-sentry-dsn@sentry.io/project-id"
```

Or use secrets for better security:

```bash
wrangler secret put NEXT_PUBLIC_SENTRY_DSN
```

#### For Local Development

Add to `.env.local`:

```env
NEXT_PUBLIC_SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
```

#### For GitHub Actions

Add GitHub Secret:
- Name: `NEXT_PUBLIC_SENTRY_DSN`
- Value: Your Sentry DSN

Update `.github/workflows/deploy.yml`:

```yaml
env:
  NEXT_PUBLIC_SENTRY_DSN: ${{ secrets.NEXT_PUBLIC_SENTRY_DSN }}
```

## Files Created

- `sentry.client.config.ts` - Client-side Sentry initialization
- `sentry.server.config.ts` - Server-side Sentry initialization
- `sentry.edge.config.ts` - Edge runtime Sentry initialization
- `instrumentation.ts` - Next.js instrumentation hook

## Features Enabled

### Error Tracking
All unhandled errors automatically reported to Sentry:
- Client-side errors
- Server-side errors
- Edge runtime errors
- API route errors

### Session Replay (Client Only)
Records user sessions when errors occur:
- Sample rate: 10% of sessions
- Error replay: 100% of errors
- Privacy: All text and media masked

### Performance Monitoring
Tracks performance metrics:
- Sample rate: 100% (adjust in production)
- API route performance
- Page load times
- Database query timing

## Configuration Options

### Adjust Sample Rates

Edit `sentry.client.config.ts`:

```typescript
tracesSampleRate: 0.1,  // 10% of transactions
replaysSessionSampleRate: 0.01,  // 1% of sessions
replaysOnErrorSampleRate: 1.0,  // 100% of errors
```

### Disable in Development

Sentry is active in all environments by default. To disable in dev:

```typescript
Sentry.init({
  dsn: process.env.NODE_ENV === 'production'
    ? process.env.NEXT_PUBLIC_SENTRY_DSN
    : undefined,
  // ...
});
```

### Filter Sensitive Data

Add to Sentry config:

```typescript
beforeSend(event) {
  // Remove sensitive data
  if (event.request) {
    delete event.request.cookies;
  }
  return event;
}
```

## Testing Sentry

### Trigger Test Error (Client)

Create a test page or add to existing page:

```typescript
<button onClick={() => {
  throw new Error("Sentry test error from client");
}}>
  Trigger Error
</button>
```

### Trigger Test Error (Server)

In any API route:

```typescript
export async function GET() {
  throw new Error("Sentry test error from server");
}
```

### Verify in Sentry Dashboard

1. Go to sentry.io
2. Navigate to Issues
3. You should see your test errors

## Usage in Code

### Capture Custom Errors

```typescript
import * as Sentry from "@sentry/nextjs";

try {
  // risky operation
} catch (error) {
  Sentry.captureException(error);
}
```

### Add Context

```typescript
Sentry.setContext("user", {
  id: user.id,
  email: user.email,
  organization: user.organizationId
});
```

### Add Breadcrumbs

```typescript
Sentry.addBreadcrumb({
  category: "survey",
  message: "User submitted survey response",
  level: "info",
  data: {
    surveyId: survey.id,
    responseId: response.id
  }
});
```

### Track Performance

```typescript
const transaction = Sentry.startTransaction({
  name: "Export Survey CSV",
  op: "export"
});

try {
  // export logic
} finally {
  transaction.finish();
}
```

## Monitoring Best Practices

### 1. Set Up Alerts

Configure Sentry alerts for:
- New error types
- Spike in error volume
- Performance degradation
- Critical errors (500s, database errors)

### 2. Create Issue Assignments

Route errors to team members:
- API errors → Backend team
- UI errors → Frontend team
- Database errors → DevOps team

### 3. Set Up Releases

Tag deployments in Sentry:

```bash
# In CI/CD pipeline
sentry-cli releases new $RELEASE_VERSION
sentry-cli releases set-commits $RELEASE_VERSION --auto
sentry-cli releases finalize $RELEASE_VERSION
```

### 4. Monitor Key Metrics

Track in Sentry dashboard:
- Error rate trends
- Response time percentiles
- User-affected errors
- Browser/device distribution

## Troubleshooting

### Errors Not Appearing in Sentry

1. Check DSN is set: `echo $NEXT_PUBLIC_SENTRY_DSN`
2. Verify Sentry is initialized: Check console for "Sentry initialized"
3. Check sample rates aren't too low
4. Verify project DSN is correct

### High Volume of Errors

1. Reduce sample rates
2. Filter out noisy errors (beforeSend filter)
3. Enable rate limiting in Sentry project settings

### Session Replays Not Working

1. Verify `replayIntegration` is configured
2. Check sample rates
3. Ensure HTTPS (replays don't work on HTTP)
4. Check browser compatibility

## Cost Optimization

Sentry pricing based on:
- Number of errors
- Number of transactions
- Number of session replays

To reduce costs:
- Lower sample rates in production
- Filter out non-critical errors
- Set up rate limits
- Use Sentry's inbound filters

## Resources

- [Sentry Next.js Docs](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
- [Sentry Cloudflare Workers](https://docs.sentry.io/platforms/javascript/guides/cloudflare-workers/)
- [Performance Monitoring](https://docs.sentry.io/product/performance/)
- [Session Replay](https://docs.sentry.io/product/session-replay/)
