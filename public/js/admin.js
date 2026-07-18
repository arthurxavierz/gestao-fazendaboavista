// =====================================================================
// FAZENDA BOA VISTA - Interface administrativa
// CRUD dirigido por configuração + dashboard + ações de negócio
// =====================================================================
const usuario = API.usuario();
if (!usuario) location.href = 'index.html';
if (usuario && usuario.perfil === 'operador') location.href = 'operador.html';

document.getElementById('quemSou').innerHTML =
  `<strong>${usuario.nome}</strong><br><span class="text-white-50">${usuario.perfil}</span>`;
const ehAdmin = usuario.perfil === 'administrador';

const FORMAS_PG = ['dinheiro', 'pix', 'boleto', 'transferencia', 'cartao', 'cheque', 'prazo'];
const STATUS_BADGE = {
  pendente:'st-amarelo', pago:'st-verde', recebido:'st-verde', vencido:'st-verm', atrasado:'st-verm',
  cancelado:'st-cinza', cancelada:'st-cinza', ativo:'st-verde', aberta:'st-amarelo', em_analise:'st-terra',
  em_atendimento:'st-terra', resolvida:'st-verde', concluida:'st-verde', em_andamento:'st-terra',
  disponivel:'st-verde', em_operacao:'st-terra', em_manutencao:'st-amarelo', parada:'st-verm',
  inativa:'st-cinza', recebida:'st-verde', confirmada:'st-verde', prevista:'st-amarelo',
  realizada:'st-verde', ferias:'st-amarelo', afastado:'st-terra', desligado:'st-cinza',
  concluido:'st-verde', encerrado:'st-cinza', em_formacao:'st-amarelo', cafe:'st-terra', abacate:'st-verde',
  receita:'st-verde', despesa:'st-verm', criacao:'st-verde', edicao:'st-amarelo', cancelamento:'st-verm',
  exclusao_logica:'st-verm', medicamento:'st-terra', vacina:'st-verde', mortalidade:'st-verm',
  entrada:'st-verde', saida:'st-amarelo', venda:'st-terra', transferencia:'st-cinza', baixa:'st-cinza',
  media:'st-amarelo', alta:'st-terra', urgente:'st-verm',
};
const badge = (s) => s ? `<span class="badge-status ${STATUS_BADGE[s] || 'st-cinza'}">${String(s).replaceAll('_',' ')}</span>` : '';
const val = (obj, caminho) => caminho.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);

