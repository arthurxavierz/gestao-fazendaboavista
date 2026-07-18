// =====================================================================
// Regras de negócio e integrações entre módulos
// =====================================================================
const express = require('express');
const { supabase } = require('../supabase');
const { exigirPerfil } = require('../middleware/auth');

const router = express.Router();
const FIN = ['administrador', 'administrativo'];

async function log(tabela, registroId, acao, anteriores, motivo, usuarioId) {
  await supabase.from('logs_alteracao').insert({ tabela, registro_id: registroId, acao, dados_anteriores: anteriores || null, motivo, usuario_id: usuarioId });
}

// ---------------------------------------------------------------------
// SALDOS DE ESTOQUE (view calculada) — operador vê sem valores
// ---------------------------------------------------------------------
router.get('/estoque/saldos', async (req, res) => {
  const { data, error } = await supabase.from('vw_saldo_estoque').select('*').eq('status', 'ativo').order('nome');
  if (error) return res.status(400).json({ erro: error.message });
  const hoje = new Date().toISOString().slice(0, 10);
  const em30 = new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10);
  let dados = data.map((p) => ({
    ...p,
    abaixo_minimo: Number(p.saldo) < Number(p.estoque_minimo),
    vencido: p.validade && p.validade < hoje,
    vencendo: p.validade && p.validade >= hoje && p.validade <= em30,
  }));
  if (req.usuario.perfil === 'operador') dados = dados.map(({ valor_unitario, ...r }) => r);
  res.json({ dados });
});

// ---------------------------------------------------------------------
// CONTAS A PAGAR -> PAGAR (gera despesa no caixa, vínculo 1:1)
// ---------------------------------------------------------------------
router.post('/contas-pagar/:id/pagar', exigirPerfil(...FIN), async (req, res) => {
  const { id } = req.params;
  const { data_pagamento, forma_pagamento } = req.body;
  const { data: conta } = await supabase.from('contas_pagar').select('*').eq('id', id).single();
  if (!conta) return res.status(404).json({ erro: 'Conta não encontrada.' });
  if (conta.status === 'pago') return res.status(400).json({ erro: 'Esta conta já foi paga.' });
  if (conta.status === 'cancelado') return res.status(400).json({ erro: 'Conta cancelada não pode ser paga.' });

  // constraint UNIQUE em lancamentos_caixa.conta_pagar_id impede duplicação
  const { data: lanc, error: e1 } = await supabase.from('lancamentos_caixa').insert({
    data: data_pagamento || new Date().toISOString().slice(0, 10),
    tipo: 'despesa',
    categoria_id: conta.categoria_id,
    atividade_id: conta.atividade_id,
    descricao: `Pagamento: ${conta.descricao}`,
    valor: conta.valor,
    forma_pagamento: forma_pagamento || conta.forma_pagamento,
    conta_pagar_id: conta.id,
    criado_por: req.usuario.id,
  }).select().single();
  if (e1) return res.status(400).json({ erro: 'Não foi possível lançar no caixa: ' + e1.message });

  await supabase.from('contas_pagar').update({
    status: 'pago',
    data_pagamento: data_pagamento || new Date().toISOString().slice(0, 10),
    forma_pagamento: forma_pagamento || conta.forma_pagamento,
  }).eq('id', id);
  await log('contas_pagar', id, 'edicao', conta, 'Baixa de pagamento', req.usuario.id);
  res.json({ ok: true, lancamento: lanc });
});

