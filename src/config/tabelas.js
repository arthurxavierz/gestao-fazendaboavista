// =====================================================================
// Configuração central das tabelas expostas pela API genérica.
// perms: c = criar, r = ler, u = editar, d = excluir/cancelar
// somenteProprios: operador só enxerga registros criados por ele
// ocultarOperador: campos removidos da resposta para o perfil operador
// protegida: nunca é apagada fisicamente (exclusão lógica / cancelamento)
// =====================================================================

const T = {
  // ---- cadastros ----
  funcionarios: {
    perms: { administrador: 'crud', administrativo: 'r', operador: '' },
    ocultar: { administrativo: ['salario'] },
  },
  fornecedores: { perms: { administrador: 'crud', administrativo: 'crud', operador: '' } },
  clientes:     { perms: { administrador: 'crud', administrativo: 'crud', operador: '' } },
  atividades:   { perms: { administrador: 'crud', administrativo: 'r', operador: 'r' } },
  categorias_financeiras: { perms: { administrador: 'crud', administrativo: 'r', operador: '' } },
  categorias_produtos:    { perms: { administrador: 'crud', administrativo: 'r', operador: 'r' } },
  locais_estoque:         { perms: { administrador: 'crud', administrativo: 'r', operador: 'r' } },

  // ---- financeiro (operador não acessa) ----
  lancamentos_caixa: {
    perms: { administrador: 'crud', administrativo: 'cru', operador: '' },
    protegida: true,
    relacoes: 'categorias_financeiras(nome), atividades(nome)',
  },
  contas_pagar: {
    perms: { administrador: 'crud', administrativo: 'cru', operador: '' },
    protegida: true,
    relacoes: 'fornecedores(nome), categorias_financeiras(nome), atividades(nome)',
  },
  contas_receber: {
    perms: { administrador: 'crud', administrativo: 'cru', operador: '' },
    protegida: true,
    relacoes: 'clientes(nome), atividades(nome)',
  },

  // ---- estoque ----
  produtos: {
    perms: { administrador: 'crud', administrativo: 'cru', operador: 'r' },
    ocultarOperador: ['valor_unitario'],
    relacoes: 'categorias_produtos(nome), locais_estoque(nome)',
  },
  movimentacoes_estoque: {
    perms: { administrador: 'crud', administrativo: 'cr', operador: 'cr' },
    protegida: true,
    somenteProprios: true,
    relacoes: 'produtos(nome,unidade), atividades(nome), maquinas(nome)',
  },

  // ---- compras e vendas (operador não acessa) ----
  compras: {
    perms: { administrador: 'crud', administrativo: 'cru', operador: '' },
    protegida: true,
    relacoes: 'fornecedores(nome), atividades(nome), itens_compra(id,produto_id,quantidade,valor_unitario,valor_total,produtos(nome,unidade))',
  },
  itens_compra: { perms: { administrador: 'crud', administrativo: 'crud', operador: '' } },
  vendas: {
    perms: { administrador: 'crud', administrativo: 'cru', operador: '' },
    protegida: true,
    relacoes: 'clientes(nome), atividades(nome), itens_venda(id,produto_id,quantidade,unidade,valor_unitario,valor_total,produtos(nome))',
  },
  itens_venda: { perms: { administrador: 'crud', administrativo: 'crud', operador: '' } },

  // ---- máquinas ----
  maquinas: {
    perms: { administrador: 'crud', administrativo: 'r', operador: 'r' },
  },
  historico_medidores: {
    perms: { administrador: 'cr', administrativo: 'r', operador: 'cr' },
    relacoes: 'maquinas(nome)',
  },
  modelos_checklist: { perms: { administrador: 'crud', administrativo: 'r', operador: 'r' },
    relacoes: 'itens_modelo_checklist(id,descricao,ordem)' },
  itens_modelo_checklist: { perms: { administrador: 'crud', administrativo: 'r', operador: 'r' } },
  checklists: {
    perms: { administrador: 'crud', administrativo: 'r', operador: 'cr' },
    protegida: true,
    somenteProprios: true,
    donoCampo: 'operador_id',
    relacoes: 'maquinas(nome), modelos_checklist(nome), respostas_checklist(id,item_id,resposta,observacao,itens_modelo_checklist(descricao))',
  },
  respostas_checklist: { perms: { administrador: 'r', administrativo: 'r', operador: 'cr' } },
  ocorrencias: {
    perms: { administrador: 'crud', administrativo: 'r', operador: 'cr' },
    somenteProprios: true,
    donoCampo: 'operador_id',
    relacoes: 'maquinas(nome), produtos(nome)',
  },
  manutencoes: {
    perms: { administrador: 'crud', administrativo: 'r', operador: 'r' },
    relacoes: 'maquinas(nome)',
  },
  manutencao_pecas: { perms: { administrador: 'crud', administrativo: 'r', operador: '' } },
  abastecimentos: {
    perms: { administrador: 'crud', administrativo: 'r', operador: 'cr' },
    protegida: true,
    somenteProprios: true,
    donoCampo: 'operador_id',
    ocultarOperador: ['valor_litro', 'valor_total'],
    relacoes: 'maquinas(nome)',
  },

  // ---- funcionários / EPI ----
  entregas_epi: {
    perms: { administrador: 'crud', administrativo: 'cru', operador: '' },
    relacoes: 'funcionarios(nome)',
  },

  // ---- produção ----
  talhoes: { perms: { administrador: 'crud', administrativo: 'r', operador: 'r' } },
  manejos: {
    perms: { administrador: 'crud', administrativo: 'r', operador: 'cr' },
    somenteProprios: true,
    ocultarOperador: ['custo'],
    relacoes: 'talhoes(nome,cultura), produtos(nome)',
  },
  producoes: {
    perms: { administrador: 'crud', administrativo: 'r', operador: 'cr' },
    protegida: true,
    somenteProprios: true,
    relacoes: 'talhoes(nome,cultura,area_ha)',
  },
  lotes_suinos: { perms: { administrador: 'crud', administrativo: 'r', operador: 'r' } },
  movimentacoes_suinos: {
    perms: { administrador: 'crud', administrativo: 'r', operador: 'cr' },
    protegida: true,
    somenteProprios: true,
    relacoes: 'lotes_suinos(identificacao)',
  },
  registros_alimentacao_suinos: {
    perms: { administrador: 'crud', administrativo: 'r', operador: 'cr' },
    somenteProprios: true,
    ocultarOperador: ['custo'],
    relacoes: 'lotes_suinos(identificacao), produtos(nome)',
  },
  registros_sanitarios_suinos: {
    perms: { administrador: 'crud', administrativo: 'r', operador: 'cr' },
    somenteProprios: true,
    ocultarOperador: ['custo'],
    relacoes: 'lotes_suinos(identificacao), produtos(nome)',
  },

  // ---- tarefas ----
  tarefas: {
    perms: { administrador: 'crud', administrativo: 'r', operador: 'ru' },
    somenteProprios: true,
    donoCampo: 'responsavel_id',
    relacoes: 'maquinas(nome), talhoes(nome), lotes_suinos(identificacao)',
    // operador só pode alterar estes campos (concluir a tarefa):
    camposEditaveisOperador: ['status', 'observacoes', 'foto_url', 'data_conclusao'],
  },

  // ---- sistema ----
  usuarios: {
    perms: { administrador: 'ru', administrativo: '', operador: '' },
    relacoes: 'perfis(nome)',
  },
  perfis: { perms: { administrador: 'r', administrativo: '', operador: '' } },
  logs_alteracao: { perms: { administrador: 'r', administrativo: '', operador: '' } },
  anexos: { perms: { administrador: 'crd', administrativo: 'cr', operador: 'cr' } },
};

module.exports = T;
