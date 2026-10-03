# Codex Agent Prompt — Buildora Batches 4–6

## Mission

You are implementing **Buildora Batches 4–6** in the existing repository:

- **Batch 4:** organization onboarding, scoped roles, verification, and trust review
- **Batch 5:** competition and hackathon core
- **Batch 6:** limited timed assessment module

Work as a senior full-stack engineer. Inspect the actual repository first, preserve existing behavior, enforce all permissions server-side, implement complete vertical slices, run validation, and clearly report implemented, blocked, and deferred work.

These batches contain security-sensitive workflows. Do not optimize for the number of screens. Optimize for correct authorization, auditable state transitions, server-authoritative deadlines, idempotency, and a safe migration path from the current prototype.

## Important baseline finding

The current repository may not actually contain completed Batches 0–3. At the time this prompt was prepared, the codebase had:

- Next.js App Router, TypeScript, React, and Tailwind CSS
- Content-driven JSON pages
- Local cookie-based authentication
- Seed accounts for `student` and `professional`
- JSON persistence under `.local-data/`
- Existing profile, onboarding, registration, hosting, and authentication routes
- No `supabase/` migrations directory
- No established Supabase repository/service layer
- No confirmed organization, opportunity, application, competition, or assessment schema

Therefore, do not assume that Supabase, RLS, organization membership, opportunity repositories, or application workflows exist. Inspect the current state and adapt. If Batches 0–3 are missing, create only the smallest compatible foundation needed for these batches, or stop at a safe dependency gate and report the blocker. Do not fake prerequisite completion.

## Repository context

- Repository: `/home/ubuntu/h2`
- Existing local development command: `npm run dev -- --port 3100`
- Existing validation commands may include:
  - `npm run typecheck`
  - `npm run lint`
  - `npm run test`
  - `npm run build`
  - `npm run test:smoke`
  - `node scripts/verify.mjs`
- Existing routes include `/auth`, `/onboarding`, `/profile`, `/my-events`, and content-driven public routes.
- Existing local account/session logic is primarily in `src/lib/accounts.ts`.
- Existing account types are primarily in `src/lib/account-types.ts`.
- The app must remain runnable without remote Supabase credentials using the established local fallback, or an explicitly documented equivalent.

## Required first step: inspect and establish a dependency report

Before editing, inspect:

- `package.json`, `tsconfig.json`, `next.config.ts`
- `git status`
- `src/lib/` repository, account, auth, and utility code
- existing authentication/session helpers
- existing role/account types
- existing API routes and route conventions
- existing content loaders and public layouts
- existing migrations, if any
- existing Batch 0–3 architecture notes and tests
- existing organization, opportunity, application, or event data

At the beginning of your final report, state which prerequisites were present. Do not discard unrelated working-tree changes.

## Execution strategy and dependency gates

Implement in this order:

```text
4A. Organization and membership foundation
    ↓
4B. Verification case and admin review
    ↓
5A. Competition configuration and public event page
    ↓
5B. Registration, teams, submissions, judging, and results
    ↓
6. Limited timed assessments
```

Each section has a gate. Do not build later sections on insecure or nonexistent data abstractions.

If remote Supabase credentials are unavailable, implement and test the local adapter plus migrations and RLS definitions where possible. Report that remote RLS execution and integration validation remain pending. Do not claim that a remote migration or policy was applied unless it actually was.

# Batch 4 — Organization onboarding and trust review

## 4A. Organization and membership foundation

Support these organization types:

- employer
- organizer
- college
- NGO
- partner

Create or extend a repository/service boundary for:

```text
organizations
organization_members
organization_roles
```

An organization should support, as appropriate:

- legal name
- public display name
- organization type
- country and jurisdiction
- registration identifier where applicable
- registered address
- public website
- logo/brand assets
- description
- public verification status
- created/updated timestamps

A membership should support:

- organization reference
- user reference
- scoped role
- invitation status
- invited/accepted timestamps
- created/updated timestamps

