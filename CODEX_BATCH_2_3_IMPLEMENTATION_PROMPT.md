# Codex Agent Prompt — Buildora Batches 2–3

## Mission

You are implementing **Buildora Batches 2–3** in the existing repository. Work as a senior full-stack engineer: inspect the current code and Batch 0–1 work first, preserve existing behavior, implement complete vertical slices, enforce authorization server-side, run validation, and report what is implemented versus blocked.

The goal is to build:

1. A searchable, filterable opportunity marketplace backed by the repository/data layer.
2. Native job and internship applications with drafts, custom questions, status history, and an employer review pipeline.

Do not implement unrelated roadmap features or perform a broad visual redesign.

## Repository context

- Repository: `/home/ubuntu/h2`
- Stack: Next.js App Router, TypeScript, React, Tailwind CSS
- Existing development command: `npm run dev -- --port 3100`
- Existing validation commands may include:
  - `npm run typecheck`
  - `npm run lint`
  - `npm run test`
  - `npm run build`
  - `npm run test:smoke`
  - `node scripts/verify.mjs`
- Existing routes include public content pages, `/auth`, `/onboarding`, `/profile`, and `/my-events`.
- Existing repository work may include Supabase integration, migrations, RLS, local JSON fallback, authentication, profiles, roles, and audit events from Batches 0–1.
- Existing content includes JSON-driven hackathon and program data under `src/content/`.
- The application must remain runnable without remote Supabase credentials by using the established local development fallback where available.

## Required first step: inspect and establish the baseline

Before editing, inspect:

- `package.json`
- `src/lib/` repository and service code
- Batch 0–1 architecture notes and migrations
- authentication/session helpers
- role and organization authorization helpers
- existing content loaders and route conventions
- existing public layouts and reusable UI components
- existing test setup
- `git status`

Do not assume that Batch 0–1 was implemented exactly as planned. Adapt to the actual repository. Do not remove unrelated pre-existing changes.

## Batch 2 — Opportunity marketplace

### Product scope

Create a shared opportunity model supporting these types:

- `job`
- `internship`
- `hackathon`
- `ngo_challenge`
- `college_program`

The marketplace must support public discovery and detail pages. Public visitors may browse published opportunities. Authenticated learners may save opportunities. Eligibility filtering must be based on published opportunity rules, not hidden assumptions about a learner segment.

### Recommended data model

Use UUIDs, explicit foreign keys, UTC timestamps, and indexes appropriate for search and filtering. Adapt naming to existing migrations and conventions.

```text
organizations
opportunities
opportunity_skills
eligibility_rules
saved_opportunities
```

An opportunity should support, as appropriate:

- title and slug
- type
- summary and full description
- organization reference
- publishing status
- category/domain
- skills
- country, city, and remote/hybrid/onsite mode
- compensation with ISO currency code and minor units where relevant
- duration
- eligibility rules
- application or registration deadline
- start/end dates
- capacity where relevant
- benefits
- FAQs
- schedule
- published timestamp
- created/updated timestamps

Use a stable status model such as `draft`, `in_review`, `published`, `closed`, and `archived`, but align it with any existing organization/verification model.

### Data import

Create a repeatable seed/import mechanism for the existing JSON opportunity content. Do not manually copy a small subset and call the migration complete.

The preferred flow is:

```text
Existing JSON content
        ↓
Repeatable import/seed script
        ↓
Opportunity repository
        ↓
Marketplace routes and UI
```

The import must be idempotent: rerunning it must not create duplicate opportunities. Preserve source slugs where possible and document any mapping decisions.

If Supabase is configured, the importer should target the Supabase adapter. If it is not configured, the local adapter should still provide representative marketplace data for development and tests.

### Required routes and UI

Implement or integrate these routes using the repository and service layers:

- `GET /opportunities`
- `GET /opportunities/[slug]`
- learner save/unsave action or route
- optional API/server actions for search and saved opportunities, following existing conventions

The directory should include:

- keyword search
- pagination
- filters for opportunity type, category/domain, skills, location, work mode, compensation, duration, eligibility, and date/deadline state
- clear result count or result state
- loading state
- empty state
- error state
- reset filters action
- responsive mobile layout

The detail page should include:

- title and organization
- organization trust/verification state when available
- overview and requirements
- skills
- location/work mode
- compensation or benefits when applicable
- duration and dates
- schedule or rounds where applicable
- eligibility
- FAQs
- deadline and current status
- clear primary action
- save control for authenticated learners
- login prompt or safe redirect for unauthenticated save/application actions

