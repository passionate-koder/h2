# Buildora batches 2–3

## Marketplace boundary

`src/lib/marketplace/domain.ts` contains query normalization, visibility, eligibility, deadline, question-validation, transition, and withdrawal rules. Server pages and route handlers call `src/lib/marketplace/repository.ts`; browsers never choose an applicant, actor, organization, or owner. The repository selects local JSON persistence or authenticated Supabase RPCs from the established identity configuration.

Public reads return only `published` opportunities. Query fields are allowlisted, page size is capped at 24, ordering is stable (`publishedAt`, then slug), and directory state is represented in URL parameters. Supabase filtering and pagination execute inside `search_opportunities`; local filtering uses the same normalized query contract.

The shared opportunity model supports jobs, internships, hackathons, NGO challenges, and college programs. Compensation uses ISO currency plus integer minor units. Eligibility is an explicit published JSON rule set. Dates are UTC timestamps and server decisions use the server clock. The UI renders dates in the visitor's runtime timezone.

## Import and local data

Run `npm run seed:opportunities`. The script reads every record in `src/content/programs.json`, preserves source slugs, records its source identity, and maps legacy `offline`/`online` modes to `onsite`/`remote`. It writes all 54 normalized records to `.local-data/opportunities-import.json` in local mode. That file is ignored and can be replaced safely on every run; the repository merges by slug, so reruns cannot duplicate results.

When both `NEXT_PUBLIC_SUPABASE_URL` and server-only `SUPABASE_SERVICE_ROLE_KEY` are present, the same command upserts organizations, opportunities, and skills using deterministic UUIDs. The service-role value is used only by this command and must never use a `NEXT_PUBLIC_` name or enter browser code.

Two representative first-party records (a job and internship for the local `ABCD` organization) are code seeds so application workflows are available without cloud credentials. Existing JSON currently contains hackathons, not native jobs or internships.

## Application lifecycle and authorization

Applications have one transaction-safe record per `(opportunity_id, applicant_id)`. Saving a draft and retrying submission updates or returns that record; a second submitted application is not created. Statuses are `draft`, `submitted`, `reviewing`, `shortlisted`, `rejected`, `withdrawn`, and `accepted`. Every creation and transition creates history, and cloud mutations append the existing audit stream.

Submission re-evaluates publication, type, deadline, eligibility, and required questions on the server. The profile snapshot is built from the verified account in local mode and from `profiles` inside the Supabase function in cloud mode; the RPC ignores the caller's snapshot argument. Learners can only read or mutate their own applications. Drafts never appear in employer results. Withdrawal is limited to the published policy, an open deadline, and submitted/reviewing/shortlisted states.

Employer access is derived from `organization_memberships` for the opportunity's organization. Accepted roles are owner, recruiter, and reviewer. Review RPCs repeat this check and derive history actors from `auth.uid()`. Notes have no learner RLS policy or table grant and are included only by authorized employer RPC responses. CSV is server-generated after the same membership check, capped at 5,000 rows, excludes notes/answers/resume content, quotes fields, and neutralizes spreadsheet formulas.

Local development mirrors these checks. The seeded professional identity is a member of the representative `ABCD` organization; the student identity is not. Local application/save state lives in `.local-data/marketplace.json` with serialized updates, restrictive file mode, and atomic rename. This is a development fallback, not a multi-process production store.

## Supabase setup

Apply migrations in order:

1. `supabase/migrations/202610020001_identity.sql`
2. `supabase/migrations/202610020002_marketplace_applications.sql`
3. Run `npm run seed:opportunities` with the project URL and service-role key in the process environment.
4. Provision organization memberships through a trusted administrative process. No public route grants employer roles.

The second migration creates organizations, memberships, opportunities, skills, questions, saves, applications, answers, history, and private notes with indexes and RLS. Public grants cover published opportunity projections only. Application writes and employer reads use constrained RPCs. Remote application and email behavior still requires verification against the configured Supabase project.

## Resume handling and limits

The application snapshot stores the private resume reference/name, never the inline resume body. The existing Batch 0–1 profile still uses a private inline PDF data field rather than object storage, so this slice does not issue storage signed URLs. Employers see only the submitted resume reference. Migrating resume bodies to a private bucket with expiring signed URLs is the next security/storage refinement.

Local mode has a fixed two-account membership fixture and process-local locking. It is for development and tests only. Organization management and verification UI, recruiter invitations, custom stage administration, ATS integration, interview scheduling, and external application redirects are intentionally outside this batch.