// ---------------------------------------------------------------------
// Seções: menu, colunas e formulários
// t: texto | numero | moeda | data | select | ref | textarea | foto | checkbox | itens | itensChecklist
// ---------------------------------------------------------------------
const SECOES = [
  { id:'dashboard', titulo:'Dashboard', grupo:'Visão geral', especial:'dashboard' },

  { id:'caixa', titulo:'Caixa', grupo:'Financeiro', tabela:'lancamentos_caixa',
    colunas:[{c:'data',l:'Data',f:fmtData},{c:'tipo',l:'Tipo',f:badge},{c:'descricao',l:'Descrição'},
      {c:'categorias_financeiras.nome',l:'Categoria'},{c:'atividades.nome',l:'Atividade'},
      {c:'valor',l:'Valor',f:fmtMoeda},{c:'status',l:'Status',f:badge}],
    campos:[{c:'data',l:'Data',t:'data',ob:1},{c:'tipo',l:'Tipo',t:'select',op:['receita','despesa'],ob:1},
      {c:'categoria_id',l:'Categoria',t:'ref',ref:'categorias_financeiras'},
      {c:'atividade_id',l:'Atividade',t:'ref',ref:'atividades'},
      {c:'descricao',l:'Descrição',t:'texto',ob:1},{c:'valor',l:'Valor (R$)',t:'moeda',ob:1},
      {c:'forma_pagamento',l:'Forma de pagamento',t:'select',op:FORMAS_PG},
      {c:'responsavel',l:'Responsável',t:'texto'},
      {c:'comprovante_url',l:'Comprovante',t:'foto'},{c:'observacoes',l:'Observações',t:'textarea'}] },

  { id:'contas_pagar', titulo:'Contas a pagar', grupo:'Financeiro', tabela:'contas_pagar', destacarVenc:1,
    colunas:[{c:'data_vencimento',l:'Vencimento',f:fmtData},{c:'fornecedores.nome',l:'Fornecedor'},
      {c:'descricao',l:'Descrição'},{c:'atividades.nome',l:'Atividade'},
      {c:'valor',l:'Valor',f:fmtMoeda},{c:'status',l:'Status',f:badge}],
    campos:[{c:'fornecedor_id',l:'Fornecedor',t:'ref',ref:'fornecedores'},
      {c:'descricao',l:'Descrição',t:'texto',ob:1},
      {c:'categoria_id',l:'Categoria',t:'ref',ref:'categorias_financeiras'},
      {c:'atividade_id',l:'Atividade',t:'ref',ref:'atividades'},
      {c:'data_emissao',l:'Emissão',t:'data'},{c:'data_vencimento',l:'Vencimento',t:'data',ob:1},
      {c:'valor',l:'Valor (R$)',t:'moeda',ob:1},
      {c:'forma_pagamento',l:'Forma de pagamento',t:'select',op:FORMAS_PG},
      {c:'comprovante_url',l:'Comprovante',t:'foto'},{c:'observacoes',l:'Observações',t:'textarea'}],
    acoes:[{rotulo:'Pagar',quando:(r)=>['pendente','vencido'].includes(r.status),fn:pagarConta}] },

  { id:'contas_receber', titulo:'Contas a receber', grupo:'Financeiro', tabela:'contas_receber', destacarVenc:1,
    colunas:[{c:'data_vencimento',l:'Vencimento',f:fmtData},{c:'clientes.nome',l:'Cliente'},
      {c:'descricao',l:'Descrição'},{c:'atividades.nome',l:'Atividade'},
      {c:'valor',l:'Valor',f:fmtMoeda},{c:'status',l:'Status',f:badge}],
    campos:[{c:'cliente_id',l:'Cliente',t:'ref',ref:'clientes'},
      {c:'descricao',l:'Produto / descrição',t:'texto',ob:1},
      {c:'atividade_id',l:'Atividade',t:'ref',ref:'atividades'},
      {c:'data_emissao',l:'Emissão',t:'data'},{c:'data_vencimento',l:'Vencimento',t:'data',ob:1},
      {c:'valor',l:'Valor (R$)',t:'moeda',ob:1},
      {c:'forma_recebimento',l:'Forma de recebimento',t:'select',op:FORMAS_PG},
      {c:'observacoes',l:'Observações',t:'textarea'}],
    acoes:[{rotulo:'Receber',quando:(r)=>['pendente','atrasado'].includes(r.status),fn:receberConta}] },

  { id:'compras', titulo:'Compras', grupo:'Movimentações', tabela:'compras',
    colunas:[{c:'data',l:'Data',f:fmtData},{c:'fornecedores.nome',l:'Fornecedor'},
      {c:'numero_documento',l:'Documento'},{c:'valor_total',l:'Total',f:fmtMoeda},{c:'status',l:'Status',f:badge}],
    campos:[{c:'data',l:'Data',t:'data',ob:1},
      {c:'fornecedor_id',l:'Fornecedor',t:'ref',ref:'fornecedores',ob:1},
      {c:'atividade_id',l:'Atividade',t:'ref',ref:'atividades'},
      {c:'forma_pagamento',l:'Forma de pagamento',t:'select',op:FORMAS_PG},
      {c:'numero_documento',l:'Nº do documento',t:'texto'},
      {c:'comprovante_url',l:'Comprovante',t:'foto'},{c:'observacoes',l:'Observações',t:'textarea'},
      {t:'itens',tabelaItens:'itens_compra',chavePai:'compra_id'}],
    acoes:[{rotulo:'Confirmar recebimento',quando:(r)=>r.status==='aberta',fn:receberCompra}] },

  { id:'vendas', titulo:'Vendas', grupo:'Movimentações', tabela:'vendas',
    colunas:[{c:'data',l:'Data',f:fmtData},{c:'clientes.nome',l:'Cliente'},
      {c:'valor_total',l:'Total',f:fmtMoeda},{c:'status',l:'Status',f:badge}],
    campos:[{c:'data',l:'Data',t:'data',ob:1},
      {c:'cliente_id',l:'Cliente',t:'ref',ref:'clientes',ob:1},
      {c:'atividade_id',l:'Atividade',t:'ref',ref:'atividades'},
      {c:'forma_pagamento',l:'Forma de pagamento',t:'select',op:FORMAS_PG},
      {c:'data_vencimento',l:'Vencimento (a prazo)',t:'data'},
      {c:'comprovante_url',l:'Comprovante',t:'foto'},{c:'observacoes',l:'Observações',t:'textarea'},
      {t:'itens',tabelaItens:'itens_venda',chavePai:'venda_id'}],
    acoes:[{rotulo:'Confirmar venda',quando:(r)=>r.status==='aberta',fn:confirmarVenda}] },

  { id:'estoque_saldos', titulo:'Estoque (saldos)', grupo:'Estoque', especial:'saldos' },
  { id:'produtos', titulo:'Produtos', grupo:'Estoque', tabela:'produtos',
    colunas:[{c:'codigo',l:'Código'},{c:'nome',l:'Nome'},{c:'categorias_produtos.nome',l:'Categoria'},
      {c:'unidade',l:'Un.'},{c:'estoque_minimo',l:'Mínimo',f:fmtNum},
      {c:'valor_unitario',l:'Valor un.',f:fmtMoeda},{c:'status',l:'Status',f:badge}],
    campos:[{c:'codigo',l:'Código',t:'texto'},{c:'nome',l:'Nome',t:'texto',ob:1},
      {c:'categoria_id',l:'Categoria',t:'ref',ref:'categorias_produtos'},
      {c:'unidade',l:'Unidade (kg, L, un, saca...)',t:'texto',ob:1},
      {c:'estoque_minimo',l:'Estoque mínimo',t:'numero'},
      {c:'validade',l:'Validade',t:'data'},{c:'lote',l:'Lote',t:'texto'},
      {c:'local_id',l:'Local de armazenamento',t:'ref',ref:'locais_estoque'},
      {c:'valor_unitario',l:'Valor unitário (R$)',t:'moeda'},
      {c:'fornecedor_id',l:'Fornecedor',t:'ref',ref:'fornecedores'},
      {c:'status',l:'Status',t:'select',op:['ativo','inativo']},
      {c:'observacoes',l:'Observações',t:'textarea'}] },
  { id:'movimentacoes_estoque', titulo:'Movimentações', grupo:'Estoque', tabela:'movimentacoes_estoque',
    colunas:[{c:'data',l:'Data',f:fmtData},{c:'produtos.nome',l:'Produto'},{c:'tipo',l:'Tipo',f:badge},
      {c:'quantidade',l:'Qtde',f:fmtNum},{c:'motivo',l:'Motivo'},{c:'status',l:'Status',f:badge}],
    campos:[{c:'produto_id',l:'Produto',t:'ref',ref:'produtos',ob:1},
      {c:'tipo',l:'Tipo',t:'select',ob:1,op:['entrada_compra','saida_utilizacao','entrada_producao','saida_venda','ajuste_positivo','ajuste_negativo','perda','devolucao','transferencia']},
      {c:'quantidade',l:'Quantidade',t:'numero',ob:1},{c:'data',l:'Data',t:'data',ob:1},
      {c:'atividade_id',l:'Atividade',t:'ref',ref:'atividades'},
      {c:'maquina_id',l:'Máquina (se aplicável)',t:'ref',ref:'maquinas'},
      {c:'origem',l:'Origem',t:'texto'},{c:'destino',l:'Destino',t:'texto'},
      {c:'motivo',l:'Motivo',t:'texto'},{c:'foto_url',l:'Foto / comprovante',t:'foto'},
      {c:'observacoes',l:'Observações',t:'textarea'}] },

  { id:'maquinas', titulo:'Máquinas e veículos', grupo:'Máquinas', tabela:'maquinas',
    colunas:[{c:'nome',l:'Nome'},{c:'tipo',l:'Tipo'},{c:'placa_identificacao',l:'Identificação'},
      {c:'horimetro_atual',l:'Horímetro',f:fmtNum},{c:'km_atual',l:'Km',f:fmtNum},
      {c:'proxima_manutencao',l:'Próx. manutenção',f:fmtData},{c:'situacao',l:'Situação',f:badge}],
    campos:[{c:'nome',l:'Nome',t:'texto',ob:1},{c:'tipo',l:'Tipo (trator, colhedora, veículo...)',t:'texto'},
      {c:'marca',l:'Marca',t:'texto'},{c:'modelo',l:'Modelo',t:'texto'},
      {c:'ano',l:'Ano',t:'numero'},{c:'placa_identificacao',l:'Placa / identificação',t:'texto'},
      {c:'horimetro_atual',l:'Horímetro atual',t:'numero'},{c:'km_atual',l:'Km atual',t:'numero'},
      {c:'data_ultima_manutencao',l:'Última manutenção',t:'data'},
      {c:'proxima_manutencao',l:'Próxima manutenção',t:'data'},
      {c:'responsavel',l:'Responsável',t:'texto'},
      {c:'situacao',l:'Situação',t:'select',op:['disponivel','em_operacao','em_manutencao','parada','inativa']},
      {c:'foto_url',l:'Foto',t:'foto'},{c:'observacoes',l:'Observações',t:'textarea'}] },
  { id:'manutencoes', titulo:'Manutenções', grupo:'Máquinas', tabela:'manutencoes',
    colunas:[{c:'maquinas.nome',l:'Máquina'},{c:'tipo',l:'Tipo',f:badge},
      {c:'data_prevista',l:'Prevista',f:fmtData},{c:'data_realizada',l:'Realizada',f:fmtData},
      {c:'valor',l:'Valor',f:fmtMoeda},{c:'situacao',l:'Situação',f:badge}],
    campos:[{c:'maquina_id',l:'Máquina',t:'ref',ref:'maquinas',ob:1},
      {c:'tipo',l:'Tipo',t:'select',ob:1,op:['preventiva','corretiva','revisao','troca_oleo','lubrificacao','outros']},
      {c:'descricao',l:'Descrição',t:'textarea'},
      {c:'data_prevista',l:'Data prevista',t:'data'},{c:'data_realizada',l:'Data realizada',t:'data'},
      {c:'horimetro',l:'Horímetro',t:'numero'},{c:'km',l:'Km',t:'numero'},
      {c:'oficina_responsavel',l:'Oficina / responsável',t:'texto'},
      {c:'valor',l:'Valor (R$)',t:'moeda'},
      {c:'situacao',l:'Situação',t:'select',op:['prevista','em_andamento','realizada','cancelada']},
      {c:'comprovante_url',l:'Comprovante',t:'foto'},{c:'observacoes',l:'Observações',t:'textarea'}],
    acoes:[{rotulo:'Usar peça do estoque',quando:()=>ehAdmin,fn:usarPeca}] },
  { id:'abastecimentos', titulo:'Combustível', grupo:'Máquinas', tabela:'abastecimentos', resumoComb:1,
    colunas:[{c:'data',l:'Data',f:fmtData},{c:'maquinas.nome',l:'Máquina'},
      {c:'tipo_combustivel',l:'Combustível'},{c:'litros',l:'Litros',f:fmtNum},
      {c:'valor_litro',l:'R$/L',f:fmtMoeda},{c:'valor_total',l:'Total',f:fmtMoeda},{c:'status',l:'Status',f:badge}],
    campos:[{c:'data',l:'Data',t:'data',ob:1},
      {c:'maquina_id',l:'Máquina',t:'ref',ref:'maquinas',ob:1},
      {c:'tipo_combustivel',l:'Combustível',t:'select',ob:1,op:['diesel_s10','diesel_s500','gasolina','etanol','arla']},
      {c:'litros',l:'Litros',t:'numero',ob:1},{c:'valor_litro',l:'Valor por litro (R$)',t:'moeda',ob:1},
      {c:'horimetro',l:'Horímetro',t:'numero'},{c:'km',l:'Km',t:'numero'},
      {c:'origem',l:'Tanque / posto',t:'texto'},
      {c:'foto_url',l:'Foto',t:'foto'},{c:'observacoes',l:'Observações',t:'textarea'}] },
  { id:'checklists', titulo:'Checklists', grupo:'Máquinas', tabela:'checklists', soLeitura:1, detalheChk:1,
    colunas:[{c:'data_hora',l:'Data/hora',f:fmtDataHora},{c:'modelos_checklist.nome',l:'Modelo'},
      {c:'maquinas.nome',l:'Máquina'},{c:'horimetro',l:'Horímetro',f:fmtNum},{c:'status',l:'Status',f:badge}] },
  { id:'modelos_checklist', titulo:'Modelos de checklist', grupo:'Máquinas', tabela:'modelos_checklist',
    colunas:[{c:'nome',l:'Nome'},{c:'descricao',l:'Descrição'}],
    campos:[{c:'nome',l:'Nome',t:'texto',ob:1},{c:'descricao',l:'Descrição',t:'texto'},{t:'itensChecklist'}] },
  { id:'ocorrencias', titulo:'Ocorrências', grupo:'Máquinas', tabela:'ocorrencias',
    colunas:[{c:'data',l:'Data',f:fmtDataHora},{c:'categoria',l:'Categoria'},
      {c:'maquinas.nome',l:'Máquina'},{c:'descricao',l:'Descrição'},
      {c:'prioridade',l:'Prioridade',f:badge},{c:'status',l:'Status',f:badge}],
    campos:[{c:'categoria',l:'Categoria',t:'select',ob:1,op:['falha_mecanica','vazamento','pneu_danificado','problema_eletrico','falta_produto','acidente','perda','quebra','outros']},
      {c:'maquina_id',l:'Máquina',t:'ref',ref:'maquinas'},
      {c:'produto_id',l:'Produto',t:'ref',ref:'produtos'},
      {c:'local',l:'Local',t:'texto'},{c:'descricao',l:'Descrição',t:'textarea',ob:1},
      {c:'prioridade',l:'Prioridade',t:'select',op:['baixa','media','alta','urgente']},
      {c:'status',l:'Status',t:'select',op:['aberta','em_analise','em_atendimento','resolvida','cancelada']},
      {c:'resposta_admin',l:'Resposta do administrador',t:'textarea'},
      {c:'foto_url',l:'Foto',t:'foto'}] },

  { id:'talhoes', titulo:'Talhões', grupo:'Produção', tabela:'talhoes',
    colunas:[{c:'nome',l:'Nome'},{c:'cultura',l:'Cultura',f:badge},{c:'area_ha',l:'Área (ha)',f:fmtNum},
      {c:'variedade',l:'Variedade'},{c:'situacao',l:'Situação',f:badge}],
    campos:[{c:'nome',l:'Nome',t:'texto',ob:1},
      {c:'cultura',l:'Cultura',t:'select',op:['cafe','abacate'],ob:1},
      {c:'area_ha',l:'Área (ha)',t:'numero',ob:1},{c:'variedade',l:'Variedade',t:'texto'},
      {c:'situacao',l:'Situação',t:'select',op:['ativo','inativo','em_formacao']},
      {c:'observacoes',l:'Observações',t:'textarea'}] },
  { id:'manejos', titulo:'Manejos', grupo:'Produção', tabela:'manejos',
    colunas:[{c:'data',l:'Data',f:fmtData},{c:'talhoes.nome',l:'Talhão'},{c:'tipo',l:'Tipo'},
      {c:'produtos.nome',l:'Produto'},{c:'quantidade',l:'Qtde',f:fmtNum},{c:'custo',l:'Custo',f:fmtMoeda}],
    campos:[{c:'talhao_id',l:'Talhão',t:'ref',ref:'talhoes',ob:1},{c:'data',l:'Data',t:'data',ob:1},
      {c:'tipo',l:'Tipo (adubação, pulverização, poda...)',t:'texto',ob:1},
      {c:'produto_id',l:'Produto utilizado',t:'ref',ref:'produtos'},
      {c:'quantidade',l:'Quantidade',t:'numero'},{c:'unidade',l:'Unidade',t:'texto'},
      {c:'custo',l:'Custo (R$)',t:'moeda'},{c:'foto_url',l:'Foto',t:'foto'},
      {c:'observacoes',l:'Observações',t:'textarea'}] },
  { id:'producoes', titulo:'Produções / colheitas', grupo:'Produção', tabela:'producoes', usarNegocioProd:1,
    colunas:[{c:'data',l:'Data',f:fmtData},{c:'talhoes.nome',l:'Talhão'},
      {c:'sacas',l:'Sacas (café)',f:fmtNum},{c:'produtividade_sc_ha',l:'sc/ha',f:fmtNum},
      {c:'kg_colhidos',l:'Kg (abacate)',f:fmtNum},{c:'kg_perdas',l:'Perdas kg',f:fmtNum},{c:'status',l:'Status',f:badge}],
    campos:[{c:'talhao_id',l:'Talhão',t:'ref',ref:'talhoes',ob:1},{c:'data',l:'Data',t:'data',ob:1},
      {c:'sacas',l:'Sacas colhidas (café)',t:'numero'},
      {c:'kg_colhidos',l:'Kg colhidos (abacate)',t:'numero'},
      {c:'kg_venda',l:'Kg destinados à venda',t:'numero'},{c:'kg_perdas',l:'Kg de perdas',t:'numero'},
      {c:'observacoes',l:'Observações',t:'textarea'}] },
  { id:'lotes_suinos', titulo:'Suínos - lotes', grupo:'Produção', especial:'suinos' },
  { id:'movimentacoes_suinos', titulo:'Suínos - movimentações', grupo:'Produção', tabela:'movimentacoes_suinos',
    colunas:[{c:'data',l:'Data',f:fmtData},{c:'lotes_suinos.identificacao',l:'Lote'},
      {c:'tipo',l:'Tipo',f:badge},{c:'quantidade',l:'Qtde',f:fmtNum},
      {c:'peso_medio',l:'Peso médio',f:fmtNum},{c:'status',l:'Status',f:badge}],
    campos:[{c:'lote_id',l:'Lote',t:'ref',ref:'lotes_suinos',rotulo:'identificacao',ob:1},
      {c:'data',l:'Data',t:'data',ob:1},
      {c:'tipo',l:'Tipo',t:'select',ob:1,op:['entrada','saida','venda','transferencia','mortalidade']},
      {c:'quantidade',l:'Quantidade de animais',t:'numero',ob:1},
      {c:'peso_medio',l:'Peso médio (kg)',t:'numero'},
      {c:'observacoes',l:'Observações',t:'textarea'}] },
  { id:'registros_alimentacao_suinos', titulo:'Suínos - ração', grupo:'Produção', tabela:'registros_alimentacao_suinos',
    colunas:[{c:'data',l:'Data',f:fmtData},{c:'lotes_suinos.identificacao',l:'Lote'},
      {c:'racao_kg',l:'Ração (kg)',f:fmtNum},{c:'custo',l:'Custo',f:fmtMoeda}],
    campos:[{c:'lote_id',l:'Lote',t:'ref',ref:'lotes_suinos',rotulo:'identificacao',ob:1},
      {c:'data',l:'Data',t:'data',ob:1},{c:'racao_kg',l:'Ração consumida (kg)',t:'numero',ob:1},
      {c:'produto_id',l:'Ração do estoque (opcional)',t:'ref',ref:'produtos'},
      {c:'custo',l:'Custo (R$)',t:'moeda'},{c:'observacoes',l:'Observações',t:'textarea'}] },
  { id:'registros_sanitarios_suinos', titulo:'Suínos - sanidade', grupo:'Produção', tabela:'registros_sanitarios_suinos',
    colunas:[{c:'data',l:'Data',f:fmtData},{c:'lotes_suinos.identificacao',l:'Lote'},
      {c:'tipo',l:'Tipo',f:badge},{c:'descricao',l:'Descrição'},{c:'custo',l:'Custo',f:fmtMoeda}],
    campos:[{c:'lote_id',l:'Lote',t:'ref',ref:'lotes_suinos',rotulo:'identificacao',ob:1},
      {c:'data',l:'Data',t:'data',ob:1},
      {c:'tipo',l:'Tipo',t:'select',op:['medicamento','vacina'],ob:1},
      {c:'produto_id',l:'Produto do estoque',t:'ref',ref:'produtos'},
      {c:'descricao',l:'Descrição',t:'texto'},{c:'quantidade',l:'Quantidade',t:'numero'},
      {c:'custo',l:'Custo (R$)',t:'moeda'},{c:'observacoes',l:'Observações',t:'textarea'}] },

  { id:'tarefas', titulo:'Tarefas', grupo:'Equipe', tabela:'tarefas',
    colunas:[{c:'data_prevista',l:'Prevista',f:fmtData},{c:'titulo',l:'Título'},
      {c:'categoria',l:'Categoria'},{c:'prioridade',l:'Prioridade',f:badge},{c:'status',l:'Status',f:badge}],
    campos:[{c:'titulo',l:'Título',t:'texto',ob:1},{c:'descricao',l:'Descrição',t:'textarea'},
      {c:'responsavel_id',l:'Responsável',t:'ref',ref:'usuarios'},
      {c:'categoria',l:'Categoria',t:'select',op:['checklist','abastecimento','estoque','manutencao','cafe','abacate','suinos','limpeza','transporte','outros']},
      {c:'data_prevista',l:'Data prevista',t:'data'},
      {c:'prioridade',l:'Prioridade',t:'select',op:['baixa','media','alta','urgente']},
      {c:'maquina_id',l:'Máquina',t:'ref',ref:'maquinas'},
      {c:'talhao_id',l:'Talhão',t:'ref',ref:'talhoes'},
      {c:'lote_id',l:'Lote de suínos',t:'ref',ref:'lotes_suinos',rotulo:'identificacao'},
      {c:'status',l:'Status',t:'select',op:['pendente','em_andamento','concluida','cancelada']},
      {c:'observacoes',l:'Observações',t:'textarea'}] },
  { id:'funcionarios', titulo:'Funcionários', grupo:'Equipe', tabela:'funcionarios',
    colunas:[{c:'nome',l:'Nome'},{c:'funcao',l:'Função'},{c:'telefone',l:'Telefone'},
      {c:'data_admissao',l:'Admissão',f:fmtData},{c:'situacao',l:'Situação',f:badge}],
    campos:[{c:'nome',l:'Nome',t:'texto',ob:1},{c:'funcao',l:'Função',t:'texto'},
      {c:'telefone',l:'Telefone',t:'texto'},{c:'data_admissao',l:'Admissão',t:'data'},
      {c:'situacao',l:'Situação',t:'select',op:['ativo','ferias','afastado','desligado']},
      {c:'salario',l:'Salário (R$) - restrito',t:'moeda'},
      {c:'ferias_inicio',l:'Férias - início',t:'data'},{c:'ferias_fim',l:'Férias - fim',t:'data'},
      {c:'documentos',l:'Documentos',t:'textarea'},{c:'observacoes',l:'Observações',t:'textarea'}] },
  { id:'entregas_epi', titulo:'Entregas de EPI', grupo:'Equipe', tabela:'entregas_epi',
    colunas:[{c:'data_entrega',l:'Entrega',f:fmtData},{c:'funcionarios.nome',l:'Funcionário'},
      {c:'epi',l:'EPI'},{c:'quantidade',l:'Qtde',f:fmtNum},{c:'validade',l:'Validade',f:fmtData}],
    campos:[{c:'funcionario_id',l:'Funcionário',t:'ref',ref:'funcionarios',ob:1},
      {c:'epi',l:'EPI',t:'texto',ob:1},{c:'quantidade',l:'Quantidade',t:'numero'},
      {c:'data_entrega',l:'Data de entrega',t:'data',ob:1},
      {c:'data_devolucao',l:'Data de devolução',t:'data'},{c:'validade',l:'Validade',t:'data'},
      {c:'comprovante_url',l:'Comprovante',t:'foto'},
      {c:'confirmado_funcionario',l:'Funcionário confirmou o recebimento',t:'checkbox'}] },

  { id:'fornecedores', titulo:'Fornecedores', grupo:'Cadastros', tabela:'fornecedores',
    colunas:[{c:'nome',l:'Nome'},{c:'telefone',l:'Telefone'},{c:'cidade',l:'Cidade'}],
    campos:[{c:'nome',l:'Nome',t:'texto',ob:1},{c:'cpf_cnpj',l:'CPF/CNPJ',t:'texto'},
      {c:'telefone',l:'Telefone',t:'texto'},{c:'email',l:'E-mail',t:'texto'},
      {c:'cidade',l:'Cidade',t:'texto'},{c:'observacoes',l:'Observações',t:'textarea'}] },
  { id:'clientes', titulo:'Clientes', grupo:'Cadastros', tabela:'clientes',
    colunas:[{c:'nome',l:'Nome'},{c:'telefone',l:'Telefone'},{c:'cidade',l:'Cidade'}],
    campos:[{c:'nome',l:'Nome',t:'texto',ob:1},{c:'cpf_cnpj',l:'CPF/CNPJ',t:'texto'},
      {c:'telefone',l:'Telefone',t:'texto'},{c:'email',l:'E-mail',t:'texto'},
      {c:'cidade',l:'Cidade',t:'texto'},{c:'observacoes',l:'Observações',t:'textarea'}] },
  { id:'usuarios', titulo:'Usuários', grupo:'Sistema', soAdmin:1, especial:'usuarios' },
  { id:'logs', titulo:'Auditoria', grupo:'Sistema', soAdmin:1, tabela:'logs_alteracao', soLeitura:1,
    colunas:[{c:'created_at',l:'Data/hora',f:fmtDataHora},{c:'tabela',l:'Tabela'},
      {c:'acao',l:'Ação',f:badge},{c:'motivo',l:'Motivo'}] },
];
const SEM_ACESSO_ADMINISTRATIVO = ['modelos_checklist'];

