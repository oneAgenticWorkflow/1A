-- Case lifecycle template sync: profile screen with decision, working field step, deep intake, full analysis and FOE lock,
-- criteria strategy, recommendations and plan approval. Brings every existing case in line with the template.
-- Task statuses already recorded are kept. Replaces the earlier interim template syncs.
drop table if exists tpl;
create temp table tpl(k text, stage int, title text, detail text, owner text, kind text, form text, gate text, deps jsonb, req boolean, off int);
insert into tpl values
  ('welcome',0,'Welcome call and consent','Explain the program, the no-guarantee policy and how data is handled. Record the signed engagement and consent.','Advisor','task','','','[]'::jsonb,true,0),
  ('f1',0,'Complete Form 1: Getting started','','Candidate','form','f1','','["welcome"]'::jsonb,true,5),
  ('r1',0,'Review Form 1 and the CV','','Advisor','review','f1','','["f1"]'::jsonb,true,7),
  ('profile',1,'Run the profile and eligibility screen','Reads the resume and Form 1 for profile, domain, experience and seniority, and gives an overall outlook. No criterion scoring yet. Never shown to the candidate.','Analysis','ai','','','["r1"]'::jsonb,true,8),
  ('proceed',1,'Decide whether to proceed to deep intake','Read the summary, then choose Proceed, Hold or Decline. Proceed opens the working field of endeavor step.','Advisor','task','','','["profile"]'::jsonb,true,10),
  ('foe0',1,'Draft working field of endeavor options','Two or three options from the resume. The deep intake is built around the one you choose. The final field is locked after the full analysis.','Analysis','ai','','','["proceed"]'::jsonb,true,11),
  ('foew',1,'Choose the working field of endeavor','Pick or edit the field the deep intake will be built around. You can still change it before the final lock.','Advisor','gate','','foew','["foe0"]'::jsonb,true,13),
  ('f2',2,'Complete Form 2: Projects','','Candidate','form','f2','','["foew"]'::jsonb,true,30),
  ('f3',2,'Complete Form 3: Scholarly record','','Candidate','form','f3','','["foew"]'::jsonb,true,35),
  ('f4',2,'Complete Form 4: Awards','','Candidate','form','f4','','["foew"]'::jsonb,true,28),
  ('f5',2,'Complete Form 5: Media','','Candidate','form','f5','','["foew"]'::jsonb,true,28),
  ('f6',2,'Complete Form 6: Compensation','','Candidate','form','f6','','["foew"]'::jsonb,true,20),
  ('f7',2,'Complete Form 7: Roles and critical role','','Candidate','form','f7','','["foew"]'::jsonb,true,32),
  ('f8',2,'Complete Form 8: Judging and memberships','','Candidate','form','f8','','["foew"]'::jsonb,true,28),
  ('f9',2,'Complete Form 9: Recommender pool','','Candidate','form','f9','','["foew"]'::jsonb,true,35),
  ('r2',2,'Review Form 2','','Advisor','review','f2','','["f2"]'::jsonb,true,34),
  ('r3',2,'Review Form 3','','Advisor','review','f3','','["f3"]'::jsonb,true,38),
  ('r4',2,'Review Form 4','','Advisor','review','f4','','["f4"]'::jsonb,true,31),
  ('r5',2,'Review Form 5','','Advisor','review','f5','','["f5"]'::jsonb,true,31),
  ('r6',2,'Review Form 6 and documents received','','Advisor','review','f6','','["f6"]'::jsonb,true,23),
  ('r7',2,'Review Form 7','','Advisor','review','f7','','["f7"]'::jsonb,true,35),
  ('r8',2,'Review Form 8','','Advisor','review','f8','','["f8"]'::jsonb,true,31),
  ('r9',2,'Review Form 9','','Advisor','review','f9','','["f9"]'::jsonb,true,38),
  ('analysis',3,'Run the full analysis','Reads every reviewed form and document and rates all 10 criteria with evidence and gaps, and flags final-merits risks. Opens when all forms are reviewed and documents are checked.','Analysis','ai','','','["r2","r3","r4","r5","r6","r7","r8","r9"]'::jsonb,true,42),
  ('review',3,'Review the scorecard and red flags','Correct any rating you disagree with. Resolve or accept each red flag.','Advisor','task','','','["analysis"]'::jsonb,true,45),
  ('foe-ai',3,'Draft field of endeavor options','Three options: primary, industry, research. Each lists the US growth evidence you must verify.','Analysis','ai','','','["review"]'::jsonb,true,47),
  ('foe',3,'FOE lock: approve the field of endeavor','Approve only after the statement is backed by US growth and impact evidence you have checked. Every later step uses it.','Advisor','gate','','foe','["foe-ai"]'::jsonb,true,50),
  ('strategy',4,'Suggest target criteria and options for each','Using the locked field of endeavor, calls Invest, Maintain or Skip for each criterion and lists options: actions, documents to request, article topics, venue types, judging routes and letter ideas.','Analysis','ai','','','["foe"]'::jsonb,true,52),
  ('targets',4,'Choose the 3 to 4 target criteria','Build the case on the criteria that are most achievable, not all ten.','Advisor','task','','','["strategy"]'::jsonb,true,55),
  ('recs',4,'Recommend articles, memberships and judging','Five article ideas with abstracts and possible journals, memberships to pursue, and how many and what kind of judging roles. Names are unverified until you check them.','Analysis','ai','','','["targets"]'::jsonb,true,56),
  ('plan',4,'Edit and approve the recommendations','Add, edit or remove any suggestion in the Plan tab. Approving turns the list into tasks, held back until you have reviewed the plan with the candidate.','Advisor','gate','','plan','["recs"]'::jsonb,true,60),
  ('review-cand',4,'Review the plan with the candidate','Walk the candidate through the plan. When you are done, release the tasks to them.','Advisor','task','','','["plan"]'::jsonb,true,63),
  ('feas-draft',4,'Draft the feasibility summary for the candidate','Writes the plain-language outlook the candidate will see. You edit it before anything is released.','Analysis','ai','','','["targets"]'::jsonb,true,57),
  ('feas',4,'Review and release the feasibility summary','Nothing reaches the candidate until you release it from the Feasibility tab.','Advisor','gate','','feas','["feas-draft","review-cand"]'::jsonb,true,65),
  ('venues',4,'Verify journals for the approved articles','Check scope, indexing, review quality, fees and predatory status for each journal on the approved articles.','Advisor','task','','','["plan"]'::jsonb,true,66),
  ('judging-proof',5,'Collect proof of every completed review','Receipts, thank-you emails, certificates or program listings. An invitation alone is not proof.','Candidate','task','','','["plan"]'::jsonb,true,105),
  ('awards',5,'Apply to shortlisted qualifying awards','No paid or vanity awards. Record issuer, selection criteria and entrant counts.','Candidate','task','','','["r4","plan"]'::jsonb,false,90),
  ('angles',5,'Choose 3 to 5 story angles about the candidate','Angles must centre on the candidate, not only the employer.','Advisor','task','','','["r5","plan"]'::jsonb,false,65),
  ('media',5,'Secure coverage in vetted outlets (editorial only)','No pay-to-publish placements. Capture circulation proof for each outlet.','Candidate','task','','','["angles"]'::jsonb,false,120),
  ('contrib',5,'Collect adoption and impact proof for top contributions','Two kinds of independent proof per contribution: adoption, citations, licensing, third-party letters.','Candidate','task','','','["r2","plan"]'::jsonb,true,90),
  ('role',5,'Get a signed org chart and employer distinction proof','','Candidate','task','','','["r7","plan"]'::jsonb,true,80),
  ('comp',5,'Compare compensation with DOL OES and survey data','Total compensation versus the 90th percentile for the same occupation and area. Save source and date.','Advisor','task','','','["r6","plan"]'::jsonb,true,66),
  ('verify',6,'Evidence verification: every claim has proof','','Advisor','task','','','["judging-proof","contrib","role","comp"]'::jsonb,true,135),
  ('rescore',6,'Re-score the case','','Analysis','ai','','','["verify"]'::jsonb,true,137),
  ('decide',6,'Filing-ready decision, or fall back to NIW or O-1','Internal rule of thumb: at least 4 criteria High and no open red flags.','Advisor','task','','','["rescore"]'::jsonb,true,140),
  ('indep',6,'Verify recommender independence','','Advisor','task','','','["r9","decide"]'::jsonb,true,143),
  ('letters-out',6,'Send recommender briefs and requests','','Advisor','task','','','["indep"]'::jsonb,true,148),
  ('letters-in',6,'Collect 6 to 8 signed letters','','Candidate','task','','','["letters-out"]'::jsonb,true,170),
  ('narrative',6,'Draft the final merits narrative','','Advisor','task','','','["decide"]'::jsonb,true,160),
  ('exhibits',6,'Build the exhibit index and certified translations','','Advisor','task','','','["narrative","letters-in"]'::jsonb,true,178),
  ('pack',7,'Send the full package to the attorney','','Advisor','task','','','["exhibits"]'::jsonb,true,180),
  ('attorney',7,'Attorney review: approve for filing','Counsel reviews the evidence index and narrative. Nothing is filed from this tracker.','Attorney','gate','','attorney','["pack"]'::jsonb,true,188),
  ('file',8,'Attorney files the petition (premium processing decision)','','Attorney','task','','','["attorney"]'::jsonb,true,195),
  ('rfe',8,'Monitor for RFE or NOID','','Attorney','task','','','["file"]'::jsonb,false,230);

