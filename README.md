# Buildora

A hackathon and innovation program platform built with Next.js App Router, React, TypeScript, and Tailwind CSS.

## Run locally

```sh
npm ci
npm run dev -- --port 3100
```

Open http://localhost:3100. Set `NEXT_PUBLIC_SITE_URL` to the public origin when deploying.

## Validate and build

```sh
npm run typecheck
npm run lint
npm run test
npm run build
npm start -- --port 3100
```

With the app running on port 3100:

```sh
npm run test:smoke
node scripts/verify.mjs
```

Browser checks use Microsoft Edge through Playwright. `BASE_URL` overrides the smoke-test target. Screenshots are written to the ignored `test-results/` directory.

## Project structure

- `src/app`: pages, API routes, global styles, and metadata.
- `src/components`: navigation, program controls, forms, account screens, and dashboards.
- `src/content`: local page content, route inventory, program data, and account fixtures.
- `src/lib`: content rendering, account persistence, and shared utilities.
- `public/assets`: required images, illustrations, and fonts.
- `public/site.css`: shared presentation styles.
- `scripts`: local account configuration and validation tools.

Development output uses `.next-dev/`; production builds use `.next/`.

## Local accounts

Keep `.env.local` private. Local authentication uses `BUILDORA_SESSION_SECRET`, `BUILDORA_STUDENT_PASSWORD_HASH`, and `BUILDORA_PRO_PASSWORD_HASH`. Browser checks also use `BUILDORA_STUDENT_EMAIL` and `BUILDORA_PRO_EMAIL`. Existing installations must rename older environment keys to the `BUILDORA_` names; the old names are no longer read.

To configure password hashes, provide `BUILDORA_STUDENT_PASSWORD` and `BUILDORA_PRO_PASSWORD` through environment variables and run `node scripts/configure-local-accounts.mjs`. The script writes password hashes and a session secret to `.env.local`.

Account changes, registrations, and hosting inquiries persist in the ignored `.local-data/` directory. PDF resumes retain the existing private inline data representation. Local account creation and reset email delivery are unavailable; configured Supabase enables email authentication, verification and recovery. OAuth and live project submissions remain outside this slice. Contact and booking actions use the local hosting inquiry flow.

## Identity foundation

See [Batch 0–1 architecture and Supabase setup](docs/architecture/batch-0-1.md) and [.env.example](.env.example). Cloud authentication uses both public Supabase variables; local mode preserves seeded accounts. Staging/production environments require Supabase and HTTPS. Keep service-role credentials server-only.

After building, `npm run test:foundation` starts an isolated local server on a free port 3100, verifies both seeded accounts, runs public smoke/screenshots, and restores local account files. Unit and embedded PostgreSQL policy tests use no live cloud project.

## Opportunities and applications

The public marketplace is available at `/opportunities`; learner applications are at `/applications`, and authorized organization review is under `/employer/opportunities/[slug]/applications`.

Run `npm run seed:opportunities` to import every legacy JSON program into the local marketplace cache, or into Supabase when a server-only service-role key is supplied. Apply `supabase/migrations/202610020002_marketplace_applications.sql` after the identity migration for cloud deployments. See [Batch 2–3 architecture](docs/architecture/batch-2-3.md) for mappings, authorization, and limitations.
