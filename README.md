# Entrenapp

Web para conectar alumnos con preparadores físicos freelance. Los alumnos puntúan, comentan y le mandan mensajes privados a los preparadores; los preparadores publican rutinas, su estado semanal, turnos disponibles, precios y promos, y responden comentarios y mensajes.

Sitio 100% estático (HTML + CSS + JavaScript, sin build step, sin npm) con [Supabase](https://supabase.com) como backend (base de datos + login + mensajería en tiempo real). No hace falta instalar nada para tocar el código.

## Probarlo en tu computadora

Parado en esta carpeta:

```bash
python3 -m http.server 8000
```

Y abrí **http://localhost:8000/index.html** en el navegador. Importante: siempre por `http://localhost:...`, nunca abriendo el archivo `.html` con doble clic — el navegador bloquea los módulos de JavaScript y la conexión a Supabase si se abre como `file://`.

Mientras no hayas conectado un proyecto de Supabase real (ver siguiente sección), vas a poder ver las páginas pero el login, los datos y los mensajes no van a funcionar todavía.

## Poner en marcha el backend (Supabase)

1. Creá una cuenta y un proyecto nuevo en [supabase.com](https://supabase.com) (plan gratis alcanza para arrancar). Guardá la contraseña de base de datos que te pida en un gestor de contraseñas.
2. Andá a **SQL Editor** y corré, en este orden, uno por vez, el contenido de cada archivo de la carpeta `sql/`:
   1. `001_schema.sql`
   2. `002_functions_and_triggers.sql`
   3. `003_rls_policies.sql`
   4. `004_storage.sql`
   5. `005_routine_media.sql`
   6. `006_security_fixes.sql`
3. Andá a **Authentication → Providers → Email** y apagá "Confirm email" — así, al registrarse, el usuario queda logueado directo sin tener que revisar el mail.
4. Andá a **Project Settings → API** y copiá el "Project URL" y la key "anon public".
5. Pegá esos dos valores en [`js/config.js`](js/config.js):
   ```js
   export const SUPABASE_URL = "https://tu-proyecto.supabase.co";
   export const SUPABASE_ANON_KEY = "tu-anon-key";
   ```
   La anon key es segura de dejar así, a la vista y commiteada — no es un secreto. Lo que protege los datos son las políticas de seguridad (RLS) que ya quedaron cargadas en el paso 2, no esta key.

## Publicarlo online (Netlify + GitHub)

1. Creá un repositorio vacío en [github.com/new](https://github.com/new) (sin tildar README/gitignore/licencia).
2. Desde esta carpeta:
   ```bash
   git init
   git add .
   git commit -m "Primera versión del sitio"
   git branch -M main
   git remote add origin https://github.com/TU-USUARIO/TU-REPO.git
   git push -u origin main
   ```
3. Creá una cuenta en [netlify.com](https://netlify.com) → **Add new site → Import an existing project** → autorizá GitHub → elegí el repo.
4. En la configuración de build dejá **Build command vacío** y **Publish directory** en `.` (un punto) — no hay nada que compilar.
5. Una vez deployado, copiá la URL que te da Netlify (ej. `https://tu-sitio.netlify.app`) y pegala en Supabase, en **Authentication → URL Configuration**, tanto en "Site URL" como en "Redirect URLs".
6. De acá en adelante, para publicar cualquier cambio alcanza con `git add`, `git commit` y `git push` — Netlify redeploya solo en cada push.

Nota: el plan gratis de Supabase pausa el proyecto si no recibe actividad por ~7 días. No se pierde nada, pero hay que "despausarlo" con un clic desde el dashboard si quedó inactivo mucho tiempo.

## Estructura del proyecto

```
index.html, login.html, signup.html, ...    Una página por vista
css/                                          Estilos (base, componentes, layout)
js/config.js                                  Credenciales de Supabase (editar acá)
js/supabaseClient.js, auth.js, guard.js       Conexión, login y protección de páginas
js/components/                                <site-header> y <star-rating> (web components)
js/data/                                       Una función por operación contra la base de datos
js/pages/                                      Un controlador por página HTML
js/utils/                                      Helpers chicos (DOM, formato de fechas/moneda, toasts)
sql/                                           Esquema de base de datos, en el orden que hay que correrlo
```

## Qué queda afuera de esta primera versión

Cambiar de rol o borrar la cuenta después de registrarse, marcar mensajes como leídos, rutinas asignadas a un alumno puntual (hoy son un portfolio público del preparador), moderación automática de contenido. Se puede agregar todo esto más adelante sin rehacer lo que ya está.
