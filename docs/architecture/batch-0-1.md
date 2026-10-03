# Buildora batches 0?1

## Implemented boundary

Pages and browser forms call API handlers and the accounts domain facade. `src/lib/accounts.ts` obtains a verified server identity and rechecks ownership before selecting an `AccountRepository`. JSON files, locks, atomic rename, and seeded-account session signatures live in `local-accounts.ts` and the local adapter. Supabase queries and RPCs live in a server-only adapter. Browser components receive safe profile data and mode labels, never service-role credentials.

`getIdentity()` returns identity, not an editable profile category. The legacy `AccountProfile.role` (`student`/`professional`) remains for UI compatibility and grants no privileges. `RoleAssignment.role` (`learner`/`organizer`/`mentor`/`admin`) is a separate authorization model. Role activation accepts an assignment selection and checks its ownership using the session; SQL independently repeats that check. No route permits clients to grant roles or choose an owner. Workspace UUIDs are reserved references until organization/workspace entities are introduced; no workspace privileges are inferred from them.

## Configuration and local development

Copy placeholders from `.env.example` into private environment configuration; do not replace existing `.env.local`. Both public Supabase variables select cloud mode; neither selects local mode. Partial configuration fails explicitly. `APP_ENV=staging` and `APP_ENV=production` require cloud authentication and an HTTPS site origin. `NODE_ENV=production` alone remains compatible with local production-build previews. Use distinct Supabase projects and site origins per deployed environment. Changing public variables requires rebuilding Next.js.

Existing local hashes and session secrets continue to work. To create them, privately supply `HC_STUDENT_PASSWORD`/`HC_PRO_PASSWORD`, then run `node scripts/configure-local-accounts.mjs`. Login uses the email in each seeded content fixture; the `HC_*_EMAIL` variables are browser-test inputs rather than authoritative identity configuration. Local account files remain ignored. There are no generated or committed credentials. Email signup/verification/recovery return explicit unavailable responses in local mode, and the UI labels local persistence.

## Supabase setup

1. Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL`, and `APP_ENV` for the environment.
2. Apply `supabase/migrations/202610020001_identity.sql` through your project's SQL editor or existing Supabase migration workflow. It targets PostgreSQL 15+ and provisions private learner profiles for both new and existing Auth identities. This repository has not applied it to a remote project.
3. Enable email/password authentication and email confirmation. Configure SMTP/email delivery, password policy, and Auth rate limits in Supabase.
4. Set the Auth Site URL to the exact site origin and allow `/auth/callback` and `/auth/callback?next=/auth/update-password` redirects on that origin. Standard PKCE email links require opening the same browser that requested the email. For cross-device verification/recovery, use an email template linking to `SITE/auth/callback?token_hash={{ .TokenHash }}&type=signup` or `type=recovery` respectively. Do not publish or log those links.
5. Verify signup, verification, recovery, expiry/refresh, and signout against the configured project before deployment.

`SUPABASE_SERVICE_ROLE_KEY` is documented for future administration but is unused in Batch 1. Normal app operations use the user's authenticated client and limited database RPCs. No privileged browser client exists. Clients and middleware follow [Supabase's cookie-based SSR guidance](https://supabase.com/docs/guides/auth/server-side/creating-a-client); Next.js 15 uses `middleware.ts`. Session access calls `getUser()` for server verification; cookie contents are never treated as proof of identity. Every auth/private response disables caching.

## Schema and RLS

`auth.users` is the identity source; a duplicate users table would introduce inconsistent identity state. `profiles` stores a private aggregate of existing editable UI fields plus learner segment, location, education/experience level, interests, skills, desired role/industry, career goals and availability. It keeps `legacy_state` for existing registration and hosting flows without introducing new competition workflows.

The migration adds role assignments, profile skills, educations, experiences, projects, visibility settings, notification preferences, and immutable audit events, with UUID keys, foreign keys, timestamps and owner indexes. Entity types in `account-types.ts` and repository history/audit reads establish structured education/experience/project and audit contracts. Both adapters implement these reads, with cloud history queries scoped to the verified owner. The current single education/professional UI fields remain in the aggregate; separate multi-entry collection editors are a later slice.

All private reads are owner-scoped. Education/experience/project collection tables have owner-only CRUD RLS as extension points. Profile, skills, preferences and visibility writes pass through a restricted `save_account` transaction that derives `auth.uid()`, preserves identity and roles, checks expected profile timestamp to reject stale writes, synchronizes skills/preferences/visibility, and records an audit event. Direct profile/role/audit/preference writes are not granted to authenticated clients. Role assignments can only be provisioned by a trusted database administrator; account creation assigns only `learner`.

Public visibility publishes only name, city and skills into `public_profiles`. The full private aggregate, contact details, resume and preferences are never publicly readable. Setting visibility to private deletes the public projection in the same transaction. Role switching uses an owner-checking RPC and adds an audit event. SECURITY DEFINER functions pin an empty search path, reference qualified objects, and limit execution grants.

## Validation and verification

TypeScript already ran in strict mode. ESLint now checks the repository, and Vitest checks configuration, schema validation, ownership, role activation, visibility, local adapter isolation/concurrency, Supabase adapter boundaries, safe API errors, and authentication/callback behavior. Embedded PostgreSQL (PGlite) applies the actual migration with simulated Supabase Auth roles and `auth.uid()`, then tests provisioning, RLS, unauthorized writes, public-summary retraction and stale-write rejection. These checks do not replace live Supabase Auth testing.

Run:

```sh
npm run typecheck
npm run lint
npm run test
npm run build
npm run test:foundation
```

The last command requires Microsoft Edge and a free port 3100. It starts the built app with temporary process-only local credentials, checks both seeded accounts, onboarding/profile persistence, owner isolation, workspace authorization, malformed/origin validation, mobile layout and logout. It then runs `npm run test:smoke` and `node scripts/verify.mjs`, stops its server and restores the exact pre-test account files. It never modifies `.env.local`. Screenshots remain under ignored `test-results/`.

## Limits and follow-up

Cloud Auth/email delivery and remote migrations require a configured project and remain unverified here. OAuth providers are intentionally absent. The local adapter is a two-account development system with process-local locks, not a multi-instance production database. The application's extra auth throttle is process-local; Supabase Auth rate limits must protect cloud deployments. Private PDF resumes retain the existing inline representation and size limit; private object storage is a future migration. Anonymous hosting inquiries remain available locally; cloud hosting inquiries require authentication until a dedicated organization-intake repository exists.

The next small Batch 2 slice is structured learner education/experience/project editors backed by owner-scoped repository methods, building on the schema and avoiding unrelated marketplace features.

## Validation results in this workspace

- Typecheck and production build passed.
- ESLint passed with seven pre-existing warnings (image optimization, stylesheet loading, unused import and PostCSS default export).
- 33 Vitest tests passed, including the actual SQL migration in embedded PostgreSQL.
- Both seeded local identities passed browser/API checks using temporary process-only passwords; original account files were restored.
- All 75 existing public routes passed smoke checks.
- The screenshot verifier reported no browser errors, missing images or desktop/mobile overflow on its sampled routes.
- `npm audit` reported zero vulnerabilities.
- No live Supabase project was connected and no remote migration was applied.
