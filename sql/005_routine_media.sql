-- Fotos y videos que el preparador suma a cada rutina publicada.
-- Correr después de 004_storage.sql.

create table public.routine_media (
  id uuid primary key default gen_random_uuid(),
  routine_id uuid not null references public.routines(id) on delete cascade,
  trainer_id uuid not null references public.profiles(id) on delete cascade,
  media_type text not null check (media_type in ('image', 'video')),
  url text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index routine_media_routine_idx on public.routine_media(routine_id, sort_order);

alter table public.routine_media enable row level security;

create policy "routine_media_select_public"
  on public.routine_media for select
  using (true);

create policy "routine_media_insert_own_trainer"
  on public.routine_media for insert
  with check (
    auth.uid() = trainer_id
    and exists (select 1 from public.routines r where r.id = routine_id and r.trainer_id = auth.uid())
  );

create policy "routine_media_delete_own_trainer"
  on public.routine_media for delete
  using (auth.uid() = trainer_id);

-- ============================================================
-- Bucket para las fotos/videos: 50MB máximo por archivo, solo formatos
-- comunes. Mismo patrón carpeta-por-usuario que avatars en 004_storage.sql:
-- <trainer_id>/<routine_id>/archivo — así las políticas validan dueño
-- sin consultar otra tabla.
-- ============================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'routine-media',
  'routine-media',
  true,
  52428800,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm', 'video/quicktime']
)
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "routine_media_storage_select_public"
  on storage.objects for select
  using (bucket_id = 'routine-media');

create policy "routine_media_storage_insert_own_folder"
  on storage.objects for insert
  with check (
    bucket_id = 'routine-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "routine_media_storage_delete_own_folder"
  on storage.objects for delete
  using (
    bucket_id = 'routine-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
