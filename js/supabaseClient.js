// Cliente único de Supabase, importado por CDN (sin npm, sin build step).
// Cada página crea su propia instancia al cargar; todas comparten la misma
// sesión porque supabase-js la persiste en localStorage (mismo origen).
// "?bundle" evita el bug intermitente de esm.sh al resolver los archivos
// internos por separado para la versión flotante "@2" (confirmado probando
// en vivo: sin bundle, la carga fallaba; con bundle, con versión fija, y por
// jsdelivr, las tres andaban bien — bundle es la que mantiene "última v2.x").
import { createClient } from "https://esm.sh/@supabase/supabase-js@2?bundle";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