// ---------------------------------------------------------------------
// CONTAS A RECEBER -> RECEBER (gera receita no caixa, vínculo 1:1)
// ---------------------------------------------------------------------
router.post('/contas-receber/:id/receber', exigirPerfil(...FIN), async (req, res) => {
  const { id } = req.params;
  const { data_recebimento, forma_recebimento } = req.body;
  const { data: conta } = await supabase.from('contas_receber').select('*').eq('id', id).single();
  if (!conta) return res.status(404).json({ erro: 'Conta não encontrada.' });
  if (conta.status === 'recebido') return res.status(400).json({ erro: 'Esta conta já foi recebida.' });
  if (conta.status === 'cancelado') return res.status(400).json({ erro: 'Conta cancelada não pode ser recebida.' });

  const { data: catVenda } = await supabase.from('categorias_financeiras').select('id').eq('nome', 'Venda de produção').single();
  const { data: lanc, error: e1 } = await supabase.from('lancamentos_caixa').insert({
    data: data_recebimento || new Date().toISOString().slice(0, 10),
    tipo: 'receita',
    categoria_id: catVenda?.id || null,
    atividade_id: conta.atividade_id,
    descricao: `Recebimento: ${conta.descricao}`,
    valor: conta.valor,
    forma_pagamento: forma_recebimento,
    conta_receber_id: conta.id,
    criado_por: req.usuario.id,
  }).select().single();
  if (e1) return res.status(400).json({ erro: 'Não foi possível lançar no caixa: ' + e1.message });

  await supabase.from('contas_receber').update({
    status: 'recebido',
    data_recebimento: data_recebimento || new Date().toISOString().slice(0, 10),
    forma_recebimento,
  }).eq('id', id);
  await log('contas_receber', id, 'edicao', conta, 'Baixa de recebimento', req.usuario.id);
  res.json({ ok: true, lancamento: lanc });
});

// ---------------------------------------------------------------------
// COMPRA -> CONFIRMAR RECEBIMENTO (entrada no estoque + conta a pagar)
// body: { gerar_conta: true, data_vencimento: 'YYYY-MM-DD' }
// ---------------------------------------------------------------------
router.post('/compras/:id/receber', exigirPerfil(...FIN), async (req, res) => {
  const { id } = req.params;
  const { data: compra } = await supabase.from('compras')
    .select('*, itens_compra(*), fornecedores(nome)').eq('id', id).single();
  if (!compra) return res.status(404).json({ erro: 'Compra não encontrada.' });
  if (compra.status === 'recebida') return res.status(400).json({ erro: 'Compra já recebida.' });
  if (compra.status === 'cancelada') return res.status(400).json({ erro: 'Compra cancelada.' });
  if (!compra.itens_compra?.length) return res.status(400).json({ erro: 'A compra não possui itens.' });

  // 1) entrada de estoque por item, vinculada à compra
  const movs = compra.itens_compra.map((i) => ({
    produto_id: i.produto_id,
    tipo: 'entrada_compra',
    quantidade: i.quantidade,
    data: compra.data,
    compra_id: compra.id,
    atividade_id: compra.atividade_id,
    origem: compra.fornecedores?.nome || 'Fornecedor',
    responsavel_id: req.usuario.id,
    criado_por: req.usuario.id,
  }));
  const { error: e1 } = await supabase.from('movimentacoes_estoque').insert(movs);
  if (e1) return res.status(400).json({ erro: 'Falha na entrada de estoque: ' + e1.message });

  const total = compra.itens_compra.reduce((s, i) => s + Number(i.valor_total), 0);
  await supabase.from('compras').update({ status: 'recebida', valor_total: total }).eq('id', id);

  // 2) conta a pagar vinculada (opcional)
  let conta = null;
  if (req.body.gerar_conta) {
    const { data: cat } = await supabase.from('categorias_financeiras').select('id').eq('nome', 'Insumos').single();
    const r = await supabase.from('contas_pagar').insert({
      fornecedor_id: compra.fornecedor_id,
      descricao: `Compra ${compra.numero_documento || ''} - ${compra.fornecedores?.nome || ''}`.trim(),
      categoria_id: cat?.id || null,
      atividade_id: compra.atividade_id,
      data_emissao: compra.data,
      data_vencimento: req.body.data_vencimento || compra.data,
      valor: total,
      forma_pagamento: compra.forma_pagamento,
      compra_id: compra.id,
      criado_por: req.usuario.id,
    }).select().single();
    conta = r.data;
  }
  await log('compras', id, 'edicao', compra, 'Recebimento confirmado', req.usuario.id);
  res.json({ ok: true, valor_total: total, conta_pagar: conta });
});

