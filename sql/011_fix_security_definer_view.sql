-- Reemplaza la vista profile_identities (marcada CRITICAL por el linter de
-- seguridad de Supabase: "Security Definer View") por una función. Mismo
-- propósito — dejar ver nombre/avatar de cualquier perfil para poder
-- mostrar "quién" dejó una reseña o te escribe, sin exponer el resto del
-- perfil — pero las funciones security definer son el patrón que Supabase
-- recomienda para esto en vez de vistas: el alcance queda explícito en la
-- firma (qué recibe, qué devuelve) en lugar de ser una tabla siempre abierta.
-- Correr después de 010_required_city_visibility_follows.sql.

create or replace function public.get_profile_identities(profile_ids uuid[])
returns table (id uuid, full_name text, avatar_url text)
language sql
security definer
set search_path = public
stable
as $$
  select p.id, p.full_name, p.avatar_url
  from public.profiles p
  where p.id = any(profile_ids);
$$;

revoke all on function public.get_profile_identities(uuid[]) from public;
grant execute on function public.get_profile_identities(uuid[]) to authenticated;

drop view public.profile_identities;
