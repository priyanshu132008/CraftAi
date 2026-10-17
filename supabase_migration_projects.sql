-- CraftAI: Supabase-backed project metadata (run once in the Supabase SQL editor).
-- id = the disk workspace folder name ("{epoch}-{slug}") — /api/projects/{id}/load
-- reads the files from that folder on the backend.

create table if not exists public.projects (
  id         text primary key,
  user_id    uuid not null references auth.users (id) on delete cascade,
  title      text not null default '',
  prompt     text not null default '',
  files      text not null default '',          -- relative path of the project dir
  created_at timestamptz not null default now()
);

alter table public.projects enable row level security;

-- LEGACY COLUMNS (production drift, fixed 2026-10-16 via CLI): the live
-- table predates this migration and still carries NOT NULL `plan` (json)
-- and `local_path` columns the insert payload never sends — PostgREST 23502.
-- Applied live via CLI; guarded here so fresh environments (which lack the
-- columns) don't fail:
do $$ begin
  if exists (select 1 from information_schema.columns
             where table_schema='public' and table_name='projects'
               and column_name='plan') then
    alter table public.projects alter column plan drop not null;
  end if;
  if exists (select 1 from information_schema.columns
             where table_schema='public' and table_name='projects'
               and column_name='local_path') then
    alter table public.projects alter column local_path drop not null;
    alter table public.projects alter column local_path set default '';
  end if;
end $$;
alter table public.projects alter column created_at set default now();

-- PUBLISH FLOW (applied to production via CLI, 2026-10-17): the Publish modal
-- stamps these on the row, and PublicPreviewHost matches by row slug.
alter table public.projects
  add column if not exists is_published boolean not null default false,
  add column if not exists slug text not null default '';
notify pgrst, 'reload schema';

-- DEMO MODE (applied to production 2026-10-16 via CLI): fully permissive.
-- The backend additionally writes with the service-role key
-- (SUPABASE_SERVICE_ROLE_KEY), bypassing RLS entirely.
-- ⚠️ SECURITY CEILING: anyone holding the public anon key can read/write
-- EVERY row — including file snapshots that embed connector secrets.
-- After the demo, drop this and restore owner-scoped policies:
--   create policy "own rows select" on public.projects
--     for select using (auth.uid() = user_id);
--   create policy "own rows insert" on public.projects
--     for insert with check (auth.uid() = user_id);
--   create policy "own rows update" on public.projects
--     for update using (auth.uid() = user_id);
--   create policy "own rows delete" on public.projects
--     for delete using (auth.uid() = user_id);
drop policy if exists "Allow all access" on public.projects;
create policy "Allow all access" on public.projects
  for all using (true) with check (true);