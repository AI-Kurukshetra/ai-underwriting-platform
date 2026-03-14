# Repository Guidelines

## Project Structure & Module Organization
The app uses Next.js 14 with the App Router. Put route pages and API handlers in `app/`; endpoints live under `app/api/**/route.ts`, and areas such as `app/dashboard`, `app/applications`, and `app/portfolio` map directly to URLs. Reusable UI belongs in `components/`. Shared business logic, types, validation, mock data, and Supabase clients live in `lib/` and `lib/supabase/`. Database changes belong in `supabase/migrations/`, with sample data in `supabase/seed.sql`. Do not edit generated output in `.next/` or dependencies in `node_modules/`.

## Build, Test, and Development Commands
Use `npm run dev` to start the local server. Use `npm run build` to create the production build and catch route or configuration issues early. Use `npm run start` to serve the built app locally. Use `npm run lint` for Next.js ESLint checks and `npm run typecheck` for strict TypeScript validation. For database work, apply schema changes with `supabase db reset` after updating SQL files.

## Coding Style & Naming Conventions
This codebase is TypeScript-first, uses strict mode, and follows `next/core-web-vitals`. Match the existing style: 2-space indentation, double quotes, semicolons, and named exports for shared helpers and components. Use `PascalCase` for React components, `camelCase` for functions and variables, and Next.js route filenames such as `page.tsx`, `layout.tsx`, and `route.ts`. Prefer the `@/` import alias over long relative paths.

## Testing Guidelines
There is no dedicated test runner configured yet. Until one is added, treat `npm run lint` and `npm run typecheck` as required checks for every change, and manually verify affected flows in the browser and API routes. When adding tests, colocate them near the feature or under `__tests__/` using `*.test.ts` or `*.test.tsx`.

## Commit & Pull Request Guidelines
This workspace snapshot does not include `.git` history, so no local convention can be inferred. Use short, imperative commit subjects with an optional scope, for example `feat: add risk scoring fallback` or `fix: guard missing Supabase session`. Keep pull requests focused, describe user-visible behavior changes, list validation steps, and attach screenshots for UI updates. Link the related issue or task whenever one exists.

## Security & Configuration Tips
Keep secrets in local environment files only and never commit `.env`. Supabase is optional for demos; if environment variables are missing, the app falls back to mock data. Any change to auth, migrations, or API handlers should be reviewed for tenant isolation and safe handling of sensitive underwriting data.
