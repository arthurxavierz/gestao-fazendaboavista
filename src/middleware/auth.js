// Autenticação (token do Supabase Auth) + carregamento do perfil
const { supabase } = require('../supabase');

async function autenticar(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ erro: 'Não autenticado.' });

    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) return res.status(401).json({ erro: 'Sessão inválida ou expirada.' });

    const { data: usuario } = await supabase
      .from('usuarios')
      .select('id, nome, email, ativo, perfil_id, perfis(nome)')
      .eq('id', data.user.id)
      .single();

    if (!usuario || !usuario.ativo)
      return res.status(403).json({ erro: 'Usuário sem acesso ao sistema.' });

    req.usuario = {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      perfil: usuario.perfis.nome, // administrador | operador | administrativo
    };
    next();
  } catch (e) {
    res.status(500).json({ erro: 'Falha na autenticação.' });
  }
}

function exigirPerfil(...perfis) {
  return (req, res, next) => {
    if (!perfis.includes(req.usuario.perfil))
      return res.status(403).json({ erro: 'Seu perfil não tem permissão para esta ação.' });
    next();
  };
}

module.exports = { autenticar, exigirPerfil };