// ---------------------------------------------------------------------
// Menu e navegação
// ---------------------------------------------------------------------
function montarMenu() {
  const grupos = {};
  for (const s of SECOES) {
    if (s.soAdmin && !ehAdmin) continue;
    if (!ehAdmin && SEM_ACESSO_ADMINISTRATIVO.includes(s.id)) continue;
    (grupos[s.grupo] = grupos[s.grupo] || []).push(s);
  }
  document.getElementById('menu').innerHTML = Object.entries(grupos).map(([g, itens]) =>
    `<div class="grupo">${g}</div>` +
    itens.map((s) => `<a class="item" data-secao="${s.id}" href="#${s.id}">${s.titulo}</a>`).join('')).join('');
  document.querySelectorAll('#menu a').forEach((a) =>
    a.addEventListener('click', () => abrir(a.dataset.secao)));
}

const REF_CACHE = {};
async function opcoesRef(tabela, rotulo = 'nome') {
  const k = tabela + rotulo;
  if (!REF_CACHE[k]) {
    const r = await API.get(`/dados/${tabela}?limit=500`);
    REF_CACHE[k] = r.dados.map((d) => ({ id: d.id, rotulo: d[rotulo] || d.nome || d.identificacao || d.descricao || d.email }));
  }
  return REF_CACHE[k];
}
function limparCache() { for (const k of Object.keys(REF_CACHE)) delete REF_CACHE[k]; }
function aviso(msg, tipo = 'success') {
  const el = document.getElementById('avisos');
  if (el) el.innerHTML = `<div class="alert alert-${tipo} py-2">${msg}</div>`;
  setTimeout(() => { if (el) el.innerHTML = ''; }, 5000);
}

