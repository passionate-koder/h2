begin;
create table public.organizations (
  id uuid primary key default gen_random_uuid(), slug text not null unique, name text not null, verified boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.organization_memberships (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade, role text not null check(role in ('owner','recruiter','reviewer')),
  created_at timestamptz not null default now(), unique(organization_id,user_id)
);
create table public.opportunities (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id), slug text not null unique,
  title text not null, type text not null check(type in ('job','internship','hackathon','ngo_challenge','college_program')),
  summary text not null default '', description text not null default '', status text not null default 'draft' check(status in ('draft','in_review','published','closed','archived')),
  category text not null default '', country text not null default '', city text not null default '', location text not null default '',
  work_mode text not null default 'onsite' check(work_mode in ('remote','hybrid','onsite')), compensation_min_minor bigint, compensation_max_minor bigint,
  currency char(3), duration text, eligibility jsonb not null default '{}', deadline timestamptz, start_at timestamptz, end_at timestamptz,
  capacity integer, benefits jsonb not null default '[]', faqs jsonb not null default '[]', schedule jsonb not null default '[]', allow_withdrawal boolean not null default true,
  source text, published_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.opportunity_skills (opportunity_id uuid not null references public.opportunities(id) on delete cascade, name text not null, primary key(opportunity_id,name));
create table public.application_questions (
  id text not null, opportunity_id uuid not null references public.opportunities(id) on delete cascade, label text not null,
  type text not null check(type in ('text','textarea','select','radio','url','number','boolean')), required boolean not null default false,
  options jsonb not null default '[]', display_order integer not null default 0, active boolean not null default true, primary key(opportunity_id,id)
);
create table public.saved_opportunities (
  user_id uuid not null references auth.users(id) on delete cascade, opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  created_at timestamptz not null default now(), primary key(user_id,opportunity_id)
);
create table public.applications (
  id uuid primary key default gen_random_uuid(), reference text not null unique, opportunity_id uuid not null references public.opportunities(id),
  applicant_id uuid not null references auth.users(id) on delete cascade, status text not null default 'draft' check(status in ('draft','submitted','reviewing','shortlisted','rejected','withdrawn','accepted')),
  profile_snapshot jsonb not null, submitted_at timestamptz, withdrawn_at timestamptz, owner_id uuid references auth.users(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(opportunity_id,applicant_id)
);
create table public.application_answers (
  application_id uuid not null references public.applications(id) on delete cascade, question_id text not null, answer text not null default '',
  primary key(application_id,question_id)
);
create table public.application_status_history (
  id uuid primary key default gen_random_uuid(), application_id uuid not null references public.applications(id) on delete cascade,
  previous_status text, new_status text not null, actor_id uuid not null references auth.users(id), reason text, created_at timestamptz not null default now()
);
create table public.employer_notes (
  id uuid primary key default gen_random_uuid(), application_id uuid not null references public.applications(id) on delete cascade,
  author_id uuid not null references auth.users(id), body text not null check(length(body) between 1 and 5000), created_at timestamptz not null default now()
);
create index opportunities_public_idx on public.opportunities(status,type,published_at desc);
create index opportunities_category_idx on public.opportunities(category);
create index opportunities_deadline_idx on public.opportunities(deadline);
create index opportunity_skills_name_idx on public.opportunity_skills(lower(name));
create index applications_applicant_idx on public.applications(applicant_id,updated_at desc);
create index applications_opportunity_status_idx on public.applications(opportunity_id,status,updated_at desc);
create index application_history_idx on public.application_status_history(application_id,created_at);
create index memberships_user_idx on public.organization_memberships(user_id,organization_id);

alter table public.organizations enable row level security; alter table public.organization_memberships enable row level security;
alter table public.opportunities enable row level security; alter table public.opportunity_skills enable row level security; alter table public.application_questions enable row level security;
alter table public.saved_opportunities enable row level security; alter table public.applications enable row level security; alter table public.application_answers enable row level security;
alter table public.application_status_history enable row level security; alter table public.employer_notes enable row level security;
create policy organizations_public_read on public.organizations for select to anon,authenticated using(true);
create policy memberships_own_read on public.organization_memberships for select to authenticated using(user_id=(select auth.uid()));
create policy opportunities_public_read on public.opportunities for select to anon,authenticated using(status='published');
create policy skills_public_read on public.opportunity_skills for select to anon,authenticated using(exists(select 1 from public.opportunities o where o.id=opportunity_id and o.status='published'));
create policy questions_public_read on public.application_questions for select to anon,authenticated using(active and exists(select 1 from public.opportunities o where o.id=opportunity_id and o.status='published'));
create policy saves_owner on public.saved_opportunities for all to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy applications_owner_read on public.applications for select to authenticated using(applicant_id=(select auth.uid()));
create policy answers_owner_read on public.application_answers for select to authenticated using(exists(select 1 from public.applications a where a.id=application_id and a.applicant_id=(select auth.uid())));
create policy history_owner_read on public.application_status_history for select to authenticated using(exists(select 1 from public.applications a where a.id=application_id and a.applicant_id=(select auth.uid())));
-- No learner policy exists for employer_notes. Employer access is exclusively through checked RPCs.
revoke all on public.organizations,public.organization_memberships,public.opportunities,public.opportunity_skills,public.application_questions,public.applications,public.application_answers,public.application_status_history,public.employer_notes from anon,authenticated;
grant select on public.organizations,public.opportunities,public.opportunity_skills,public.application_questions to anon,authenticated;
grant select on public.organization_memberships,public.applications,public.application_answers,public.application_status_history to authenticated;
grant select,insert,delete on public.saved_opportunities to authenticated;

create function public.opportunity_json(o public.opportunities) returns jsonb language sql stable security invoker set search_path='' as $$
select jsonb_build_object('id',o.id,'slug',o.slug,'title',o.title,'type',o.type,'summary',o.summary,'description',o.description,
 'organization',jsonb_build_object('id',g.id,'name',g.name,'slug',g.slug,'verified',g.verified),'status',o.status,'category',o.category,
 'skills',coalesce((select jsonb_agg(s.name order by s.name) from public.opportunity_skills s where s.opportunity_id=o.id),'[]'),
 'country',o.country,'city',o.city,'location',o.location,'workMode',o.work_mode,'compensationMinMinor',o.compensation_min_minor,'compensationMaxMinor',o.compensation_max_minor,
 'currency',o.currency,'duration',o.duration,'eligibility',o.eligibility,'deadline',o.deadline,'startAt',o.start_at,'endAt',o.end_at,'capacity',o.capacity,
 'benefits',o.benefits,'faqs',o.faqs,'schedule',o.schedule,'allowWithdrawal',o.allow_withdrawal,'publishedAt',o.published_at,'createdAt',o.created_at,'updatedAt',o.updated_at,'source',o.source,
 'questions',coalesce((select jsonb_agg(jsonb_build_object('id',q.id,'label',q.label,'type',q.type,'required',q.required,'options',q.options,'order',q.display_order,'active',q.active) order by q.display_order) from public.application_questions q where q.opportunity_id=o.id and q.active),'[]'))
from public.organizations g where g.id=o.organization_id $$;

create function public.get_public_opportunity(opportunity_slug text) returns jsonb language sql stable security invoker set search_path='' as $$
select public.opportunity_json(o) from public.opportunities o where o.slug=opportunity_slug and o.status='published' limit 1 $$;

create function public.search_opportunities(filters jsonb, profile_data jsonb default null) returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare p integer:=greatest(1,least(10000,coalesce((filters->>'page')::integer,1))); ps integer:=greatest(1,least(24,coalesce((filters->>'pageSize')::integer,12))); total integer; result jsonb;
begin
 with matched as (select o.* from public.opportunities o where o.status='published'
  and (coalesce(filters->>'q','')='' or concat_ws(' ',o.title,o.summary,o.description,o.category) ilike '%'||replace(filters->>'q','%','\%')||'%')
  and (jsonb_array_length(coalesce(filters->'types','[]'))=0 or o.type in(select jsonb_array_elements_text(filters->'types')))
  and (jsonb_array_length(coalesce(filters->'categories','[]'))=0 or lower(o.category) in(select jsonb_array_elements_text(filters->'categories')))
  and (jsonb_array_length(coalesce(filters->'modes','[]'))=0 or o.work_mode in(select jsonb_array_elements_text(filters->'modes')))
  and (coalesce(filters->>'location','')='' or concat_ws(' ',o.location,o.city,o.country) ilike '%'||replace(filters->>'location','%','\%')||'%')
  and (coalesce(filters->>'compensation','any')='any' or (filters->>'compensation'='paid' and o.compensation_max_minor is not null) or (filters->>'compensation'='unpaid' and o.compensation_max_minor is null))
  and (coalesce(filters->>'duration','')='' or o.duration ilike '%'||replace(filters->>'duration','%','\%')||'%')
  and (coalesce(filters->>'deadline','open')='all' or (o.deadline is null or o.deadline>=now()) and (filters->>'deadline'<>'upcoming' or o.deadline<=now()+interval '7 days'))
  and (jsonb_array_length(coalesce(filters->'skills','[]'))=0 or not exists(select 1 from jsonb_array_elements_text(filters->'skills') x where not exists(select 1 from public.opportunity_skills s where s.opportunity_id=o.id and lower(s.name)=x)))
  and (coalesce(filters->>'eligibility','any')<>'eligible' or profile_data is not null
    and (jsonb_array_length(coalesce(o.eligibility->'learnerSegments','[]'))=0 or o.eligibility->'learnerSegments' ? (profile_data->>'learnerSegment'))
    and (jsonb_array_length(coalesce(o.eligibility->'educationLevels','[]'))=0 or o.eligibility->'educationLevels' ? (profile_data->>'educationLevel'))
    and (jsonb_array_length(coalesce(o.eligibility->'graduationYears','[]'))=0 or o.eligibility->'graduationYears' ? (profile_data->>'graduationYear'))
    and (jsonb_array_length(coalesce(o.eligibility->'requiredSkills','[]'))=0 or exists(select 1 from jsonb_array_elements_text(o.eligibility->'requiredSkills') r where exists(select 1 from jsonb_array_elements_text(coalesce(profile_data->'skills','[]')) s where lower(s)=lower(r)))))
 ) select count(*) into total from matched;
 with matched as (select o.* from public.opportunities o where o.status='published'
  and (coalesce(filters->>'q','')='' or concat_ws(' ',o.title,o.summary,o.description,o.category) ilike '%'||replace(filters->>'q','%','\%')||'%')
  and (jsonb_array_length(coalesce(filters->'types','[]'))=0 or o.type in(select jsonb_array_elements_text(filters->'types')))
  and (jsonb_array_length(coalesce(filters->'categories','[]'))=0 or lower(o.category) in(select jsonb_array_elements_text(filters->'categories')))
  and (jsonb_array_length(coalesce(filters->'modes','[]'))=0 or o.work_mode in(select jsonb_array_elements_text(filters->'modes')))
  and (coalesce(filters->>'location','')='' or concat_ws(' ',o.location,o.city,o.country) ilike '%'||replace(filters->>'location','%','\%')||'%')
  and (coalesce(filters->>'compensation','any')='any' or (filters->>'compensation'='paid' and o.compensation_max_minor is not null) or (filters->>'compensation'='unpaid' and o.compensation_max_minor is null))
  and (coalesce(filters->>'duration','')='' or o.duration ilike '%'||replace(filters->>'duration','%','\%')||'%')
  and (coalesce(filters->>'deadline','open')='all' or (o.deadline is null or o.deadline>=now()) and (filters->>'deadline'<>'upcoming' or o.deadline<=now()+interval '7 days'))
  and (jsonb_array_length(coalesce(filters->'skills','[]'))=0 or not exists(select 1 from jsonb_array_elements_text(filters->'skills') x where not exists(select 1 from public.opportunity_skills s where s.opportunity_id=o.id and lower(s.name)=x)))
  and (coalesce(filters->>'eligibility','any')<>'eligible' or profile_data is not null
    and (jsonb_array_length(coalesce(o.eligibility->'learnerSegments','[]'))=0 or o.eligibility->'learnerSegments' ? (profile_data->>'learnerSegment'))
    and (jsonb_array_length(coalesce(o.eligibility->'educationLevels','[]'))=0 or o.eligibility->'educationLevels' ? (profile_data->>'educationLevel'))
    and (jsonb_array_length(coalesce(o.eligibility->'graduationYears','[]'))=0 or o.eligibility->'graduationYears' ? (profile_data->>'graduationYear'))
    and (jsonb_array_length(coalesce(o.eligibility->'requiredSkills','[]'))=0 or exists(select 1 from jsonb_array_elements_text(o.eligibility->'requiredSkills') r where exists(select 1 from jsonb_array_elements_text(coalesce(profile_data->'skills','[]')) s where lower(s)=lower(r)))))
  order by o.published_at desc nulls last,o.slug limit ps offset (p-1)*ps)
 select coalesce(jsonb_agg(public.opportunity_json(m)),'[]') into result from matched m;
 return jsonb_build_object('items',result,'total',total,'page',p,'pageSize',ps,'pages',greatest(1,ceil(total::numeric/ps)::integer));
end $$;

create function public.saved_opportunity_ids() returns jsonb language sql stable security invoker set search_path='' as $$ select coalesce(jsonb_agg(opportunity_id),'[]') from public.saved_opportunities where user_id=auth.uid() $$;
create function public.set_saved_opportunity(p_opportunity_id uuid,should_save boolean) returns jsonb language plpgsql security definer set search_path='' as $$ begin
 if auth.uid() is null or not exists(select 1 from public.opportunities where id=p_opportunity_id and status='published') then raise exception 'access denied'; end if;
 if should_save then insert into public.saved_opportunities(user_id,opportunity_id) values(auth.uid(),p_opportunity_id) on conflict do nothing; else delete from public.saved_opportunities where user_id=auth.uid() and saved_opportunities.opportunity_id=p_opportunity_id; end if;
 return jsonb_build_object('saved',should_save); end $$;

create function public.application_json(a public.applications,include_notes boolean default false) returns jsonb language sql stable security definer set search_path='' as $$
select jsonb_build_object('id',a.id,'reference',a.reference,'opportunityId',a.opportunity_id,'opportunitySlug',o.slug,'opportunityTitle',o.title,'applicantId',a.applicant_id,'status',a.status,
 'answers',coalesce((select jsonb_object_agg(x.question_id,x.answer) from public.application_answers x where x.application_id=a.id),'{}'),'profileSnapshot',a.profile_snapshot,
 'submittedAt',a.submitted_at,'withdrawnAt',a.withdrawn_at,'createdAt',a.created_at,'updatedAt',a.updated_at,'ownerId',a.owner_id,
 'history',coalesce((select jsonb_agg(jsonb_build_object('id',h.id,'previousStatus',h.previous_status,'newStatus',h.new_status,'actorId',h.actor_id,'reason',h.reason,'createdAt',h.created_at) order by h.created_at) from public.application_status_history h where h.application_id=a.id),'[]'),
 'notes',case when include_notes then coalesce((select jsonb_agg(jsonb_build_object('id',n.id,'authorId',n.author_id,'body',n.body,'createdAt',n.created_at) order by n.created_at) from public.employer_notes n where n.application_id=a.id),'[]') else null end) from public.opportunities o where o.id=a.opportunity_id $$;

create function public.my_applications() returns jsonb language sql stable security invoker set search_path='' as $$ select coalesce(jsonb_agg(public.application_json(a,false) order by a.updated_at desc),'[]') from public.applications a where a.applicant_id=auth.uid() $$;
create function public.my_application(p_application_id uuid) returns jsonb language sql stable security invoker set search_path='' as $$ select public.application_json(a,false) from public.applications a where a.id=p_application_id and a.applicant_id=auth.uid() $$;

create function public.save_application(p_opportunity_id uuid,answer_data jsonb,should_submit boolean,profile_snapshot jsonb default '{}') returns jsonb language plpgsql security definer set search_path='' as $$
declare owner uuid:=auth.uid(); o public.opportunities; a public.applications; question_row record; answer text; snap jsonb; old_status text;
begin
 if owner is null then raise exception 'Authentication required'; end if; select * into o from public.opportunities where id=p_opportunity_id and status='published' and type in('job','internship') for share;
 if o is null or (o.deadline is not null and o.deadline<now()) then raise exception 'Applications are closed'; end if;
 select data into snap from public.profiles where id=owner; snap:=jsonb_build_object('fullName',snap->>'fullName','email',snap->>'email','city',snap->>'city','skills',coalesce(snap->'skills','[]'),'educationLevel',snap->>'educationLevel','experienceLevel',snap->>'experienceLevel','learnerSegment',snap->>'learnerSegment','graduationYear',snap->>'graduationYear','resumeName',snap->>'resumeName');
 if jsonb_array_length(coalesce(o.eligibility->'learnerSegments','[]'))>0 and not o.eligibility->'learnerSegments' ? (snap->>'learnerSegment') then raise exception 'Your learner profile does not match the eligible audience'; end if;
 if jsonb_array_length(coalesce(o.eligibility->'educationLevels','[]'))>0 and not o.eligibility->'educationLevels' ? (snap->>'educationLevel') then raise exception 'Your education level does not match this opportunity'; end if;
 if jsonb_array_length(coalesce(o.eligibility->'graduationYears','[]'))>0 and not o.eligibility->'graduationYears' ? (snap->>'graduationYear') then raise exception 'Your graduation year is outside the eligible range'; end if;
 if jsonb_array_length(coalesce(o.eligibility->'requiredSkills','[]'))>0 and not exists(select 1 from jsonb_array_elements_text(o.eligibility->'requiredSkills') r where exists(select 1 from jsonb_array_elements_text(coalesce(snap->'skills','[]')) s where lower(s)=lower(r))) then raise exception 'Add one of the required skills to your profile'; end if;
 if should_submit then for question_row in select aq.* from public.application_questions aq where aq.opportunity_id=o.id and aq.active loop answer:=coalesce(answer_data->>question_row.id,''); if question_row.required and trim(answer)='' then raise exception '% is required',question_row.label; end if; if jsonb_array_length(question_row.options)>0 and trim(answer)<>'' and not question_row.options ? answer then raise exception 'Invalid answer'; end if; end loop; end if;
 select * into a from public.applications where applications.opportunity_id=o.id and applicant_id=owner for update;
 if a.id is not null and a.status<>'draft' then return public.application_json(a,false); end if; old_status:=case when a.id is null then null else a.status end;
 if a.id is null then insert into public.applications(reference,opportunity_id,applicant_id,status,profile_snapshot,submitted_at) values('BLD-'||extract(year from now())::text||'-'||upper(substr(gen_random_uuid()::text,1,8)),o.id,owner,case when should_submit then 'submitted' else 'draft' end,snap,case when should_submit then now() end) returning * into a;
 else update public.applications set profile_snapshot=snap,status=case when should_submit then 'submitted' else 'draft' end,submitted_at=case when should_submit then now() else submitted_at end,updated_at=now() where id=a.id returning * into a; delete from public.application_answers where application_id=a.id; end if;
 insert into public.application_answers(application_id,question_id,answer) select a.id,key,value from jsonb_each_text(answer_data) x where exists(select 1 from public.application_questions q where q.opportunity_id=o.id and q.id=x.key and q.active) on conflict(application_id,question_id) do update set answer=excluded.answer;
 if old_status is null or should_submit then insert into public.application_status_history(application_id,previous_status,new_status,actor_id) values(a.id,old_status,a.status,owner); end if;
 insert into public.audit_events(user_id,action) values(owner,case when should_submit then 'application.submitted' else 'application.saved' end); return public.application_json(a,false);
end $$;

create function public.withdraw_application(p_application_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$ declare a public.applications; begin
 select a0.* into a from public.applications a0 join public.opportunities o on o.id=a0.opportunity_id where a0.id=p_application_id and a0.applicant_id=auth.uid() and a0.status in('submitted','reviewing','shortlisted') and o.allow_withdrawal and (o.deadline is null or o.deadline>=now()) for update of a0;
 if a.id is null then raise exception 'Application cannot be withdrawn'; end if; insert into public.application_status_history(application_id,previous_status,new_status,actor_id) values(a.id,a.status,'withdrawn',auth.uid()); update public.applications set status='withdrawn',withdrawn_at=now(),updated_at=now() where id=a.id returning * into a; insert into public.audit_events(user_id,action) values(auth.uid(),'application.withdrawn'); return public.application_json(a,false); end $$;

create function public.is_opportunity_member(opportunity_id uuid) returns boolean language sql stable security definer set search_path='' as $$ select exists(select 1 from public.opportunities o join public.organization_memberships m on m.organization_id=o.organization_id where o.id=opportunity_id and m.user_id=auth.uid() and m.role in('owner','recruiter','reviewer')) $$;
create function public.employer_applications(opportunity_slug text,status_filter text default null) returns jsonb language plpgsql stable security definer set search_path='' as $$ declare oid uuid; begin select id into oid from public.opportunities where slug=opportunity_slug; if oid is null or not public.is_opportunity_member(oid) then raise exception 'access denied'; end if; return (select coalesce(jsonb_agg(public.application_json(a,true) order by a.updated_at desc),'[]') from public.applications a where a.opportunity_id=oid and a.status<>'draft' and (status_filter is null or a.status=status_filter)); end $$;
create function public.update_application_status(p_application_id uuid,next_status text,status_reason text default null) returns jsonb language plpgsql security definer set search_path='' as $$ declare a public.applications; allowed boolean; begin select * into a from public.applications where id=p_application_id for update; if a.id is null or a.status='draft' or not public.is_opportunity_member(a.opportunity_id) then raise exception 'access denied'; end if; allowed:=(a.status='submitted' and next_status in('reviewing','shortlisted','rejected','accepted')) or (a.status='reviewing' and next_status in('shortlisted','rejected','accepted')) or (a.status='shortlisted' and next_status in('reviewing','rejected','accepted')); if not allowed then raise exception 'Invalid transition'; end if; insert into public.application_status_history(application_id,previous_status,new_status,actor_id,reason) values(a.id,a.status,next_status,auth.uid(),left(status_reason,1000)); update public.applications set status=next_status,updated_at=now() where id=a.id returning * into a; insert into public.audit_events(user_id,action) values(auth.uid(),'application.status_changed'); return public.application_json(a,true); end $$;
create function public.add_employer_note(p_application_id uuid,note_body text) returns jsonb language plpgsql security definer set search_path='' as $$ declare a public.applications; begin select * into a from public.applications where id=p_application_id and status<>'draft'; if a.id is null or not public.is_opportunity_member(a.opportunity_id) or length(trim(note_body)) not between 1 and 5000 then raise exception 'access denied'; end if; insert into public.employer_notes(application_id,author_id,body) values(a.id,auth.uid(),trim(note_body)); insert into public.audit_events(user_id,action) values(auth.uid(),'application.note_added'); return public.application_json(a,true); end $$;

revoke all on function public.opportunity_json(public.opportunities),public.application_json(public.applications,boolean),public.is_opportunity_member(uuid) from public,anon,authenticated;
grant execute on function public.get_public_opportunity(text),public.search_opportunities(jsonb,jsonb) to anon,authenticated;
grant execute on function public.saved_opportunity_ids(),public.set_saved_opportunity(uuid,boolean),public.my_applications(),public.my_application(uuid),public.save_application(uuid,jsonb,boolean,jsonb),public.withdraw_application(uuid),public.employer_applications(text,text),public.update_application_status(uuid,text,text),public.add_employer_note(uuid,text) to authenticated;
commit;
