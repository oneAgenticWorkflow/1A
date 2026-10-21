-- Target criteria: no fixed count; the advisor ticks every criterion worth building evidence for.
update public.tasks set data = data
  || jsonb_build_object('title', $q$Choose the target criteria$q$,
     'detail', $q$Open the Scorecard tab. Every criterion is evaluated with Invest, Maintain or Skip and a reason. Tick every criterion worth building evidence for (no fixed number), then confirm. Unticked criteria have their evidence tasks skipped.$q$)
 where data->>'key' = 'targets';