Reuse the existing Buildora visual language. Do not replace the entire site shell or introduce a new design system unless the current implementation lacks the necessary primitive.

### Search implementation guidance

Start with reliable server-side filtering. Do not add an external search engine for this batch.

Use:

- normalized query parsing
- allowlisted filter fields
- bounded page size
- stable ordering
- indexed columns for frequent filters
- URL query parameters so results are linkable and refresh-safe

Do not interpolate raw user input into SQL. Do not fetch the entire database into the browser to filter it client-side.

### SEO and public behavior

For public opportunity pages:

- generate stable metadata/title/description
- use canonical URLs where the project supports them
- prevent draft, in-review, closed, and archived records from appearing publicly unless explicitly intended
- return a proper not-found response for unknown or non-public slugs

## Batch 3 — Native job and internship applications

### Product scope

Add native applications for `job` and `internship` opportunities. Applications must use the learner's Buildora profile and resume data, support employer-defined questions, permit drafts, and preserve a status history.

Do not implement ATS integrations, external application redirects, recruiter talent search, interview scheduling, or payments in this batch.

### Recommended data model

Adapt to existing schema and naming conventions:

```text
application_questions
applications
application_answers
application_stages
application_status_history
employer_notes
```

An application should support:

- applicant/user reference
- opportunity reference
- current status
- draft/submitted state
- profile/resume snapshot or version reference
- submitted timestamp
- withdrawn timestamp where permitted
- created/updated timestamps
- idempotency protection

Application questions should support:

- stable question ID
- opportunity reference
- label/prompt
- question type
- required flag
- allowed options where relevant
- display order
- active state

Status history should capture:

- application reference
- previous status
- new status
- actor
- reason or note where appropriate
- timestamp

Employer notes must be private to authorized organization members and must never be returned to learners.

### Learner application experience

Implement a clear application journey:

1. Learner opens a job/internship detail page.
2. Learner sees eligibility, deadline, and required questions.
3. Learner starts an application.
4. Profile and resume information are prefilled where available.
5. Learner can save a draft.
6. Learner can resume a draft.
7. Learner submits after all required fields pass validation.
8. Learner receives a confirmation and application receipt/reference.
9. Learner can view application status and history.
10. Learner can withdraw only when the opportunity/application policy permits it.

Use server-side validation for every transition. Do not trust a client-supplied applicant ID, opportunity owner ID, eligibility result, deadline, or status.

Add appropriate routes/pages or integrate with existing routes, for example:

- `/opportunities/[slug]/apply`
- `/applications`
- `/applications/[id]`

Follow the existing route style if different.

### Employer application review experience

Implement a minimal organization workspace for authorized members of the publishing organization:

- list applications for an authorized job/internship
- filter by current status
- view applicant profile/application answers
- view submitted resume reference according to permissions
- move an application through configurable stages
- add and view private employer notes
- assign an owner if the existing role model supports it
- export a safe CSV for authorized users

Start with a small default stage set, for example:

```text
submitted
reviewing
shortlisted
rejected
withdrawn
accepted
```

Keep the stage model extensible for later interview and assessment workflows. Every status change must create a status-history record and audit event where the Batch 0–1 audit layer exists.

### Eligibility and deadline behavior

Implement a shared server-side eligibility/deadline service that can be reused by future registrations and competitions.

Required behavior:

- published opportunity rules are evaluated consistently
- closed or expired opportunities cannot receive new submissions unless an authorized override exists
- ineligible learners receive a safe explanation without exposing private rules or other users' data
- all times are evaluated in UTC on the server
- the UI displays a user-friendly timezone representation
- duplicate submitted applications are rejected or return the existing application safely
- retries must not create duplicate applications

Do not silently bypass eligibility to make the UI demo work.

### Idempotency

Application creation and submission must be safe to retry. Use one of these approaches, consistent with the existing architecture:

- a unique database constraint on `(opportunity_id, applicant_id)` for one active application
- an explicit idempotency key stored and checked server-side
- an equivalent transaction-safe design

If drafts and withdrawn applications require a different uniqueness model, document it and add tests for the chosen behavior.

## Authorization and security requirements

These are mandatory:

