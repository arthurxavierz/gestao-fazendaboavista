// =====================================================================
// API genérica: /api/dados/:tabela
// Aplica permissões por perfil, filtro "somente próprios" para operador,
// ocultação de campos financeiros, exclusão lógica e log de alterações.
// =====================================================================
const express = require('express');
const { supabase } = require('../supabase');
const TABELAS = require('../config/tabelas');

const router = express.Router();

function cfg(req, res) {
  const c = TABELAS[req.params.tabela];
  if (!c) { res.status(404).json({ erro: 'Recurso não encontrado.' }); return null; }
  return c;
}
function pode(c, perfil, letra) {
  return (c.perms[perfil] || '').includes(letra);
}
function ocultarCampos(rows, c, perfil) {
  const ocultos = [
    ...(perfil === 'operador' ? c.ocultarOperador || [] : []),
    ...((c.ocultar && c.ocultar[perfil]) || []),
  ];
  if (!ocultos.length) return rows;
  const limpa = (r) => { const o = { ...r }; ocultos.forEach((k) => delete o[k]); return o; };
  return Array.isArray(rows) ? rows.map(limpa) : limpa(rows);
}
async function log(tabela, registroId, acao, anteriores, motivo, usuarioId) {
  await supabase.from('logs_alteracao').insert({
    tabela, registro_id: registroId, acao,
    dados_anteriores: anteriores || null, motivo: motivo || null, usuario_id: usuarioId,
  });
}

// ------------------------- LISTAR -------------------------
router.get('/:tabela', async (req, res) => {
  const c = cfg(req, res); if (!c) return;
  const { perfil, id: uid } = req.usuario;
  if (!pode(c, perfil, 'r')) return res.status(403).json({ erro: 'Sem permissão de consulta.' });

  const select = c.relacoes ? `*, ${c.relacoes}` : '*';
  let q = supabase.from(req.params.tabela).select(select, { count: 'exact' });

  // operador enxerga apenas os próprios registros nas tabelas marcadas
  if (perfil === 'operador' && c.somenteProprios) {
    const dono = c.donoCampo || 'criado_por';
    q = q.or(`${dono}.eq.${uid},criado_por.eq.${uid}`);
  }
  // filtros simples: ?campo=valor  |  paginação: ?limit & ?offset  |  busca: ?busca=texto&campoBusca=nome
  const reservados = ['limit', 'offset', 'order', 'busca', 'campoBusca'];
  for (const [k, v] of Object.entries(req.query)) {
    if (!reservados.includes(k)) q = q.eq(k, v);
  }
  if (req.query.busca && req.query.campoBusca) q = q.ilike(req.query.campoBusca, `%${req.query.busca}%`);
  const order = req.query.order || 'created_at.desc';
  const [col, dir] = order.split('.');
  q = q.order(col, { ascending: dir !== 'desc' });
  q = q.range(Number(req.query.offset || 0), Number(req.query.offset || 0) + Number(req.query.limit || 100) - 1);

  const { data, error, count } = await q;
  if (error) return res.status(400).json({ erro: error.message });
  res.json({ dados: ocultarCampos(data, c, perfil), total: count });
});

// ------------------------- OBTER UM -------------------------
router.get('/:tabela/:id', async (req, res) => {
  const c = cfg(req, res); if (!c) return;
  const { perfil } = req.usuario;
  if (!pode(c, perfil, 'r')) return res.status(403).json({ erro: 'Sem permissão de consulta.' });
  const select = c.relacoes ? `*, ${c.relacoes}` : '*';
  const { data, error } = await supabase.from(req.params.tabela).select(select).eq('id', req.params.id).single();
  if (error) return res.status(404).json({ erro: 'Registro não encontrado.' });
  res.json(ocultarCampos(data, c, perfil));
});

