**SurveyMania – MVP Scaffold**

- Next.js 14 (App Router), TypeScript
- Prisma + PostgreSQL (PostGIS-ready via lat/long fields)
- Tailwind CSS
- API routes matching core spec (stubs + basic CRUD)

Getting started
- Copy `.env.example` to `.env` and set `DATABASE_URL`.
- For auth, set `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` (Clerk dashboard).
- Install deps: `npm install`
- Generate Prisma client: `npm run prisma:generate`
- Create DB schema: `npm run prisma:migrate -- --name init`
- Dev server: `npm run dev`

Key files
- `prisma/schema.prisma`: Data models per spec (with enums).
- `app/api/*`: REST endpoints stubs: surveys, questions, responses, campaigns, exports, geolocation, geofence, heatmap.
- `app/dashboard/surveys/new`: Minimal survey builder UI using Zustand + basic components.
- `lib/db.ts`: Prisma client singleton.
- `lib/auth.ts`: Placeholder auth; replace with Clerk.
  - Now integrated with Clerk; includes dev fallback if keys are placeholders.

Auth
- Routes under `/dashboard` and most `/api` endpoints are protected by Clerk middleware.
- Public endpoints: GET `/api/surveys/:id`, POST `/api/surveys/:id/responses`, geocode/geofence, and heatmap.
- Sign-in: `/sign-in` — Sign-up: `/sign-up`.

Notes
- PostGIS geography fields are represented as `latitude/longitude` decimals. You can add native geography columns via SQL migrations if needed.
- Geocoding and export download are mocked; wire to providers (Mapbox/Google, S3/R2) later.
- Replace `lib/auth.ts` with Clerk (`@clerk/nextjs`) and add middleware for protected routes.
