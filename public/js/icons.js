// =====================================================================
// FAZENDA BOA VISTA - Conjunto de ícones (SVG de linha, sem emojis)
// Uso: icon('estoque')  ou  icon('estoque', { size: 28, cls: 'x' })
// Todos herdam a cor do texto (currentColor) e a espessura padrão.
// =====================================================================
const ICON_PATHS = {
  // marca
  folha: '<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6"/>',
  // operador — 8 ações
  tarefas: '<path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="m9 14 2 2 4-4"/>',
  checklist: '<path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="m9 12 2 2 4-4"/><path d="M9 17h6"/>',
  combustivel: '<path d="M3 22h12"/><path d="M4 9h10"/><path d="M14 22V4a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v18"/><path d="M14 13h2a2 2 0 0 1 2 2v2a2 2 0 0 0 2 2a2 2 0 0 0 2-2V9.83a2 2 0 0 0-.59-1.42L18 5"/>',
  estoque: '<path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>',
  producao: '<path d="M2 22 16 8"/><path d="M3.47 12.53 5 11l1.53 1.53a3.5 3.5 0 0 1 0 4.94L5 19l-1.53-1.53a3.5 3.5 0 0 1 0-4.94Z"/><path d="M7.47 8.53 9 7l1.53 1.53a3.5 3.5 0 0 1 0 4.94L9 15l-1.53-1.53a3.5 3.5 0 0 1 0-4.94Z"/><path d="M11.47 4.53 13 3l1.53 1.53a3.5 3.5 0 0 1 0 4.94L13 11l-1.53-1.53a3.5 3.5 0 0 1 0-4.94Z"/>',
  problema: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
  buscar: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  registros: '<path d="M14.5 22H18a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v4"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M2 15h10"/><path d="m9 18 3-3-3-3"/>',
  // gerais
  voltar: '<path d="m15 18-6-6 6-6"/>',
  sair: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>',
  ok: '<path d="M21.801 10A10 10 0 1 1 17 3.335"/><path d="m9 11 3 3L22 4"/>',
  cafe: '<path d="M10 2v2"/><path d="M14 2v2"/><path d="M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h14a4 4 0 1 1 0 8h-1"/><path d="M6 2v2"/>',
  abacate: '<path d="M12 2a3 3 0 0 0-3 3c0 1 .3 1.8.8 2.5C8 9 7 11.2 7 13.7 7 18.3 9.2 22 12 22s5-3.7 5-8.3c0-2.5-1-4.7-2.8-6.2.5-.7.8-1.5.8-2.5a3 3 0 0 0-3-3Z"/><circle cx="12" cy="14.5" r="2.2"/>',
  suinos: '<path d="M14.5 8.5c1.5 0 2.7.6 3.5 1.5l1.8-.6c.6-.2 1.2.4 1 1l-.6 1.9c.2.6.3 1.3.3 2 0 3-2.9 5.2-6.5 5.2H12c-3.6 0-6.5-2.3-6.5-5.6 0-1 .3-2 .8-2.8L5 8.4c-.3-.7.4-1.4 1.1-1.1l2 .8c.9-.9 2-1.4 3.4-1.4"/><path d="M11 13h.01"/><path d="M15 13h.01"/><path d="M13 16.5c-.6.4-1.4.4-2 0"/>',
  sync: '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',
  nuvem_off: '<path d="m2 2 20 20"/><path d="M5.8 5.8A6 6 0 0 0 8 17h9a4 4 0 0 0 1.9-.5"/><path d="M9.6 4.5A6 6 0 0 1 17.9 10a4 4 0 0 1 1.5 7"/>',
  relogio: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
};

function icon(nome, opc = {}) {
  const p = ICON_PATHS[nome];
  if (!p) return '';
  const size = opc.size || 24;
  const cls = opc.cls ? ` class="${opc.cls}"` : '';
  const sw = opc.stroke || 2;
  return `<svg${cls} width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
}
