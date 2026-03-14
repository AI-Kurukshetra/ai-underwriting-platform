# Underwriting & Risk Intelligence Platform

A Next.js + Prisma + Supabase MVP for AI-assisted underwriting, fraud detection, and portfolio monitoring. The project is based on the product brief in `project.md` and focuses on the initial scope: risk scoring, workflow automation, document confidence, auditability, and API-first integration.

## What is included
- Next.js App Router dashboard and workflow pages
- Prisma data layer over Postgres with local mock fallbacks
- Supabase email/password auth with Prisma-backed tenant provisioning
- Internal personal-loan intake form and underwriter decision controls
- Password reset, email change, and admin-only decision overrides
- Supporting document upload with Supabase Storage and OCR-readiness scoring heuristics
- Risk scoring engine with explainable factor breakdowns
- API routes for applications, decisions, monitoring, and scoring
- Supabase SQL migration, Prisma schema, and seed data

## Getting started
1. Install dependencies: `npm install`
2. Copy environment values from `.env.example`
3. Generate Prisma client: `npm run prisma:generate`
4. Start the app: `npm run dev`
5. Optional Supabase local workflow: `npx supabase db reset`

## Authentication
- Visit `/auth/sign-up` to create a user, organization, and baseline tenant records
- Visit `/auth/login` to sign in with email/password
- Visit `/auth/forgot-password` to request a recovery email
- Protected pages and internal API routes redirect or return `401` until authenticated

## Key routes
- `/` product overview and architecture summary
- `/dashboard` operational risk dashboard
- `/applications` loan intake and underwriting queue
- `/models` model governance and monitoring
- `/portfolio` portfolio concentration and loss trends

## API surface
- `GET, POST /api/applications`
- `POST /api/risk-assessment/score`
- `POST /api/decisions`
- `GET /api/monitoring`

## Supabase setup
Apply the schema in `supabase/migrations`, then load `supabase/seed.sql` for sample records. Runtime data access now uses `DATABASE_URL` through Prisma, while Supabase is still used for auth and storage. If `DATABASE_URL` is omitted, the UI falls back to in-memory mock data so the project remains demoable.

Apply `supabase/migrations/20260314143000_application_documents.sql` before using document upload and storage-backed document tracking.
