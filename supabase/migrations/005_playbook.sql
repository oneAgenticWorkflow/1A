-- Admin-only internal reference used by the analysis function.
-- Table and access policy only. The playbook text itself is loaded directly in Supabase and is never stored in this repository.
create table if not exists public.playbook (
  key text primary key,
  body text not null,
  updated_at timestamptz not null default now()
);
alter table public.playbook enable row level security;
drop policy if exists playbook_admin on public.playbook;
create policy playbook_admin on public.playbook for all using (public.is_admin()) with check (public.is_admin());
