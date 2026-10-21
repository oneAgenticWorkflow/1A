-- Remove the working-field analysis step (saves model cost). The advisor sets the working field directly.
delete from public.tasks where data->>'key' = 'foe0';
update public.tasks set data = data
  || jsonb_build_object('deps', '["proceed"]'::jsonb,
     'title', $q$Set the working field of endeavor$q$,
     'detail', $q$Write the field the deep intake will be built around, as a broad area with a focus on the niche. Use the Profile tab as a guide. No analysis runs here; the final field is drafted and locked after the full analysis.$q$)
 where data->>'key' = 'foew';
update public.tasks set data = jsonb_set(data,'{detail}',to_jsonb($q$Open the Scorecard tab. Correct any rating you disagree with. Resolve or accept each red flag.$q$::text)) where data->>'key'='review';
update public.tasks set data = jsonb_set(data,'{detail}',to_jsonb($q$Open the Scorecard tab: it shows Invest, Maintain or Skip for each criterion with the options, and a suggested set of targets. Choose the 3 to 4 most achievable, not all ten, then mark this done.$q$::text)) where data->>'key'='targets';
do $$ declare r record; begin
  for r in select id from public.candidates loop perform public.reconcile_case(r.id); end loop;
end $$;
