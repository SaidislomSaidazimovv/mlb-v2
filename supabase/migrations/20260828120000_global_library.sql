-- =====================================================================
-- Global library (share) — blocks + components published for ALL masters.
-- Read = any authenticated master; write = the author, but publishing goes
-- through the `publish-library-item` Edge Function (the §10.3 gate) which
-- inserts with service_role after the gate passes. Author-scoped delete.
-- Plus: real avatar (profiles.avatar_url + a public `avatars` storage bucket).
-- =====================================================================

-- 1) the shared table -------------------------------------------------
create table if not exists public.global_library (
  id           uuid primary key default gen_random_uuid(),
  kind         text        not null check (kind in ('block','component')),
  author       uuid        not null references auth.users (id) on delete cascade,
  author_name  text        not null default '',   -- snapshot at publish time
  name         text        not null,
  payload      jsonb       not null,              -- block = Cabinet · component = ComponentLibraryItem
  gate_passed  boolean     not null default true, -- only gate-passed rows are inserted
  created_at   timestamptz not null default now()
);
create index if not exists global_library_kind_created_idx
  on public.global_library (kind, created_at desc);

alter table public.global_library enable row level security;

drop policy if exists "global_read_all"   on public.global_library;
drop policy if exists "global_insert_own" on public.global_library;
drop policy if exists "global_delete_own" on public.global_library;
-- every signed-in master sees ALL published items
create policy "global_read_all"   on public.global_library for select using (auth.role() = 'authenticated');
-- a master may only insert rows authored by themselves (the Edge Function enforces the gate first)
create policy "global_insert_own" on public.global_library for insert with check (auth.uid() = author);
-- a master may delete only their own items
create policy "global_delete_own" on public.global_library for delete using (auth.uid() = author);

-- 2) real avatar on the profile --------------------------------------
alter table public.profiles add column if not exists avatar_url text not null default '';

-- 3) public avatars bucket -------------------------------------------
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "avatars_read"   on storage.objects;
drop policy if exists "avatars_write"  on storage.objects;
drop policy if exists "avatars_update" on storage.objects;
-- anyone can read an avatar (public); a master can only write into their own uid folder
create policy "avatars_read"   on storage.objects for select using (bucket_id = 'avatars');
create policy "avatars_write"  on storage.objects for insert with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars_update" on storage.objects for update using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
