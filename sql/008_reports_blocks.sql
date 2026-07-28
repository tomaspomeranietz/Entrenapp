-- Reportar y bloquear usuarios. Correr después de 007_length_limits.sql.

-- ============================================================
-- blocks: si alguien te bloquea (o vos a alguien), no se pueden mandar
-- mensajes nuevos entre esas dos personas en ningún sentido.
-- ============================================================
create table public.blocks (
  id uuid primary key default gen_random_uuid(),
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint blocks_not_self check (blocker_id <> blocked_id),
  constraint blocks_unique unique (blocker_id, blocked_id)
);
create index blocks_blocker_idx on public.blocks(blocker_id);

alter table public.blocks enable row level security;

-- Both sides need to be able to leer un bloqueo puntual (no todos los que
-- existen, solo los propios) para que el chequeo "¿hay un bloqueo entre
-- estas dos personas?" funcione sin importar quién de las dos manda el
-- mensaje — si solo el que bloquea pudiera leerlo, el bloqueado podría
-- seguir escribiendo porque su propia sesión nunca ve esa fila.
create policy "blocks_select_involved"
  on public.blocks for select
  using (auth.uid() = blocker_id or auth.uid() = blocked_id);

create policy "blocks_insert_own"
  on public.blocks for insert
  with check (auth.uid() = blocker_id);

create policy "blocks_delete_own"
  on public.blocks for delete
  using (auth.uid() = blocker_id);

-- ============================================================
-- reports: reseñas o usuarios que alguien marca para que se revisen a
-- mano (no hay panel de admin todavía: se leen desde el Table Editor de
-- Supabase). A propósito sin policy de SELECT para el cliente.
-- ============================================================
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  target_type text not null check (target_type in ('review', 'user')),
  target_id uuid not null,
  reason text not null check (char_length(btrim(reason)) > 0 and char_length(reason) <= 500),
  created_at timestamptz not null default now()
);
create index reports_created_idx on public.reports(created_at desc);

alter table public.reports enable row level security;

create policy "reports_insert_own"
  on public.reports for insert
  with check (auth.uid() = reporter_id);

-- ============================================================
-- Enforcement: bloquea conversaciones/mensajes nuevos si hay un block
-- activo en cualquier sentido entre los dos participantes.
-- ============================================================
drop policy "conversations_insert_by_student" on public.conversations;
create policy "conversations_insert_by_student"
  on public.conversations for insert
  with check (
    auth.uid() = student_id
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'alumno')
    and exists (select 1 from public.profiles t where t.id = trainer_id and t.role = 'preparador')
    and not exists (
      select 1 from public.blocks b
      where (b.blocker_id = student_id and b.blocked_id = trainer_id)
         or (b.blocker_id = trainer_id and b.blocked_id = student_id)
    )
  );

drop policy "messages_insert_participant" on public.messages;
create policy "messages_insert_participant"
  on public.messages for insert
  with check (
    auth.uid() = sender_id
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (c.student_id = auth.uid() or c.trainer_id = auth.uid())
        and not exists (
          select 1 from public.blocks b
          where (b.blocker_id = c.student_id and b.blocked_id = c.trainer_id)
             or (b.blocker_id = c.trainer_id and b.blocked_id = c.student_id)
        )
    )
  );
