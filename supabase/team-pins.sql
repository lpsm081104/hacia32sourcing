-- Run in the Supabase SQL Editor. Team membership is managed by the owner.
begin;
create table if not exists public.team_members (
  user_id uuid primary key references auth.users(id) on delete cascade
);
create table if not exists public.school_pins (
  school_id text primary key check (school_id ~ '^(node|way|relation)/[0-9]+$'),
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now()
);
alter table public.team_members enable row level security;
alter table public.school_pins enable row level security;
revoke all on public.team_members from anon, authenticated;
revoke all on public.school_pins from anon, authenticated;
grant select on public.team_members to authenticated;
grant select, insert, delete on public.school_pins to authenticated;
drop policy if exists "Read own membership" on public.team_members;
create policy "Read own membership" on public.team_members for select to authenticated
using (user_id = (select auth.uid()));
drop policy if exists "Team reads pins" on public.school_pins;
create policy "Team reads pins" on public.school_pins for select to authenticated
using (exists (select 1 from public.team_members where user_id = (select auth.uid())));
drop policy if exists "Team adds pins" on public.school_pins;
create policy "Team adds pins" on public.school_pins for insert to authenticated
with check (created_by = (select auth.uid()) and exists (select 1 from public.team_members where user_id = (select auth.uid())));
drop policy if exists "Team removes pins" on public.school_pins;
create policy "Team removes pins" on public.school_pins for delete to authenticated
using (exists (select 1 from public.team_members where user_id = (select auth.uid())));
commit;
