-- EB-1A portal schema. Admins control everything; a candidate sees and edits only their own case.
-- Every table stores one JSON document per row so the web app can keep a simple document model.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  role text not null default 'candidate' check (role in ('admin','candidate')),
  case_id text
);
create table if not exists public.invites (
  email text primary key,
  case_id text not null
);
create table if not exists public.candidates (id text primary key, case_id text not null, data jsonb not null default '{}');
create table if not exists public.tasks      (id text primary key, case_id text not null, data jsonb not null default '{}');
create table if not exists public.responses  (id text primary key, case_id text not null, data jsonb not null default '{}');
create table if not exists public.log        (id text primary key, case_id text not null, data jsonb not null default '{}');
create table if not exists public.docs       (id text primary key, case_id text not null, data jsonb not null default '{}');
create index if not exists tasks_case on public.tasks(case_id);
create index if not exists resp_case on public.responses(case_id);
create index if not exists log_case on public.log(case_id);
create index if not exists docs_case on public.docs(case_id);

-- ---------- helpers ----------
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;
create or replace function public.my_case_id() returns text
language sql stable security definer set search_path = public as $$
  select case_id from public.profiles where id = auth.uid() and role = 'candidate';
$$;

-- new sign-ups become candidates with no case until an invite matches their email
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, role, case_id)
  values (new.id, lower(new.email), 'candidate', (select case_id from public.invites where email = lower(new.email)))
  on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- called after login: links the account to the invited case
create or replace function public.claim_case() returns text
language plpgsql security definer set search_path = public as $$
declare cid text;
begin
  select case_id into cid from public.invites where email = (select lower(email) from public.profiles where id = auth.uid());
  if cid is not null then
    update public.profiles set case_id = cid where id = auth.uid() and role = 'candidate' and case_id is distinct from cid;
  end if;
  return (select case_id from public.profiles where id = auth.uid());
end $$;

-- ---------- row level security ----------
alter table public.profiles   enable row level security;
alter table public.invites    enable row level security;
alter table public.candidates enable row level security;
alter table public.tasks      enable row level security;
alter table public.responses  enable row level security;
alter table public.log        enable row level security;
alter table public.docs       enable row level security;

create policy profiles_self on public.profiles for select using (id = auth.uid() or public.is_admin());
create policy profiles_admin on public.profiles for all using (public.is_admin()) with check (public.is_admin());
create policy invites_admin on public.invites for all using (public.is_admin()) with check (public.is_admin());

create policy cand_admin on public.candidates for all using (public.is_admin()) with check (public.is_admin());
create policy tasks_admin on public.tasks for all using (public.is_admin()) with check (public.is_admin());
create policy resp_admin on public.responses for all using (public.is_admin()) with check (public.is_admin());
create policy log_admin on public.log for all using (public.is_admin()) with check (public.is_admin());
create policy docs_admin on public.docs for all using (public.is_admin()) with check (public.is_admin());

-- candidates: NO direct access to the candidates table (it holds scores and red flags); they use my_case().
-- tasks: read only, only their own tasks, never unapproved AI drafts. They cannot change a task.
create policy tasks_cand_read on public.tasks for select using (
  case_id = public.my_case_id()
  and data->>'owner' = 'Candidate'
  and coalesce((data->>'draft')::boolean, false) = false
);
-- responses: read and edit their own form answers, but only while a form is open for edits.
-- Submitting goes through submit_form(), so a candidate cannot mark anything submitted or reviewed.
create policy resp_cand_read on public.responses for select using (case_id = public.my_case_id());
create policy resp_cand_insert on public.responses for insert with check (
  case_id = public.my_case_id() and data->>'status' in ('Not started','In progress')
);
create policy resp_cand_update on public.responses for update
  using (case_id = public.my_case_id() and data->>'status' in ('Not started','In progress'))
  with check (case_id = public.my_case_id() and data->>'status' in ('Not started','In progress'));
-- notes: candidates write their own notes and read notes the admin marked shared
create policy log_cand_read on public.log for select using (
  case_id = public.my_case_id() and (data->>'by' = 'Candidate' or coalesce((data->>'shared')::boolean,false))
);
create policy log_cand_insert on public.log for insert with check (
  case_id = public.my_case_id() and data->>'kind' = 'note' and data->>'by' = 'Candidate'
);
-- documents: candidates see their case's requests and files and add files; they cannot delete or edit.
create policy docs_cand_read on public.docs for select using (case_id = public.my_case_id());
create policy docs_cand_insert on public.docs for insert with check (
  case_id = public.my_case_id() and data->>'kind' = 'file' and data->>'by' = 'Candidate'
);

-- ---------- candidate-safe case summary ----------
create or replace function public.my_case() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare cid text := public.my_case_id(); c jsonb; total int; done int;
begin
  if cid is null then return null; end if;
  select data into c from public.candidates where id = cid;
  if c is null then return null; end if;
  select count(*) filter (where coalesce((data->>'req')::boolean,true)),
         count(*) filter (where coalesce((data->>'req')::boolean,true) and data->>'status' in ('Done','Skipped'))
    into total, done from public.tasks where case_id = cid;
  return jsonb_build_object('name', c->'name','visa', c->'visa','visaExpiry', c->'visaExpiry','goal', c->'goal',
     'stage', coalesce(c->'stage','0'::jsonb),'startDate', c->'startDate',
     'progress', case when total = 0 then 0 else round(done * 100.0 / total) end);
