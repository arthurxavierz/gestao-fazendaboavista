// Login via Supabase Auth + gestão de usuários (admin)
const express = require('express');
const { supabase, supabaseAnon } = require('../supabase');
const { autenticar, exigirPerfil } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/login { email, senha }
router.post('/login', async (req, res) => {
  const { email, senha } = req.body;
  if (!email || !senha) return res.status(400).json({ erro: 'Informe e-mail e senha.' });

  const { data, error } = await supabaseAnon.auth.signInWithPassword({ email, password: senha });
  if (error) return res.status(401).json({ erro: 'E-mail ou senha inválidos.' });

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('id, nome, email, ativo, perfis(nome)')
    .eq('id', data.user.id).single();

  if (!usuario || !usuario.ativo)
    return res.status(403).json({ erro: 'Usuário sem acesso ao sistema. Fale com o administrador.' });

  res.json({
    token: data.session.access_token,
    usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email, perfil: usuario.perfis.nome },
  });
});

// POST /api/auth/usuarios (admin cria usuário no Auth + tabela usuarios)
// body: { nome, email, senha, perfil_id, funcionario_id }
router.post('/usuarios', autenticar, exigirPerfil('administrador'), async (req, res) => {
  const { nome, email, senha, perfil_id, funcionario_id } = req.body;
  if (!nome || !email || !senha || !perfil_id)
    return res.status(400).json({ erro: 'Informe nome, e-mail, senha e perfil.' });

  const { data, error } = await supabase.auth.admin.createUser({
    email, password: senha, email_confirm: true,
  });
  if (error) return res.status(400).json({ erro: error.message });

  const { data: usuario, error: e2 } = await supabase.from('usuarios').insert({
    id: data.user.id, nome, email, perfil_id, funcionario_id: funcionario_id || null,
  }).select().single();
  if (e2) return res.status(400).json({ erro: e2.message });

  res.status(201).json(usuario);
});

// GET /api/auth/eu
router.get('/eu', autenticar, (req, res) => res.json(req.usuario));

module.exports = router;
