-- Advisor-only data inside form answers (screening results, verified venue) lives in its own admin-only table.
create table if not exists public.adv_notes (id text primary key, case_id text, data jsonb not null default '{}');
alter table public.adv_notes enable row level security;
drop policy if exists adv_notes_admin on public.adv_notes;
create policy adv_notes_admin on public.adv_notes for all using (public.is_admin()) with check (public.is_admin());
grant select, insert, update, delete on public.adv_notes to authenticated;

create or replace function public.split_priv() returns trigger
language plpgsql security definer set search_path = public as $$
declare el jsonb; pk jsonb; priv jsonb := '[]'; clean jsonb := '[]'; found boolean := false; trusted boolean;
begin
  trusted := public.is_admin() or auth.uid() is null;
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
drop trigger if exists responses_split_priv on public.responses;
create trigger responses_split_priv before insert or update on public.responses for each row execute function public.split_priv();

create or replace function public.drop_priv() returns trigger language plpgsql security definer set search_path = public as $$
begin delete from public.adv_notes where id = old.id; return old; end $$;
drop trigger if exists responses_drop_priv on public.responses;
create trigger responses_drop_priv after delete on public.responses for each row execute function public.drop_priv();

-- move what is already stored, then rename the analysis owner label
update public.responses set data = data where jsonb_typeof(data->'data'->'ideas') = 'array';
update public.tasks set data = jsonb_set(data, '{owner}', '"Analysis"') where data->>'owner' = 'Claude';
update public.tasks set data = jsonb_set(data, '{source}', '"Advisor"') where data->>'source' = 'Claude';
