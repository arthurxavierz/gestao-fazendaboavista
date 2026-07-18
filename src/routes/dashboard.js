// =====================================================================
// Dashboard administrativo: indicadores agregados com filtro de período
// GET /api/dashboard?inicio=YYYY-MM-DD&fim=YYYY-MM-DD
// =====================================================================
const express = require('express');
const { supabase } = require('../supabase');
const { exigirPerfil } = require('../middleware/auth');

const router = express.Router();

router.get('/', exigirPerfil('administrador', 'administrativo'), async (req, res) => {
  const hoje = new Date().toISOString().slice(0, 10);
  const inicio = req.query.inicio || new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);
  const fim = req.query.fim || hoje;
  const em15 = new Date(Date.now() + 15 * 864e5).toISOString().slice(0, 10);

  const [caixa, cp, cr, estoque, maqs, abast, prod, lotes, ultimos, ocor] = await Promise.all([
    supabase.from('lancamentos_caixa').select('data,tipo,valor,categoria_id,atividade_id,categorias_financeiras(nome),atividades(nome)')
      .eq('status', 'ativo').gte('data', inicio).lte('data', fim),
    supabase.from('contas_pagar').select('valor,status,data_vencimento').in('status', ['pendente', 'vencido']),
    supabase.from('contas_receber').select('valor,status,data_vencimento').in('status', ['pendente', 'atrasado']),
    supabase.from('vw_saldo_estoque').select('*').eq('status', 'ativo'),
    supabase.from('maquinas').select('id,nome,proxima_manutencao,situacao').lte('proxima_manutencao', em15).neq('situacao', 'inativa'),
    supabase.from('abastecimentos').select('litros,valor_total,data').eq('status', 'ativo').gte('data', inicio).lte('data', fim),
    supabase.from('producoes').select('data,sacas,kg_colhidos,talhoes(cultura)').eq('status', 'ativo').gte('data', inicio).lte('data', fim),
    supabase.from('vw_resumo_lotes').select('*').eq('situacao', 'ativo'),
    supabase.from('logs_alteracao').select('tabela,acao,created_at,usuarios(nome)').order('created_at', { ascending: false }).limit(10),
    supabase.from('ocorrencias').select('id,status').in('status', ['aberta', 'em_analise', 'em_atendimento']),
  ]);

  const lanc = caixa.data || [];
  const receitas = lanc.filter((l) => l.tipo === 'receita').reduce((s, l) => s + Number(l.valor), 0);
  const despesas = lanc.filter((l) => l.tipo === 'despesa').reduce((s, l) => s + Number(l.valor), 0);

  const pagarPendentes = (cp.data || []).reduce((s, c) => s + Number(c.valor), 0);
  const pagarVencidas = (cp.data || []).filter((c) => c.data_vencimento < hoje).reduce((s, c) => s + Number(c.valor), 0);
  const receberPendentes = (cr.data || []).reduce((s, c) => s + Number(c.valor), 0);
  const receberAtrasadas = (cr.data || []).filter((c) => c.data_vencimento < hoje).reduce((s, c) => s + Number(c.valor), 0);

  const est = estoque.data || [];
  const valorEstoque = est.reduce((s, p) => s + Number(p.saldo) * Number(p.valor_unitario || 0), 0);
  const abaixoMinimo = est.filter((p) => Number(p.saldo) < Number(p.estoque_minimo));

  const combustivelLitros = (abast.data || []).reduce((s, a) => s + Number(a.litros), 0);
  const combustivelCusto = (abast.data || []).reduce((s, a) => s + Number(a.valor_total), 0);

  const producaoCafe = (prod.data || []).filter((p) => p.talhoes?.cultura === 'cafe').reduce((s, p) => s + Number(p.sacas || 0), 0);
  const producaoAbacate = (prod.data || []).filter((p) => p.talhoes?.cultura === 'abacate').reduce((s, p) => s + Number(p.kg_colhidos || 0), 0);

  const suinosAtuais = (lotes.data || []).reduce((s, l) => s + Number(l.quantidade_atual), 0);
  const racaoConsumida = (lotes.data || []).reduce((s, l) => s + Number(l.consumo_racao_kg), 0);

  // séries para gráficos
  const porMes = {};
  for (const l of lanc) {
    const m = l.data.slice(0, 7);
    porMes[m] = porMes[m] || { receitas: 0, despesas: 0 };
    porMes[m][l.tipo === 'receita' ? 'receitas' : 'despesas'] += Number(l.valor);
  }
  const despesaPorCategoria = {};
  for (const l of lanc.filter((x) => x.tipo === 'despesa')) {
    const nome = l.categorias_financeiras?.nome || 'Sem categoria';
    despesaPorCategoria[nome] = (despesaPorCategoria[nome] || 0) + Number(l.valor);
  }
  const porAtividade = {};
  for (const l of lanc) {
    const nome = l.atividades?.nome || 'Geral';
    porAtividade[nome] = porAtividade[nome] || { receitas: 0, despesas: 0 };
    porAtividade[nome][l.tipo === 'receita' ? 'receitas' : 'despesas'] += Number(l.valor);
  }

  res.json({
    periodo: { inicio, fim },
    financeiro: {
      receitas, despesas, saldo: receitas - despesas,
      contas_pagar_pendentes: pagarPendentes, contas_pagar_vencidas: pagarVencidas,
      contas_receber_pendentes: receberPendentes, contas_receber_atrasadas: receberAtrasadas,
    },
    estoque: {
      valor_estimado: valorEstoque,
      abaixo_minimo: abaixoMinimo.map((p) => ({ nome: p.nome, saldo: p.saldo, minimo: p.estoque_minimo, unidade: p.unidade })),
    },
    maquinas_manutencao_proxima: maqs.data || [],
    combustivel: { litros: combustivelLitros, custo: combustivelCusto },
    producao: { cafe_sacas: producaoCafe, abacate_kg: producaoAbacate },
    suinos: { quantidade_atual: suinosAtuais, racao_kg: racaoConsumida },
    ocorrencias_abertas: (ocor.data || []).length,
    ultimos_registros: ultimos.data || [],
    graficos: { por_mes: porMes, despesa_por_categoria: despesaPorCategoria, por_atividade: porAtividade },
  });
});

module.exports = router;