let secaoAtual = null;
async function abrir(id) {
  const s = SECOES.find((x) => x.id === id) || SECOES[0];
  secaoAtual = s;
  document.querySelectorAll('#menu a').forEach((a) => a.classList.toggle('ativo', a.dataset.secao === s.id));
  const el = document.getElementById('conteudo');
  el.innerHTML = '<div class="text-muted py-4">Carregando...</div>';
  try {
    if (s.especial === 'dashboard') return await telaDashboard(el);
    if (s.especial === 'saldos') return await telaSaldos(el);
    if (s.especial === 'suinos') return await telaSuinos(el);
    if (s.especial === 'usuarios') return await telaUsuarios(el);
    await telaLista(el, s);
  } catch (e) {
    el.innerHTML = `<div class="alert alert-danger">${e.message}</div>`;
  }
}

// ---------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------
async function telaDashboard(el) {
  const hoje = new Date().toISOString().slice(0, 10);
  const inicio = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);
  el.innerHTML = `
    <div class="d-flex flex-wrap justify-content-between align-items-end gap-2 mb-3">
      <div><h2 class="h4 mb-0">Dashboard</h2><small class="text-muted">Visão geral da fazenda</small></div>
      <div class="d-flex gap-2 align-items-end">
        <div><label class="form-label small mb-0">Início</label><input id="fInicio" type="date" class="form-control form-control-sm" value="${inicio}"></div>
        <div><label class="form-label small mb-0">Fim</label><input id="fFim" type="date" class="form-control form-control-sm" value="${hoje}"></div>
        <button class="btn btn-sm btn-fazenda" id="fAplicar">Aplicar</button>
      </div>
    </div>
    <div id="avisos"></div>
    <div id="dashCorpo"><div class="text-muted py-4">Carregando indicadores...</div></div>`;
  document.getElementById('fAplicar').onclick = () => carregarDash();
  await carregarDash();

  async function carregarDash() {
    const d = await API.get(`/dashboard?inicio=${fInicio.value}&fim=${fFim.value}`);
    const f = d.financeiro;
    const card = (rotulo, valor, cls = '') =>
      `<div class="col-6 col-md-3"><div class="cartao indicador ${cls} h-100"><div class="rotulo">${rotulo}</div><div class="numero">${valor}</div></div></div>`;
    document.getElementById('dashCorpo').innerHTML = `
      <div class="row g-3 mb-3">
        ${card('Receitas do período', fmtMoeda(f.receitas))}
        ${card('Despesas do período', fmtMoeda(f.despesas))}
        ${card('Saldo', fmtMoeda(f.saldo), f.saldo < 0 ? 'alerta' : '')}
        ${card('Contas vencidas', fmtMoeda(f.contas_pagar_vencidas + f.contas_receber_atrasadas), 'alerta')}
        ${card('A pagar (pendente)', fmtMoeda(f.contas_pagar_pendentes), 'atencao')}
        ${card('A receber (pendente)', fmtMoeda(f.contas_receber_pendentes))}
        ${card('Valor em estoque', fmtMoeda(d.estoque.valor_estimado))}
        ${card('Combustível no período', `${fmtNum(d.combustivel.litros)} L · ${fmtMoeda(d.combustivel.custo)}`)}
        ${card('Café colhido', fmtNum(d.producao.cafe_sacas) + ' sacas')}
        ${card('Abacate colhido', fmtNum(d.producao.abacate_kg) + ' kg')}
        ${card('Suínos atuais', fmtNum(d.suinos.quantidade_atual))}
        ${card('Ração consumida', fmtNum(d.suinos.racao_kg) + ' kg')}
      </div>
      <div class="row g-3 mb-3">
        <div class="col-md-6"><div class="cartao"><h6>Receitas x despesas por mês</h6><canvas id="gMes" height="220"></canvas></div></div>
        <div class="col-md-6"><div class="cartao"><h6>Despesas por categoria</h6><canvas id="gCat" height="220"></canvas></div></div>
        <div class="col-md-6"><div class="cartao"><h6>Resultado por atividade</h6><canvas id="gAtiv" height="220"></canvas></div></div>
        <div class="col-md-6"><div class="cartao">
          <h6>Alertas</h6>
          ${d.estoque.abaixo_minimo.length ? `<p class="mb-1 small text-danger fw-semibold">Estoque abaixo do mínimo:</p>` +
            d.estoque.abaixo_minimo.map((p) => `<div class="small">• ${p.nome}: ${fmtNum(p.saldo)} ${p.unidade} (mínimo ${fmtNum(p.minimo)})</div>`).join('') : '<div class="small text-muted">Nenhum produto abaixo do mínimo.</div>'}
          ${d.maquinas_manutencao_proxima.length ? `<p class="mb-1 mt-2 small text-danger fw-semibold">Manutenções próximas:</p>` +
            d.maquinas_manutencao_proxima.map((m) => `<div class="small">• ${m.nome} - ${fmtData(m.proxima_manutencao)}</div>`).join('') : ''}
          <p class="mb-0 mt-2 small">Ocorrências em aberto: <strong>${d.ocorrencias_abertas}</strong></p>
        </div></div>
      </div>
      <div class="cartao">
        <h6>Últimos registros no sistema</h6>
        ${d.ultimos_registros.map((r) => `<div class="small py-1 border-bottom">
          ${fmtDataHora(r.created_at)} — <strong>${r.usuarios?.nome || 'Sistema'}</strong>: ${r.acao.replaceAll('_',' ')} em ${r.tabela.replaceAll('_',' ')}</div>`).join('') || '<div class="small text-muted">Sem registros.</div>'}
      </div>`;

    const meses = Object.keys(d.graficos.por_mes).sort();
    new Chart(gMes, { type: 'bar', data: { labels: meses,
      datasets: [
        { label: 'Receitas', data: meses.map((m) => d.graficos.por_mes[m].receitas), backgroundColor: '#3a7a52' },
        { label: 'Despesas', data: meses.map((m) => d.graficos.por_mes[m].despesas), backgroundColor: '#a4552b' }] } });
    const cats = Object.entries(d.graficos.despesa_por_categoria);
    new Chart(gCat, { type: 'doughnut', data: { labels: cats.map((c) => c[0]),
      datasets: [{ data: cats.map((c) => c[1]), backgroundColor: ['#26523a','#a4552b','#d9a441','#3a7a52','#6b7a70','#17301f','#c98a5e','#88a894'] }] } });
    const ativs = Object.keys(d.graficos.por_atividade);
    new Chart(gAtiv, { type: 'bar', data: { labels: ativs,
      datasets: [
        { label: 'Receitas', data: ativs.map((a) => d.graficos.por_atividade[a].receitas), backgroundColor: '#3a7a52' },
        { label: 'Despesas', data: ativs.map((a) => d.graficos.por_atividade[a].despesas), backgroundColor: '#a4552b' }] } });
  }
}