Use a role model compatible with future employer and organizer workflows:

```text
owner
billing_admin
hiring_manager
event_manager
evaluator
content_editor
analyst
viewer
```

Do not grant organization access from a browser-supplied organization ID. Every server operation must derive membership and role from the authenticated session.

### Required organization behavior

- A user can create an organization only if the product rules permit it.
- An organization owner can invite members.
- Invitations must be bound to the intended organization and role.
- Membership acceptance must be safe to retry.
- Members can see only organizations they belong to.
- Role changes are authorized and auditable.
- Removing a member cannot accidentally remove ownership without an explicit safe rule.
- Public organization pages expose only approved public fields.
- Private evidence and member data are never public.

## 4B. Verification case and manual review

Create or extend:

```text
verification_cases
verification_evidence
verification_reviews
```

A verification case should capture:

- organization reference
- current state: `draft`, `submitted`, `in_review`, `approved`, `rejected`, `needs_changes`, or equivalent
- submitted evidence metadata
- reviewer reference
- decision reason
- submitted/reviewed timestamps
- re-verification state
- audit references

Evidence should capture metadata, not expose private file contents publicly:

- evidence type
- storage path/reference
- original filename if safe
- MIME type and size after validation
- uploader
- created timestamp
- review status

Required evidence categories should cover the plan's launch requirements as appropriate:

- legal organization identity
- country/jurisdiction and registration evidence
- registered address
- public website
- domain-email verification state
- authorized representative details
- NGO/nonprofit evidence where relevant

Do not claim automated registry/KYC verification. Manual review is sufficient for this scope.

### Admin review workflow

Implement a minimal admin review queue or admin service boundary that can:

1. List pending verification cases.
2. Open a case and inspect evidence metadata through authorized access.
3. Approve, reject, or request changes.
4. Require a reason for rejection or request-changes decisions.
5. Record reviewer, timestamp, previous state, new state, and reason.
6. Trigger re-verification when relevant organization identity or domain information changes.

Only approved organizations and authorized publishing roles may publish future opportunities or competitions. If opportunity publishing already exists, connect this rule without breaking local development.

### Batch 4 security requirements

- RLS or equivalent checks must isolate organization records.
- A member cannot read another organization's private evidence.
- A non-admin cannot approve a verification case.
- A reviewer cannot alter the actor or timestamp of a review.
- Uploaded evidence must be private and accessed through signed URLs where storage is available.
- File type, size, and filename must be validated.
- Never log identity documents, private evidence contents, secrets, or tokens.
- Verification decisions and role changes must create audit events where the audit layer exists.

### Batch 4 gate

Do not proceed to organizer publishing flows until:

- membership authorization works
- verification state transitions are validated server-side
- only verified organizations can publish
- review actions are auditable
- unauthorized users cannot access private evidence

# Batch 5 — Competition and hackathon core

## 5A. Competition configuration

Create or extend the competition model using UUIDs, explicit foreign keys, UTC timestamps, indexes, and transaction-safe constraints.

Recommended entities:

```text
competitions
competition_rounds
problem_statements
rubrics
rubric_criteria
```

A competition should support:

- title and slug
- organization reference
- format: online, in-person, or hybrid
- branding and public description
- venue/location where applicable
- registration open/close times
- event start/end times
- capacity
- individual/team participation
- minimum/maximum team size
- team formation deadline
- eligibility rules
- problem statements
- resources
- prizes
- FAQs
- rubric criteria
- publishing state
- created/updated timestamps

A round should support:

- ordered position
- name and instructions
- open/close window
- round type
- advancement rule
- participation mode where relevant
- attachment/resource references
- contact owner

Start with these round modes only where they can be implemented safely:

- registration
- project/file/URL submission
- timed assessment reference
- manual shortlist
- judging

Do not build live video, interview scheduling, coding execution, or browser proctoring in this batch.

### Organizer UI

Provide an authorized organizer workspace for:

