-- Refresh the evidence checklists on existing cases (new cases get them from the template).

update public.tasks set data = data || jsonb_build_object('detail', $q$For every completed role keep four things: the invitation and your acceptance; proof you finished (review receipt, thank-you email, certificate or program listing); a short signed letter from the editor, chair or organizer saying what you judged; and one line on the venue (ranking, acceptance rate, audience). Aim for 5 to 8 completed roles over 6 to 9 months, from at least two types (paper review, award or competition judging, other expert evaluation), spread over more than a year. An invitation alone is not proof.$q$)
  where data->>'key' = 'judging-proof' and data->>'source' = 'template';

update public.tasks set data = data || jsonb_build_object('detail', $q$No paid or vanity awards. For each award keep: the rules or call for entries, who judged it, the number of entrants and winners, proof there was no fee or purchase, the certificate or letter, and independent press about the award.$q$)
  where data->>'key' = 'awards' and data->>'source' = 'template';

update public.tasks set data = data || jsonb_build_object('detail', $q$No pay-to-publish placements. For each piece keep: the full article with date and author, the page showing you are named and what share is about you, the outlet's circulation or traffic from a third party, and a certified translation if not in English.$q$)
  where data->>'key' = 'media' and data->>'source' = 'template';

update public.tasks set data = data || jsonb_build_object('detail', $q$Two kinds of independent proof per contribution: adoption (users, downloads, licences, customers outside your employer), citations or third-party use, and letters from people who used it. Tie each claim to a number, a date and a link.$q$)
  where data->>'key' = 'contrib' and data->>'source' = 'template';

update public.tasks set data = data || jsonb_build_object('detail', $q$Total compensation versus the 90th percentile for the same occupation and area. Save the source, table and date (DOL OES, a salary survey, or a named benchmark) next to the candidate's W-2s and offer letter.$q$)
  where data->>'key' = 'comp' and data->>'source' = 'template';
