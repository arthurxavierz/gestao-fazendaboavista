// =====================================================================
// FAZENDA BOA VISTA - Service Worker (PWA)
// Deixa o app abrir sem internet e serve dados já vistos do cache.
// Escritas (POST/PUT/DELETE) NÃO passam por aqui: a fila offline do app cuida.
// =====================================================================
const VERSAO = 'fbv-v1';
const CACHE_APP = 'app-' + VERSAO;   // arquivos do próprio app (shell)
const CACHE_API = 'api-' + VERSAO;   // respostas GET da API (para consulta offline)

const SHELL = [
  '/', '/index.html', '/admin.html', '/operador.html',
  '/css/app.css',
  '/js/icons.js', '/js/api.js', '/js/offline.js', '/js/admin.js', '/js/operador.js',
  '/manifest.webmanifest',
  '/icons/icon-192.png', '/icons/icon-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE_APP);
    await Promise.allSettled(SHELL.map((u) => c.add(u)));  // não falha se um recurso faltar
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const nomes = await caches.keys();
    await Promise.all(nomes.filter((n) => !n.endsWith(VERSAO)).map((n) => caches.delete(n)));
    self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);

  // só interceptamos GET; escritas seguem direto para a rede/fila do app
  if (req.method !== 'GET') return;

  const ehAPI = url.origin === location.origin && url.pathname.startsWith('/api/');

  if (ehAPI) {
    // API: rede primeiro, cai para o cache quando offline
    e.respondWith((async () => {
      try {
        const resp = await fetch(req);
        const c = await caches.open(CACHE_API);
        c.put(req, resp.clone());
        return resp;
      } catch {
        const cacheado = await caches.match(req);
        if (cacheado) return cacheado;
        return new Response(JSON.stringify({ erro: 'Sem conexão e sem dados salvos para esta tela.' }),
          { status: 503, headers: { 'Content-Type': 'application/json' } });
      }
    })());
    return;
  }

  // navegação (abrir uma página): cai para a tela inicial se offline
  if (req.mode === 'navigate') {
    e.respondWith((async () => {
      try { return await fetch(req); }
      catch { return (await caches.match(req)) || (await caches.match('/index.html')); }
    })());
    return;
  }

  // demais recursos (app + CDN): cache primeiro, senão rede
  e.respondWith((async () => {
    const cacheado = await caches.match(req);
    if (cacheado) return cacheado;
    try {
      const resp = await fetch(req);
      if (resp.ok && (url.origin === location.origin || req.url.startsWith('https://cdn'))) {
        const c = await caches.open(CACHE_APP); c.put(req, resp.clone());
      }
      return resp;
    } catch {
      return cacheado || Response.error();
    }
  })());
});
