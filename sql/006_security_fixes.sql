-- Correcciones de la auditoría de seguridad + privacidad de perfiles de alumnos.
-- Correr después de 005_routine_media.sql.

-- ============================================================
-- Vuln 1 (XSS almacenado): currency sin validar en pricing_items permitía
-- guardar cualquier string, que después se mostraba sin escapar en el front
-- (ese fix también se hizo en el código). Esto es la capa de defensa en la base.
-- ============================================================
alter table public.pricing_items
  add constraint pricing_currency_format check (currency ~ '^[A-Z]{3}$');

-- ============================================================
-- Vuln 2 (IDOR): el UPDATE de review_replies no revalidaba que review_id
-- siguiera perteneciendo a una reseña del mismo preparador, permitiendo
-- reasignar una respuesta propia hacia la reseña de OTRO preparador.
-- ============================================================
drop policy "replies_update_own_trainer" on public.review_replies;
create policy "replies_update_own_trainer"
  on public.review_replies for update
  using (auth.uid() = trainer_id)
  with check (
    auth.uid() = trainer_id
    and trainer_id = (select r.trainer_id from public.reviews r where r.id = review_id)
  );

-- Mismo patrón de bug en reviews: el UPDATE no revalidaba que trainer_id
-- siguiera siendo un preparador real (el INSERT sí lo hace).
drop policy "reviews_update_own_student" on public.reviews;
create policy "reviews_update_own_student"
  on public.reviews for update
  using (auth.uid() = student_id)
  with check (
    auth.uid() = student_id
    and exists (select 1 from public.profiles t where t.id = trainer_id and t.role = 'preparador')
  );

-- ============================================================
-- Vuln 4: bucket avatars sin límite de tamaño ni tipo de archivo
-- (routine-media ya lo tenía bien; esto lo alinea).
-- ============================================================
update storage.buckets
set file_size_limit = 5242880, -- 5MB, de sobra para una foto de perfil
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
where id = 'avatars';

-- ============================================================
-- Privacidad: profiles_select_public dejaba leer la fila COMPLETA de
-- cualquier usuario (incluidos alumnos) a cualquiera con la anon key,
-- aunque la UI nunca lo mostrara. Ahora solo los preparadores (que son
-- el directorio público) quedan totalmente públicos; un alumno solo
-- puede leer su propia fila completa.
-- ============================================================
drop policy "profiles_select_public" on public.profiles;
create policy "profiles_select_public"
  on public.profiles for select
  using (role = 'preparador' or auth.uid() = id);

-- Vista mínima (solo nombre + avatar) para poder seguir mostrando "quién"
-- dejó una reseña o "quién" te escribe un mensaje, sin exponer el resto
-- del perfil del alumno (bio, ciudad, etc). security_invoker = false a
-- propósito: necesita poder leer más allá de lo que permite la policy
-- de arriba, pero solo expone estas dos columnas.
create view public.profile_identities
with (security_invoker = false) as
select id, full_name, avatar_url from public.profiles;

grant select on public.profile_identities to anon, authenticated;
