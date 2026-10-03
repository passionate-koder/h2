# Codex Agent Prompt — Buildora Batches 0–1

## Mission

You are implementing **Buildora Batches 0–1** in the existing repository. Work as a senior full-stack engineer: inspect the codebase first, preserve existing behavior, make incremental changes, run validation, and report exactly what was implemented and what remains blocked.

The goal is to establish a production-oriented foundation and replace the current prototype account layer with a secure, extensible identity/profile/role foundation backed by Supabase where credentials are available, while keeping the app runnable locally when they are not.

## Repository context

- Stack: Next.js App Router, TypeScript, React, Tailwind CSS
- Existing app name: Buildora
- Existing local development command: `npm run dev -- --port 3100`
- Existing validation commands:
  - `npm run typecheck`
  - `npm run build`
  - `npm run test:smoke`
  - `node scripts/verify.mjs`
- Existing local account persistence uses cookies and JSON files under `.local-data/`.
- Existing account/session logic is primarily in `src/lib/accounts.ts`.
- Existing account-related types are in `src/lib/account-types.ts`.
- Existing routes include `/auth`, `/onboarding`, `/profile`, `/my-events`, and API routes under `src/app/api/`.
- Existing content is heavily JSON-driven under `src/content/`.
- The application must remain usable with the current local development setup.

## Product requirements for this task

### Batch 0 — Foundation

Implement the minimum foundation required for safe future feature work:

1. Add clear environment configuration for local, staging, and production.
2. Add or improve strict TypeScript validation.
3. Add ESLint configuration and a runnable lint script if missing.
4. Add Vitest and a runnable unit-test script.
5. Create repository interfaces/adapters so pages and route handlers do not directly depend on JSON persistence.
6. Add a Supabase integration boundary without hard-coding credentials.
7. Add consistent server-side error handling where practical.
8. Add or improve loading, empty, unauthorized, and error states only where touched.
9. Add basic structured logging that does not leak secrets or passwords.
10. Preserve the existing local JSON adapter as a development fallback.

### Batch 1 — Identity, roles, and learner profiles

Implement the first production-oriented identity/profile slice:

1. Supabase Auth integration boundary for email/password authentication.
2. Email verification and password-recovery route/UI structure, using Supabase when configured.
3. Persistent server-side session access through the Supabase server client when configured.
4. A local fallback that continues to support the existing seeded accounts when Supabase is not configured.
5. Profile schema and repository interfaces for:
   - user identity
   - learner profile
   - role assignments
   - active workspace/role
   - skills
   - education
   - experience
   - projects
   - profile visibility
   - notification preferences
   - audit events
6. Learner onboarding persistence for:
   - learner segment: student, recent graduate, or career switcher
   - location
   - education/experience level
   - interests
   - skills
   - desired role/industry
   - career goals
   - availability
7. Profile editing for the fields already supported by the current UI, plus the new onboarding fields where the UI can support them cleanly.
8. Role-aware authorization helpers that do not trust browser-supplied user, organization, or role identifiers.
9. Supabase SQL migrations and RLS policies for the implemented tables.
10. Unit tests for validation and authorization helpers.
11. Do not add Google, GitHub, or LinkedIn OAuth unless the integration can be implemented cleanly without inventing credentials or weakening the local fallback. Prefer scaffolding/configuration for those providers over fake functionality.

## Non-goals for this task

Do **not** implement the following yet:

- Opportunity marketplace search or filters
- Job/internship applications
- Organization verification
- Competition/team/submission workflows
- Assessments
- Payments or subscriptions
- Mentor marketplace
- Coding execution
- Proctoring
- ML recommendations
- Full admin workspace
- Real-time chat
- Broad UI redesign
- Migration of every existing JSON content file

## Required operating procedure

### 1. Inspect before editing

First inspect:

- `package.json`
- `tsconfig.json`
- `next.config.ts`
- existing source routes and components
- `src/lib/accounts.ts`
- `src/lib/account-types.ts`
- existing auth/profile/onboarding pages and API routes
- current scripts
- current environment files, without printing secrets
- current git status

Do not overwrite files blindly. Reuse established conventions where they are sound.

### 2. Establish a safe architecture

Use this dependency direction:

```text
UI components/pages
        ↓
Server actions or route handlers
        ↓
Domain services and authorization helpers
        ↓
Repository interfaces
        ↓
Supabase adapter OR local JSON adapter
```

Rules:

- Keep browser components unaware of Supabase service-role credentials.
- Use server-only modules for privileged Supabase operations.
- Never expose `SUPABASE_SERVICE_ROLE_KEY` to the browser.
- Prefer the authenticated user's server session over browser-provided IDs.
- Validate all request bodies at the server boundary.
- Avoid leaking whether another user's account exists.
- Never log passwords, tokens, session cookies, reset links, or secret environment values.
- Keep local fallback behavior explicit and isolated rather than mixing persistence logic into UI components.

### 3. Environment configuration

