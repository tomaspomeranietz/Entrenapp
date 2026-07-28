-- Link externo por contenido, estudios del preparador, modalidad por
-- servicio, y mensajes entre preparadores. Correr después de 008.

-- ============================================================
-- Link externo en cada contenido (ej: Google Drive, YouTube, PDF).
-- El check exige http(s) a propósito: si algún día esto se renderiza como
-- <a href>, un esquema como "javascript:" ejecutaría código — escapar el
-- texto no alcanza para eso, hace falta restringir el esquema acá.
-- ============================================================
alter table public.routines
  add column link_url text,
  add constraint routines_link_url_format check (link_url is null or link_url ~ '^https?://');

-- ============================================================
-- Estudios (formación formal) del preparador, aparte de certifications
-- (cursos/certificaciones puntuales) que ya existía.
-- ============================================================
alter table public.profiles
  add column education text,
  add constraint profiles_education_length check (education is null or char_length(education) <= 500);

-- ============================================================
-- Modalidad por servicio/precio: el perfil ya tenía una modalidad general,
-- esto es más fino — cada servicio puede ser presencial, online o ambas.
-- ============================================================
alter table public.pricing_items
  add column modality text check (modality in ('presencial', 'online', 'ambos'));

-- ============================================================
-- Mensajes entre preparadores: hoy conversations solo se podía crear
-- alumno -> preparador. Se relaja para que cualquiera (alumno o
-- preparador) pueda iniciar una conversación con un preparador —
-- lo único que sigue sin poder pasar es que alguien le escriba en frío
-- a un alumno. Nota: la columna sigue llamándose student_id/trainer_id
-- por compatibilidad, pero en una conversación preparador-preparador
-- "student_id" simplemente es quien inició el chat.
-- ============================================================
drop policy "conversations_insert_by_student" on public.conversations;
create policy "conversations_insert_participants"
  on public.conversations for insert
  with check (
    auth.uid() = student_id
    and student_id <> trainer_id
    and exists (select 1 from public.profiles t where t.id = trainer_id and t.role = 'preparador')
    and not exists (
      select 1 from public.blocks b
      where (b.blocker_id = student_id and b.blocked_id = trainer_id)
         or (b.blocker_id = trainer_id and b.blocked_id = student_id)
    )
  );
