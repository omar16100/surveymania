import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/api((?!/geocode|/geofence|/surveys/.*/heatmap|/webhooks).*)'
])

const isPublicSurveyGet = createRouteMatcher(['/api/surveys/:id'])
const isPublicResponsePost = createRouteMatcher(['/api/surveys/:id/responses'])

export default clerkMiddleware((auth, req) => {
  // Allow GET to survey details (public view)
  if (req.method === 'GET' && isPublicSurveyGet(req)) return
  // Allow POST to survey responses (public submission)
  if (req.method === 'POST' && isPublicResponsePost(req)) return
  if (isProtectedRoute(req)) auth().protect()
})

export const config = {
  matcher: [
    // Skip Next internals and static files
    '/((?!_next|.*\\..*).*)'
  ]
}
