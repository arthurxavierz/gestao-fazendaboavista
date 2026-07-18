// =====================================================================
// FAZENDA BOA VISTA - Interface do operador (mobile)
// Botões grandes, poucos campos por tela, confirmação antes do envio.
// =====================================================================
const usuario = API.usuario();
if (!usuario) location.href = 'index.html';
document.getElementById('quemSou').textContent = `Olá, ${usuario.nome.split(' ')[0]}`;

const tela = document.getElementById('tela');
const aviso = (msg, tipo = 'success') => {
  document.getElementById('avisos').innerHTML = `<div class="alert alert-${tipo} py-2">${msg}</div>`;
  setTimeout(() => (document.getElementById('avisos').innerHTML = ''), 6000);
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

// cache de listas para os seletores
const CACHE = {};
async function lista(tabela, rotulo = 'nome') {
  if (!CACHE[tabela]) {
    const r = await API.get(`/dados/${tabela}?limit=300`);
    CACHE[tabela] = r.dados;
  }
  return CACHE[tabela];
}
const opt = (dados, rotulo = 'nome') =>
  dados.map((d) => `<option value="${d.id}">${d[rotulo] || d.nome || d.identificacao}</option>`).join('');

function cabecalho(titulo) {
  return `<div class="px-3 pt-3 pb-1 d-flex align-items-center gap-2">
    <a href="#" class="voltar" onclick="home();return false">‹ Voltar</a>
    <h2 class="h5 mb-0 ms-1">${titulo}</h2></div>`;
}

// confirmação antes do envio (exigência da interface do operador)
function confirmarEnvio(resumo) {
  return window.confirm('Confirme o registro:\n\n' + resumo + '\n\nDeseja enviar?');
}

async function comFoto(inputId) {
  const inp = document.getElementById(inputId);
  if (inp && inp.files && inp.files[0]) {
    aviso('Enviando foto...', 'info');
    return await API.upload(inp.files[0]);
  }
  return null;
}

// ---------------------------------------------------------------------
// HOME: botões grandes
// ---------------------------------------------------------------------
function home() {
  tela.innerHTML = `
    <div class="grade-acoes">
      <a class="botao-acao" href="#" onclick="minhasTarefas();return false"><div class="icone">📋</div><span>Minhas tarefas</span></a>
      <a class="botao-acao" href="#" onclick="fazerChecklist();return false"><div class="icone">✅</div><span>Fazer checklist</span></a>
      <a class="botao-acao terra" href="#" onclick="registrarAbastecimento();return false"><div class="icone">⛽</div><span>Registrar abastecimento</span></a>
      <a class="botao-acao" href="#" onclick="movimentarEstoque();return false"><div class="icone">📦</div><span>Movimentar estoque</span></a>
      <a class="botao-acao" href="#" onclick="registrarProducao();return false"><div class="icone">🌾</div><span>Registrar produção</span></a>
      <a class="botao-acao terra" href="#" onclick="informarProblema();return false"><div class="icone">⚠️</div><span>Informar problema</span></a>
      <a class="botao-acao" href="#" onclick="consultarEstoque();return false"><div class="icone">🔎</div><span>Consultar estoque</span></a>
      <a class="botao-acao" href="#" onclick="meusRegistros();return false"><div class="icone">🗂️</div><span>Meus registros</span></a>
    </div>`;
}

// ---------------------------------------------------------------------
// MINHAS TAREFAS
// ---------------------------------------------------------------------
async function minhasTarefas() {
  tela.innerHTML = cabecalho('Minhas tarefas') + '<div class="px-3 text-muted">Carregando...</div>';
  const r = await API.get('/dados/tarefas?order=data_prevista.asc');
  const abertas = r.dados.filter((t) => ['pendente', 'em_andamento'].includes(t.status));
  tela.innerHTML = cabecalho('Minhas tarefas') + `<div class="px-3 pb-3">
    ${abertas.map((t) => `<div class="lista-registro">
      <div class="d-flex justify-content-between align-items-start">
        <strong>${t.titulo}</strong>
        <span class="badge-status ${t.prioridade === 'urgente' || t.prioridade === 'alta' ? 'st-verm' : 'st-amarelo'}">${t.prioridade}</span>
      </div>
      ${t.descricao ? `<div class="small text-muted">${t.descricao}</div>` : ''}
      <div class="small mt-1">Categoria: ${t.categoria.replaceAll('_',' ')} ${t.data_prevista ? '· Prevista: ' + fmtData(t.data_prevista) : ''}
        ${t.maquinas ? '· Máquina: ' + t.maquinas.nome : ''} ${t.talhoes ? '· Talhão: ' + t.talhoes.nome : ''}</div>
      <div class="mt-2 d-flex gap-2">
        ${t.status === 'pendente' ? `<button class="btn btn-sm btn-outline-secondary" onclick="mudarTarefa('${t.id}','em_andamento')">Iniciar</button>` : ''}
        <button class="btn btn-sm btn-fazenda" onclick="mudarTarefa('${t.id}','concluida')">Concluir</button>
      </div>
    </div>`).join('') || '<div class="text-muted">Nenhuma tarefa pendente. Bom trabalho! 🎉</div>'}
  </div>`;
}
async function mudarTarefa(id, status) {
  const obs = status === 'concluida' ? prompt('Alguma observação sobre a conclusão? (opcional)') : null;
  const corpo = { status };
  if (status === 'concluida') { corpo.data_conclusao = new Date().toISOString().slice(0, 10); if (obs) corpo.observacoes = obs; }
  try { await API.put(`/dados/tarefas/${id}`, corpo); aviso(status === 'concluida' ? 'Tarefa concluída!' : 'Tarefa iniciada.'); minhasTarefas(); }
  catch (e) { aviso(e.message, 'danger'); }
}

// ---------------------------------------------------------------------
// FAZER CHECKLIST
// ---------------------------------------------------------------------
async function fazerChecklist() {
  tela.innerHTML = cabecalho('Fazer checklist') + '<div class="px-3 text-muted">Carregando...</div>';
  const [modelos, maquinas] = await Promise.all([lista('modelos_checklist'), lista('maquinas')]);
  tela.innerHTML = cabecalho('Fazer checklist') + `
    <div class="px-3 pb-4 form-operador">
      <div class="mb-3"><label class="form-label">Modelo</label>
        <select id="cModelo" class="form-select"><option value="">-- escolha --</option>${opt(modelos)}</select></div>
      <div class="mb-3"><label class="form-label">Máquina / veículo</label>
        <select id="cMaquina" class="form-select"><option value="">-- escolha --</option>${opt(maquinas)}</select></div>
      <div class="row g-2 mb-3">
        <div class="col-6"><label class="form-label">Horímetro</label><input id="cHor" type="number" step="any" class="form-control"></div>
        <div class="col-6"><label class="form-label">Km</label><input id="cKm" type="number" step="any" class="form-control"></div>
      </div>
      <div id="cItens"></div>
      <div class="mb-3"><label class="form-label">Observações</label><textarea id="cObs" class="form-control" rows="2"></textarea></div>
      <div class="mb-3"><label class="form-label">Foto (opcional)</label><input id="cFoto" type="file" accept="image/*" capture="environment" class="form-control"></div>
      <button id="cEnviar" class="btn btn-fazenda w-100 py-2" disabled>Enviar checklist</button>
    </div>`;
  const sel = document.getElementById('cModelo');
  sel.onchange = () => {
    const m = modelos.find((x) => x.id === sel.value);
    const itens = (m?.itens_modelo_checklist || []).sort((a, b) => a.ordem - b.ordem);
    document.getElementById('cItens').innerHTML = itens.map((i) => `
      <div class="item-checklist" data-item="${i.id}">
        <div class="mb-2 fw-semibold">${i.descricao}</div>
        <div class="btn-group w-100" role="group">
          <input type="radio" class="btn-check" name="r-${i.id}" id="c-${i.id}" value="conforme">
          <label class="btn btn-outline-secondary op-conforme" for="c-${i.id}">Conforme</label>
          <input type="radio" class="btn-check" name="r-${i.id}" id="n-${i.id}" value="nao_conforme">
          <label class="btn btn-outline-secondary op-nao" for="n-${i.id}">Não conforme</label>
          <input type="radio" class="btn-check" name="r-${i.id}" id="a-${i.id}" value="nao_se_aplica">
          <label class="btn btn-outline-secondary op-na" for="a-${i.id}">Não se aplica</label>
        </div>
        <input type="text" class="form-control form-control-sm mt-2 d-none" placeholder="Descreva o problema" data-obs="${i.id}">
      </div>`).join('');
    document.getElementById('cEnviar').disabled = !itens.length;
    document.querySelectorAll('#cItens input[type=radio]').forEach((r) => r.addEventListener('change', () => {
      const bloco = r.closest('.item-checklist');
      bloco.querySelector('[data-obs]').classList.toggle('d-none', r.value !== 'nao_conforme' || !r.checked);
    }));
  };
  document.getElementById('cEnviar').onclick = async () => {
    try {
      const respostas = [...document.querySelectorAll('#cItens .item-checklist')].map((b) => {
        const marcado = b.querySelector('input[type=radio]:checked');
        return marcado ? { item_id: b.dataset.item, resposta: marcado.value, observacao: b.querySelector('[data-obs]').value || null } : null;
      });
      if (respostas.some((r) => !r)) return aviso('Responda todos os itens do checklist.', 'warning');
      if (!cMaquina.value) return aviso('Escolha a máquina.', 'warning');
      const nc = respostas.filter((r) => r.resposta === 'nao_conforme').length;
      if (!confirmarEnvio(`Checklist com ${respostas.length} itens (${nc} não conformidade(s)).${nc ? '\nSerá gerada uma ocorrência para cada não conformidade.' : ''}`)) return;
      const foto_url = await comFoto('cFoto');
      const enviar = async (forcar) => API.post('/negocio/checklists/executar', {
        modelo_id: cModelo.value, maquina_id: cMaquina.value,
        horimetro: cHor.value || null, km: cKm.value || null,
        observacoes: cObs.value || null, foto_url, respostas, forcar_medidor: forcar,
      });
      let r;
      try { r = await enviar(false); }
      catch (e) {
        if (e.status === 409 && window.confirm(e.message)) r = await enviar(true);
        else throw e;
      }
      aviso(`Checklist enviado com sucesso!${r.ocorrencias_geradas ? ` ${r.ocorrencias_geradas} ocorrência(s) criada(s) para o administrador.` : ''}`);
      home();
    } catch (e) { aviso(e.message, 'danger'); }
  };
}

// ---------------------------------------------------------------------
// REGISTRAR ABASTECIMENTO
// ---------------------------------------------------------------------
async function registrarAbastecimento() {
  tela.innerHTML = cabecalho('Registrar abastecimento') + '<div class="px-3 text-muted">Carregando...</div>';
  const maquinas = await lista('maquinas');
  tela.innerHTML = cabecalho('Registrar abastecimento') + `
    <div class="px-3 pb-4 form-operador">
      <div class="mb-3"><label class="form-label">Máquina / veículo</label>
        <select id="aMaquina" class="form-select"><option value="">-- escolha --</option>${opt(maquinas)}</select></div>
      <div class="mb-3"><label class="form-label">Combustível</label>
        <select id="aTipo" class="form-select">
          <option value="diesel_s10">Diesel S10</option><option value="diesel_s500">Diesel S500</option>
          <option value="gasolina">Gasolina</option><option value="etanol">Etanol</option><option value="arla">Arla</option>
        </select></div>
      <div class="row g-2 mb-3">
        <div class="col-6"><label class="form-label">Litros</label><input id="aLitros" type="number" step="any" class="form-control"></div>
        <div class="col-6"><label class="form-label">Valor por litro (R$)</label><input id="aValor" type="number" step="0.01" class="form-control"></div>
      </div>
      <div class="row g-2 mb-3">
        <div class="col-6"><label class="form-label">Horímetro</label><input id="aHor" type="number" step="any" class="form-control"></div>
        <div class="col-6"><label class="form-label">Km</label><input id="aKm" type="number" step="any" class="form-control"></div>
      </div>
      <div class="mb-3"><label class="form-label">Tanque / posto</label><input id="aOrigem" class="form-control" placeholder="Ex.: tanque da fazenda"></div>
      <div class="mb-3"><label class="form-label">Foto da bomba (opcional)</label><input id="aFoto" type="file" accept="image/*" capture="environment" class="form-control"></div>
      <div class="mb-3"><label class="form-label">Observações</label><textarea id="aObs" class="form-control" rows="2"></textarea></div>
      <button id="aEnviar" class="btn btn-fazenda w-100 py-2">Enviar abastecimento</button>
    </div>`;
  document.getElementById('aEnviar').onclick = async () => {
    try {
      if (!aMaquina.value || !aLitros.value || !aValor.value) return aviso('Preencha máquina, litros e valor por litro.', 'warning');
      const maq = maquinas.find((m) => m.id === aMaquina.value);
      if (!confirmarEnvio(`Máquina: ${maq.nome}\nLitros: ${aLitros.value}\nValor/L: R$ ${aValor.value}`)) return;
      const foto_url = await comFoto('aFoto');
      const enviar = (forcar) => API.post('/negocio/abastecimentos/registrar', {
        maquina_id: aMaquina.value, tipo_combustivel: aTipo.value,
        litros: aLitros.value, valor_litro: aValor.value,
        horimetro: aHor.value || null, km: aKm.value || null,
        origem: aOrigem.value || null, observacoes: aObs.value || null, foto_url, forcar_medidor: forcar,
      });
      try { await enviar(false); }
      catch (e) {
        if (e.status === 409 && window.confirm(e.message)) await enviar(true);
        else throw e;
      }
      aviso('Abastecimento registrado com sucesso!');
      home();
    } catch (e) { aviso(e.message, 'danger'); }
  };
}

// ---------------------------------------------------------------------
// MOVIMENTAR ESTOQUE
// ---------------------------------------------------------------------
async function movimentarEstoque() {
  tela.innerHTML = cabecalho('Movimentar estoque') + '<div class="px-3 text-muted">Carregando...</div>';
  const [produtos, atividades, maquinas] = await Promise.all([lista('produtos'), lista('atividades'), lista('maquinas')]);
  tela.innerHTML = cabecalho('Movimentar estoque') + `
    <div class="px-3 pb-4 form-operador">
      <div class="mb-3"><label class="form-label">Produto</label>
        <select id="mProduto" class="form-select"><option value="">-- escolha --</option>${opt(produtos)}</select></div>
      <div class="mb-3"><label class="form-label">O que você está fazendo?</label>
        <select id="mTipo" class="form-select">
          <option value="saida_utilizacao">Retirando para usar</option>
          <option value="entrada_producao">Guardando produção</option>
          <option value="devolucao">Devolvendo ao estoque</option>
          <option value="perda">Registrando perda</option>
        </select></div>
      <div class="mb-3"><label class="form-label">Quantidade</label><input id="mQtde" type="number" step="any" class="form-control"></div>
      <div class="mb-3"><label class="form-label">Atividade</label>
        <select id="mAtiv" class="form-select"><option value="">-- escolha --</option>${opt(atividades)}</select></div>
      <div class="mb-3"><label class="form-label">Máquina (se for o caso)</label>
        <select id="mMaq" class="form-select"><option value="">-- nenhuma --</option>${opt(maquinas)}</select></div>
      <div class="mb-3"><label class="form-label">Motivo</label><input id="mMotivo" class="form-control" placeholder="Ex.: adubação do talhão 1"></div>
      <div class="mb-3"><label class="form-label">Foto (opcional)</label><input id="mFoto" type="file" accept="image/*" capture="environment" class="form-control"></div>
      <button id="mEnviar" class="btn btn-fazenda w-100 py-2">Enviar movimentação</button>
    </div>`;
  document.getElementById('mEnviar').onclick = async () => {
    try {
      if (!mProduto.value || !mQtde.value) return aviso('Escolha o produto e a quantidade.', 'warning');
      const p = produtos.find((x) => x.id === mProduto.value);
      const tipoTxt = mTipo.options[mTipo.selectedIndex].text;
      if (!confirmarEnvio(`${tipoTxt}\nProduto: ${p.nome}\nQuantidade: ${mQtde.value} ${p.unidade || ''}`)) return;
      const foto_url = await comFoto('mFoto');
      await API.post('/dados/movimentacoes_estoque', {
        produto_id: mProduto.value, tipo: mTipo.value, quantidade: mQtde.value,
        data: new Date().toISOString().slice(0, 10),
        atividade_id: mAtiv.value || null, maquina_id: mMaq.value || null,
        motivo: mMotivo.value || null, foto_url, responsavel_id: usuario.id,
      });
      aviso('Movimentação registrada com sucesso!');
      home();
    } catch (e) { aviso(e.message, 'danger'); }
  };
}

// ---------------------------------------------------------------------
// REGISTRAR PRODUÇÃO
// ---------------------------------------------------------------------
async function registrarProducao() {
  tela.innerHTML = cabecalho('Registrar produção') + '<div class="px-3 text-muted">Carregando...</div>';
  const talhoes = await lista('talhoes');
  tela.innerHTML = cabecalho('Registrar produção') + `
    <div class="px-3 pb-4 form-operador">
      <div class="mb-3"><label class="form-label">Talhão</label>
        <select id="pTalhao" class="form-select"><option value="">-- escolha --</option>${opt(talhoes)}</select></div>
      <div id="pCampos"></div>
      <div class="mb-3"><label class="form-label">Observações</label><textarea id="pObs" class="form-control" rows="2"></textarea></div>
      <button id="pEnviar" class="btn btn-fazenda w-100 py-2" disabled>Enviar produção</button>
    </div>`;
  const sel = document.getElementById('pTalhao');
  sel.onchange = () => {
    const t = talhoes.find((x) => x.id === sel.value);
    document.getElementById('pEnviar').disabled = !t;
    document.getElementById('pCampos').innerHTML = !t ? '' : t.cultura === 'cafe'
      ? `<div class="mb-3"><label class="form-label">Sacas colhidas</label><input id="pSacas" type="number" step="any" class="form-control"></div>`
      : `<div class="mb-3"><label class="form-label">Quilos colhidos</label><input id="pKg" type="number" step="any" class="form-control"></div>
         <div class="row g-2 mb-3">
           <div class="col-6"><label class="form-label">Kg para venda</label><input id="pVenda" type="number" step="any" class="form-control"></div>
           <div class="col-6"><label class="form-label">Kg de perdas</label><input id="pPerdas" type="number" step="any" class="form-control"></div>
         </div>`;
  };
  document.getElementById('pEnviar').onclick = async () => {
    try {
      const t = talhoes.find((x) => x.id === pTalhao.value);
      const corpo = { talhao_id: t.id, observacoes: pObs.value || null };
      let resumo = `Talhão: ${t.nome} (${t.cultura})`;
      if (t.cultura === 'cafe') {
        if (!document.getElementById('pSacas').value) return aviso('Informe as sacas colhidas.', 'warning');
        corpo.sacas = document.getElementById('pSacas').value;
        resumo += `\nSacas: ${corpo.sacas}`;
      } else {
        if (!document.getElementById('pKg').value) return aviso('Informe os quilos colhidos.', 'warning');
        corpo.kg_colhidos = document.getElementById('pKg').value;
        corpo.kg_venda = document.getElementById('pVenda').value || 0;
        corpo.kg_perdas = document.getElementById('pPerdas').value || 0;
        resumo += `\nKg: ${corpo.kg_colhidos} (venda ${corpo.kg_venda}, perdas ${corpo.kg_perdas})`;
      }
      if (!confirmarEnvio(resumo)) return;
      await API.post('/negocio/producoes/registrar', corpo);
      aviso('Produção registrada com sucesso!');
      home();
    } catch (e) { aviso(e.message, 'danger'); }
  };
}

// ---------------------------------------------------------------------
// INFORMAR PROBLEMA (ocorrência)
// ---------------------------------------------------------------------
async function informarProblema() {
  tela.innerHTML = cabecalho('Informar problema') + '<div class="px-3 text-muted">Carregando...</div>';
  const [maquinas, produtos] = await Promise.all([lista('maquinas'), lista('produtos')]);
  tela.innerHTML = cabecalho('Informar problema') + `
    <div class="px-3 pb-4 form-operador">
      <div class="mb-3"><label class="form-label">Tipo de problema</label>
        <select id="oCat" class="form-select">
          <option value="falha_mecanica">Falha mecânica</option><option value="vazamento">Vazamento</option>
          <option value="pneu_danificado">Pneu danificado</option><option value="problema_eletrico">Problema elétrico</option>
          <option value="falta_produto">Falta de produto</option><option value="acidente">Acidente</option>
          <option value="perda">Perda</option><option value="quebra">Quebra</option><option value="outros">Outro</option>
        </select></div>
      <div class="mb-3"><label class="form-label">Máquina (se for o caso)</label>
        <select id="oMaq" class="form-select"><option value="">-- nenhuma --</option>${opt(maquinas)}</select></div>
      <div class="mb-3"><label class="form-label">Produto (se for o caso)</label>
        <select id="oProd" class="form-select"><option value="">-- nenhum --</option>${opt(produtos)}</select></div>
      <div class="mb-3"><label class="form-label">Local</label><input id="oLocal" class="form-control" placeholder="Ex.: talhão 2, galpão..."></div>
      <div class="mb-3"><label class="form-label">O que aconteceu?</label><textarea id="oDesc" class="form-control" rows="3"></textarea></div>
      <div class="mb-3"><label class="form-label">Urgência</label>
        <select id="oPrio" class="form-select">
          <option value="baixa">Baixa</option><option value="media" selected>Média</option>
          <option value="alta">Alta</option><option value="urgente">Urgente</option>
        </select></div>
      <div class="mb-3"><label class="form-label">Foto (opcional)</label><input id="oFoto" type="file" accept="image/*" capture="environment" class="form-control"></div>
      <button id="oEnviar" class="btn btn-terra w-100 py-2">Enviar ocorrência</button>
    </div>`;
  document.getElementById('oEnviar').onclick = async () => {
    try {
      if (!oDesc.value.trim()) return aviso('Descreva o que aconteceu.', 'warning');
      if (!confirmarEnvio(`${oCat.options[oCat.selectedIndex].text} (${oPrio.value})\n${oDesc.value}`)) return;
      const foto_url = await comFoto('oFoto');
      await API.post('/dados/ocorrencias', {
        categoria: oCat.value, maquina_id: oMaq.value || null, produto_id: oProd.value || null,
        local: oLocal.value || null, descricao: oDesc.value, prioridade: oPrio.value,
        foto_url, operador_id: usuario.id,
      });
      aviso('Ocorrência enviada! O administrador foi avisado.');
      home();
    } catch (e) { aviso(e.message, 'danger'); }
  };
}

// ---------------------------------------------------------------------
// CONSULTAR ESTOQUE (sem valores para o operador)
// ---------------------------------------------------------------------
async function consultarEstoque() {
  tela.innerHTML = cabecalho('Consultar estoque') + '<div class="px-3 text-muted">Carregando...</div>';
  const r = await API.get('/negocio/estoque/saldos');
  tela.innerHTML = cabecalho('Consultar estoque') + `
    <div class="px-3 pb-4">
      <input id="filtro" class="form-control mb-3" placeholder="Buscar produto...">
      <div id="listaEstoque">${r.dados.map((p) => `
        <div class="lista-registro" data-nome="${p.nome.toLowerCase()}">
          <div class="d-flex justify-content-between">
            <strong>${p.nome}</strong>
            <span>${fmtNum(p.saldo)} ${p.unidade}</span>
          </div>
          ${p.abaixo_minimo ? '<span class="badge-status st-verm">abaixo do mínimo</span>' : ''}
          ${p.vencido ? '<span class="badge-status st-verm">vencido</span>' : p.vencendo ? '<span class="badge-status st-amarelo">vence em 30 dias</span>' : ''}
        </div>`).join('')}</div>
    </div>`;
  document.getElementById('filtro').oninput = (e) => {
    const q = e.target.value.toLowerCase();
    document.querySelectorAll('#listaEstoque [data-nome]').forEach((el) =>
      el.style.display = el.dataset.nome.includes(q) ? '' : 'none');
  };
}

// ---------------------------------------------------------------------
// MEUS REGISTROS
// ---------------------------------------------------------------------
async function meusRegistros() {
  tela.innerHTML = cabecalho('Meus registros') + '<div class="px-3 text-muted">Carregando...</div>';
  const [movs, abast, chks, ocs, prods] = await Promise.all([
    API.get('/dados/movimentacoes_estoque?limit=20'),
    API.get('/dados/abastecimentos?limit=20'),
    API.get('/dados/checklists?limit=20'),
    API.get('/dados/ocorrencias?limit=20'),
    API.get('/dados/producoes?limit=20'),
  ]);
  const bloco = (titulo, itens, fmt) => `
    <h6 class="mt-3">${titulo}</h6>
    ${itens.length ? itens.map(fmt).join('') : '<div class="small text-muted">Nenhum registro.</div>'}`;
  tela.innerHTML = cabecalho('Meus registros') + `<div class="px-3 pb-4">
    ${bloco('Checklists', chks.dados, (c) => `<div class="lista-registro small">${fmtDataHora(c.data_hora)} — ${c.maquinas?.nome || ''} (${c.modelos_checklist?.nome || ''})</div>`)}
    ${bloco('Abastecimentos', abast.dados, (a) => `<div class="lista-registro small">${fmtData(a.data)} — ${a.maquinas?.nome || ''}: ${fmtNum(a.litros)} L de ${a.tipo_combustivel.replaceAll('_',' ')}</div>`)}
    ${bloco('Movimentações de estoque', movs.dados, (m) => `<div class="lista-registro small">${fmtData(m.data)} — ${m.tipo.replaceAll('_',' ')}: ${fmtNum(m.quantidade)} de ${m.produtos?.nome || ''}</div>`)}
    ${bloco('Produções', prods.dados, (p) => `<div class="lista-registro small">${fmtData(p.data)} — ${p.talhoes?.nome || ''}: ${p.sacas ? fmtNum(p.sacas) + ' sacas' : fmtNum(p.kg_colhidos) + ' kg'}</div>`)}
    ${bloco('Ocorrências', ocs.dados, (o) => `<div class="lista-registro small d-flex justify-content-between">
      <span>${fmtDataHora(o.data)} — ${o.descricao}</span><span class="badge-status ${o.status === 'resolvida' ? 'st-verde' : 'st-amarelo'}">${o.status.replaceAll('_',' ')}</span></div>`)}
  </div>`;
}

home();