// ---------------------------------------------------------------------
// VENDA -> CONFIRMAR (saída de estoque com validação de saldo + conta a receber)
// body: { gerar_conta: true, baixar_estoque: true, autorizar_saldo_negativo: false, motivo }
// ---------------------------------------------------------------------
router.post('/vendas/:id/confirmar', exigirPerfil(...FIN), async (req, res) => {
  const { id } = req.params;
  const { data: venda } = await supabase.from('vendas')
    .select('*, itens_venda(*), clientes(nome)').eq('id', id).single();
  if (!venda) return res.status(404).json({ erro: 'Venda não encontrada.' });
  if (venda.status === 'confirmada') return res.status(400).json({ erro: 'Venda já confirmada.' });
  if (venda.status === 'cancelada') return res.status(400).json({ erro: 'Venda cancelada.' });
  if (!venda.itens_venda?.length) return res.status(400).json({ erro: 'A venda não possui itens.' });

  const baixar = req.body.baixar_estoque !== false;
  if (baixar) {
    // RN09: não vender acima do saldo, salvo autorização do administrador
    for (const item of venda.itens_venda) {
      const { data: s } = await supabase.from('vw_saldo_estoque').select('saldo,nome').eq('produto_id', item.produto_id).single();
      if (s && Number(s.saldo) < Number(item.quantidade)) {
        const autorizado = req.body.autorizar_saldo_negativo && req.usuario.perfil === 'administrador';
        if (!autorizado) {
          return res.status(400).json({ erro: `Saldo insuficiente de "${s.nome}" (disponível: ${s.saldo}). O administrador pode autorizar informando um motivo.` });
        }
      }
    }
    const movs = venda.itens_venda.map((i) => ({
      produto_id: i.produto_id,
      tipo: 'saida_venda',
      quantidade: i.quantidade,
      data: venda.data,
      venda_id: venda.id,
      atividade_id: venda.atividade_id,
      destino: venda.clientes?.nome || 'Cliente',
      motivo: req.body.motivo || null,
      responsavel_id: req.usuario.id,
      criado_por: req.usuario.id,
    }));
    const { error: e1 } = await supabase.from('movimentacoes_estoque').insert(movs);
    if (e1) return res.status(400).json({ erro: 'Falha na saída de estoque: ' + e1.message });
  }

  const total = venda.itens_venda.reduce((s, i) => s + Number(i.valor_total), 0);
  await supabase.from('vendas').update({ status: 'confirmada', valor_total: total }).eq('id', id);

  let conta = null;
  if (req.body.gerar_conta) {
    const r = await supabase.from('contas_receber').insert({
      cliente_id: venda.cliente_id,
      descricao: `Venda para ${venda.clientes?.nome || 'cliente'}`,
      atividade_id: venda.atividade_id,
      data_emissao: venda.data,
      data_vencimento: venda.data_vencimento || venda.data,
      valor: total,
      forma_recebimento: venda.forma_pagamento,
      venda_id: venda.id,
      criado_por: req.usuario.id,
    }).select().single();
    conta = r.data;
  }
  await log('vendas', id, 'edicao', venda, 'Venda confirmada', req.usuario.id);
  res.json({ ok: true, valor_total: total, conta_receber: conta });
});

