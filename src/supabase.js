// Clientes Supabase usados pelo backend
const { createClient } = require('@supabase/supabase-js');

// Cliente com service role: ignora RLS. NUNCA expor essa chave no frontend.
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// Cliente anônimo: usado apenas para login (email/senha)
const supabaseAnon = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

module.exports = { supabase, supabaseAnon };
