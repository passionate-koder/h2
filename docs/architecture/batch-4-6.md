# Buildora Batches 4–6: local workflow and cloud dependency gate

## Prerequisites found

Batch 0–1 provided authenticated identity, account profiles, audit events, local signed sessions, and Supabase identity migration. Batch 2–3 provided opportunities, applications, local JSON repository patterns, and a marketplace migration with organizations and basic owner/recruiter/reviewer membership. There was no verification case, competition registration/team/judging, or assessment model.

## Current adapter

`src/lib/events/store.ts` uses `.local-data/events.json` with a process-wide mutation queue, atomic file replacement, and file mode `0600`. It works without Supabase credentials. This process-local queue is not safe for multiple server processes or machines. When Supabase authentication is configured, these new service functions return 503 rather than creating an unauthenticated parallel store. Existing content pages and marketplace features continue to use their established adapters.

Migration `202610020003_events_assessments.sql` adds private tables and expands the membership role check. The new tables have RLS enabled and no grants to anonymous or authenticated clients. It does **not** add the authenticated RPCs, policies, private Supabase Storage bucket, or remote repository adapter required to activate cloud workflows. Apply it after the first two migrations; do not enable the new cloud features until the RPC and policy work is complete and tested in a real project. The existing `organizations` public read policy exposes its existing public columns only; new legal and address fields live in private `organization_details`.

## Roles and transitions

Organization owners invite and manage members. An invitation is tied to an exact email, organization, and role; accepting twice returns the same membership. A last owner cannot be demoted or removed. Owners and event managers may submit verification evidence. Reviewer access comes from `BUILDORA_REVIEWER_EMAILS` in local mode; the configured email must match a signed in seed account and cannot belong to the organization under review. Reviewer decisions record actor, previous and new state, reason, and server timestamp. Rejection and request changes require a reason. Updating an approved organization's legal identity, address, jurisdiction, or website revokes verification and hides its published competitions until a new review succeeds. Evidence is accepted only as PDF, PNG, or JPEG with checked file signatures, safe filenames, and a 10 MB limit. Files are written under `.local-data/private/<organization-id>/` and no public download route exists. Reviewers see metadata, not document bytes. There is no signed URL path in local mode.

Verified organizations with owner or event manager membership may create and publish competitions. Drafts are absent from public reads. Event dates are UTC. Registration is serialized with the capacity check, unique per user/event, and retryable. Eligibility supports optional local account role restrictions through `eligibleRoles`; the free text `eligibility` field is descriptive only. Team changes require registration, an invitation tied to email, and the formation deadline. One final submission is stored per team and repeated submission returns its original receipt. Judges see only assignments and cannot score their own team. Each criterion score is unique per judge/submission; final scores are immutable. Results require an assigned judge and a final score for every criterion on every submission. Ranking sums finalized scores and breaks ties by immutable receipt.

Assessments support single and multi select questions. Only registered users can start a published assessment in its window after acknowledging the disclosure. Start reuses an active attempt. The server stores consent, start/expiry timestamps, randomized question and option order, answers, and one active attempt per user/assessment. Browser responses omit correct option IDs as an answer key, though option IDs are necessarily visible to submit answers. Autosave validates assigned questions/options. Expired or submitted attempts reject writes. Final submission calculates exact set matches and produces a stable receipt. The browser timer is display only. Disclosed focus and connection events are private review evidence available through the authorized review endpoint; no automatic disqualification is performed.

## Routes and setup

- `/organizer` creates organizations, uploads verification evidence, and creates/publishes simple competition drafts. `/organizer/competitions/[id]` manages submissions, judging, export, and a basic assessment.
- `/admin/verification` is the reviewer queue. Set `BUILDORA_REVIEWER_EMAILS` to one or more comma separated seed account emails in the local environment.
- `/judge` shows only assignments for the currently authorized evaluator and records criterion scores.
- `/hackathons/[slug]` renders native published competitions and falls back to existing content pages for legacy slugs.
- `/assessments/[id]` runs a published assessment.
- `/api/organizations`, `/api/competitions`, and `/api/assessments` expose validated server actions. All mutations require a signed in session and same origin request. The API returns an invitation token to the inviter; manual delivery to the intended email is required in this local prototype.

Set the existing `BUILDORA_SESSION_SECRET` and local seed account settings as described in the repository README. No new secret is required. Data appears on first use. The test suite creates isolated temporary stores. To apply the SQL migration to a Supabase project, run the repository's normal migration process in filename order; no remote project was available in this task.

## Gaps before production use

Cloud RPCs and RLS integration tests, private Supabase Storage with short lived signed URLs, project file uploads, durable multi-process registration and attempt transactions, email invitation delivery, richer structured eligibility, a full identity editing UI, manual score correction, manual disqualification, and browser end-to-end coverage remain to be built. Project submissions accept HTTP(S) repository and demo URLs; no arbitrary browser supplied file path is accepted. The local API supports more configuration than the initial workspace UI. No automated registry/KYC or proctoring is claimed.