// ---------------------------------------------------------------------
// CHECKLIST COMPLETO (checklist + respostas + medidor + ocorrências)
// body: { modelo_id, maquina_id, horimetro, km, observacoes, foto_url,
//         latitude, longitude, respostas: [{item_id, resposta, observacao}] }
// ---------------------------------------------------------------------
router.post('/checklists/executar', async (req, res) => {
  const b = req.body;
  if (!b.modelo_id || !b.maquina_id || !b.respostas?.length)
    return res.status(400).json({ erro: 'Informe o modelo, a máquina e as respostas.' });

  // RN12: alerta de medidor menor que o último
  const { data: maq } = await supabase.from('maquinas').select('*').eq('id', b.maquina_id).single();
  if (!b.forcar_medidor) {
    if (b.horimetro && maq?.horimetro_atual && Number(b.horimetro) < Number(maq.horimetro_atual))
      return res.status(409).json({ erro: `Horímetro informado (${b.horimetro}) é menor que o último registrado (${maq.horimetro_atual}). Confirme para continuar.`, confirmar: true });
    if (b.km && maq?.km_atual && Number(b.km) < Number(maq.km_atual))
      return res.status(409).json({ erro: `Km informado (${b.km}) é menor que o último registrado (${maq.km_atual}). Confirme para continuar.`, confirmar: true });
  }

  const { data: chk, error: e1 } = await supabase.from('checklists').insert({
    modelo_id: b.modelo_id, maquina_id: b.maquina_id, operador_id: req.usuario.id,
    horimetro: b.horimetro || null, km: b.km || null,
    observacoes: b.observacoes || null, foto_url: b.foto_url || null,
    confirmado: true, latitude: b.latitude || null, longitude: b.longitude || null,
  }).select().single();
  if (e1) return res.status(400).json({ erro: e1.message });

  const respostas = b.respostas.map((r) => ({ checklist_id: chk.id, item_id: r.item_id, resposta: r.resposta, observacao: r.observacao || null }));
  await supabase.from('respostas_checklist').insert(respostas);

  // histórico de medidores + atualização da máquina (RN13)
  if (b.horimetro || b.km) {
    await supabase.from('historico_medidores').insert({ maquina_id: b.maquina_id, horimetro: b.horimetro || null, km: b.km || null, origem: 'checklist', usuario_id: req.usuario.id });
    const upd = {};
    if (b.horimetro) upd.horimetro_atual = b.horimetro;
    if (b.km) upd.km_atual = b.km;
    await supabase.from('maquinas').update(upd).eq('id', b.maquina_id);
  }

  // não conformidades -> ocorrências (RN11)
  const naoConformes = b.respostas.filter((r) => r.resposta === 'nao_conforme');
  const ocorrencias = [];
  if (b.gerar_ocorrencias !== false) {
    for (const nc of naoConformes) {
      const { data: item } = await supabase.from('itens_modelo_checklist').select('descricao').eq('id', nc.item_id).single();
      const { data: oc } = await supabase.from('ocorrencias').insert({
        operador_id: req.usuario.id, categoria: 'falha_mecanica', maquina_id: b.maquina_id,
        checklist_id: chk.id, descricao: `Não conformidade no checklist: ${item?.descricao || 'item'}${nc.observacao ? ' - ' + nc.observacao : ''}`,
        prioridade: 'media', criado_por: req.usuario.id,
      }).select().single();
      ocorrencias.push(oc);
    }
  }
  await log('checklists', chk.id, 'criacao', null, null, req.usuario.id);
  res.status(201).json({ ok: true, checklist: chk, ocorrencias_geradas: ocorrencias.length });
});

