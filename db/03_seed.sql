-- =====================================================================
-- FAZENDA BOA VISTA - DADOS INICIAIS + DEMONSTRAÇÃO (3º de 3)
-- =====================================================================

-- Perfis
insert into perfis (nome, descricao) values
 ('administrador','Acesso completo'),
 ('operador','Interface simplificada de campo'),
 ('administrativo','Financeiro e cadastros');

-- Atividades
insert into atividades (nome) values ('Café'),('Abacate'),('Suínos'),('Geral');

-- Categorias financeiras
insert into categorias_financeiras (nome, tipo) values
 ('Venda de produção','receita'),('Insumos','despesa'),('Mão de obra','despesa'),
 ('Manutenção','despesa'),('Combustível','despesa'),('Medicamentos','despesa'),
 ('Vacinas','despesa'),('Ração','despesa'),('Impostos','despesa'),('Taxas','despesa'),
 ('Frete','despesa'),('Energia','despesa'),('Água','despesa'),('Arrendamento','despesa'),
 ('Investimento','despesa'),('Outros','ambas');

-- Categorias de produtos
insert into categorias_produtos (nome) values
 ('Insumos'),('Fertilizantes'),('Defensivos'),('Ração'),('Medicamentos'),
 ('Vacinas'),('Peças'),('Equipamentos'),('Combustíveis'),('Produtos colhidos'),('Outros');

-- Locais de estoque
insert into locais_estoque (nome) values
 ('Galpão principal'),('Depósito de insumos'),('Farmácia da granja'),('Tanque de combustível');

-- ============== DEMONSTRAÇÃO ==============
insert into fornecedores (nome, cidade) values
 ('Agropecuária Serra Ltda','Serra do Salitre'),
 ('Cooperativa dos Cafeicultores','Patrocínio'),
 ('Nutrição Animal MG','Patos de Minas');

insert into clientes (nome, cidade) values
 ('Cooperativa dos Cafeicultores','Patrocínio'),
 ('Frigorífico Alvorada','Uberlândia'),
 ('CEASA Distribuidora','Uberaba');

insert into funcionarios (nome, funcao, telefone, data_admissao, situacao, salario) values
 ('João Pereira','Operador de máquinas','(34) 99999-0001','2022-03-01','ativo',2600.00),
 ('Maria Souza','Auxiliar administrativa','(34) 99999-0002','2023-07-15','ativo',2400.00),
 ('Carlos Lima','Tratorista','(34) 99999-0003','2021-01-10','ativo',2800.00);

insert into maquinas (nome, tipo, marca, modelo, ano, placa_identificacao, horimetro_atual, situacao, proxima_manutencao) values
 ('Trator 01','trator','Massey Ferguson','MF 4275',2019,'TR-01',3520.5,'disponivel', current_date + 20),
 ('Colhedora de café','colhedora','Jacto','KTR Advance',2021,'CL-01',1210.0,'disponivel', current_date + 45),
 ('Caminhonete','veiculo','Toyota','Hilux',2020,'ABC1D23',0,'disponivel', current_date + 60);
update maquinas set km_atual = 84500 where nome = 'Caminhonete';

insert into produtos (codigo, nome, categoria_id, unidade, estoque_minimo, valor_unitario, local_id) values
 ('FER-001','Adubo NPK 20-05-20', (select id from categorias_produtos where nome='Fertilizantes'),'kg',500, 3.20, 2),
 ('DEF-001','Fungicida cobre',     (select id from categorias_produtos where nome='Defensivos'),'L', 20, 85.00, 2),
 ('RAC-001','Ração crescimento suínos',(select id from categorias_produtos where nome='Ração'),'kg',1000, 2.10, 3),
 ('MED-001','Vermífugo injetável', (select id from categorias_produtos where nome='Medicamentos'),'frasco',5, 48.00, 3),
 ('PEC-001','Filtro de óleo trator',(select id from categorias_produtos where nome='Peças'),'un',2, 65.00, 1),
 ('CMB-001','Diesel S10',          (select id from categorias_produtos where nome='Combustíveis'),'L',300, 6.05, 4),
 ('COL-001','Café beneficiado',    (select id from categorias_produtos where nome='Produtos colhidos'),'saca',0, 1450.00, 1),
 ('COL-002','Abacate',             (select id from categorias_produtos where nome='Produtos colhidos'),'kg',0, 4.50, 1);

