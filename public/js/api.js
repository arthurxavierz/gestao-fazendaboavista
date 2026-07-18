// Camada de acesso à API do sistema
const API = {
  token() { return localStorage.getItem('fbv_token'); },
  usuario() { try { return JSON.parse(localStorage.getItem('fbv_usuario')); } catch { return null; } },
  sair() { localStorage.removeItem('fbv_token'); localStorage.removeItem('fbv_usuario'); location.href = 'index.html'; },

  async req(caminho, opcoes = {}) {
    const r = await fetch('/api' + caminho, {
      ...opcoes,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + this.token(),
        ...(opcoes.headers || {}),
      },
    });
    if (r.status === 401) { this.sair(); return; }
    const dados = await r.json().catch(() => ({}));
    if (!r.ok) { const e = new Error(dados.erro || 'Erro na requisição.'); e.status = r.status; e.dados = dados; throw e; }
    return dados;
  },
  get(c) { return this.req(c); },
  post(c, corpo) { return this.req(c, { method: 'POST', body: JSON.stringify(corpo) }); },
  put(c, corpo) { return this.req(c, { method: 'PUT', body: JSON.stringify(corpo) }); },
  del(c) { return this.req(c, { method: 'DELETE' }); },

  async upload(arquivo) {
    const fd = new FormData();
    fd.append('arquivo', arquivo);
    const r = await fetch('/api/upload', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + this.token() },
      body: fd,
    });
    const dados = await r.json();
    if (!r.ok) throw new Error(dados.erro || 'Falha no upload.');
    return dados.url;
  },
};

const fmtMoeda = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtNum = (v) => Number(v || 0).toLocaleString('pt-BR');
const fmtData = (v) => v ? new Date(v + (v.length === 10 ? 'T12:00' : '')).toLocaleDateString('pt-BR') : '';
const fmtDataHora = (v) => v ? new Date(v).toLocaleString('pt-BR') : '';
