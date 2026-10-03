-- Identity is auth.users; private legacy UI fields remain JSON while typed child tables
-- provide extension points. All privileged functions have a fixed search_path.
begin;
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  legacy_state jsonb not null default '{"registrations":[],"hostInquiries":[]}'::jsonb,
  active_role_assignment_id uuid,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.role_assignments (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('learner','organizer','mentor','admin')),
  workspace_id uuid, created_at timestamptz not null default now(),
  unique nulls not distinct (user_id,role,workspace_id)
);
alter table public.profiles add constraint profiles_active_role_fk foreign key (active_role_assignment_id) references public.role_assignments(id) on delete set null;
create table public.profile_skills (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (length(name) between 1 and 100), created_at timestamptz not null default now(), unique(user_id,name)
);
create table public.educations (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  institution text not null, qualification text not null, start_date date, end_date date,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.experiences (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  organization text not null, title text not null, start_date date, end_date date,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.projects (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null, description text not null default '', url text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.profile_visibility_settings (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  visibility text not null default 'private' check (visibility in ('private','public')), updated_at timestamptz not null default now()
);
create table public.notification_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  transactional boolean not null default true, promotional boolean not null default false, updated_at timestamptz not null default now()
);
create table public.audit_events (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  action text not null, created_at timestamptz not null default now()
);
create index role_assignments_user_idx on public.role_assignments(user_id);
create index profile_skills_user_idx on public.profile_skills(user_id);
create index educations_user_idx on public.educations(user_id);
create index experiences_user_idx on public.experiences(user_id);
create index projects_user_idx on public.projects(user_id);
create index audit_events_user_time_idx on public.audit_events(user_id,created_at desc);
-- A separate safe projection prevents public visibility exposing email/phone/resume/preferences.
create table public.public_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  full_name text not null, city text not null default '', skills text[] not null default '{}', updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
alter table public.role_assignments enable row level security;
alter table public.profile_skills enable row level security;
alter table public.educations enable row level security;
alter table public.experiences enable row level security;
alter table public.projects enable row level security;
alter table public.profile_visibility_settings enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.audit_events enable row level security;
alter table public.public_profiles enable row level security;
create policy profiles_owner_read on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy roles_owner_read on public.role_assignments for select to authenticated using ((select auth.uid()) = user_id);
create policy skills_owner_read on public.profile_skills for select to authenticated using ((select auth.uid()) = user_id);
create policy visibility_owner_read on public.profile_visibility_settings for select to authenticated using ((select auth.uid()) = user_id);
create policy preferences_owner_read on public.notification_preferences for select to authenticated using ((select auth.uid()) = user_id);
create policy audit_owner_read on public.audit_events for select to authenticated using ((select auth.uid()) = user_id);
create policy education_owner on public.educations for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy experience_owner on public.experiences for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy projects_owner on public.projects for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy public_profiles_read on public.public_profiles for select to anon,authenticated using (true);
-- Remove inherited broad grants. Writes for aggregate/private/role/audit tables are RPC-only.
revoke all on public.profiles,public.role_assignments,public.profile_skills,public.profile_visibility_settings,public.notification_preferences,public.audit_events,public.public_profiles from anon,authenticated;
grant select on public.profiles,public.role_assignments,public.profile_skills,public.profile_visibility_settings,public.notification_preferences,public.audit_events to authenticated;
grant select on public.public_profiles to anon,authenticated;
revoke all on public.educations,public.experiences,public.projects from anon,authenticated;
grant select,insert,update,delete on public.educations,public.experiences,public.projects to authenticated;

create function public.initialize_profile() returns trigger language plpgsql security definer set search_path = '' as $$
declare assignment uuid;
begin
  insert into public.profiles(id,data) values (new.id,jsonb_build_object(
    'uid',new.id,'email',coalesce(new.email,''),'fullName',coalesce(new.raw_user_meta_data->>'full_name','Learner'),
    'role','student','profileType','student','gender','','phone','','city','','professionalCategory','other',
    'organization','','website','','pitch','','jobTitle','','college','','collegeCity','','degree','',
    'yearOfStudy','','graduationYear','','skills','[]'::jsonb,'links','{}'::jsonb,'details','{}'::jsonb,
    'transactional',true,'promotional',false,'resumeName','','visibility','private','learnerSegment','student',
    'createdAt',now(),'updatedAt',now()
  ));
  insert into public.role_assignments(user_id,role) values(new.id,'learner') returning id into assignment;
  update public.profiles set active_role_assignment_id=assignment where id=new.id;
  insert into public.profile_visibility_settings(user_id) values(new.id);
  insert into public.notification_preferences(user_id) values(new.id);
  insert into public.audit_events(user_id,action) values(new.id,'identity.created');
  return new;
end $$;
create trigger auth_user_created after insert on auth.users for each row execute function public.initialize_profile();

create function public.save_account(profile_data jsonb, legacy_data jsonb, expected_updated_at text) returns void language plpgsql security definer set search_path = '' as $$
declare owner uuid := auth.uid(); old_data jsonb; cleaned jsonb; skill text; field text;
begin
  if owner is null then raise exception 'Authentication required'; end if;
  select data into old_data from public.profiles where id=owner for update;
  if old_data is null then raise exception 'Profile missing'; end if;
  if expected_updated_at is distinct from old_data->>'updatedAt' then raise exception 'Concurrent profile change' using errcode='40001'; end if;
  if jsonb_typeof(profile_data) <> 'object' or jsonb_typeof(legacy_data) <> 'object' or octet_length(profile_data::text)>7500000 then raise exception 'Invalid profile'; end if;
  -- Immutable identity/role/timestamps never come from the request.
  cleaned := old_data;
  foreach field in array array['fullName','gender','phone','city','profileType','professionalCategory','organization','website','pitch','jobTitle','college','collegeCity','degree','yearOfStudy','graduationYear','resumeName','resumeData','skills','links','details','transactional','promotional','learnerSegment','educationLevel','experienceLevel','interests','desiredRole','desiredIndustry','careerGoals','availability','visibility'] loop
    if profile_data ? field then cleaned := jsonb_set(cleaned,array[field],profile_data->field); end if;
  end loop;
  if jsonb_typeof(cleaned->'fullName') <> 'string' or length(trim(cleaned->>'fullName')) not between 1 and 120 then raise exception 'Invalid name'; end if;
  if cleaned->>'profileType' not in ('student','working_professional') then raise exception 'Invalid profile type'; end if;
  if cleaned ? 'learnerSegment' and cleaned->>'learnerSegment' not in ('student','recent_graduate','career_switcher') then raise exception 'Invalid learner segment'; end if;
  if cleaned->>'visibility' not in ('private','public') then raise exception 'Invalid visibility'; end if;
  if jsonb_typeof(cleaned->'skills') <> 'array' or jsonb_array_length(cleaned->'skills')>100 then raise exception 'Invalid skills'; end if;
  if jsonb_typeof(cleaned->'transactional') <> 'boolean' or jsonb_typeof(cleaned->'promotional') <> 'boolean' then raise exception 'Invalid preferences'; end if;
  foreach field in array array['fullName','gender','phone','city','profileType','professionalCategory','organization','website','pitch','jobTitle','college','collegeCity','degree','yearOfStudy','graduationYear','resumeName','educationLevel','experienceLevel','desiredRole','desiredIndustry','careerGoals','availability','learnerSegment','visibility'] loop
    if cleaned ? field and (jsonb_typeof(cleaned->field) <> 'string' or length(cleaned->>field)>10000) then raise exception 'Invalid profile field'; end if;
  end loop;
  if cleaned ? 'resumeData' and (jsonb_typeof(cleaned->'resumeData')<>'string' or length(cleaned->>'resumeData')>7000000 or ((cleaned->>'resumeData')<>'' and (cleaned->>'resumeData') !~ '^data:application/pdf;base64,[A-Za-z0-9+/=]+$')) then raise exception 'Invalid resume'; end if;
  if jsonb_typeof(cleaned->'links') <> 'object' or jsonb_typeof(cleaned->'details') <> 'object' then raise exception 'Invalid profile details'; end if;
  if exists(select 1 from jsonb_each(cleaned->'links') v where jsonb_typeof(v.value)<>'string' or ((v.value #>> '{}') <> '' and (v.value #>> '{}') !~* '^https?://[^[:space:]]+$')) then raise exception 'Invalid link'; end if;
  if cleaned->>'website'<>'' and cleaned->>'website' !~* '^https?://[^[:space:]]+$' then raise exception 'Invalid website'; end if;
  if exists(select 1 from jsonb_array_elements(cleaned->'skills') v where jsonb_typeof(v)<>'string' or length(v #>> '{}') not between 1 and 100) then raise exception 'Invalid skill'; end if;
  if cleaned ? 'interests' then
    if jsonb_typeof(cleaned->'interests')<>'array' or jsonb_array_length(cleaned->'interests')>50 then raise exception 'Invalid interests'; end if;
    if exists(select 1 from jsonb_array_elements(cleaned->'interests') v where jsonb_typeof(v)<>'string' or length(v #>> '{}') not between 1 and 100) then raise exception 'Invalid interest'; end if;
  end if;
  cleaned := jsonb_set(cleaned,'{updatedAt}',to_jsonb(now()));
  update public.profiles set data=cleaned,legacy_state=legacy_data,updated_at=now() where id=owner;
  delete from public.profile_skills where user_id=owner;
  for skill in select jsonb_array_elements_text(cleaned->'skills') loop
    insert into public.profile_skills(user_id,name) values(owner,skill) on conflict(user_id,name) do nothing;
  end loop;
  update public.notification_preferences set transactional=(cleaned->>'transactional')::boolean,promotional=(cleaned->>'promotional')::boolean,updated_at=now() where user_id=owner;
  update public.profile_visibility_settings set visibility=cleaned->>'visibility',updated_at=now() where user_id=owner;
  if cleaned->>'visibility'='public' then
    insert into public.public_profiles(user_id,full_name,city,skills) values(owner,cleaned->>'fullName',coalesce(cleaned->>'city',''),array(select jsonb_array_elements_text(cleaned->'skills')))
    on conflict(user_id) do update set full_name=excluded.full_name,city=excluded.city,skills=excluded.skills,updated_at=now();
  else delete from public.public_profiles where user_id=owner; end if;
  insert into public.audit_events(user_id,action) values(owner,'account.updated');
end $$;
create function public.activate_role(assignment_id uuid) returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not exists(select 1 from public.role_assignments where id=assignment_id and user_id=auth.uid()) then raise exception 'Role unavailable'; end if;
  update public.profiles set active_role_assignment_id=assignment_id,updated_at=now() where id=auth.uid();
  insert into public.audit_events(user_id,action) values(auth.uid(),'workspace.changed');
end $$;
revoke all on function public.initialize_profile() from public,anon,authenticated;
revoke all on function public.save_account(jsonb,jsonb,text) from public,anon;
revoke all on function public.activate_role(uuid) from public,anon;
grant execute on function public.save_account(jsonb,jsonb,text),public.activate_role(uuid) to authenticated;
-- Existing Auth users receive private learner profiles as part of migration.
do $$
declare existing record; assignment uuid;
begin
  for existing in select u.* from auth.users u where not exists(select 1 from public.profiles p where p.id=u.id) loop
  insert into public.profiles(id,data) values (existing.id,jsonb_build_object(
    'uid',existing.id,'email',coalesce(existing.email,''),'fullName',coalesce(existing.raw_user_meta_data->>'full_name','Learner'),
    'role','student','profileType','student','gender','','phone','','city','','professionalCategory','other',
    'organization','','website','','pitch','','jobTitle','','college','','collegeCity','','degree','',
    'yearOfStudy','','graduationYear','','skills','[]'::jsonb,'links','{}'::jsonb,'details','{}'::jsonb,
    'transactional',true,'promotional',false,'resumeName','','visibility','private','learnerSegment','student',
    'createdAt',now(),'updatedAt',now()
  ));
  insert into public.role_assignments(user_id,role) values(existing.id,'learner') returning id into assignment;
  update public.profiles set active_role_assignment_id=assignment where id=existing.id;
  insert into public.profile_visibility_settings(user_id) values(existing.id);
  insert into public.notification_preferences(user_id) values(existing.id);
  insert into public.audit_events(user_id,action) values(existing.id,'identity.created');
  end loop;
end $$;
commit;