- creating a draft competition
- editing configuration
- adding problem statements
- adding rubric criteria
- configuring capacity, team rules, eligibility, dates, and format
- previewing the public event page
- submitting/publishing only when the organization is verified and the user has the required role

Use existing UI primitives and route conventions. Keep the first organizer interface functional rather than visually expansive.

### Public event page

Provide a public competition detail route, compatible with existing `/hackathons/[slug]` patterns if present. It should display:

- organizer and verification state
- overview
- format and location
- dates and deadlines
- eligibility
- team rules
- problem statements
- prizes
- schedule/rounds
- rubric summary where public
- FAQs/resources
- registration CTA and current registration state

Draft and unpublished competitions must not be publicly visible.

## 5B. Registration, teams, submissions, judging, and results

Recommended entities:

```text
registrations
teams
team_members
project_submissions
judge_assignments
scores
rankings
```

### Registration

Support:

- learner registration
- attendance selection for hybrid events where applicable
- capacity enforcement
- duplicate-registration prevention
- eligibility validation
- registration close/deadline enforcement
- confirmation receipt
- participant status

Use a transaction or database constraint to prevent over-capacity and duplicate registration under concurrent requests. Do not rely only on a client-side count.

### Teams

Support:

- individual participation where configured
- team creation
- invite/join flow compatible with the existing auth model
- minimum and maximum team sizes
- team formation deadline
- member roles or contribution fields where useful
- leaving a team subject to event rules
- organizer visibility into team membership

All team changes must be server-authorized and auditable. Do not allow a user to add arbitrary members by submitting their user ID without an invitation/acceptance rule.

### Problem statements and submissions

Allow an eligible participant/team to select a problem statement and submit:

- project name
- description
- repository URL
- demo URL
- presentation asset reference
- optional media/file references
- team contribution details
- submitted timestamp

Required controls:

- submission deadline validation on the server
- server-authoritative timestamp
- one active submission per configured round/team unless revisions are explicitly allowed
- idempotent submit/retry behavior
- immutable submission receipt/reference
- safe signed file URLs
- no late submission unless an authorized override is recorded
- audit events for creation, revision, final submission, and override

### Judging and results

Support:

- judge assignment to competitions/rounds/submissions
- criterion-level scores
- judge feedback
- draft versus finalized score state
- prevention of unauthorized self-scoring or duplicate scoring
- organizer ranking review
- finalization lock or equivalent
- winner publication
- event-data export for authorized organizers

The score model must record the judge, criterion, score, feedback, and timestamps. Ranking logic must be deterministic and tested. Do not silently overwrite finalized scores; require an authorized correction path with an audit record.

### Batch 5 security and integrity requirements

- Only verified organizations with authorized event roles can create/publish competitions.
- Participants can access only their own registrations, teams, and submissions unless the event policy makes data public.
- Judges can access only assigned submissions.
- Judges cannot score their own team or otherwise conflicted submissions if conflict data is available.
- Organizers can access only competitions belonging to their organization.
- Server time controls deadlines.
- Registration and submission operations are idempotent.
- All sensitive status changes are auditable.
- Participant personal data and private organizer notes are not exposed in public pages.

### Batch 5 gate

Do not proceed to assessments until the competition core can safely demonstrate:

```text
verified organizer creates event
→ public event is published
→ eligible learner registers
→ capacity/duplicate rules work
→ learner forms or joins a team
→ team submits before deadline
→ assigned judge scores criteria
→ organizer finalizes and publishes results
```

# Batch 6 — Limited timed assessment module

Implement only single-select and multi-select assessments. Do not implement coding execution, live interviews, webcam/ID proctoring, browser lockdown, AI proctoring, or automated disqualification.

## Recommended entities

```text
assessments
question_pools
questions
assessment_attempts
attempt_answers
integrity_events
```

An assessment should support:

