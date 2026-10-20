\set ON_ERROR_STOP on
-- users: admin, candidate A, candidate B, stranger
insert into auth.users(id,email) values
 ('00000000-0000-0000-0000-0000000000a0','boss@x.com'),
 ('00000000-0000-0000-0000-0000000000a1','alex@x.com'),
 ('00000000-0000-0000-0000-0000000000b1','bea@x.com');
insert into invites values ('alex@x.com','caseA'),('bea@x.com','caseB');
update public.profiles set role='admin' where email='boss@x.com';
-- case data created as admin (superuser here, equivalent to admin writes)
insert into candidates values ('caseA','caseA','{"name":"Alex","stage":0,"criteria":{"c1":"secret"}}'),('caseB','caseB','{"name":"Bea","stage":0}');
insert into tasks values
 ('caseA-welcome','caseA','{"cid":"caseA","key":"welcome","stage":0,"owner":"Advisor","status":"Done","req":true,"deps":[]}'),
 ('caseA-f1','caseA','{"cid":"caseA","key":"f1","stage":0,"owner":"Candidate","kind":"form","status":"To do","req":true,"deps":["welcome"]}'),
 ('caseA-r1','caseA','{"cid":"caseA","key":"r1","stage":0,"owner":"Advisor","kind":"review","status":"Not started","req":true,"deps":["f1"]}'),
 ('caseA-draftx','caseA','{"cid":"caseA","key":"draftx","stage":3,"owner":"Candidate","status":"To do","req":false,"draft":true,"deps":[]}'),
 ('caseB-f1','caseB','{"cid":"caseB","key":"f1","stage":0,"owner":"Candidate","kind":"form","status":"To do","req":true,"deps":[]}');
insert into responses values ('caseB-f1','caseB','{"cid":"caseB","formId":"f1","status":"In progress","data":{}}');

create or replace function t_as(uid text) returns void language plpgsql as $$ begin perform set_config('request.jwt.sub', uid, false); end $$;
create or replace function expect(label text, got bigint, want bigint) returns text language plpgsql as $$ begin
  if got is distinct from want then raise exception 'FAIL %: got %, wanted %', label, got, want; end if; raise notice 'ok   %', label; return 'ok'; end $$;
grant execute on function t_as(text) to authenticated;
grant execute on function expect(text,bigint,bigint) to authenticated;

