-- =====================================================================
-- FAZENDA BOA VISTA - SCHEMA POSTGRESQL (SUPABASE)
-- Execute este arquivo no SQL Editor do Supabase (1º de 3)
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------- FUNÇÃO PADRÃO DE updated_at ----------
create or replace function fn_set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end; $$ language plpgsql;

-- =====================================================================
-- USUÁRIOS E PERFIS
-- =====================================================================
create table perfis (
  id serial primary key,
  nome text unique not null,           -- administrador | operador | administrativo
  descricao text,
  created_at timestamptz default now()
);

create table usuarios (
  id uuid primary key,                 -- mesmo id do auth.users
  nome text not null,
  email text unique not null,
  perfil_id int not null references perfis(id),
  funcionario_id uuid,
  ativo boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- =====================================================================
-- CADASTROS BÁSICOS
-- =====================================================================
create table funcionarios (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  funcao text,
  telefone text,
  data_admissao date,
  situacao text default 'ativo' check (situacao in ('ativo','ferias','afastado','desligado')),
  salario numeric(12,2),               -- visível só a autorizados (tratado no backend)
  ferias_inicio date,
  ferias_fim date,
  documentos text,
  observacoes text,
  criado_por uuid references usuarios(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table usuarios add constraint fk_usuario_funcionario
  foreign key (funcionario_id) references funcionarios(id);

create table fornecedores (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  cpf_cnpj text,
  telefone text,
  email text,
  cidade text,
  observacoes text,
  ativo boolean default true,
  criado_por uuid references usuarios(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table clientes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  cpf_cnpj text,
  telefone text,
  email text,
  cidade text,
  observacoes text,
  ativo boolean default true,
  criado_por uuid references usuarios(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table atividades (
  id serial primary key,
  nome text unique not null,           -- Café, Abacate, Suínos, Geral...
  ativo boolean default true
);

create table categorias_financeiras (
  id serial primary key,
  nome text unique not null,
  tipo text check (tipo in ('receita','despesa','ambas')) default 'ambas',
  ativo boolean default true
);

-- =====================================================================
-- FINANCEIRO
-- =====================================================================
create table contas_pagar (
  id uuid primary key default gen_random_uuid(),
  fornecedor_id uuid references fornecedores(id),
  descricao text not null,
  categoria_id int references categorias_financeiras(id),
  atividade_id int references atividades(id),
  data_emissao date default current_date,
  data_vencimento date not null,
  valor numeric(12,2) not null check (valor > 0),
  status text default 'pendente' check (status in ('pendente','pago','vencido','cancelado')),
  data_pagamento date,
  forma_pagamento text,
  comprovante_url text,
  observacoes text,
  compra_id uuid,                      -- vínculo opcional com compra
  criado_por uuid references usuarios(id),
  motivo_alteracao text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table contas_receber (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid references clientes(id),
  descricao text not null,
  atividade_id int references atividades(id),
  data_emissao date default current_date,
  data_vencimento date not null,
  valor numeric(12,2) not null check (valor > 0),
  status text default 'pendente' check (status in ('pendente','recebido','atrasado','cancelado')),
  data_recebimento date,
  forma_recebimento text,
  observacoes text,
  venda_id uuid,                       -- vínculo opcional com venda
  criado_por uuid references usuarios(id),
  motivo_alteracao text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table lancamentos_caixa (
  id uuid primary key default gen_random_uuid(),
  data date not null default current_date,
  tipo text not null check (tipo in ('receita','despesa')),
  categoria_id int references categorias_financeiras(id),
  atividade_id int references atividades(id),
  descricao text not null,
  valor numeric(12,2) not null check (valor > 0),
  forma_pagamento text,
  responsavel text,
  observacoes text,
  comprovante_url text,
  conta_pagar_id uuid unique references contas_pagar(id),    -- vínculo 1:1 (evita duplicação)
  conta_receber_id uuid unique references contas_receber(id),-- vínculo 1:1 (evita duplicação)
  status text default 'ativo' check (status in ('ativo','cancelado')),
  criado_por uuid references usuarios(id),
  motivo_alteracao text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- =====================================================================
-- ESTOQUE
-- =====================================================================
create table categorias_produtos (
  id serial primary key,
  nome text unique not null,
  ativo boolean default true
);

create table locais_estoque (
  id serial primary key,
  nome text unique not null,
  ativo boolean default true
);

create table produtos (
  id uuid primary key default gen_random_uuid(),
  codigo text unique,
  nome text not null,
  categoria_id int references categorias_produtos(id),
  unidade text not null default 'un',
  estoque_minimo numeric(12,3) default 0,
  validade date,
  lote text,
  local_id int references locais_estoque(id),
  valor_unitario numeric(12,2) default 0,
  fornecedor_id uuid references fornecedores(id),
  observacoes text,
  status text default 'ativo' check (status in ('ativo','inativo')),
  criado_por uuid references usuarios(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table maquinas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  tipo text,
  marca text,
  modelo text,
  ano int,
  placa_identificacao text,
  horimetro_atual numeric(12,1) default 0,
  km_atual numeric(12,1) default 0,
  data_ultima_manutencao date,
  proxima_manutencao date,
  responsavel text,
  situacao text default 'disponivel'
    check (situacao in ('disponivel','em_operacao','em_manutencao','parada','inativa')),
  foto_url text,
  observacoes text,
  criado_por uuid references usuarios(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table movimentacoes_estoque (
  id uuid primary key default gen_random_uuid(),
  produto_id uuid not null references produtos(id),
  tipo text not null check (tipo in (
    'entrada_compra','saida_utilizacao','entrada_producao','saida_venda',
    'ajuste_positivo','ajuste_negativo','perda','devolucao','transferencia')),
  quantidade numeric(12,3) not null check (quantidade > 0),
  data date not null default current_date,
  responsavel_id uuid references usuarios(id),
  origem text,
  destino text,
  atividade_id int references atividades(id),
  maquina_id uuid references maquinas(id),
  motivo text,
  observacoes text,
  foto_url text,
  compra_id uuid,
  venda_id uuid,
  manutencao_id uuid,
  status text default 'ativo' check (status in ('ativo','cancelado')),
  motivo_alteracao text,
  criado_por uuid references usuarios(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- saldo calculado a partir das movimentações (RN06)
create or replace view vw_saldo_estoque as
select p.id as produto_id, p.codigo, p.nome, p.unidade, p.estoque_minimo,
       p.validade, p.valor_unitario, p.categoria_id, p.status,
       coalesce(sum(case
         when m.status <> 'ativo' then 0
         when m.tipo in ('entrada_compra','entrada_producao','ajuste_positivo','devolucao') then m.quantidade
         when m.tipo in ('saida_utilizacao','saida_venda','ajuste_negativo','perda') then -m.quantidade
         else 0 end), 0) as saldo
from produtos p
left join movimentacoes_estoque m on m.produto_id = p.id
group by p.id;

-- =====================================================================
-- COMPRAS E VENDAS
-- =====================================================================
create table compras (
  id uuid primary key default gen_random_uuid(),
  data date not null default current_date,
  fornecedor_id uuid references fornecedores(id),
  atividade_id int references atividades(id),
  forma_pagamento text,
  numero_documento text,
  valor_total numeric(12,2) default 0,
  observacoes text,
  comprovante_url text,
  status text default 'aberta' check (status in ('aberta','recebida','cancelada')),
  criado_por uuid references usuarios(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table itens_compra (
  id uuid primary key default gen_random_uuid(),
  compra_id uuid not null references compras(id) on delete cascade,
  produto_id uuid not null references produtos(id),
  quantidade numeric(12,3) not null check (quantidade > 0),
  valor_unitario numeric(12,2) not null check (valor_unitario >= 0),
  valor_total numeric(12,2) generated always as (quantidade * valor_unitario) stored
);

create table vendas (
  id uuid primary key default gen_random_uuid(),
  data date not null default current_date,
  cliente_id uuid references clientes(id),
  atividade_id int references atividades(id),
  forma_pagamento text,
  data_vencimento date,
  valor_total numeric(12,2) default 0,
  observacoes text,
  comprovante_url text,
  status text default 'aberta' check (status in ('aberta','confirmada','cancelada')),
  criado_por uuid references usuarios(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table itens_venda (
  id uuid primary key default gen_random_uuid(),
  venda_id uuid not null references vendas(id) on delete cascade,
  produto_id uuid not null references produtos(id),
  quantidade numeric(12,3) not null check (quantidade > 0),
  unidade text,
  valor_unitario numeric(12,2) not null check (valor_unitario >= 0),
  valor_total numeric(12,2) generated always as (quantidade * valor_unitario) stored
);

alter table contas_pagar  add constraint fk_cp_compra foreign key (compra_id) references compras(id);
alter table contas_receber add constraint fk_cr_venda foreign key (venda_id) references vendas(id);
alter table movimentacoes_estoque add constraint fk_mov_compra foreign key (compra_id) references compras(id);
alter table movimentacoes_estoque add constraint fk_mov_venda  foreign key (venda_id)  references vendas(id);

-- =====================================================================
-- MÁQUINAS: MEDIDORES, CHECKLISTS, OCORRÊNCIAS, MANUTENÇÕES, COMBUSTÍVEL
-- =====================================================================
create table historico_medidores (
  id uuid primary key default gen_random_uuid(),
  maquina_id uuid not null references maquinas(id),
  data timestamptz default now(),
  horimetro numeric(12,1),
  km numeric(12,1),
  origem text,                          -- checklist | abastecimento | manual | manutencao
  usuario_id uuid references usuarios(id),
  created_at timestamptz default now()
);

create table modelos_checklist (
  id uuid primary key default gen_random_uuid(),
  nome text not null,                   -- Checklist de trator, início de turno...
  descricao text,
  ativo boolean default true,
  criado_por uuid references usuarios(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table itens_modelo_checklist (
  id uuid primary key default gen_random_uuid(),
  modelo_id uuid not null references modelos_checklist(id) on delete cascade,
  descricao text not null,              -- Nível de óleo, pneus, freios...
  ordem int default 0
);

create table checklists (
  id uuid primary key default gen_random_uuid(),
  modelo_id uuid not null references modelos_checklist(id),
  maquina_id uuid not null references maquinas(id),
  operador_id uuid not null references usuarios(id),
  data_hora timestamptz default now(),
  horimetro numeric(12,1),
  km numeric(12,1),
  observacoes text,
  foto_url text,
  confirmado boolean default false,     -- assinatura/confirmação
  latitude numeric(10,6),
  longitude numeric(10,6),
  status text default 'concluido' check (status in ('concluido','cancelado')),
  motivo_alteracao text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table respostas_checklist (
  id uuid primary key default gen_random_uuid(),
  checklist_id uuid not null references checklists(id) on delete cascade,
  item_id uuid not null references itens_modelo_checklist(id),
  resposta text not null check (resposta in ('conforme','nao_conforme','nao_se_aplica')),
  observacao text
);

create table ocorrencias (
  id uuid primary key default gen_random_uuid(),
  data timestamptz default now(),
  operador_id uuid references usuarios(id),
  categoria text not null,              -- falha_mecanica, vazamento, pneu, eletrica, falta_produto, acidente, perda, quebra, outros
  maquina_id uuid references maquinas(id),
  produto_id uuid references produtos(id),
  checklist_id uuid references checklists(id),
  local text,
  descricao text not null,
  prioridade text default 'media' check (prioridade in ('baixa','media','alta','urgente')),
  foto_url text,
  status text default 'aberta' check (status in ('aberta','em_analise','em_atendimento','resolvida','cancelada')),
  resposta_admin text,
  criado_por uuid references usuarios(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table manutencoes (
  id uuid primary key default gen_random_uuid(),
  maquina_id uuid not null references maquinas(id),
  tipo text not null check (tipo in ('preventiva','corretiva','revisao','troca_oleo','lubrificacao','outros')),
  descricao text,
  data_prevista date,
  data_realizada date,
  horimetro numeric(12,1),
  km numeric(12,1),
  oficina_responsavel text,
  valor numeric(12,2),
  situacao text default 'prevista' check (situacao in ('prevista','em_andamento','realizada','cancelada')),
  observacoes text,
  comprovante_url text,
  criado_por uuid references usuarios(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table movimentacoes_estoque add constraint fk_mov_manut foreign key (manutencao_id) references manutencoes(id);

create table manutencao_pecas (
  id uuid primary key default gen_random_uuid(),
  manutencao_id uuid not null references manutencoes(id) on delete cascade,
  produto_id uuid not null references produtos(id),
  quantidade numeric(12,3) not null check (quantidade > 0)
);

create table abastecimentos (
  id uuid primary key default gen_random_uuid(),
  data date not null default current_date,
  maquina_id uuid not null references maquinas(id),
  operador_id uuid references usuarios(id),
  tipo_combustivel text not null,       -- diesel_s10, diesel_s500, gasolina, etanol...
  litros numeric(12,2) not null check (litros > 0),
  valor_litro numeric(12,3) not null check (valor_litro >= 0),
  valor_total numeric(12,2) generated always as (litros * valor_litro) stored,
  horimetro numeric(12,1),
  km numeric(12,1),
  origem text,                          -- tanque da fazenda / posto
  foto_url text,
  observacoes text,
  status text default 'ativo' check (status in ('ativo','cancelado')),
  motivo_alteracao text,
  criado_por uuid references usuarios(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- =====================================================================
-- FUNCIONÁRIOS: EPIs
-- =====================================================================
create table entregas_epi (
  id uuid primary key default gen_random_uuid(),
  funcionario_id uuid not null references funcionarios(id),
  epi text not null,
  quantidade numeric(10,2) default 1,
  data_entrega date not null default current_date,
  data_devolucao date,
  validade date,
  comprovante_url text,
  confirmado_funcionario boolean default false,
  criado_por uuid references usuarios(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- =====================================================================
-- PRODUÇÃO: TALHÕES (CAFÉ/ABACATE), MANEJOS, PRODUÇÕES
-- =====================================================================
create table talhoes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  cultura text not null check (cultura in ('cafe','abacate')),
  area_ha numeric(10,2) not null check (area_ha > 0),
  variedade text,
  situacao text default 'ativo' check (situacao in ('ativo','inativo','em_formacao')),
  observacoes text,
  criado_por uuid references usuarios(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table manejos (
  id uuid primary key default gen_random_uuid(),
  talhao_id uuid not null references talhoes(id),
  data date not null default current_date,
  tipo text not null,                   -- adubação, pulverização, poda, capina...
  produto_id uuid references produtos(id),
  quantidade numeric(12,3),
  unidade text,
  custo numeric(12,2),
  responsavel_id uuid references usuarios(id),
  observacoes text,
  foto_url text,
  criado_por uuid references usuarios(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table producoes (
  id uuid primary key default gen_random_uuid(),
  talhao_id uuid not null references talhoes(id),
  data date not null default current_date,
  -- café
  sacas numeric(12,2),
  produtividade_sc_ha numeric(12,2),    -- calculada no backend: sacas / area
  -- abacate
  kg_colhidos numeric(12,2),
  kg_venda numeric(12,2),
  kg_perdas numeric(12,2),
  responsavel_id uuid references usuarios(id),
  observacoes text,
  status text default 'ativo' check (status in ('ativo','cancelado')),
  criado_por uuid references usuarios(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- =====================================================================
-- GRANJA DE SUÍNOS
-- =====================================================================
create table lotes_suinos (
  id uuid primary key default gen_random_uuid(),
  identificacao text unique not null,
  data_entrada date not null,
  quantidade_inicial int not null check (quantidade_inicial > 0),
  peso_medio_inicial numeric(10,2),
  situacao text default 'ativo' check (situacao in ('ativo','encerrado')),
  observacoes text,
  criado_por uuid references usuarios(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table movimentacoes_suinos (
  id uuid primary key default gen_random_uuid(),
  lote_id uuid not null references lotes_suinos(id),
  data date not null default current_date,
  tipo text not null check (tipo in ('entrada','saida','venda','transferencia','mortalidade')),
  quantidade int not null check (quantidade > 0),
  peso_medio numeric(10,2),
  responsavel_id uuid references usuarios(id),
  observacoes text,
  status text default 'ativo' check (status in ('ativo','cancelado')),
  criado_por uuid references usuarios(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table registros_alimentacao_suinos (
  id uuid primary key default gen_random_uuid(),
  lote_id uuid not null references lotes_suinos(id),
  data date not null default current_date,
  racao_kg numeric(12,2) not null check (racao_kg > 0),
  produto_id uuid references produtos(id),   -- ração do estoque (opcional)
  custo numeric(12,2),
  responsavel_id uuid references usuarios(id),
  observacoes text,
  criado_por uuid references usuarios(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table registros_sanitarios_suinos (
  id uuid primary key default gen_random_uuid(),
  lote_id uuid not null references lotes_suinos(id),
  data date not null default current_date,
  tipo text not null check (tipo in ('medicamento','vacina')),
  produto_id uuid references produtos(id),
  descricao text,
  quantidade numeric(12,3),
  custo numeric(12,2),
  responsavel_id uuid references usuarios(id),
  observacoes text,
  criado_por uuid references usuarios(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- resumo do lote (RN17)
create or replace view vw_resumo_lotes as
select l.id as lote_id, l.identificacao, l.data_entrada, l.quantidade_inicial, l.situacao,
  l.quantidade_inicial
    + coalesce(sum(case when m.tipo='entrada' and m.status='ativo' then m.quantidade else 0 end),0)
    - coalesce(sum(case when m.tipo in ('saida','venda','transferencia','mortalidade') and m.status='ativo' then m.quantidade else 0 end),0)
    as quantidade_atual,
  coalesce(sum(case when m.tipo='mortalidade' and m.status='ativo' then m.quantidade else 0 end),0) as mortalidade_acumulada,
  round(100.0 * coalesce(sum(case when m.tipo='mortalidade' and m.status='ativo' then m.quantidade else 0 end),0)
    / nullif(l.quantidade_inicial + coalesce(sum(case when m.tipo='entrada' and m.status='ativo' then m.quantidade else 0 end),0),0), 2) as taxa_mortalidade_pct,
  (select coalesce(sum(a.racao_kg),0) from registros_alimentacao_suinos a where a.lote_id = l.id) as consumo_racao_kg,
  (select coalesce(sum(a.custo),0) from registros_alimentacao_suinos a where a.lote_id = l.id)
    + (select coalesce(sum(s.custo),0) from registros_sanitarios_suinos s where s.lote_id = l.id) as custo_acumulado,
  (select m2.peso_medio from movimentacoes_suinos m2
     where m2.lote_id = l.id and m2.peso_medio is not null and m2.status='ativo'
     order by m2.data desc, m2.created_at desc limit 1) as peso_medio_recente
from lotes_suinos l
left join movimentacoes_suinos m on m.lote_id = l.id
group by l.id;

-- =====================================================================
-- TAREFAS, ANEXOS E AUDITORIA
-- =====================================================================
create table tarefas (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  descricao text,
  responsavel_id uuid references usuarios(id),
  categoria text default 'outros' check (categoria in
    ('checklist','abastecimento','estoque','manutencao','cafe','abacate','suinos','limpeza','transporte','outros')),
  data_prevista date,
  prioridade text default 'media' check (prioridade in ('baixa','media','alta','urgente')),
  maquina_id uuid references maquinas(id),
  talhao_id uuid references talhoes(id),
  lote_id uuid references lotes_suinos(id),
  status text default 'pendente' check (status in ('pendente','em_andamento','concluida','cancelada')),
  observacoes text,
  foto_url text,
  data_conclusao date,
  criado_por uuid references usuarios(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table anexos (
  id uuid primary key default gen_random_uuid(),
  tabela text not null,
  registro_id uuid not null,
  url text not null,
  nome_arquivo text,
  criado_por uuid references usuarios(id),
  created_at timestamptz default now()
);

create table logs_alteracao (
  id uuid primary key default gen_random_uuid(),
  tabela text not null,
  registro_id uuid not null,
  acao text not null check (acao in ('criacao','edicao','cancelamento','exclusao_logica')),
  dados_anteriores jsonb,
  motivo text,
  usuario_id uuid references usuarios(id),
  created_at timestamptz default now()
);

-- =====================================================================
-- TRIGGERS DE updated_at
-- =====================================================================
do $$
declare t text;
begin
  for t in select c.table_name from information_schema.columns c
           join pg_tables p on p.tablename = c.table_name and p.schemaname = 'public'
           where c.table_schema='public' and c.column_name='updated_at'
           group by c.table_name
  loop
    execute format('create trigger trg_upd_%I before update on %I
                    for each row execute function fn_set_updated_at()', t, t);
  end loop;
end $$;

-- =====================================================================
-- ÍNDICES ÚTEIS
-- =====================================================================
create index idx_mov_estoque_produto on movimentacoes_estoque(produto_id);
create index idx_mov_estoque_data on movimentacoes_estoque(data);
create index idx_caixa_data on lancamentos_caixa(data);
create index idx_cp_venc on contas_pagar(data_vencimento);
create index idx_cr_venc on contas_receber(data_vencimento);
create index idx_abast_maquina on abastecimentos(maquina_id);
create index idx_checklists_maquina on checklists(maquina_id);
create index idx_tarefas_resp on tarefas(responsavel_id);
