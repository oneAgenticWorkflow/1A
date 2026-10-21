-- Admin resets a candidate's access: new access code, old sign-in removed. The case and its data stay.
create or replace function public.reset_candidate(p_case text) returns text
language plpgsql security definer set search_path = public, auth as $$
declare v_email text; v_code text;
begin
  if not public.is_admin() then raise exception 'admins only'; end if;
  select email into v_email from public.invites where case_id = p_case;
  if v_email is null then raise exception 'no invite for this case'; end if;
  select string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 1 + floor(random() * 32)::int, 1), '') into v_code from generate_series(1, 8);
  update public.invites set code = v_code where case_id = p_case;
  delete from auth.users where lower(email) = lower(v_email) and id in (select id from public.profiles where role = 'candidate');
  return v_code;
end $$;
revoke all on function public.reset_candidate(text) from public, anon;
grant execute on function public.reset_candidate(text) to authenticated;