- title and instructions
- duration in seconds
- question pool
- single-select and multi-select questions
- maximum attempts
- random question ordering
- random option ordering
- open/close window where applicable
- pass/result threshold where applicable
- published state
- disclosure/consent text for integrity signals

An attempt should support:

- participant/user reference
- assessment reference
- attempt number
- server-authoritative start time
- server-authoritative expiry time
- active/submitted/expired/disqualified state
- autosaved answers
- final receipt/reference
- final score where applicable
- created/updated/submitted timestamps

## Assessment lifecycle

Implement this flow:

1. Eligible participant opens the assessment.
2. Participant sees instructions, duration, attempt policy, and integrity disclosure.
3. Server creates one active attempt.
4. Server determines start and expiry time.
5. Participant receives a randomized question/option presentation without exposing the answer key.
6. Participant autosaves answers.
7. Server rejects writes after expiry except for a narrowly defined finalization race rule.
8. Participant submits once.
9. Server calculates the result for supported question types.
10. Server creates an immutable final receipt.
11. Participant sees the permitted result view.

### Timer requirements

The browser timer is only a display aid. The server must be authoritative.

- Never calculate final validity only in the browser.
- Persist `started_at` and `expires_at` on the server.
- Enforce one active attempt per user/assessment.
- Make attempt creation and final submission idempotent.
- Define behavior for refresh, reconnect, duplicate submit, and expired attempts.
- Store timestamps in UTC.

### Question and answer security

- Never send correct answers to the browser.
- Validate single-select and multi-select answers on the server.
- Do not accept question IDs or option IDs that were not assigned to the attempt.
- Preserve the attempt's randomized order so refresh does not change the test unexpectedly.
- Do not expose other participants' answers or scores.
- Prevent answer mutation after final submission.

### Integrity events

Only record disclosed signals as review evidence, for example:

- attempt started
- tab focus/blur
- connection change
- device metadata at the minimum necessary level
- IP metadata only when legally and operationally justified

Requirements:

- show or link to the relevant disclosure/consent text
- do not make automatic guilt or disqualification decisions
- do not use webcam, biometric, or hidden behavioral monitoring
- provide authorized reviewers with an evidence timeline where implemented
- protect integrity events as private data

### Manual disqualification

If manual disqualification is implemented, require:

- authorized reviewer role
- reason
- actor
- timestamp
- audit event
- participant-visible status according to policy

No automated adverse decision may be based solely on focus, device, IP, or connection signals.

## Batch 6 gate

The assessment module is complete only when it can demonstrate:

```text
eligible participant starts one attempt
→ server-authoritative timer runs
→ answers autosave
→ refresh preserves the attempt
→ expired attempt cannot be edited
→ final submission is idempotent
→ result/receipt is generated
→ answer keys remain private
```

# Cross-cutting authorization and data rules

These requirements apply to all three batches:

- Derive user identity from the authenticated server session.
- Never trust browser-supplied user IDs, organization IDs, role IDs, reviewer IDs, judge IDs, actor IDs, or timestamps.
- Use RLS when Supabase is configured and equivalent service-layer checks in local mode.
- Keep privileged Supabase operations in server-only modules.
- Keep evidence, resumes, submissions, and private files in private storage.
- Use signed URLs with short expirations where file access is required.
- Validate MIME type, size, filename, and ownership before accepting uploads.
- Use UTC timestamps and server time for all deadlines.
- Use unique constraints or transactions for capacity and idempotency.
- Record audit events for role changes, verification decisions, publishing, overrides, submissions, score finalization, and manual disqualification.
- Do not log passwords, auth tokens, private evidence, private notes, full resumes, or answer keys.
- Make public pages expose only deliberately public fields.

# Testing requirements

## Unit tests

Add focused tests for:

- organization role authorization
- invitation acceptance idempotency
- verification state transitions
- publishing eligibility based on verification
- capacity enforcement
- duplicate registration prevention
- team-size rules
- team formation deadline
- submission deadline and override rules
- submission idempotency
- judge assignment authorization
- score aggregation and ranking determinism
- finalized score immutability
- assessment question/option randomization stability
- server-authoritative timer behavior
- active-attempt uniqueness
- autosave and expired-attempt rules
- answer validation without answer-key leakage
- integrity event disclosure rules

