// =====================================================================
// FAZENDA BOA VISTA - Camada offline (PWA)
// - Fila de escritas que falham por falta de conexão (localStorage)
// - Fotos tiradas offline ficam guardadas e sobem na sincronização
// - Reenvio automático quando a internet volta
// - Barra de status + contador de pendências
// =====================================================================
const Offline = (() => {
  const CHAVE_FILA = 'fbv_fila';
  const CHAVE_FOTOS = 'fbv_fotos';
  const MARCA_FOTO = '__FOTO_OFFLINE__:';
  let enviando = false;

  const lerFila = () => { try { return JSON.parse(localStorage.getItem(CHAVE_FILA)) || []; } catch { return []; } };
  const salvarFila = (f) => localStorage.setItem(CHAVE_FILA, JSON.stringify(f));
  const lerFotos = () => { try { return JSON.parse(localStorage.getItem(CHAVE_FOTOS)) || {}; } catch { return {}; } };
  const salvarFotos = (f) => localStorage.setItem(CHAVE_FOTOS, JSON.stringify(f));

  function pendentes() { return lerFila().length; }

  // guarda uma foto tirada offline e devolve um marcador que vai no corpo
  function guardarFoto(arquivo) {
    return new Promise((resolve, reject) => {
      const leitor = new FileReader();
      leitor.onload = () => {
        const id = 'f' + Date.now() + Math.random().toString(36).slice(2, 7);
        const fotos = lerFotos(); fotos[id] = leitor.result; salvarFotos(fotos);
        resolve(MARCA_FOTO + id);
      };
      leitor.onerror = reject;
      leitor.readAsDataURL(arquivo);
    });
  }

  // enfileira uma escrita (POST/PUT/DELETE) e devolve resposta otimista
  function enfileirar(metodo, caminho, corpo) {
    const fila = lerFila();
    fila.push({ id: 'q' + Date.now() + Math.random().toString(36).slice(2, 7), metodo, caminho, corpo, ts: Date.now() });
    salvarFila(fila);
    atualizarBarra();
    return { __fila: true, ok: true, pendente: true };
  }

  const dataUrlParaBlob = async (dataUrl) => (await fetch(dataUrl)).blob();

  // envia um item; devolve true se concluído, false se deve parar (sem rede)
  async function enviarItem(item) {
    const corpo = { ...(item.corpo || {}) };
    // sobe fotos guardadas offline e troca o marcador pela URL real
    const fotos = lerFotos();
    for (const [campo, valor] of Object.entries(corpo)) {
      if (typeof valor === 'string' && valor.startsWith(MARCA_FOTO)) {
        const idFoto = valor.slice(MARCA_FOTO.length);
        if (fotos[idFoto]) {
          const fd = new FormData();
          fd.append('arquivo', await dataUrlParaBlob(fotos[idFoto]), 'foto.jpg');
          const ru = await fetch('/api/upload', { method: 'POST', headers: { Authorization: 'Bearer ' + API.token() }, body: fd });
          if (!ru.ok) throw Object.assign(new Error('upload'), { rede: false });
          corpo[campo] = (await ru.json()).url;
          delete fotos[idFoto]; salvarFotos(fotos);
        } else { corpo[campo] = null; }
      }
    }
    const enviar = (c) => fetch('/api' + item.caminho, {
      method: item.metodo,
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + API.token() },
      body: item.metodo === 'DELETE' ? undefined : JSON.stringify(c),
    });
    let r = await enviar(corpo);
    if (r.status === 401) throw Object.assign(new Error('sessao'), { fatal: true });
    // 409 = aviso de medidor menor que o anterior. Foi registrado offline sem
    // poder confirmar, então reenviamos forçando para não perder o registro.
    if (r.status === 409) r = await enviar({ ...corpo, forcar_medidor: true });
    if (r.status === 401) throw Object.assign(new Error('sessao'), { fatal: true });
    // 4xx do servidor = item inválido: descarta para não travar a fila
    if (!r.ok && r.status < 500) { console.warn('Registro descartado na sincronização', item.caminho, r.status); return true; }
    if (!r.ok) throw Object.assign(new Error('servidor'), { rede: false });
    return true;
  }

  async function sincronizar() {
    if (enviando || !navigator.onLine) return;
    let fila = lerFila();
    if (!fila.length) { atualizarBarra(); return; }
    enviando = true; atualizarBarra();
    try {
      while (fila.length) {
        const item = fila[0];
        try { await enviarItem(item); }
        catch (e) {
          if (e.fatal) break;                // sessão expirou: para e mantém a fila
          if (e.rede === undefined) break;    // erro de rede (fetch falhou): tenta depois
          // erro não-rede já retornou true; não deve cair aqui
          break;
        }
        fila.shift(); salvarFila(fila);
        atualizarBarra();
      }
    } finally {
      enviando = false;
      atualizarBarra();
      if (window.__aoSincronizar && !lerFila().length) window.__aoSincronizar();
    }
  }

  // -------------------- interface de status --------------------
  function elementos() {
    let barra = document.getElementById('barraSync');
    if (!barra) {
      barra = document.createElement('div');
      barra.id = 'barraSync'; barra.className = 'barra-sync';
      document.body.prepend(barra);
    }
    return barra;
  }
  function atualizarBarra() {
    const barra = elementos();
    const n = pendentes();
    barra.className = 'barra-sync';
    if (!navigator.onLine) {
      barra.classList.add('mostrar', 'offline');
      barra.innerHTML = icon('nuvem_off') + `<span>Sem conexão${n ? ` · ${n} registro(s) aguardando envio` : ''}. Os dados ficam salvos no aparelho.</span>`;
    } else if (enviando) {
      barra.classList.add('mostrar', 'enviando');
      barra.innerHTML = icon('sync', { cls: 'girando' }) + `<span>Sincronizando ${n} registro(s)...</span>`;
    } else if (n) {
      barra.classList.add('mostrar', 'pendente');
      barra.innerHTML = icon('relogio') + `<span>${n} registro(s) aguardando conexão para sincronizar.</span>`;
    }
    // contador global para outras telas
    window.__pendentesSync = n;
    document.dispatchEvent(new CustomEvent('sync:mudou', { detail: { pendentes: n, enviando } }));
  }

  // -------------------- botão instalar (PWA) --------------------
  let promptInstalar = null;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); promptInstalar = e;
    let b = document.getElementById('btnInstalar');
    if (!b) {
      b = document.createElement('button');
      b.id = 'btnInstalar'; b.className = 'btn-instalar mostrar';
      b.innerHTML = icon('estoque', { size: 18 }) + '<span>Instalar app</span>';
      b.onclick = async () => { b.classList.remove('mostrar'); promptInstalar.prompt(); await promptInstalar.userChoice; promptInstalar = null; };
      document.body.appendChild(b);
    } else { b.classList.add('mostrar'); }
  });
  window.addEventListener('appinstalled', () => { const b = document.getElementById('btnInstalar'); if (b) b.remove(); });

  // -------------------- ganchos de rede --------------------
  window.addEventListener('online', () => { atualizarBarra(); sincronizar(); });
  window.addEventListener('offline', atualizarBarra);
  document.addEventListener('DOMContentLoaded', () => { atualizarBarra(); sincronizar(); });
  setInterval(() => { if (navigator.onLine && pendentes()) sincronizar(); }, 20000);

  return { enfileirar, guardarFoto, sincronizar, pendentes, atualizarBarra, MARCA_FOTO };
})();

// registra o service worker (cache do app + funcionamento offline)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
}