-- ===== candidate A =====
select t_as('00000000-0000-0000-0000-0000000000a1');
set role authenticated;
select public.claim_case();
select expect('A is linked to caseA', (select count(*) from public.profiles where case_id='caseA'), 1);
select expect('A cannot read the candidates table', (select count(*) from public.candidates), 0);
select expect('A reads safe summary', (select count(*) from (select public.my_case() c) q where c->>'name'='Alex' and not (c ? 'criteria')), 1);
select expect('A sees only own candidate-owned, non-draft tasks', (select count(*) from public.tasks), 1);
select expect('A cannot see case B tasks', (select count(*) from public.tasks where case_id='caseB'), 0);
-- A cannot change a task
update public.tasks set data = data || '{"status":"Done"}' where id='caseA-f1';
select expect('A cannot complete a task', (select count(*) from public.tasks where data->>'status'='Done'), 0);
-- A can write own response
insert into public.responses values ('caseA-f1','caseA','{"cid":"caseA","formId":"f1","status":"In progress","data":{"id":{"name":"Alex"}}}');
select expect('A saved own answers', (select count(*) from public.responses), 1);
-- A cannot write into case B
do $$ begin begin insert into public.responses values ('caseB-x','caseB','{"status":"In progress"}'); raise exception 'FAIL: A wrote into case B'; exception when insufficient_privilege or others then if sqlerrm like 'FAIL%' then raise; end if; end; end $$;
-- A cannot self-mark submitted
do $$ begin begin update public.responses set data = data || '{"status":"Submitted"}' where id='caseA-f1'; exception when others then null; end; end $$;
select expect('A cannot set Submitted directly', (select count(*) from public.responses where data->>'status'='Submitted'), 0);
do $$ begin begin update public.responses set data = data || '{"status":"Reviewed"}' where id='caseA-f1'; exception when others then null; end; end $$;
select expect('A cannot set Reviewed', (select count(*) from public.responses where data->>'status'='Reviewed'), 0);
-- A submits through the function
select public.submit_form('f1');
select expect('submit marks response Submitted', (select count(*) from public.responses where data->>'status'='Submitted'), 1);
-- after submit A cannot edit
update public.responses set data = data || '{"data":{"id":{"name":"Hacked"}}}' where id='caseA-f1';
select expect('A cannot edit after submit', (select count(*) from public.responses where data->'data'->'id'->>'name'='Hacked'), 0);
-- A cannot create tasks or delete
do $$ begin begin insert into public.tasks values ('caseA-new','caseA','{"owner":"Candidate","status":"To do"}'); exception when others then null; end; end $$;
select expect('A cannot create tasks', (select count(*) from public.tasks where id='caseA-new'), 0);
delete from public.responses where id='caseA-f1';
select expect('A cannot delete answers', (select count(*) from public.responses), 1);
-- notes
insert into public.log values ('n1','caseA','{"cid":"caseA","kind":"note","by":"Candidate","text":"hi"}');
select expect('A can add a note', (select count(*) from public.log), 2);
do $$ begin begin insert into public.log values ('n2','caseA','{"cid":"caseA","kind":"gate","by":"Candidate","text":"forged"}'); exception when others then null; end; end $$;
select expect('A cannot forge a non-note log', (select count(*) from public.log), 2);
-- docs
insert into public.docs values ('d1','caseA','{"cid":"caseA","kind":"file","by":"Candidate","name":"w2.pdf","path":"caseA/w2.pdf"}');
select expect('A can add a file record', (select count(*) from public.docs), 1);
do $$ begin begin insert into public.docs values ('d2','caseB','{"kind":"file","by":"Candidate"}'); exception when others then null; end; end $$;
select expect('A cannot add file records to B', (select count(*) from public.docs where case_id='caseB'), 0);
-- storage
insert into storage.objects(bucket_id,name) values ('case-files','caseA/w2.pdf');
do $$ begin begin insert into storage.objects(bucket_id,name) values ('case-files','caseB/steal.pdf'); exception when others then null; end; end $$;
select expect('A uploads only into caseA folder', (select count(*) from storage.objects), 1);
-- admin RPCs blocked
do $$ begin begin perform public.reconcile('caseA'); raise exception 'FAIL: A ran reconcile'; exception when others then if sqlerrm like 'FAIL%' then raise; end if; end; end $$;
reset role;

-- ===== engine: the submit unlocked the review task =====
select expect('review task unlocked by submit', (select count(*) from tasks where id='caseA-r1' and data->>'status'='To do'), 1);
select expect('form task done by submit', (select count(*) from tasks where id='caseA-f1' and data->>'status'='Done'), 1);

-- ===== candidate B =====
select t_as('00000000-0000-0000-0000-0000000000b1');
set role authenticated;
select public.claim_case();
select expect('B sees only B form response', (select count(*) from public.responses), 1);
select expect('B sees no A docs', (select count(*) from public.docs), 0);
select expect('B sees no A notes', (select count(*) from public.log), 0);
select expect('B sees no A files', (select count(*) from storage.objects), 0);
reset role;

-- ===== admin =====
select t_as('00000000-0000-0000-0000-0000000000a0');
set role authenticated;
select expect('admin sees all candidates', (select count(*) from public.candidates), 2);
select expect('admin sees drafts and all tasks', (select count(*) from public.tasks), 5);
select public.merge_doc('tasks','caseA-r1','{"status":"Done"}'::jsonb);
select public.reconcile('caseA');
select expect('admin merge works', (select count(*) from tasks where id='caseA-r1' and data->>'status'='Done'), 1);
select expect('stage moves on when required tasks finish', (select (data->>'stage')::int from candidates where id='caseA'), 8);
reset role;
-- ===== stranger: no profile case =====
insert into auth.users(id,email) values ('00000000-0000-0000-0000-0000000000c1','who@x.com');
select t_as('00000000-0000-0000-0000-0000000000c1');
set role authenticated;
select expect('uninvited user sees nothing', (select count(*) from public.tasks)+(select count(*) from public.responses)+(select count(*) from public.docs), 0);
select expect('uninvited user has no case', (select count(*) from (select public.my_case() c) q where c is not null), 0);
reset role;
\echo ALL ACCESS TESTS PASSED
