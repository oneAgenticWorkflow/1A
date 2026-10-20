-- Password sign-in. A candidate links to their case with the email + access code the admin gives them.
alter table public.invites add column if not exists code text;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, role, case_id)
  values (new.id, lower(new.email), 'candidate', null)
  on conflict (id) do nothing;
  return new;
end $$;

create or replace function public.claim_case() returns text
language plpgsql security definer set search_path = public as $$
begin
  return (select case_id from public.profiles where id = auth.uid());
end $$;

create or replace function public.claim_with_code(p_code text) returns text
language plpgsql security definer set search_path = public as $$
declare cid text;
begin
  select i.case_id into cid from public.invites i
   where i.email = (select lower(email) from public.profiles where id = auth.uid())
     and i.code is not null and upper(i.code) = upper(trim(p_code));
  if cid is null then return null; end if;
  update public.profiles set case_id = cid where id = auth.uid() and role = 'candidate';
  return cid;
end $$;
revoke all on function public.claim_with_code(text) from public, anon;
grant execute on function public.claim_with_code(text) to authenticated;

-- invite for any already-onboarded candidate that has no code yet
update public.invites set code = upper(substr(md5(random()::text || email), 1, 8)) where code is null;
