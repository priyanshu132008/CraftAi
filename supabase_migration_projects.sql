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