## Integration/RLS tests

Where the test environment permits, verify:

- a member cannot read another organization's private data
- a non-admin cannot approve verification
- an unverified organization cannot publish
- a participant cannot read another participant's private submission
- a judge cannot access unassigned submissions
- an organizer cannot manage another organization's event
- an assessment participant cannot read answer keys
- a participant cannot edit another participant's attempt
- finalized scores cannot be modified without an authorized correction path

## End-to-end tests

Cover at least:

1. Organization member submits verification evidence.
2. Admin reviews and approves the organization.
3. Authorized organizer creates and publishes a competition.
4. Public visitor opens the competition page.
5. Learner registers and forms/joins a team.
6. Team submits a project before the deadline.
7. Assigned judge scores the submission.
8. Organizer finalizes and publishes results.
9. Eligible participant starts and completes a timed assessment.
10. Refresh, retry, expiry, and unauthorized access cases behave safely.

Run all applicable checks:

```bash
npm run typecheck
npm run lint
npm run test
npm run build
npm run test:smoke
node scripts/verify.mjs
```

Do not hide failures. If a check is unavailable or blocked by missing Supabase credentials, report the exact reason and run all local/focused tests that remain possible.

# Explicit non-goals

Do not implement these in this task:

- payments, subscriptions, or billing
- coding execution or test runners
- plagiarism providers
- webcam/ID/AI proctoring
- browser lockdown
- live video or interview scheduling
- full mentor marketplace
- advanced analytics
- ATS integrations
- recruiter talent search
- automated registry/KYC verification
- ML recommendations
- mobile applications
- broad site redesign

# Definition of done

Batches 4–6 are complete only when the implemented scope has:

- organization membership and scoped roles
- manual verification review with auditable state transitions
- publication restricted to verified organizations and authorized roles
- competition creation, publishing, registration, teams, submissions, judging, and results at the implemented scope
- limited single/multi-select timed assessments with server-authoritative timers
- server-side deadline, capacity, eligibility, authorization, and idempotency enforcement
- private evidence, submissions, answer keys, notes, and integrity data
- RLS and/or equivalent local authorization checks
- migrations or a documented local persistence equivalent
- unit tests for critical domain rules
- integration/RLS tests where possible
- critical end-to-end coverage
- local development that still works without Supabase credentials
- existing public routes and prior functionality preserved
- no unrelated roadmap features introduced

If prerequisites are missing and cannot be safely established in this task, stop at the dependency gate instead of building an insecure parallel implementation. Report the exact missing prerequisite and the smallest next action required.

# Change-control rules

- Make focused, reviewable changes.
- Reuse existing repository, auth, UI, and audit abstractions when they exist.
- Do not rewrite the entire app.
- Do not delete existing content or routes without a compatible replacement.
- Do not add fake production responses.
- Do not weaken authorization to make a demo flow pass.
- Do not commit secrets or real environment files.
- Do not discard unrelated working-tree changes.
- Document schema, state-machine, and permission decisions in `docs/architecture/batch-4-6.md` or the repository's established architecture-document location.

# Final response format

At completion, report:

1. **Dependency assessment** — which Batches 0–3 components were present, missing, or replaced with a local equivalent.
2. **Implemented** — files, routes, schemas, state machines, and workflows added.
3. **Security model** — RLS/local checks, private storage, server-authoritative time, and audit behavior.
4. **Validation** — every command run and its result.
5. **Environment/setup** — required variables, migration commands, seed commands, and manual steps.
6. **Known limitations** — incomplete remote integrations or deferred work.
7. **Next recommended slice** — the smallest safe follow-up after Batch 6.

Do not claim production readiness unless the relevant security, authorization, idempotency, and validation requirements were actually satisfied.
