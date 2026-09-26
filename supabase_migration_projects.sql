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

-- Users see, insert and edit only their own rows.
drop policy if exists "own rows select" on public.projects;
create policy "own rows select" on public.projects
  for select using (auth.uid() = user_id);

drop policy if exists "own rows insert" on public.projects;
create policy "own rows insert" on public.projects
  for insert with check (auth.uid() = user_id);

drop policy if exists "own rows update" on public.projects;
create policy "own rows update" on public.projects
  for update using (auth.uid() = user_id);

drop policy if exists "own rows delete" on public.projects;
create policy "own rows delete" on public.projects
  for delete using (auth.uid() = user_id);