// ---------------------------------------------------------------------
// Estoque: saldos calculados
// ---------------------------------------------------------------------
async function telaSaldos(el) {
  const r = await API.get('/negocio/estoque/saldos');
  el.innerHTML = `
    <div class="d-flex justify-content-between align-items-center mb-3">
      <h2 class="h4 mb-0">Estoque - saldos atuais</h2>
      <button class="btn btn-sm btn-fazenda" onclick="abrir('movimentacoes_estoque')">Nova movimentação</button>
    </div>
    <div id="avisos"></div>
    <div class="cartao p-0"><div class="table-responsive"><table class="table mb-0">
      <thead><tr><th>Código</th><th>Produto</th><th>Saldo</th><th>Mínimo</th><th>Valor un.</th><th>Valor total</th><th>Validade</th><th>Alertas</th></tr></thead>
      <tbody>${r.dados.map((p) => `<tr class="${p.abaixo_minimo || p.vencido ? 'table-danger' : p.vencendo ? 'table-warning' : ''}">
        <td>${p.codigo || ''}</td><td>${p.nome}</td>
        <td><strong>${fmtNum(p.saldo)} ${p.unidade}</strong></td><td>${fmtNum(p.estoque_minimo)}</td>
        <td>${fmtMoeda(p.valor_unitario)}</td><td>${fmtMoeda(p.saldo * p.valor_unitario)}</td>
        <td>${fmtData(p.validade)}</td>
        <td>${p.abaixo_minimo ? badge('vencido').replace('vencido','abaixo do mínimo') : ''}
            ${p.vencido ? badge('vencido') : p.vencendo ? badge('pendente').replace('pendente','vence em 30 dias') : ''}</td>
      </tr>`).join('')}</tbody></table></div></div>`;
}

