// Cria o primeiro usuário administrador.
// Uso: node scripts/criar-admin.js "Nome" email@fazenda.com senha123
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

(async () => {
  const [nome, email, senha] = process.argv.slice(2);
  if (!nome || !email || !senha) {
    console.log('Uso: npm run criar-admin -- "Seu Nome" email@fazenda.com suaSenha');
    process.exit(1);
  }
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { data, error } = await supabase.auth.admin.createUser({ email, password: senha, email_confirm: true });
  if (error) { console.error('Erro no Auth:', error.message); process.exit(1); }
  const { data: perfil } = await supabase.from('perfis').select('id').eq('nome', 'administrador').single();
  const { error: e2 } = await supabase.from('usuarios').insert({ id: data.user.id, nome, email, perfil_id: perfil.id });
  if (e2) { console.error('Erro na tabela usuarios:', e2.message); process.exit(1); }
  console.log('Administrador criado com sucesso! Faça login com', email);
})();
