-- Límites de largo en campos de texto libre: evita abuso (mensajes/comentarios
-- gigantes) y le pone un techo razonable a todo lo que carga el usuario.
-- Correr después de 006_security_fixes.sql. El frontend además usa
-- maxlength en los inputs para avisar antes de mandar el form.

alter table public.profiles
  add constraint profiles_full_name_length check (char_length(full_name) <= 100),
  add constraint profiles_bio_length check (bio is null or char_length(bio) <= 500),
  add constraint profiles_city_length check (city is null or char_length(city) <= 100),
  add constraint profiles_certifications_length check (certifications is null or char_length(certifications) <= 500),
  add constraint profiles_current_focus_length check (current_focus is null or char_length(current_focus) <= 300);

alter table public.routines
  add constraint routines_title_length check (char_length(title) <= 120),
  add constraint routines_description_length check (description is null or char_length(description) <= 1000);

alter table public.pricing_items
  add constraint pricing_title_length check (char_length(title) <= 120),
  add constraint pricing_description_length check (description is null or char_length(description) <= 500);

alter table public.availability_slots
  add constraint availability_label_length check (label is null or char_length(label) <= 100);

alter table public.reviews
  add constraint reviews_comment_length check (comment is null or char_length(comment) <= 1000);

alter table public.review_replies
  add constraint replies_body_length check (char_length(body) <= 1000);

alter table public.messages
  add constraint messages_body_length check (char_length(body) <= 2000);
