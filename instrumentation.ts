export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}

export const onRequestError = async (
  err: unknown,
  request: {
    method: string;
    path: string;
  },
  context: {
    routerKind: string;
    routePath: string;
    routeType: string;
  }
) => {
  // Use Sentry to report errors
  // This will automatically be called for all errors in your app
  if (typeof err === 'object' && err !== null && 'message' in err) {
    console.error('Request error:', {
      error: err,
      method: request.method,
      path: request.path,
      routerKind: context.routerKind,
      routePath: context.routePath,
      routeType: context.routeType,
    });
  }
};
