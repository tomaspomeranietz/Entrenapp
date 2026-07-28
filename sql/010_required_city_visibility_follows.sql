-- Ciudad obligatoria para preparadores, perfiles solo para usuarios
-- logueados, y sistema de "seguir" con contenido gateado a seguidores.
-- Correr después de 009_content_studies_service_dm.sql.

-- ============================================================
-- Ciudad obligatoria para preparadores. NOT VALID: no rompe cuentas
-- existentes que ya tengan la ciudad vacía, pero sí exige la ciudad en
-- cualquier alta o edición de perfil A PARTIR de ahora (incluida una
-- edición futura de un preparador viejo sin ciudad todavía cargada).
-- ============================================================
alter table public.profiles
  add constraint profiles_trainer_requires_city check (role <> 'preparador' or city is not null) not valid;

-- El signup ahora manda "city" en la metadata cuando el rol es preparador
-- (antes solo mandaba full_name y role).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, role, full_name, city)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'role', 'alumno'),
    coalesce(new.raw_user_meta_data ->> 'full_name', 'Usuario'),
    nullif(new.raw_user_meta_data ->> 'city', '')
  );
  return new;
end;
$$;

-- ============================================================
-- follows: cualquiera (alumno o preparador) puede seguir a un preparador.
-- Un preparador también puede seguir a otro preparador (mutuo).
-- ============================================================
create table public.follows (
  id uuid primary key default gen_random_uuid(),
  follower_id uuid not null references public.profiles(id) on delete cascade,
  followed_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint follows_not_self check (follower_id <> followed_id),
  constraint follows_unique unique (follower_id, followed_id)
);
create index follows_follower_idx on public.follows(follower_id);
create index follows_followed_idx on public.follows(followed_id);

alter table public.follows enable row level security;

create policy "follows_select_involved"
  on public.follows for select
  using (auth.uid() = follower_id or auth.uid() = followed_id);

create policy "follows_insert_own"
  on public.follows for insert
  with check (
    auth.uid() = follower_id
    and exists (select 1 from public.profiles t where t.id = followed_id and t.role = 'preparador')
  );

create policy "follows_delete_own"
  on public.follows for delete
  using (auth.uid() = follower_id);

-- ============================================================
-- Perfiles solo para usuarios logueados: profiles_select_public dejaba
-- ver a cualquier preparador sin sesión (para el directorio público).
-- Ahora hace falta estar autenticado.
-- ============================================================
drop policy "profiles_select_public" on public.profiles;
create policy "profiles_select_logged_in"
  on public.profiles for select
  using (auth.uid() is not null and (role = 'preparador' or auth.uid() = id));

-- La vista de nombre/avatar para reseñas y mensajes también pasa a pedir
-- sesión (ya era necesaria sesión para ver esas pantallas de todos modos).
revoke select on public.profile_identities from anon;

-- ============================================================
-- Contenido de valor visible solo para quien sigue al preparador (o es
-- el dueño). Reemplaza la policy vieja que lo dejaba ver a cualquiera
-- con el contenido publicado.
-- ============================================================
drop policy "routines_select_published_or_own" on public.routines;
create policy "routines_select_followers_or_own"
  on public.routines for select
  using (
    auth.uid() = trainer_id
    or (
      is_published = true
      and exists (select 1 from public.follows f where f.follower_id = auth.uid() and f.followed_id = trainer_id)
    )
  );