// ---------------------------------------------------------------------
// ABASTECIMENTO (valor total automático + medidores)
// ---------------------------------------------------------------------
router.post('/abastecimentos/registrar', async (req, res) => {
  const b = req.body;
  if (!b.maquina_id || !b.litros || b.valor_litro == null || !b.tipo_combustivel)
    return res.status(400).json({ erro: 'Informe máquina, combustível, litros e valor por litro.' });

  const { data: maq } = await supabase.from('maquinas').select('*').eq('id', b.maquina_id).single();
  if (!b.forcar_medidor) {
    if (b.horimetro && maq?.horimetro_atual && Number(b.horimetro) < Number(maq.horimetro_atual))
      return res.status(409).json({ erro: `Horímetro informado (${b.horimetro}) é menor que o último registrado (${maq.horimetro_atual}). Confirme para continuar.`, confirmar: true });
    if (b.km && maq?.km_atual && Number(b.km) < Number(maq.km_atual))
      return res.status(409).json({ erro: `Km informado (${b.km}) é menor que o último registrado (${maq.km_atual}). Confirme para continuar.`, confirmar: true });
  }

  const { data: ab, error } = await supabase.from('abastecimentos').insert({
    data: b.data || new Date().toISOString().slice(0, 10),
    maquina_id: b.maquina_id, operador_id: req.usuario.id,
    tipo_combustivel: b.tipo_combustivel, litros: b.litros, valor_litro: b.valor_litro,
    horimetro: b.horimetro || null, km: b.km || null,
    origem: b.origem || null, foto_url: b.foto_url || null, observacoes: b.observacoes || null,
    criado_por: req.usuario.id,
  }).select().single();
  if (error) return res.status(400).json({ erro: error.message });

  if (b.horimetro || b.km) {
    await supabase.from('historico_medidores').insert({ maquina_id: b.maquina_id, horimetro: b.horimetro || null, km: b.km || null, origem: 'abastecimento', usuario_id: req.usuario.id });
    const upd = {};
    if (b.horimetro) upd.horimetro_atual = b.horimetro;
    if (b.km) upd.km_atual = b.km;
    await supabase.from('maquinas').update(upd).eq('id', b.maquina_id);
  }
  // baixa opcional no estoque de combustível (tanque da fazenda)
  if (b.produto_combustivel_id) {
    await supabase.from('movimentacoes_estoque').insert({
      produto_id: b.produto_combustivel_id, tipo: 'saida_utilizacao', quantidade: b.litros,
      data: ab.data, maquina_id: b.maquina_id, motivo: 'Abastecimento',
      responsavel_id: req.usuario.id, criado_por: req.usuario.id,
    });
  }
  await log('abastecimentos', ab.id, 'criacao', null, null, req.usuario.id);
  const resposta = req.usuario.perfil === 'operador' ? (({ valor_litro, valor_total, ...r }) => r)(ab) : ab;
  res.status(201).json({ ok: true, abastecimento: resposta });
});

// resumo de combustível por máquina (admin/administrativo)
router.get('/combustivel/resumo', exigirPerfil(...FIN), async (req, res) => {
  const { data, error } = await supabase.from('abastecimentos')
    .select('maquina_id, litros, valor_total, horimetro, km, data, maquinas(nome)')
    .eq('status', 'ativo');
  if (error) return res.status(400).json({ erro: error.message });
  const porMaquina = {};
  for (const a of data) {
    const k = a.maquina_id;
    porMaquina[k] = porMaquina[k] || { maquina: a.maquinas?.nome, litros: 0, custo: 0, registros: [] };
    porMaquina[k].litros += Number(a.litros);
    porMaquina[k].custo += Number(a.valor_total);
    porMaquina[k].registros.push(a);
  }
  // média simples de consumo (L/h ou km/L) quando há dados suficientes
  for (const k of Object.keys(porMaquina)) {
    const regs = porMaquina[k].registros.filter((r) => r.horimetro || r.km).sort((x, y) => (x.data < y.data ? -1 : 1));
    if (regs.length >= 2) {
      const first = regs[0], last = regs[regs.length - 1];
      const litros = regs.slice(1).reduce((s, r) => s + Number(r.litros), 0);
      if (first.horimetro && last.horimetro && last.horimetro > first.horimetro)
        porMaquina[k].media_l_por_hora = +(litros / (last.horimetro - first.horimetro)).toFixed(2);
      if (first.km && last.km && last.km > first.km && litros > 0)
        porMaquina[k].media_km_por_litro = +((last.km - first.km) / litros).toFixed(2);
    }
    delete porMaquina[k].registros;
  }
  res.json({ dados: porMaquina });
});