// ---------------------------------------------------------------------
// Suínos: lotes + resumo calculado
// ---------------------------------------------------------------------
async function telaSuinos(el) {
  const [resumo, lotes] = await Promise.all([API.get('/negocio/suinos/resumo'), API.get('/dados/lotes_suinos')]);
  const porId = Object.fromEntries(resumo.dados.map((r) => [r.lote_id, r]));
  el.innerHTML = `
    <div class="d-flex justify-content-between align-items-center mb-3">
      <h2 class="h4 mb-0">Granja de suínos - lotes</h2>
      <button class="btn btn-sm btn-fazenda" id="novoLote">Novo lote</button>
    </div>
    <div id="avisos"></div>
    <div class="row g-3">${lotes.dados.map((l) => { const r = porId[l.id] || {}; return `
      <div class="col-md-6 col-xl-4"><div class="cartao h-100">
        <div class="d-flex justify-content-between"><h5 class="mb-1">${l.identificacao}</h5>${badge(l.situacao)}</div>
        <div class="small text-muted mb-2">Entrada em ${fmtData(l.data_entrada)} · ${fmtNum(l.quantidade_inicial)} animais iniciais</div>
        <div class="row text-center g-2">
          <div class="col-4"><div class="numero h5 mb-0">${fmtNum(r.quantidade_atual ?? l.quantidade_inicial)}</div><div class="rotulo small text-muted">atuais</div></div>
          <div class="col-4"><div class="numero h5 mb-0">${fmtNum(r.mortalidade_acumulada || 0)}</div><div class="rotulo small text-muted">mortes (${r.taxa_mortalidade_pct || 0}%)</div></div>
          <div class="col-4"><div class="numero h5 mb-0">${fmtNum(r.peso_medio_recente || l.peso_medio_inicial || 0)}</div><div class="rotulo small text-muted">kg médio</div></div>
        </div>
        <hr class="my-2">
        <div class="small">Ração consumida: <strong>${fmtNum(r.consumo_racao_kg || 0)} kg</strong></div>
        ${r.custo_acumulado != null ? `<div class="small">Custo acumulado: <strong>${fmtMoeda(r.custo_acumulado)}</strong></div>` : ''}
        <div class="mt-2 d-flex gap-2">
          <button class="btn btn-sm btn-outline-secondary" onclick="editarLote('${l.id}')">Editar</button>
          <button class="btn btn-sm btn-outline-secondary" onclick="abrir('movimentacoes_suinos')">Movimentar</button>
        </div>
      </div></div>`; }).join('')}</div>`;
  document.getElementById('novoLote').onclick = () => abrirFormLote();
}
const CAMPOS_LOTE = [
  { c:'identificacao', l:'Identificação', t:'texto', ob:1 },
  { c:'data_entrada', l:'Data de entrada', t:'data', ob:1 },
  { c:'quantidade_inicial', l:'Quantidade inicial', t:'numero', ob:1 },
  { c:'peso_medio_inicial', l:'Peso médio inicial (kg)', t:'numero' },
  { c:'situacao', l:'Situação', t:'select', op:['ativo','encerrado'] },
  { c:'observacoes', l:'Observações', t:'textarea' }];
async function abrirFormLote(reg) {
  await abrirModal(reg ? 'Editar lote' : 'Novo lote', CAMPOS_LOTE, reg, async (corpo) => {
    if (reg) await API.put(`/dados/lotes_suinos/${reg.id}`, corpo);
    else await API.post('/dados/lotes_suinos', corpo);
    limparCache(); abrir('lotes_suinos');
  });
}
async function editarLote(id) { abrirFormLote(await API.get(`/dados/lotes_suinos/${id}`)); }

// ---------------------------------------------------------------------
// Usuários (via /api/auth)
// ---------------------------------------------------------------------
async function telaUsuarios(el) {
  const [us, perfis] = await Promise.all([API.get('/dados/usuarios'), API.get('/dados/perfis')]);
  el.innerHTML = `
    <div class="d-flex justify-content-between align-items-center mb-3">
      <h2 class="h4 mb-0">Usuários do sistema</h2>
      <button class="btn btn-sm btn-fazenda" id="novoUsuario">Novo usuário</button>
    </div>
    <div id="avisos"></div>
    <div class="cartao p-0"><div class="table-responsive"><table class="table mb-0">
      <thead><tr><th>Nome</th><th>E-mail</th><th>Perfil</th><th>Situação</th><th></th></tr></thead>
      <tbody>${us.dados.map((u) => `<tr>
        <td>${u.nome}</td><td>${u.email}</td><td>${badge(u.perfis?.nome)}</td>
        <td>${badge(u.ativo ? 'ativo' : 'inativa').replace('inativa','inativo')}</td>
        <td class="text-end"><button class="btn btn-sm btn-outline-secondary" onclick="alternarUsuario('${u.id}', ${u.ativo})">${u.ativo ? 'Inativar' : 'Reativar'}</button></td>
      </tr>`).join('')}</tbody></table></div></div>`;
  document.getElementById('novoUsuario').onclick = () => {
    abrirModal('Novo usuário', [
      { c:'nome', l:'Nome', t:'texto', ob:1 },
      { c:'email', l:'E-mail', t:'texto', ob:1 },
      { c:'senha', l:'Senha inicial', t:'texto', ob:1 },
      { c:'perfil_id', l:'Perfil', t:'select', ob:1, op: perfis.dados.map((p) => ({ id: p.id, rotulo: p.nome })) },
    ], null, async (corpo) => {
      await API.post('/auth/usuarios', corpo);
      limparCache(); abrir('usuarios');
    });
  };
}
async function alternarUsuario(id, ativo) {
  await API.put(`/dados/usuarios/${id}`, { ativo: !ativo });
  abrir('usuarios');
}

// ---------------------------------------------------------------------
// Tela de lista genérica
// ---------------------------------------------------------------------
async function telaLista(el, s) {
  const r = await API.get(`/dados/${s.tabela}?limit=200`);
  const hoje = new Date().toISOString().slice(0, 10);
  el.innerHTML = `
    <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
      <h2 class="h4 mb-0">${s.titulo}</h2>
      <div class="d-flex gap-2">
        ${s.resumoComb ? '<button class="btn btn-sm btn-outline-secondary" id="btnResumoComb">Resumo por máquina</button>' : ''}
        ${!s.soLeitura ? `<button class="btn btn-sm btn-fazenda" id="btnNovo">+ Novo</button>` : ''}
      </div>
    </div>
    <div id="avisos"></div>
    <div id="extra"></div>
    <div class="cartao p-0"><div class="table-responsive"><table class="table mb-0">
      <thead><tr>${s.colunas.map((c) => `<th>${c.l}</th>`).join('')}<th class="text-end">Ações</th></tr></thead>
      <tbody id="linhas"></tbody>
    </table></div></div>`;

  const tbody = document.getElementById('linhas');
  tbody.innerHTML = r.dados.map((reg) => {
    const vencida = s.destacarVenc && ['pendente','vencido','atrasado'].includes(reg.status) && reg.data_vencimento < hoje;
    const proxima = s.destacarVenc && reg.status === 'pendente' && !vencida &&
      reg.data_vencimento <= new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10);
    const acoes = [
      ...(s.acoes || []).filter((a) => a.quando(reg)).map((a, i) =>
        `<button class="btn btn-sm btn-terra" data-acao="${i}" data-id="${reg.id}">${a.rotulo}</button>`),
      ...(!s.soLeitura ? [`<button class="btn btn-sm btn-outline-secondary" data-editar="${reg.id}">Editar</button>`] : []),
      ...(s.detalheChk ? [`<button class="btn btn-sm btn-outline-secondary" data-ver="${reg.id}">Ver</button>`] : []),
      ...(ehAdmin && !s.soLeitura ? [`<button class="btn btn-sm btn-outline-danger" data-excluir="${reg.id}">Cancelar</button>`] : []),
    ].join(' ');
    return `<tr class="${vencida ? 'table-danger' : proxima ? 'table-warning' : ''}">
      ${s.colunas.map((c) => `<td>${c.f ? c.f(val(reg, c.c)) : (val(reg, c.c) ?? '')}</td>`).join('')}
      <td class="text-end" style="white-space:nowrap">${acoes}</td></tr>`;
  }).join('') || `<tr><td colspan="${s.colunas.length + 1}" class="text-muted py-4 text-center">Nenhum registro ainda. Clique em "+ Novo" para começar.</td></tr>`;

  const porId = Object.fromEntries(r.dados.map((d) => [d.id, d]));
  tbody.querySelectorAll('[data-editar]').forEach((b) => b.onclick = () => abrirFormSecao(s, porId[b.dataset.editar]));
  tbody.querySelectorAll('[data-excluir]').forEach((b) => b.onclick = async () => {
    const motivo = prompt('Motivo do cancelamento/exclusão:');
    if (motivo === null) return;
    try { await API.del(`/dados/${s.tabela}/${b.dataset.excluir}?motivo=${encodeURIComponent(motivo)}`); aviso('Registro cancelado.'); abrir(s.id); }
    catch (e) { aviso(e.message, 'danger'); }
  });
  tbody.querySelectorAll('[data-acao]').forEach((b) => b.onclick = () => (s.acoes[b.dataset.acao].fn)(porId[b.dataset.id], s));
  tbody.querySelectorAll('[data-ver]').forEach((b) => b.onclick = () => verChecklist(porId[b.dataset.ver]));
  const btnNovo = document.getElementById('btnNovo');
  if (btnNovo) btnNovo.onclick = () => abrirFormSecao(s, null);
  const btnRC = document.getElementById('btnResumoComb');
  if (btnRC) btnRC.onclick = mostrarResumoCombustivel;
}

