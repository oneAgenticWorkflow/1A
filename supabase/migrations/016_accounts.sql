-- Admin-managed accounts. Admins create every login (username + generated password) and assign supervisors to cases.
alter table public.profiles add column if not exists username text;
alter table public.profiles add column if not exists display_name text;
alter table public.profiles add column if not exists contact_email text;
alter table public.profiles add column if not exists must_change boolean not null default false;
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('admin','supervisor','candidate'));
create unique index if not exists profiles_username_uq on public.profiles (lower(username));

create table if not exists public.assignments (
  user_id uuid not null references auth.users(id) on delete cascade,
  case_id text not null,
  primary key (user_id, case_id)
);
alter table public.assignments enable row level security;
drop policy if exists assignments_admin on public.assignments;
create policy assignments_admin on public.assignments for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists assignments_self on public.assignments;
create policy assignments_self on public.assignments for select using (user_id = auth.uid());
grant select, insert, update, delete on public.assignments to authenticated;

create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role in ('admin','supervisor'));
$$;
create or replace function public.can_work_case(p_case text) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_admin() or exists (
    select 1 from public.assignments a join public.profiles p on p.id = a.user_id
     where a.user_id = auth.uid() and p.role = 'supervisor' and a.case_id = p_case);
$$;

-- supervisors: read and write the cases assigned to them; deleting stays with admins
do $$
declare t text;
begin
  foreach t in array array['candidates','tasks','responses','log','docs','adv_notes'] loop
    execute format('drop policy if exists %I on public.%I', t || '_sup_sel', t);
    execute format('create policy %I on public.%I for select using (public.can_work_case(case_id))', t || '_sup_sel', t);
    execute format('drop policy if exists %I on public.%I', t || '_sup_ins', t);
    execute format('create policy %I on public.%I for insert with check (public.can_work_case(case_id))', t || '_sup_ins', t);
    execute format('drop policy if exists %I on public.%I', t || '_sup_upd', t);
    execute format('create policy %I on public.%I for update using (public.can_work_case(case_id)) with check (public.can_work_case(case_id))', t || '_sup_upd', t);
  end loop;
end $$;
drop policy if exists playbook_staff on public.playbook;
create policy playbook_staff on public.playbook for select using (public.is_staff());
drop policy if exists files_sup on storage.objects;
create policy files_sup on storage.objects for all
  using (bucket_id = 'case-files' and public.can_work_case((storage.foldername(name))[1]))
  with check (bucket_id = 'case-files' and public.can_work_case((storage.foldername(name))[1]));

-- private notes trigger and engine run: staff, not only admins
create or replace function public.split_priv() returns trigger
language plpgsql security definer set search_path = public as $$
declare el jsonb; pk jsonb; priv jsonb := '[]'; clean jsonb := '[]'; found boolean := false; trusted boolean;
begin
  trusted := public.is_staff() or auth.uid() is null;
  if jsonb_typeof(new.data->'data'->'ideas') = 'array' then
    for el in select value from jsonb_array_elements(new.data->'data'->'ideas') loop
      pk := jsonb_strip_nulls(jsonb_build_object('_screen', el->'_screen', 'venue', el->'venue', 'venue_ok', el->'venue_ok'));
      if pk <> '{}'::jsonb then found := true; end if;
      priv := priv || jsonb_build_array(pk);
      clean := clean || jsonb_build_array(el - '_screen' - 'venue' - 'venue_ok');
    end loop;
    if trusted and found then
      insert into public.adv_notes(id, case_id, data) values (new.id, new.case_id, jsonb_build_object('ideas', priv))
      on conflict (id) do update set data = excluded.data;
    end if;
    new.data := jsonb_set(new.data, '{data,ideas}', clean);
  end if;
  return new;
end $$;

create or replace function public.reconcile(p_case text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.can_work_case(p_case) then raise exception 'not allowed for this case'; end if;
  perform public.reconcile_case(p_case);
end $$;
grant execute on function public.reconcile(text) to authenticated;

-- a person who signed in with a generated password must choose their own
create or replace function public.password_changed() returns void
language sql security definer set search_path = public as $$
  update public.profiles set must_change = false where id = auth.uid();
$$;
revoke all on function public.password_changed() from public, anon;
grant execute on function public.password_changed() to authenticated;
