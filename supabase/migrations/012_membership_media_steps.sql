-- Senior membership facts sheet (Form 11), membership fit test, and media research sheet steps. All optional.
insert into public.tasks (id, case_id, data)
select c.id || '-' || p.k, c.id,
  jsonb_build_object('cid', c.id, 'key', p.k, 'stage', 5, 'title', p.title, 'detail', p.detail, 'owner', p.owner, 'kind', p.kind,
    'form', p.form, 'gate', '', 'deps', p.deps, 'req', false, 'status', 'Not started',
    'due', to_char(coalesce((c.data->>'startDate')::date, current_date) + p.off, 'YYYY-MM-DD'),
    'source', 'template', 'createdAt', to_char(now() at time zone 'utc','YYYY-MM-DD"T"HH24:MI:SS"Z"'))
from public.candidates c cross join (values
  ('f11',$q$Complete Form 11: Senior membership facts sheet$q$,$q$Every job and client engagement with exact dates, your best results with their source, certifications and recognition, and the senior members who could act as references. We draft the application answers from this sheet.$q$,'Candidate','form','f11','["plan"]'::jsonb,100),
  ('r11',$q$Review Form 11 and check the answers agree$q$,$q$Titles, dates and figures must be identical wherever they appear. Fix overlaps and gaps in the date line. Confirm each client allows its name and figures to be used. Then draft the application answers for the candidate to review.$q$,'Advisor','review','f11','["f11"]'::jsonb,104),
  ('mem-fit',$q$Run the fit test on each membership$q$,$q$Count a membership as evidence only if all four are true: admission is decided by experts or a committee on achievement; the published criteria ask for outstanding or senior-level achievement; we hold the bylaws page and the candidate's certificate or letter; the association is recognised in the field. Save the bylaws link and the date checked. Memberships that fail are listed as helpful but not evidence.$q$,'Advisor','task','','["plan"]'::jsonb,90),
  ('media-sheet',$q$Research existing coverage and sort it A, B or C$q$,$q$Record each piece in the shared sheet: title, URL, date, author, outlet, reach with a third-party source, whether the candidate is named, share about the candidate or work, kind, language. Sort: A names the candidate and discusses the work; B covers the project without the name (use it for contributions, role or field importance); C does not qualify (press release, paid, employer only).$q$,'Advisor','task','','["r5","plan"]'::jsonb,62),
  ('media-chk',$q$Review the media sheet$q$,$q$Confirm each item is accurate, mark anything wrong and tell us what is missing. Only coverage that names you and discusses your work counts as media evidence; coverage of the project without your name still helps as proof of your impact.$q$,'Candidate','task','','["media-sheet"]'::jsonb,70)) as p(k,title,detail,owner,kind,form,deps,off)
on conflict (id) do nothing;

do $$ declare r record; begin
  for r in select id from public.candidates loop perform public.reconcile_case(r.id); end loop;
end $$;