// ------------------------- CRIAR -------------------------
router.post('/:tabela', async (req, res) => {
  const c = cfg(req, res); if (!c) return;
  const { perfil, id: uid } = req.usuario;
  if (!pode(c, perfil, 'c')) return res.status(403).json({ erro: 'Sem permissão para criar.' });

  const corpo = { ...req.body };
  if ('criado_por' in corpo || true) corpo.criado_por = uid; // rastreabilidade
  delete corpo.id; delete corpo.created_at; delete corpo.updated_at;

  const { data, error } = await supabase.from(req.params.tabela).insert(corpo).select().single();
  if (error) return res.status(400).json({ erro: error.message });
  await log(req.params.tabela, data.id, 'criacao', null, null, uid);
  res.status(201).json(data);
});

// ------------------------- EDITAR -------------------------
router.put('/:tabela/:id', async (req, res) => {
  const c = cfg(req, res); if (!c) return;
  const { perfil, id: uid } = req.usuario;
  if (!pode(c, perfil, 'u')) return res.status(403).json({ erro: 'Sem permissão para editar.' });

  const { data: atual } = await supabase.from(req.params.tabela).select('*').eq('id', req.params.id).single();
  if (!atual) return res.status(404).json({ erro: 'Registro não encontrado.' });

  let corpo = { ...req.body };
  delete corpo.id; delete corpo.created_at; delete corpo.updated_at; delete corpo.criado_por;

  // operador: só edita registros próprios e apenas os campos liberados
  if (perfil === 'operador') {
    const dono = c.donoCampo || 'criado_por';
    if (atual[dono] !== uid && atual.criado_por !== uid)
      return res.status(403).json({ erro: 'Você só pode alterar seus próprios registros.' });
    if (c.camposEditaveisOperador) {
      corpo = Object.fromEntries(Object.entries(corpo).filter(([k]) => c.camposEditaveisOperador.includes(k)));
    }
  }

  const { data, error } = await supabase.from(req.params.tabela).update(corpo).eq('id', req.params.id).select().single();
  if (error) return res.status(400).json({ erro: error.message });
  await log(req.params.tabela, req.params.id, 'edicao', atual, req.body.motivo_alteracao, uid);
  res.json(data);
});

// ------------------------- EXCLUIR / CANCELAR -------------------------
router.delete('/:tabela/:id', async (req, res) => {
  const c = cfg(req, res); if (!c) return;
  const { perfil, id: uid } = req.usuario;
  if (!pode(c, perfil, 'd')) return res.status(403).json({ erro: 'Sem permissão para excluir.' });

  const { data: atual } = await supabase.from(req.params.tabela).select('*').eq('id', req.params.id).single();
  if (!atual) return res.status(404).json({ erro: 'Registro não encontrado.' });

  // Tabelas protegidas nunca são apagadas: cancelamento (exclusão lógica)
  if (c.protegida) {
    const novo = 'status' in atual ? { status: atual.status === 'pendente' ? 'cancelado' : 'cancelado' } : { ativo: false };
    const { error } = await supabase.from(req.params.tabela).update({ ...novo, motivo_alteracao: req.query.motivo || 'Cancelado pelo usuário' }).eq('id', req.params.id);
    if (error) return res.status(400).json({ erro: error.message });
    await log(req.params.tabela, req.params.id, 'cancelamento', atual, req.query.motivo, uid);
    return res.json({ ok: true, cancelado: true });
  }

  if ('ativo' in atual) {
    await supabase.from(req.params.tabela).update({ ativo: false }).eq('id', req.params.id);
    await log(req.params.tabela, req.params.id, 'exclusao_logica', atual, req.query.motivo, uid);
    return res.json({ ok: true });
  }

  const { error } = await supabase.from(req.params.tabela).delete().eq('id', req.params.id);
  if (error) return res.status(400).json({ erro: error.message });
  await log(req.params.tabela, req.params.id, 'exclusao_logica', atual, req.query.motivo, uid);
  res.json({ ok: true });
});

module.exports = router;
