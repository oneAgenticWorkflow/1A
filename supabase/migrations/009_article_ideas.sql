-- Form 10 (candidate article ideas) and its review step. Recommendations now wait on that review.
insert into public.tasks (id, case_id, data)
select c.id || '-' || p.k, c.id,
  jsonb_build_object('cid', c.id, 'key', p.k, 'stage', 4, 'title', p.title, 'detail', p.detail, 'owner', p.owner, 'kind', p.kind,
    'form', 'f10', 'gate', '', 'deps', p.deps, 'req', true, 'status', 'Not started',
    'due', to_char(coalesce((c.data->>'startDate')::date, current_date) + p.off, 'YYYY-MM-DD'),
    'source', 'template', 'createdAt', to_char(now() at time zone 'utc','YYYY-MM-DD"T"HH24:MI:SS"Z"'))
from public.candidates c cross join (values
  ('f10','Complete Form 10: Your article ideas','Optional: your own article ideas, to compare with ours.','Candidate','form','["foe"]'::jsonb,54),
  ('r10','Review Form 10','','Advisor','review','["f10"]'::jsonb,57)) as p(k,title,detail,owner,kind,deps,off)
on conflict (id) do nothing;

update public.tasks set data = data || jsonb_build_object('deps','["targets","r10"]'::jsonb,'due',to_char((data->>'due')::date + 2,'YYYY-MM-DD'))
  where data->>'key' = 'recs' and data->>'source' = 'template' and data->'deps' = '["targets"]'::jsonb;
update public.tasks set data = data || jsonb_build_object('detail','Compare with the candidate''s own ideas, then add, edit or remove any suggestion in the Plan tab. Approving turns the list into tasks, held back until you have reviewed the plan with the candidate.')
  where data->>'key' = 'plan' and data->>'source' = 'template';

do $$ declare r record; begin
  for r in select id from public.candidates loop perform public.reconcile_case(r.id); end loop;
end $$;