insert into talhoes (nome, cultura, area_ha, variedade) values
 ('Talhão Café 1','cafe',12.5,'Catuaí Vermelho'),
 ('Talhão Café 2','cafe',8.0,'Mundo Novo'),
 ('Talhão Abacate 1','abacate',6.0,'Hass');

insert into lotes_suinos (identificacao, data_entrada, quantidade_inicial, peso_medio_inicial) values
 ('LOTE-2026-01', current_date - 60, 120, 22.5);

insert into modelos_checklist (nome, descricao) values
 ('Checklist de trator','Verificação diária antes da operação'),
 ('Checklist de caminhonete','Verificação de veículo leve'),
 ('Início de turno','Checklist geral de início de turno');

insert into itens_modelo_checklist (modelo_id, descricao, ordem)
select id, d.descricao, d.ordem from modelos_checklist,
 (values ('Nível de óleo',1),('Água / arrefecimento',2),('Pneus',3),('Freios',4),
         ('Luzes',5),('Vazamentos',6),('Combustível',7),('Limpeza',8),
         ('Equipamentos de segurança',9),('Condição geral',10)) as d(descricao, ordem)
where modelos_checklist.nome = 'Checklist de trator';

insert into itens_modelo_checklist (modelo_id, descricao, ordem)
select id, d.descricao, d.ordem from modelos_checklist,
 (values ('Pneus e estepe',1),('Freios',2),('Luzes e setas',3),('Nível de óleo',4),
         ('Combustível',5),('Limpeza',6),('Documentos',7)) as d(descricao, ordem)
where modelos_checklist.nome = 'Checklist de caminhonete';

insert into itens_modelo_checklist (modelo_id, descricao, ordem)
select id, d.descricao, d.ordem from modelos_checklist,
 (values ('EPI completo',1),('Condição geral do equipamento',2),('Área de trabalho segura',3)) as d(descricao, ordem)
where modelos_checklist.nome = 'Início de turno';

-- Movimentações de estoque de demonstração (entradas iniciais)
insert into movimentacoes_estoque (produto_id, tipo, quantidade, data, motivo, origem)
select id,'ajuste_positivo', q, current_date - 30, 'Saldo inicial (migração da planilha)', 'Migração'
from (values ('FER-001',2000),('DEF-001',60),('RAC-001',5000),('MED-001',12),
             ('PEC-001',6),('CMB-001',1500),('COL-001',85),('COL-002',0.0)) as v(codigo,q)
join produtos p on p.codigo = v.codigo and v.q > 0;

-- Financeiro de demonstração
insert into contas_pagar (fornecedor_id, descricao, categoria_id, atividade_id, data_vencimento, valor)
values
 ((select id from fornecedores where nome like 'Agropecuária%'),'Compra de adubo NPK',
  (select id from categorias_financeiras where nome='Insumos'),
  (select id from atividades where nome='Café'), current_date + 10, 6400.00),
 ((select id from fornecedores where nome like 'Nutrição%'),'Ração crescimento - 5t',
  (select id from categorias_financeiras where nome='Ração'),
  (select id from atividades where nome='Suínos'), current_date - 5, 10500.00);

insert into contas_receber (cliente_id, descricao, atividade_id, data_vencimento, valor)
values
 ((select id from clientes where nome like 'Cooperativa%'),'Venda de 30 sacas de café',
  (select id from atividades where nome='Café'), current_date + 15, 43500.00);

insert into lancamentos_caixa (data, tipo, categoria_id, atividade_id, descricao, valor, forma_pagamento)
values
 (current_date - 20,'despesa',(select id from categorias_financeiras where nome='Combustível'),
  (select id from atividades where nome='Geral'),'Abastecimento tanque diesel', 9075.00,'pix'),
 (current_date - 12,'receita',(select id from categorias_financeiras where nome='Venda de produção'),
  (select id from atividades where nome='Abacate'),'Venda de abacate - CEASA', 8100.00,'transferencia'),
 (current_date - 3,'despesa',(select id from categorias_financeiras where nome='Energia'),
  (select id from atividades where nome='Suínos'),'Conta de energia da granja', 1320.00,'boleto');