Add or update a safe example file such as `.env.example` with placeholders only. At minimum document:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SITE_URL=http://localhost:3100
```

Keep existing `HC_*` variables documented if the local adapter still needs them. Do not create or commit a real `.env.local` containing secrets.

If Supabase variables are absent:

- The app must still start.
- The local adapter must remain available.
- The UI must clearly avoid claiming that cloud persistence is active.
- Tests must be able to run without a live Supabase project.

### 4. Database and migrations

If Supabase tooling is not already configured, create a clear migrations directory, for example:

```text
supabase/migrations/
```

Add only the tables needed for Batch 1. Use UUID primary keys, UTC timestamps, explicit foreign keys, and sensible indexes. At minimum consider:

```text
profiles
role_assignments
profile_skills
educations
experiences
projects
profile_visibility_settings
notification_preferences
audit_events
```

If a separate `users` table would duplicate Supabase Auth unnecessarily, use `auth.users` as the identity source and explain the decision in the implementation notes.

RLS requirements:

- Users can read/update their own private profile data.
- Public profile reads must respect the profile visibility setting.
- Users cannot modify another user's roles, audit events, or notification records.
- Role/workspace changes must be server-authorized.
- Service-role operations must be isolated to server-only code.

Do not claim migrations were applied to a remote Supabase project unless the required credentials and command actually succeeded.

### 5. Authentication and local fallback

Preserve the current seeded-account experience while adding the new boundary.

Recommended behavior:

- `authMode = supabase` when required Supabase public variables are configured.
- `authMode = local` otherwise.
- The mode selection must be centralized and observable in development logs without exposing secrets.
- Existing local login/logout behavior should continue to work.
- Supabase session cookies should use the official server/browser client patterns for Next.js App Router.
- Do not maintain two unrelated authorization implementations in page components.

If complete Supabase authentication cannot be safely finished because credentials or package support are missing, implement the adapter, configuration, migrations, and clear TODOs, while ensuring local mode remains fully functional. Report this limitation explicitly.

### 6. Onboarding and profile UX

Reuse the existing visual language and components. Do not redesign the entire site.

Implement or update:

- onboarding form state and validation
- persistence through a server action or route handler
- profile edit form
- success and error feedback
- loading/pending states
- unauthorized handling
- mobile-safe layout
- accessible labels, focus states, and keyboard operation

Avoid turning every field into a new complex component. Prefer small reusable primitives where repeated patterns exist.

## Testing requirements

Add or update tests for:

### Unit tests

- environment/config mode selection
- onboarding input validation
- profile input validation
- role authorization helpers
- visibility rules
- repository adapter behavior with mocked dependencies
- local fallback behavior

### Integration tests where practical

- unauthenticated access is rejected for private profile operations
- one user cannot update another user's profile
- role/workspace changes require authorization
- local mode works without Supabase variables
- malformed request payloads return safe 4xx responses

### Existing validation

Run all applicable commands:

```bash
npm run typecheck
npm run lint
npm run test
npm run build
npm run test:smoke
node scripts/verify.mjs
```

If a command does not exist, add it where appropriate or state why it is not applicable. Do not hide failures.

## Definition of done

Batch 0–1 is complete only when all applicable conditions below are true:

- The app starts in local mode without Supabase credentials.
- Existing seeded local accounts still work.
- Supabase configuration is isolated behind server-safe adapters.
- `.env.example` documents required variables without secrets.
- Database migrations exist for the implemented profile/role-related entities.
- RLS policies exist for the implemented tables.
- Onboarding data can be validated and persisted through the repository/service layer.
- Profile data can be viewed and edited by the authenticated owner.
- Unauthorized access is handled safely.
- No route handler trusts a browser-supplied user ID or role assignment.
- Typecheck, lint, unit tests, build, and relevant smoke checks pass.
- Existing public routes remain functional.
- No unrelated product features are introduced.
- The final report distinguishes implemented work, tested work, and blocked work.

## Change-control rules

- Make focused, reviewable changes.
- Do not delete existing content or routes unless there is a clear replacement and compatibility is preserved.
- Do not add dependencies without checking whether an existing dependency already solves the problem.
- Do not use fake Supabase responses in production code.
- Do not silently downgrade security to make tests pass.
- Do not commit secrets, generated credentials, or large unrelated artifacts.
- If the repository has unrelated pre-existing changes, do not discard them; report them and avoid modifying them unless necessary.
- If a design choice materially affects future marketplace, organization, or competition features, document it in `docs/architecture/batch-0-1.md` or a similarly appropriate location.

## Final response format

At the end, report:

1. **Implemented** — concise list of files/features changed.
2. **Architecture decisions** — especially auth mode, repository boundary, migrations, and RLS.
3. **Validation** — commands run and their outcomes.
4. **Environment/setup** — variables or manual steps required.
5. **Known limitations** — anything not completed and why.
6. **Next recommended slice** — the smallest logical Batch 2 starting point.

Do not claim production readiness unless the definition of done is actually satisfied.
