-- Market and evidence table for the locked field of endeavor, and a check step before the criteria strategy.
insert into public.tasks (id, case_id, data)
select c.id || '-' || p.k, c.id,
  jsonb_build_object('cid', c.id, 'key', p.k, 'stage', 3, 'title', p.title, 'detail', p.detail, 'owner', p.owner, 'kind', p.kind,
    'form', '', 'gate', '', 'deps', p.deps, 'req', true, 'status', 'Not started',
    'due', to_char(coalesce((c.data->>'startDate')::date, current_date) + p.off, 'YYYY-MM-DD'),
    'source', 'template', 'createdAt', to_char(now() at time zone 'utc','YYYY-MM-DD"T"HH24:MI:SS"Z"'))
from public.candidates c cross join (values
  ('foe-mkt','Research the market and evidence for the field','Searches the web for market size and growth figures and maps the field to the national Critical and Emerging Technologies list. Builds the FOE, market and evidence table. Only links the search actually returned are kept.','Analysis','ai','["foe"]'::jsonb,51),
  ('foe-mkt-ok','Check the market figures and sources','Open each source, confirm the figure and year, and edit the table in the Field tab. Every later step uses this table.','Advisor','task','["foe-mkt"]'::jsonb,53)) as p(k,title,detail,owner,kind,deps,off)
on conflict (id) do nothing;

update public.tasks set data = data || jsonb_build_object('deps','["foe","foe-mkt-ok"]'::jsonb)
  where data->>'key' = 'strategy' and data->>'source' = 'template' and data->'deps' = '["foe"]'::jsonb;

do $$ declare r record; begin
  for r in select id from public.candidates loop perform public.reconcile_case(r.id); end loop;
end $$;
