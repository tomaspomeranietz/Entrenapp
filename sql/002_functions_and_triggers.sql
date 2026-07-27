-- Funciones y triggers de mantenimiento + alta automática de perfil al registrarse.
-- Correr después de 001_schema.sql.

-- ============================================================
-- updated_at automático en cada UPDATE
-- ============================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();

create trigger trg_routines_updated_at
  before update on public.routines
  for each row execute procedure public.set_updated_at();

create trigger trg_availability_updated_at
  before update on public.availability_slots
  for each row execute procedure public.set_updated_at();

create trigger trg_pricing_updated_at
  before update on public.pricing_items
  for each row execute procedure public.set_updated_at();

create trigger trg_reviews_updated_at
  before update on public.reviews
  for each row execute procedure public.set_updated_at();

create trigger trg_replies_updated_at
  before update on public.review_replies
  for each row execute procedure public.set_updated_at();

-- ============================================================
-- Alta automática de profiles al registrarse (lee role/full_name de la metadata
-- que manda el signup). El cliente nunca inserta directo en profiles.
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, role, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'role', 'alumno'),
    coalesce(new.raw_user_meta_data ->> 'full_name', 'Usuario')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- Bloquea que un usuario cambie su propio rol después del signup
-- (evita escalada de privilegios vía UPDATE profiles SET role='preparador').
-- ============================================================
create or replace function public.prevent_role_change()
returns trigger
language plpgsql
as $$
begin
  if new.role is distinct from old.role then
    raise exception 'No se puede cambiar el rol de un perfil existente';
  end if;
  return new;
end;
$$;

create trigger trg_profiles_lock_role
  before update on public.profiles
  for each row execute procedure public.prevent_role_change();

-- Nota operativa: si algún día necesitás corregir un rol mal elegido a mano
-- desde el SQL Editor, este trigger también te va a bloquear a vos. Para eso:
--   alter table public.profiles disable trigger trg_profiles_lock_role;
--   update public.profiles set role = '...' where id = '...';
--   alter table public.profiles enable trigger trg_profiles_lock_role;

-- ============================================================
-- Actualiza conversations.last_message_at cada vez que llega un mensaje
-- (así la bandeja de mensajes se puede ordenar por actividad reciente).
-- ============================================================
create or replace function public.touch_conversation()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  update public.conversations
  set last_message_at = new.created_at
  where id = new.conversation_id;
  return new;
end;
$$;

create trigger trg_messages_touch_conversation
  after insert on public.messages
  for each row execute procedure public.touch_conversation();

-- ============================================================
-- Habilita Realtime (eventos en vivo) para la tabla de mensajes.
-- Sin esto, el chat funciona pero no llegan mensajes nuevos sin refrescar.
-- ============================================================
alter publication supabase_realtime add table public.messages;