async function mostrarResumoCombustivel() {
  const r = await API.get('/negocio/combustivel/resumo');
  document.getElementById('extra').innerHTML = `<div class="cartao mb-3"><h6>Resumo por máquina</h6>
    <div class="table-responsive"><table class="table mb-0"><thead><tr>
      <th>Máquina</th><th>Litros</th><th>Custo</th><th>Média</th></tr></thead>
      <tbody>${Object.values(r.dados).map((m) => `<tr><td>${m.maquina}</td>
        <td>${fmtNum(m.litros)} L</td><td>${fmtMoeda(m.custo)}</td>
        <td>${m.media_l_por_hora ? m.media_l_por_hora + ' L/h' : m.media_km_por_litro ? m.media_km_por_litro + ' km/L' : '<span class="text-muted small">dados insuficientes</span>'}</td>
      </tr>`).join('')}</tbody></table></div></div>`;
}

function verChecklist(reg) {
  const respostas = (reg.respostas_checklist || []).map((x) =>
    `<div class="d-flex justify-content-between border-bottom py-1 small">
      <span>${x.itens_modelo_checklist?.descricao || ''}${x.observacao ? ' — ' + x.observacao : ''}</span>
      ${badge(x.resposta)}</div>`).join('');
  abrirModalLivre(`Checklist - ${reg.maquinas?.nome || ''}`, `
    <p class="small text-muted mb-2">${fmtDataHora(reg.data_hora)} · Modelo: ${reg.modelos_checklist?.nome || ''}
    · Horímetro: ${fmtNum(reg.horimetro)} · Km: ${fmtNum(reg.km)}</p>
    ${respostas}
    ${reg.observacoes ? `<p class="small mt-2 mb-0"><strong>Observações:</strong> ${reg.observacoes}</p>` : ''}
    ${reg.foto_url ? `<img src="${reg.foto_url}" class="img-fluid rounded mt-2">` : ''}`);
}

// ---------------------------------------------------------------------
// Formulário genérico (modal)
// ---------------------------------------------------------------------
const modal = new bootstrap.Modal(document.getElementById('modalForm'));
let salvarAtual = null;
document.getElementById('modalSalvar').onclick = () => salvarAtual && salvarAtual();

function abrirModalLivre(titulo, html) {
  document.getElementById('modalTitulo').textContent = titulo;
  document.getElementById('modalCorpo').innerHTML = html;
  document.getElementById('modalSalvar').style.display = 'none';
  salvarAtual = null;
  modal.show();
}

async function abrirModal(titulo, campos, registro, aoSalvar) {
  document.getElementById('modalTitulo').textContent = titulo;
  document.getElementById('modalSalvar').style.display = '';
  const corpo = document.getElementById('modalCorpo');
  corpo.innerHTML = '<div class="text-muted">Carregando formulário...</div>';
  modal.show();

  let html = '<div class="row g-3" id="formCampos">';
  for (const f of campos) {
    if (f.t === 'itens') { html += await htmlItens(f, registro); continue; }
    if (f.t === 'itensChecklist') { html += htmlItensChecklist(registro); continue; }
    const v = registro ? (registro[f.c] ?? '') : '';
    const ob = f.ob ? ' <span class="text-danger">*</span>' : '';
    let campo = '';
    if (f.t === 'select' || f.t === 'ref') {
      let ops = f.op;
      if (f.t === 'ref') ops = await opcoesRef(f.ref, f.rotulo || 'nome');
      const opts = (ops || []).map((o) => {
        const id = o.id ?? o, rot = o.rotulo ?? String(o).replaceAll('_', ' ');
        return `<option value="${id}" ${String(v) === String(id) ? 'selected' : ''}>${rot}</option>`;
      }).join('');
      campo = `<select class="form-select" data-campo="${f.c}"><option value="">-- selecione --</option>${opts}</select>`;
    } else if (f.t === 'textarea') {
      campo = `<textarea class="form-control" rows="2" data-campo="${f.c}">${v}</textarea>`;
    } else if (f.t === 'checkbox') {
      campo = `<div class="form-check"><input type="checkbox" class="form-check-input" data-campo="${f.c}" ${v ? 'checked' : ''}></div>`;
    } else if (f.t === 'foto') {
      campo = `<input type="file" class="form-control" accept="image/*,.pdf" data-foto="${f.c}">
        ${v ? `<small><a href="${v}" target="_blank">Ver anexo atual</a></small>` : ''}
        <input type="hidden" data-campo="${f.c}" value="${v}">`;
    } else {
      const tipo = f.t === 'data' ? 'date' : (f.t === 'numero' || f.t === 'moeda') ? 'number' : 'text';
      const step = f.t === 'moeda' ? 'step="0.01"' : f.t === 'numero' ? 'step="any"' : '';
      campo = `<input type="${tipo}" ${step} class="form-control" data-campo="${f.c}" value="${v}">`;
    }
    html += `<div class="col-md-6"><label class="form-label">${f.l}${ob}</label>${campo}</div>`;
  }
  html += '</div><div id="modalErro" class="mt-2"></div>';
  corpo.innerHTML = html;

  salvarAtual = async () => {
    try {
      const btn = document.getElementById('modalSalvar');
      btn.disabled = true; btn.textContent = 'Salvando...';
      // uploads de fotos
      for (const inp of corpo.querySelectorAll('[data-foto]')) {
        if (inp.files && inp.files[0]) {
          const url = await API.upload(inp.files[0]);
          corpo.querySelector(`input[type=hidden][data-campo="${inp.dataset.foto}"]`).value = url;
        }
      }
      const dados = {};
      for (const el2 of corpo.querySelectorAll('[data-campo]')) {
        const c = el2.dataset.campo;
        if (el2.type === 'checkbox') dados[c] = el2.checked;
        else dados[c] = el2.value === '' ? null : el2.value;
      }
      // itens (compras/vendas)
      const itens = [...corpo.querySelectorAll('.linha-item')].map((li) => ({
        produto_id: li.querySelector('[data-item=produto]').value,
        quantidade: li.querySelector('[data-item=qtde]').value,
        unidade: li.querySelector('[data-item=un]')?.value,
        valor_unitario: li.querySelector('[data-item=vu]').value,
      })).filter((i) => i.produto_id && i.quantidade);
      // itens de modelo de checklist
      const itensChk = corpo.querySelector('#itensChkTexto')?.value;
      for (const f of campos) {
        const obrig = campos.filter((x) => x.ob && x.c);
        for (const o of obrig) if (dados[o.c] == null) throw new Error(`Preencha o campo "${o.l}".`);
        break;
      }
      await aoSalvar(dados, { itens, itensChk });
      modal.hide();
      btn.disabled = false; btn.textContent = 'Salvar';
    } catch (e) {
      document.getElementById('modalErro').innerHTML = `<div class="alert alert-danger py-2 mb-0">${e.message}</div>`;
      const btn = document.getElementById('modalSalvar');
      btn.disabled = false; btn.textContent = 'Salvar';
    }
  };
}

