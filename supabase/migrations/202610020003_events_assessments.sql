begin;
-- This migration establishes private storage tables and closed RLS defaults.
-- Authenticated mutation RPCs must be added and tested before enabling cloud workflows.
alter table public.organization_memberships drop constraint if exists organization_memberships_role_check;
alter table public.organization_memberships add constraint organization_memberships_role_check check(role in ('owner','recruiter','reviewer','billing_admin','hiring_manager','event_manager','evaluator','content_editor','analyst','viewer'));
create table public.organization_details (
 organization_id uuid primary key references public.organizations(id) on delete cascade,
 legal_name text not null, organization_type text not null check(organization_type in ('employer','organizer','college','NGO','partner')),
 country text not null, jurisdiction text not null, registration_identifier text, registered_address text,
 website text, description text, updated_at timestamptz not null default now()
);
create table public.verification_cases (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
 state text not null default 'draft' check(state in ('draft','submitted','in_review','approved','rejected','needs_changes')),
 submitted_at timestamptz, reviewed_at timestamptz, reviewer_id uuid references auth.users(id), reason text,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index verification_queue_idx on public.verification_cases(state,submitted_at);
create table public.verification_evidence (
 id uuid primary key default gen_random_uuid(), case_id uuid not null references public.verification_cases(id) on delete cascade,
 category text not null, storage_path text not null, filename text not null, mime_type text not null,
 byte_size integer not null check(byte_size between 1 and 10000000), uploader_id uuid not null references auth.users(id),
 review_status text not null default 'pending', created_at timestamptz not null default now()
);
create table public.verification_reviews (
 id uuid primary key default gen_random_uuid(), case_id uuid not null references public.verification_cases(id),
 reviewer_id uuid not null references auth.users(id), previous_state text not null, new_state text not null,
 reason text, created_at timestamptz not null default now()
);
create table public.competitions (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id), slug text not null unique,
 title text not null, description text not null default '', format text not null check(format in ('online','in-person','hybrid')),
 location text, registration_opens_at timestamptz not null, registration_closes_at timestamptz not null,
 starts_at timestamptz not null, ends_at timestamptz not null, team_deadline timestamptz not null,
 submission_deadline timestamptz not null, capacity integer not null check(capacity>0),
 min_team_size integer not null check(min_team_size>0), max_team_size integer not null check(max_team_size>=min_team_size),
 eligibility jsonb not null default '{}', prizes jsonb not null default '[]', faqs jsonb not null default '[]', resources jsonb not null default '[]',
 state text not null default 'draft' check(state in ('draft','published','results_published')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check(registration_opens_at<registration_closes_at and starts_at<ends_at and team_deadline<=submission_deadline and submission_deadline<=ends_at)
);
create index competitions_public_idx on public.competitions(state,registration_closes_at);
create index competitions_org_idx on public.competitions(organization_id,created_at desc);
create table public.competition_rounds (
 id uuid primary key default gen_random_uuid(), competition_id uuid not null references public.competitions(id) on delete cascade,
 position integer not null, name text not null, instructions text not null default '', round_type text not null check(round_type in ('registration','submission','assessment','shortlist','judging')),
 opens_at timestamptz not null, closes_at timestamptz not null, unique(competition_id,position), check(opens_at<closes_at)
);
create table public.problem_statements (id uuid primary key default gen_random_uuid(),competition_id uuid not null references public.competitions(id) on delete cascade,title text not null,description text not null default '',position integer not null,unique(competition_id,position));
create table public.rubric_criteria (id uuid primary key default gen_random_uuid(),competition_id uuid not null references public.competitions(id) on delete cascade,name text not null,max_score numeric(8,2) not null check(max_score>0),position integer not null,unique(competition_id,position));
create table public.competition_registrations (
 id uuid primary key default gen_random_uuid(),competition_id uuid not null references public.competitions(id),user_id uuid not null references auth.users(id),
 attendance text check(attendance in ('online','in-person')),reference text not null unique,created_at timestamptz not null default now(),unique(competition_id,user_id)
);
create index competition_registrations_event_idx on public.competition_registrations(competition_id,created_at);
create table public.competition_teams (id uuid primary key default gen_random_uuid(),competition_id uuid not null references public.competitions(id),name text not null,creator_id uuid not null references auth.users(id),created_at timestamptz not null default now());
create table public.competition_team_members (team_id uuid not null references public.competition_teams(id) on delete cascade,user_id uuid not null references auth.users(id),joined_at timestamptz not null default now(),primary key(team_id,user_id));
create table public.competition_team_invites (id uuid primary key default gen_random_uuid(),team_id uuid not null references public.competition_teams(id) on delete cascade,email text not null,token_hash text not null unique,created_at timestamptz not null default now(),accepted_at timestamptz);
create table public.project_submissions (id uuid primary key default gen_random_uuid(),competition_id uuid not null references public.competitions(id),team_id uuid not null unique references public.competition_teams(id),problem_id uuid not null references public.problem_statements(id),name text not null,description text not null,repository_url text,demo_url text,private_asset_path text,reference text not null unique,submitted_at timestamptz not null default now());
create table public.judge_assignments (id uuid primary key default gen_random_uuid(),submission_id uuid not null references public.project_submissions(id),judge_id uuid not null references auth.users(id),created_at timestamptz not null default now(),unique(submission_id,judge_id));
create table public.judge_scores (id uuid primary key default gen_random_uuid(),submission_id uuid not null references public.project_submissions(id),judge_id uuid not null references auth.users(id),criterion_id uuid not null references public.rubric_criteria(id),score numeric(8,2) not null,feedback text,state text not null check(state in ('draft','final')),created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(submission_id,judge_id,criterion_id));
create table public.assessments (id uuid primary key default gen_random_uuid(),competition_id uuid not null references public.competitions(id),title text not null,instructions text not null,disclosure text not null,duration_seconds integer not null check(duration_seconds between 30 and 14400),max_attempts integer not null check(max_attempts between 1 and 10),opens_at timestamptz not null,closes_at timestamptz not null,published boolean not null default false,created_at timestamptz not null default now(),check(opens_at<closes_at));
create table public.assessment_questions (id uuid primary key default gen_random_uuid(),assessment_id uuid not null references public.assessments(id) on delete cascade,prompt text not null,question_type text not null check(question_type in ('single','multi')),points integer not null check(points>0),position integer not null);
create table public.assessment_options (id uuid primary key default gen_random_uuid(),question_id uuid not null references public.assessment_questions(id) on delete cascade,label text not null,is_correct boolean not null default false,position integer not null);
create table public.assessment_attempts (id uuid primary key default gen_random_uuid(),assessment_id uuid not null references public.assessments(id),user_id uuid not null references auth.users(id),attempt_number integer not null,started_at timestamptz not null default now(),consented_at timestamptz not null,expires_at timestamptz not null,state text not null check(state in ('active','submitted','expired')),question_order jsonb not null,option_orders jsonb not null,score numeric(10,2),reference text unique,submitted_at timestamptz,updated_at timestamptz not null default now(),unique(assessment_id,user_id,attempt_number));
create unique index one_active_assessment_attempt on public.assessment_attempts(assessment_id,user_id) where state='active';
create table public.attempt_answers (attempt_id uuid not null references public.assessment_attempts(id) on delete cascade,question_id uuid not null references public.assessment_questions(id),option_ids jsonb not null default '[]',updated_at timestamptz not null default now(),primary key(attempt_id,question_id));
create table public.integrity_events (id uuid primary key default gen_random_uuid(),attempt_id uuid not null references public.assessment_attempts(id),event_type text not null check(event_type in ('started','blur','focus','connection_change')),created_at timestamptz not null default now());
create table public.event_audit (id uuid primary key default gen_random_uuid(),actor_id uuid not null references auth.users(id),action text not null,subject_id uuid not null,previous_state text,new_state text,reason text,created_at timestamptz not null default now());
do $$ declare table_name text; begin foreach table_name in array array['organization_details','verification_cases','verification_evidence','verification_reviews','competitions','competition_rounds','problem_statements','rubric_criteria','competition_registrations','competition_teams','competition_team_members','competition_team_invites','project_submissions','judge_assignments','judge_scores','assessments','assessment_questions','assessment_options','assessment_attempts','attempt_answers','integrity_events','event_audit'] loop execute format('alter table public.%I enable row level security',table_name); execute format('revoke all on public.%I from anon,authenticated',table_name); end loop; end $$;
commit;