// ---------------------------------------------------------------------
// MANUTENÇÃO -> USO DE PEÇAS COM BAIXA DE ESTOQUE (RN14)
// body: { pecas: [{produto_id, quantidade}] }
// ---------------------------------------------------------------------
router.post('/manutencoes/:id/pecas', exigirPerfil('administrador'), async (req, res) => {
  const { id } = req.params;
  const { data: man } = await supabase.from('manutencoes').select('*').eq('id', id).single();
  if (!man) return res.status(404).json({ erro: 'Manutenção não encontrada.' });
  if (!req.body.pecas?.length) return res.status(400).json({ erro: 'Informe as peças.' });

  for (const p of req.body.pecas) {
    await supabase.from('manutencao_pecas').insert({ manutencao_id: id, produto_id: p.produto_id, quantidade: p.quantidade });
    await supabase.from('movimentacoes_estoque').insert({
      produto_id: p.produto_id, tipo: 'saida_utilizacao', quantidade: p.quantidade,
      maquina_id: man.maquina_id, manutencao_id: id, motivo: 'Peça usada em manutenção',
      responsavel_id: req.usuario.id, criado_por: req.usuario.id,
    });
  }
  res.json({ ok: true });
});

// ---------------------------------------------------------------------
// PRODUÇÃO DE CAFÉ (produtividade calculada) e ABACATE (validação RN16)
// ---------------------------------------------------------------------
router.post('/producoes/registrar', async (req, res) => {
  const b = req.body;
  const { data: talhao } = await supabase.from('talhoes').select('*').eq('id', b.talhao_id).single();
  if (!talhao) return res.status(400).json({ erro: 'Talhão inválido.' });

  const registro = {
    talhao_id: b.talhao_id, data: b.data || new Date().toISOString().slice(0, 10),
    responsavel_id: req.usuario.id, observacoes: b.observacoes || null, criado_por: req.usuario.id,
  };
  if (talhao.cultura === 'cafe') {
    if (!b.sacas) return res.status(400).json({ erro: 'Informe a quantidade de sacas.' });
    registro.sacas = b.sacas;
    registro.produtividade_sc_ha = +(Number(b.sacas) / Number(talhao.area_ha)).toFixed(2); // RN15
  } else {
    if (!b.kg_colhidos) return res.status(400).json({ erro: 'Informe a produção em quilos.' });
    const venda = Number(b.kg_venda || 0), perdas = Number(b.kg_perdas || 0);
    if (venda + perdas > Number(b.kg_colhidos))
      return res.status(400).json({ erro: 'Venda + perdas não pode ser maior que a produção total.' }); // RN16
    registro.kg_colhidos = b.kg_colhidos; registro.kg_venda = venda; registro.kg_perdas = perdas;
  }
  const { data, error } = await supabase.from('producoes').insert(registro).select().single();
  if (error) return res.status(400).json({ erro: error.message });

  // entrada opcional do produto colhido no estoque
  if (b.produto_colhido_id && b.quantidade_estoque) {
    await supabase.from('movimentacoes_estoque').insert({
      produto_id: b.produto_colhido_id, tipo: 'entrada_producao', quantidade: b.quantidade_estoque,
      data: registro.data, motivo: 'Entrada de produção', origem: talhao.nome,
      responsavel_id: req.usuario.id, criado_por: req.usuario.id,
    });
  }
  res.status(201).json({ ok: true, producao: data });
});

// ---------------------------------------------------------------------
// RESUMO DOS LOTES DE SUÍNOS
// ---------------------------------------------------------------------
router.get('/suinos/resumo', async (req, res) => {
  const { data, error } = await supabase.from('vw_resumo_lotes').select('*');
  if (error) return res.status(400).json({ erro: error.message });
  let dados = data;
  if (req.usuario.perfil === 'operador') dados = data.map(({ custo_acumulado, ...r }) => r);
  res.json({ dados });
});

module.exports = router;