async function htmlItens(f, registro) {
  const produtos = await opcoesRef('produtos');
  const existentes = registro ? (registro[f.tabelaItens] || []) : [];
  const linha = (it = {}) => `<div class="d-flex gap-2 mb-2 linha-item">
    <select class="form-select" data-item="produto" style="flex:3">
      <option value="">-- produto --</option>
      ${produtos.map((p) => `<option value="${p.id}" ${it.produto_id === p.id ? 'selected' : ''}>${p.rotulo}</option>`).join('')}
    </select>
    <input type="number" step="any" class="form-control" placeholder="Qtde" data-item="qtde" value="${it.quantidade ?? ''}" style="flex:1">
    ${f.tabelaItens === 'itens_venda' ? `<input type="text" class="form-control" placeholder="Un." data-item="un" value="${it.unidade ?? ''}" style="flex:1">` : ''}
    <input type="number" step="0.01" class="form-control" placeholder="R$ unit." data-item="vu" value="${it.valor_unitario ?? ''}" style="flex:1">
    <button type="button" class="btn btn-outline-danger btn-sm" onclick="this.parentElement.remove()">×</button>
  </div>`;
  window.__linhaItem = linha;
  return `<div class="col-12"><label class="form-label">Itens ${registro ? '(a edição de itens vale apenas para registros ainda abertos)' : ''}</label>
    <div id="itensLista">${existentes.map(linha).join('') || linha()}</div>
    <button type="button" class="btn btn-sm btn-outline-secondary"
      onclick="document.getElementById('itensLista').insertAdjacentHTML('beforeend', window.__linhaItem())">+ item</button>
    <div class="small text-muted mt-1">O valor total é calculado automaticamente (quantidade × valor unitário).</div></div>`;
}

function htmlItensChecklist(registro) {
  const itens = registro ? (registro.itens_modelo_checklist || []).sort((a, b) => a.ordem - b.ordem).map((i) => i.descricao).join('\n') : 'Nível de óleo\nÁgua / arrefecimento\nPneus\nFreios\nLuzes\nVazamentos\nCombustível\nLimpeza\nEquipamentos de segurança\nCondição geral';
  return `<div class="col-12"><label class="form-label">Itens do checklist (um por linha)</label>
    <textarea class="form-control" id="itensChkTexto" rows="8">${itens}</textarea></div>`;
}

// salvar padrão de uma seção
async function abrirFormSecao(s, registro) {
  await abrirModal(registro ? `Editar - ${s.titulo}` : `Novo - ${s.titulo}`, s.campos, registro, async (dados, extras) => {
    // produções passam pela rota de negócio para calcular produtividade e validar perdas
    if (s.usarNegocioProd && !registro) {
      await API.post('/negocio/producoes/registrar', dados);
    } else {
      let salvo = registro;
      if (registro) salvo = await API.put(`/dados/${s.tabela}/${registro.id}`, dados);
      else salvo = await API.post(`/dados/${s.tabela}`, dados);
      // itens de compra/venda
      const cfgItens = s.campos.find((c) => c.t === 'itens');
      if (cfgItens && extras.itens?.length && !registro) {
        for (const it of extras.itens) {
          await API.post(`/dados/${cfgItens.tabelaItens}`, { ...it, [cfgItens.chavePai]: salvo.id });
        }
      }
      // itens de modelo de checklist
      if (s.campos.find((c) => c.t === 'itensChecklist') && extras.itensChk != null) {
        if (registro) for (const i of (registro.itens_modelo_checklist || [])) await API.del(`/dados/itens_modelo_checklist/${i.id}`);
        const linhas = extras.itensChk.split('\n').map((x) => x.trim()).filter(Boolean);
        for (let i = 0; i < linhas.length; i++) {
          await API.post('/dados/itens_modelo_checklist', { modelo_id: salvo.id, descricao: linhas[i], ordem: i + 1 });
        }
      }
    }
    limparCache(); aviso('Registro salvo com sucesso.'); abrir(s.id);
  });
}

// ---------------------------------------------------------------------
// Ações de negócio
// ---------------------------------------------------------------------
async function pagarConta(reg) {
  await abrirModal(`Pagar: ${reg.descricao} (${fmtMoeda(reg.valor)})`, [
    { c: 'data_pagamento', l: 'Data do pagamento', t: 'data', ob: 1 },
    { c: 'forma_pagamento', l: 'Forma de pagamento', t: 'select', op: FORMAS_PG },
  ], { data_pagamento: new Date().toISOString().slice(0, 10), forma_pagamento: reg.forma_pagamento }, async (dados) => {
    await API.post(`/negocio/contas-pagar/${reg.id}/pagar`, dados);
    aviso('Conta paga. Despesa lançada automaticamente no caixa.');
    abrir('contas_pagar');
  });
}
async function receberConta(reg) {
  await abrirModal(`Receber: ${reg.descricao} (${fmtMoeda(reg.valor)})`, [
    { c: 'data_recebimento', l: 'Data do recebimento', t: 'data', ob: 1 },
    { c: 'forma_recebimento', l: 'Forma de recebimento', t: 'select', op: FORMAS_PG },
  ], { data_recebimento: new Date().toISOString().slice(0, 10) }, async (dados) => {
    await API.post(`/negocio/contas-receber/${reg.id}/receber`, dados);
    aviso('Conta recebida. Receita lançada automaticamente no caixa.');
    abrir('contas_receber');
  });
}
async function receberCompra(reg) {
  await abrirModal('Confirmar recebimento da compra', [
    { c: 'gerar_conta', l: 'Gerar conta a pagar vinculada', t: 'checkbox' },
    { c: 'data_vencimento', l: 'Vencimento da conta', t: 'data' },
  ], { gerar_conta: true, data_vencimento: new Date().toISOString().slice(0, 10) }, async (dados) => {
    const r = await API.post(`/negocio/compras/${reg.id}/receber`, dados);
    aviso(`Compra recebida (${fmtMoeda(r.valor_total)}). Estoque atualizado${r.conta_pagar ? ' e conta a pagar criada' : ''}.`);
    abrir('compras');
  });
}
async function confirmarVenda(reg) {
  await abrirModal('Confirmar venda', [
    { c: 'baixar_estoque', l: 'Registrar saída no estoque', t: 'checkbox' },
    { c: 'gerar_conta', l: 'Gerar conta a receber vinculada', t: 'checkbox' },
    ...(ehAdmin ? [{ c: 'autorizar_saldo_negativo', l: 'Autorizar venda acima do saldo (admin)', t: 'checkbox' },
                   { c: 'motivo', l: 'Motivo da autorização', t: 'texto' }] : []),
  ], { baixar_estoque: true, gerar_conta: true }, async (dados) => {
    const r = await API.post(`/negocio/vendas/${reg.id}/confirmar`, dados);
    aviso(`Venda confirmada (${fmtMoeda(r.valor_total)}).${r.conta_receber ? ' Conta a receber criada.' : ''}`);
    abrir('vendas');
  });
}
async function usarPeca(reg) {
  await abrirModal(`Usar peça do estoque - manutenção da máquina`, [
    { c: 'produto_id', l: 'Peça (produto do estoque)', t: 'ref', ref: 'produtos', ob: 1 },
    { c: 'quantidade', l: 'Quantidade', t: 'numero', ob: 1 },
  ], null, async (dados) => {
    await API.post(`/negocio/manutencoes/${reg.id}/pecas`, { pecas: [dados] });
    aviso('Peça registrada e baixada do estoque.');
    abrir('manutencoes');
  });
}

// ---------------------------------------------------------------------
montarMenu();
abrir(location.hash.replace('#', '') || 'dashboard');
