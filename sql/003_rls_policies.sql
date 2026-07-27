-- Row Level Security: acá vive la protección real de los datos.
-- Sin "enable row level security", una tabla queda abierta a la anon key
-- aunque no tenga ninguna policy. Correr después de 002_functions_and_triggers.sql.

alter table public.profiles enable row level security;
alter table public.routines enable row level security;
alter table public.availability_slots enable row level security;
alter table public.pricing_items enable row level security;
alter table public.reviews enable row level security;
alter table public.review_replies enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;

-- ============================================================
-- profiles
-- Sin policy de INSERT/DELETE a propósito: el alta la hace el trigger
-- handle_new_user (security definer), nunca el cliente directamente.
-- ============================================================
create policy "profiles_select_public"
  on public.profiles for select
  using (true);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ============================================================
-- routines
-- ============================================================
create policy "routines_select_published_or_own"
  on public.routines for select
  using (is_published = true or auth.uid() = trainer_id);

create policy "routines_insert_own_trainer"
  on public.routines for insert
  with check (
    auth.uid() = trainer_id
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'preparador')
  );

create policy "routines_update_own"
  on public.routines for update
  using (auth.uid() = trainer_id)
  with check (auth.uid() = trainer_id);

create policy "routines_delete_own"
  on public.routines for delete
  using (auth.uid() = trainer_id);

-- ============================================================
-- availability_slots
-- ============================================================
create policy "availability_select_public"
  on public.availability_slots for select
  using (true);

create policy "availability_insert_own_trainer"
  on public.availability_slots for insert
  with check (
    auth.uid() = trainer_id
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'preparador')
  );

create policy "availability_update_own"
  on public.availability_slots for update
  using (auth.uid() = trainer_id)
  with check (auth.uid() = trainer_id);

create policy "availability_delete_own"
  on public.availability_slots for delete
  using (auth.uid() = trainer_id);

-- ============================================================
-- pricing_items
-- ============================================================
create policy "pricing_select_active_or_own"
  on public.pricing_items for select
  using (active = true or auth.uid() = trainer_id);

create policy "pricing_insert_own_trainer"
  on public.pricing_items for insert
  with check (
    auth.uid() = trainer_id
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'preparador')
  );

create policy "pricing_update_own"
  on public.pricing_items for update
  using (auth.uid() = trainer_id)
  with check (auth.uid() = trainer_id);

create policy "pricing_delete_own"
  on public.pricing_items for delete
  using (auth.uid() = trainer_id);

-- ============================================================
-- reviews
-- A propósito NO hay policy que deje al preparador editar/borrar
-- reseñas sobre sí mismo.
-- ============================================================
create policy "reviews_select_public"
  on public.reviews for select
  using (true);

create policy "reviews_insert_own_student"
  on public.reviews for insert
  with check (
    auth.uid() = student_id
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'alumno')
    and exists (select 1 from public.profiles t where t.id = trainer_id and t.role = 'preparador')
  );

create policy "reviews_update_own_student"
  on public.reviews for update
  using (auth.uid() = student_id)
  with check (auth.uid() = student_id);

create policy "reviews_delete_own_student"
  on public.reviews for delete
  using (auth.uid() = student_id);

-- ============================================================
-- review_replies
-- ============================================================
create policy "replies_select_public"
  on public.review_replies for select
  using (true);

create policy "replies_insert_reviewed_trainer"
  on public.review_replies for insert
  with check (
    auth.uid() = trainer_id
    and trainer_id = (select r.trainer_id from public.reviews r where r.id = review_id)
  );

create policy "replies_update_own_trainer"
  on public.review_replies for update
  using (auth.uid() = trainer_id)
  with check (auth.uid() = trainer_id);

create policy "replies_delete_own_trainer"
  on public.review_replies for delete
  using (auth.uid() = trainer_id);

-- ============================================================
-- conversations
-- Las crea el alumno; no hay policy de UPDATE/DELETE para el cliente
-- (last_message_at lo mantiene el trigger touch_conversation).
-- ============================================================
create policy "conversations_select_participant"
  on public.conversations for select
  using (auth.uid() = student_id or auth.uid() = trainer_id);

create policy "conversations_insert_by_student"
  on public.conversations for insert
  with check (
    auth.uid() = student_id
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'alumno')
    and exists (select 1 from public.profiles t where t.id = trainer_id and t.role = 'preparador')
  );

-- ============================================================
-- messages
-- Inmutables: sin policy de UPDATE/DELETE.
-- ============================================================
create policy "messages_select_participant"
  on public.messages for select
  using (exists (
    select 1 from public.conversations c
    where c.id = conversation_id
      and (c.student_id = auth.uid() or c.trainer_id = auth.uid())
  ));

create policy "messages_insert_participant"
  on public.messages for insert
  with check (
    auth.uid() = sender_id
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (c.student_id = auth.uid() or c.trainer_id = auth.uid())
    )
  );