end $$;

-- ---------- workflow engine in the database ----------
create or replace function public.reconcile_case(p_case text) returns void
language plpgsql security definer set search_path = public as $$
declare r record; met boolean; st int; s int; new_status text;
begin
  for r in select id, data from public.tasks where case_id = p_case and jsonb_array_length(coalesce(data->'deps','[]'::jsonb)) > 0 loop
    select bool_and(coalesce(d.data->>'status','') in ('Done','Skipped')) into met
      from jsonb_array_elements_text(r.data->'deps') k
      left join public.tasks d on d.id = p_case || '-' || k;
    met := coalesce(met, false);
    new_status := null;
    if r.data->>'status' = 'Not started' and met then new_status := 'To do';
    elsif r.data->>'status' = 'To do' and not met then new_status := 'Not started'; end if;
    if new_status is not null then
      update public.tasks set data = data || jsonb_build_object('status', new_status) where id = r.id;
    end if;
  end loop;
  -- stage = first stage that still has a required task not done
  select coalesce(min((data->>'stage')::int), 8) into st from public.tasks
    where case_id = p_case and coalesce((data->>'req')::boolean,true) and data->>'status' not in ('Done','Skipped');
  if exists (select 1 from public.candidates where id = p_case and coalesce((data->>'stage')::int, -1) <> st) then
    update public.candidates set data = data || jsonb_build_object('stage', st) where id = p_case;
    insert into public.log (id, case_id, data) values ('l' || replace(gen_random_uuid()::text,'-',''), p_case,
      jsonb_build_object('cid', p_case, 'tid', '', 'ts', to_char(now() at time zone 'utc','YYYY-MM-DD"T"HH24:MI:SS"Z"'), 'text', 'Moved to stage ' || (st + 1) || '.', 'kind', 'stage'));
  end if;
end $$;
revoke all on function public.reconcile_case(text) from public, anon, authenticated;

-- the only way a candidate hands a form in
create or replace function public.submit_form(p_form text) returns void
language plpgsql security definer set search_path = public as $$
declare cid text; rid text; cur text;
begin
  cid := public.my_case_id();
  if cid is null and public.is_admin() then raise exception 'Admins submit from the case page'; end if;
  if cid is null then raise exception 'No case linked to this account'; end if;
  rid := cid || '-' || p_form;
  select data->>'status' into cur from public.responses where id = rid;
  if cur is null then raise exception 'Nothing to submit'; end if;
  if cur not in ('Not started','In progress') then raise exception 'This form is already submitted'; end if;
  update public.responses set data = data || jsonb_build_object('status','Submitted','submittedAt', to_char(now() at time zone 'utc','YYYY-MM-DD"T"HH24:MI:SS"Z"')) where id = rid;
  update public.tasks set data = data || jsonb_build_object('status','Done','doneAt', to_char(now() at time zone 'utc','YYYY-MM-DD"T"HH24:MI:SS"Z"'))
    where id = cid || '-' || p_form and data->>'kind' = 'form' and data->>'status' in ('To do','In progress');
  insert into public.log (id, case_id, data) values ('l' || replace(gen_random_uuid()::text,'-',''), cid,
    jsonb_build_object('cid', cid, 'tid', cid || '-' || p_form, 'ts', to_char(now() at time zone 'utc','YYYY-MM-DD"T"HH24:MI:SS"Z"'), 'text', 'Candidate submitted ' || p_form || '.', 'kind', 'task', 'by', 'Candidate'));
  perform public.reconcile_case(cid);
end $$;
grant execute on function public.submit_form(text) to authenticated;
grant execute on function public.my_case() to authenticated;
grant execute on function public.claim_case() to authenticated;

-- admin-only partial update of one JSON document (merges top-level keys)
create or replace function public.merge_doc(p_table text, p_id text, p_patch jsonb) returns void
language plpgsql security invoker set search_path = public as $$
begin
  if p_table not in ('candidates','tasks','responses','log','docs') then raise exception 'bad table'; end if;
  execute format('update public.%I set data = data || $1 where id = $2', p_table) using p_patch, p_id;
end $$;
grant execute on function public.merge_doc(text, text, jsonb) to authenticated;
-- run the engine for one case (admin only)
create or replace function public.reconcile(p_case text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'admins only'; end if;
  perform public.reconcile_case(p_case);
end $$;
grant execute on function public.reconcile(text) to authenticated;

-- ---------- table privileges (RLS does the rest) ----------
grant usage on schema public to authenticated;
grant select, insert, update, delete on public.candidates, public.tasks, public.responses, public.log, public.docs, public.invites to authenticated;
grant select on public.profiles to authenticated;
grant update, insert, delete on public.profiles to authenticated; -- policies limit this to admins

-- ---------- private file storage ----------
insert into storage.buckets (id, name, public) values ('case-files', 'case-files', false) on conflict (id) do nothing;
create policy files_admin on storage.objects for all using (bucket_id = 'case-files' and public.is_admin()) with check (bucket_id = 'case-files' and public.is_admin());
create policy files_cand_read on storage.objects for select using (bucket_id = 'case-files' and (storage.foldername(name))[1] = public.my_case_id());
create policy files_cand_insert on storage.objects for insert with check (bucket_id = 'case-files' and (storage.foldername(name))[1] = public.my_case_id());

-- live updates in the app
alter publication supabase_realtime add table public.candidates, public.tasks, public.responses, public.log, public.docs;