- A learner can read and modify only their own drafts and applications.
- A learner can never read employer notes.
- An employer can read applications only for opportunities belonging to an organization where they have an authorized role.
- Organization access must be derived from the authenticated server session and organization membership.
- Browser-supplied organization IDs, applicant IDs, role IDs, and status-history actor IDs must not grant access.
- Draft applications must not appear in public search or employer lists unless the authorized employer view explicitly permits it.
- Resume and uploaded files must use private storage and signed URLs where applicable.
- CSV exports must be server-generated, authorized, bounded, and free of secrets or unrelated records.
- Validate and normalize all query parameters and request bodies.
- Do not expose Supabase service-role credentials in browser code.
- Do not log passwords, tokens, private notes, full resumes, or sensitive personal data.

If Supabase is available, add or update RLS policies and test them. If only local mode is available, implement equivalent checks in the local adapter/service layer and make the limitation explicit.

## Testing requirements

Add tests for the affected domain logic and workflows.

### Unit tests

- opportunity query parsing and filter validation
- pagination bounds and stable ordering
- eligibility evaluation
- deadline evaluation and timezone handling
- opportunity visibility/status rules
- save/unsave behavior
- application question validation
- application state transitions
- duplicate application/idempotency behavior
- withdrawal rules
- organization/member authorization
- private employer-note access
- CSV export filtering

### Integration/RLS tests

Where the existing test setup permits, verify that:

- unauthenticated users can read only published public opportunities
- a learner cannot read another learner's applications
- a learner cannot change another learner's application
- a learner cannot read employer notes
- an employer cannot read applications for another organization
- an employer cannot change statuses without the required organization role
- draft applications are not exposed publicly
- application status changes produce history records

### End-to-end tests

Cover at least:

1. Public user searches and filters opportunities.
2. Public user opens a published opportunity detail page.
3. Authenticated learner saves and unsaves an opportunity.
4. Learner starts, saves, resumes, and submits an internship/job application.
5. Learner sees the submitted application and status history.
6. Authorized employer views the application and changes its status.
7. Unauthorized user is blocked from the employer view.
8. Duplicate submit/retry does not create a second active application.

Run all applicable project checks:

```bash
npm run typecheck
npm run lint
npm run test
npm run build
npm run test:smoke
node scripts/verify.mjs
```

Do not hide failures. If an existing script is broken for unrelated reasons, report the exact failure and still run the focused tests for this work.

## Definition of done

Batches 2–3 are complete only when:

- Public users can browse published opportunities.
- Search and filters are server-side, URL-addressable, bounded, and refresh-safe.
- Opportunity detail pages show the required information and metadata.
- Existing JSON opportunity content can be imported or served through the repository layer without duplicates.
- Learners can save and unsave opportunities.
- Learners can create, save, resume, submit, view, and where permitted withdraw job/internship applications.
- Required custom application questions are validated server-side.
- Duplicate application submission is safely prevented or deduplicated.
- Authorized employers can review applications and update status.
- Every status change is recorded in history and audit events where available.
- Employer notes are private.
- Drafts, private applications, and private files are not exposed publicly.
- RLS and/or equivalent local authorization checks are implemented and tested.
- Local development remains functional without Supabase credentials.
- Existing public routes and Batch 0–1 behavior remain functional.
- Typecheck, lint, focused tests, build, and relevant smoke checks pass.
- No unrelated roadmap features are introduced.

## Change-control rules

- Make focused, reviewable changes.
- Do not delete existing content or routes without a compatible replacement.
- Do not rewrite the whole application to add these features.
- Reuse the existing repository interfaces and auth boundary from Batch 0–1.
- Do not add an external search engine, ATS, payment system, or messaging platform.
- Do not use fake production data paths or fake authorization checks.
- Do not commit secrets or real environment files.
- Do not discard unrelated working-tree changes.
- Document important schema or authorization decisions in `docs/architecture/batch-2-3.md` or the repository's established architecture-doc location.

## Final response format

At completion, report:

1. **Implemented** — files, routes, schema, and workflows added.
2. **Architecture decisions** — repository adapters, search strategy, status model, idempotency, and authorization.
3. **Data migration** — importer/seed command, source mappings, and whether it was run.
4. **Validation** — every command run and its result.
5. **Environment/setup** — required variables, migrations, and manual steps.
6. **Known limitations** — incomplete integrations or blocked Supabase operations.
7. **Next recommended slice** — the smallest logical follow-up, likely organization verification or competition core.

Do not claim production readiness unless the definition of done and security checks are actually satisfied.
