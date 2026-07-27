-- Esquema de datos: perfiles, rutinas, turnos, precios, reseñas, mensajes.
-- Correr en el SQL Editor de Supabase, en orden (001 -> 002 -> 003 -> 004).

create extension if not exists "pgcrypto";

-- ============================================================
-- profiles: una fila por usuario (alumno o preparador). id = auth.users.id
-- ============================================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('alumno', 'preparador')),
  full_name text not null,
  avatar_url text,
  bio text,
  city text,
  modality text check (modality in ('presencial', 'online', 'ambos')),
  specialties text[],
  years_experience smallint check (years_experience >= 0),
  certifications text,
  current_focus text,
  current_focus_updated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index profiles_role_idx on public.profiles(role);

comment on table public.profiles is 'Datos de aplicación de cada usuario. auth.users guarda email/password; acá vive todo lo que la app necesita mostrar.';
comment on column public.profiles.current_focus is 'En qué está trabajando el preparador esta semana (texto libre).';

-- ============================================================
-- routines: portfolio de rutinas que publica cada preparador
-- ============================================================
create table public.routines (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text,
  level text check (level in ('principiante', 'intermedio', 'avanzado')),
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index routines_trainer_idx on public.routines(trainer_id);

-- ============================================================
-- availability_slots: turnos disponibles que publica el preparador
-- ============================================================
create table public.availability_slots (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references public.profiles(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  label text,
  is_available boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint availability_time_order check (ends_at > starts_at)
);
create index availability_trainer_idx on public.availability_slots(trainer_id, starts_at);

-- ============================================================
-- pricing_items: precios y promos (solo informativo, sin cobro en la web)
-- ============================================================
create table public.pricing_items (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text,
  price numeric(10, 2),
  currency text not null default 'ARS',
  is_promo boolean not null default false,
  active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index pricing_trainer_idx on public.pricing_items(trainer_id);

-- ============================================================
-- reviews: puntaje + comentario del alumno. Una reseña activa por par (editable).
-- ============================================================
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references public.profiles(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reviews_one_per_student unique (trainer_id, student_id),
  constraint reviews_not_self check (trainer_id <> student_id)
);

-- ============================================================
-- review_replies: respuesta pública del preparador a una reseña puntual.
-- Tabla separada de reviews a propósito (ver 003_rls_policies.sql).
-- ============================================================
create table public.review_replies (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null unique references public.reviews(id) on delete cascade,
  trainer_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(btrim(body)) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- conversations + messages: chat privado 1 a 1, un hilo por par alumno/preparador
-- ============================================================
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  trainer_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now(),
  constraint conversations_unique_pair unique (student_id, trainer_id)
);
create index conversations_trainer_idx on public.conversations(trainer_id);
create index conversations_student_idx on public.conversations(student_id);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(btrim(body)) > 0),
  created_at timestamptz not null default now()
);
create index messages_conversation_idx on public.messages(conversation_id, created_at);

-- ============================================================
-- Vista: promedio de puntaje y cantidad de reseñas por preparador
-- ============================================================
create view public.trainer_rating_summary
with (security_invoker = true) as
select
  trainer_id,
  round(avg(rating)::numeric, 2) as avg_rating,
  count(*)::int as reviews_count
from public.reviews
group by trainer_id;