delete from public.tasks t using public.candidates c
  where t.case_id = c.id and t.data->>'source' = 'template'
    and not exists (select 1 from tpl where tpl.k = t.data->>'key');

insert into public.tasks (id, case_id, data)
select c.id || '-' || p.k, c.id,
  jsonb_build_object('cid', c.id, 'key', p.k, 'stage', p.stage, 'title', p.title, 'detail', p.detail, 'owner', p.owner, 'kind', p.kind,
    'form', p.form, 'gate', p.gate, 'deps', p.deps, 'req', p.req, 'status', 'Not started',
    'due', to_char(coalesce((c.data->>'startDate')::date, current_date) + p.off, 'YYYY-MM-DD'),
    'source', 'template', 'createdAt', to_char(now() at time zone 'utc','YYYY-MM-DD"T"HH24:MI:SS"Z"'))
from public.candidates c cross join tpl p
on conflict (id) do nothing;

update public.tasks t set data = t.data || jsonb_build_object('stage', p.stage, 'title', p.title, 'detail', p.detail, 'owner', p.owner,
    'kind', p.kind, 'form', p.form, 'gate', p.gate, 'deps', p.deps, 'req', p.req,
    'due', to_char(coalesce((c.data->>'startDate')::date, current_date) + p.off, 'YYYY-MM-DD'))
from tpl p, public.candidates c
where t.case_id = c.id and t.data->>'key' = p.k and t.data->>'source' = 'template';

do $$ declare r record; begin
  for r in select id from public.candidates loop perform public.reconcile_case(r.id); end loop;
end $$;
drop table tpl;
