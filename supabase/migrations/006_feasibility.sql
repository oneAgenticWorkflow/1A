-- Candidates see only the released feasibility summary; internal analysis stays hidden.
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
     'feasibility', c->'feasibilityReleased',
     'progress', case when total = 0 then 0 else round(done * 100.0 / total) end);
end $$;
grant execute on function public.my_case() to authenticated;

-- Add the new workflow tasks to cases created before this change, and retitle the first analysis step.
insert into public.tasks (id, case_id, data)
select c.id || '-' || n.k, c.id,
  jsonb_build_object('cid', c.id, 'key', n.k, 'stage', 3, 'title', n.t, 'detail', n.d, 'owner', n.o, 'kind', n.kind,
    'form', '', 'gate', n.g, 'deps', n.deps, 'req', true, 'status', 'Not started',
    'due', to_char(coalesce((c.data->>'startDate')::date, current_date) + n.off, 'YYYY-MM-DD'),
    'source', 'template', 'createdAt', to_char(now() at time zone 'utc','YYYY-MM-DD"T"HH24:MI:SS"Z"'))
from public.candidates c
cross join (values
  ('baseline','Run the full baseline score','Scores all 10 criteria from every reviewed form and the documents. Opens when all forms are reviewed and documents are checked.','Analysis','ai','','["r2","r3","r4","r5","r7","r8","r9"]'::jsonb,40),
  ('feas-draft','Draft the feasibility summary for the candidate','Writes the plain-language outlook the candidate will see. You edit it before anything is released.','Analysis','ai','','["baseline"]'::jsonb,42),
  ('feas','Review and release the feasibility summary','Nothing reaches the candidate until you release it from the Feasibility tab.','Advisor','gate','feas','["feas-draft"]'::jsonb,46)
) as n(k,t,d,o,kind,g,deps,off)
on conflict (id) do nothing;

update public.tasks set data = data || '{"title":"Run the quick screen (resume and Form 1)","detail":"Preliminary read from the resume and Form 1 only. Use it to decide what to ask for. It is not the baseline and is never shown to the candidate."}'::jsonb
  where data->>'key' = 'score';
update public.tasks set data = data || '{"deps":["baseline"]}'::jsonb where data->>'key' = 'tasks-ai';

do $$ declare r record; begin
  for r in select id from public.candidates loop perform public.reconcile_case(r.id); end loop;
end $$;
