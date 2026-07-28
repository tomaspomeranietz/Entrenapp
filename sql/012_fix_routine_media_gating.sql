-- Arregla un agujero de seguridad encontrado en la revisión: sql/010 le
-- agregó el filtro de "solo seguidores" a routines, pero routine_media (las
-- fotos/videos de cada contenido) se quedó con la policy original de
-- sql/005, que dejaba leer cualquier fila sin ninguna condición
-- (using (true)). Resultado: el candado de "seguí para desbloquear
-- contenido" tapaba el título/descripción, pero cualquiera con la anon key
-- pública podía pedir routine_media directo por la API y llevarse la URL
-- real de todas las fotos/videos de todos los preparadores, sin login,
-- sin seguir a nadie y sin importar si el contenido estaba publicado.
-- Correr después de 011_fix_security_definer_view.sql.

drop policy "routine_media_select_public" on public.routine_media;

create policy "routine_media_select_followers_or_own"
  on public.routine_media for select
  using (
    auth.uid() = trainer_id
    or (
      exists (select 1 from public.routines r where r.id = routine_id and r.is_published = true)
      and exists (select 1 from public.follows f where f.follower_id = auth.uid() and f.followed_id = trainer_id)
    )
  );
