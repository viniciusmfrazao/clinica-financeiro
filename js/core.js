// =============================================
// CLÍNICA FINANCEIRO — Core
// =============================================

const SUPABASE_URL  = 'https://avdqqbaeormqcvikpawn.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2ZHFxYmFlb3JtcWN2aWtwYXduIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwNzM1OTEsImV4cCI6MjA5MDY0OTU5MX0.EQHJI-ByJ8CRq1y_-GKDykj4vZe3UsngxYV25m3Mm3Y';

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON);

// ---- ESTADO GLOBAL ----
window.APP = {
  user: null,
  config: { nome: 'Clínica Financeiro', cor_primaria: '#0B5345', logo_url: null },
  procs: [], profs: [], usuarios: [], taxas: [],
};

// ---- UTILIDADES ----
const fmt  = v => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
const fmtPct = v => ((v || 0) * 100).toFixed(2) + '%';
const fmtData = d => { if (!d) return ''; const s = String(d).slice(0, 10); const [y,m,dd] = s.split('-'); return `${dd}/${m}/${y}`; };
const mesLabel = m => { if (!m) return ''; const d = new Date(m + 'T12:00:00'); return ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'][d.getMonth()] + '/' + String(d.getFullYear()).slice(2); };
const hoje = () => new Date().toISOString().slice(0, 10);
const mesAtual = () => hoje().slice(0, 7);
const inicioMes = mes => `${mes}-01`;
const fimMes = mes => { const [y, m] = mes.split('-').map(Number); return new Date(y, m, 0).toISOString().slice(0, 10); };
const nParcelas = forma => { const m = forma?.match(/(\d+)x/); return m ? parseInt(m[1]) : 0; };
const ehParcelado = forma => forma?.includes('x') && forma !== 'Crédito 1x';
const MARCO = '2026-02-04';
const initials = nome => nome?.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase() || '?';

// ---- TOAST ----
function toast(msg, tipo = 'success') {
  const ct = document.getElementById('toast-container');
  if (!ct) return;
  const el = document.createElement('div');
  el.className = `toast ${tipo}`;
  el.textContent = msg;
  ct.appendChild(el);
  setTimeout(() => el.remove(), 3200);
}

// ---- MODAL ----
function openModal(html) {
  closeModal();
  const bd = document.createElement('div');
  bd.className = 'modal-backdrop';
  bd.id = 'modal-backdrop';
  bd.innerHTML = `<div class="modal">${html}</div>`;
  bd.addEventListener('click', e => { if (e.target === bd) closeModal(); });
  document.body.appendChild(bd);
}
function closeModal() {
  document.getElementById('modal-backdrop')?.remove();
}

// ---- SPINNER ----
const spinnerHTML = '<span class="spinner"></span>';

// ---- APLICAR COR DO SISTEMA ----
function aplicarCor(cor) {
  document.documentElement.style.setProperty('--primary', cor);
  // Gerar variações
  document.documentElement.style.setProperty('--primary-mid', adjustColor(cor, 20));
  document.documentElement.style.setProperty('--primary-dark', adjustColor(cor, -20));
  document.documentElement.style.setProperty('--primary-light', hexToLight(cor));
}

function adjustColor(hex, amount) {
  const num = parseInt(hex.replace('#',''), 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + amount));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0xFF) + amount));
  const b = Math.min(255, Math.max(0, (num & 0xFF) + amount));
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

function hexToLight(hex) {
  const num = parseInt(hex.replace('#',''), 16);
  const r = (num >> 16);
  const g = ((num >> 8) & 0xFF);
  const b = (num & 0xFF);
  return `rgba(${r},${g},${b},0.12)`;
}

// ---- CARREGAR CONFIG ----
async function carregarConfig() {
  const { data } = await sb.from('config_sistema').select('*').single();
  if (data) {
    APP.config = data;
    aplicarCor(data.cor_primaria || '#0B5345');
    // Logo
    if (data.logo_url) {
      document.querySelectorAll('.logo-img').forEach(el => { el.src = data.logo_url; el.style.display = ''; });
      document.querySelectorAll('.logo-placeholder').forEach(el => el.style.display = 'none');
    }
    // Nome
    document.querySelectorAll('.sistema-nome').forEach(el => el.textContent = data.nome);
    document.title = data.nome;
  }
}

// ---- CARREGAR DADOS BASE ----
async function carregarDadosBase() {
  const [p, pr, u, t] = await Promise.all([
    sb.from('procedimentos').select('*').eq('ativo', true).order('nome'),
    sb.from('profissionais').select('*').eq('ativo', true).order('nome'),
    sb.from('usuarios').select('*').eq('ativo', true).order('nome'),
    sb.from('config_taxas').select('*'),
  ]);
  APP.procs    = p.data || [];
  APP.profs    = pr.data || [];
  APP.usuarios = u.data || [];
  APP.taxas    = t.data || [];
}

// ---- BUSCAR TAXA ----
function buscarTaxa(forma, bandeira) {
  const row = APP.taxas.find(t =>
    t.forma === forma && (t.bandeira === bandeira || (!t.bandeira && !bandeira))
  );
  return row?.taxa || 0;
}

// ---- AUTH ----
async function checkAuth() {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) return null;
  const { data: usr } = await sb.from('usuarios').select('*').eq('id', session.user.id).single();
  if (!usr) return null;
  APP.user = { ...session.user, ...usr };
  return APP.user;
}

async function logout() {
  await sb.auth.signOut();
  location.reload();
}

// ---- SVG ICONS ----
const Icons = {
  dashboard: `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>`,
  entrada:   `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
  saida:     `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>`,
  lista:     `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>`,
  chart:     `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`,
  dre:       `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`,
  receiv:    `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>`,
  settings:  `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>`,
  users:     `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>`,
  logout:    `<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>`,
  print:     `<svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>`,
  export:    `<svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
  close:     `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
  edit:      `<svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
  trash:     `<svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>`,
};
// ---- TOGGLE SENHA ----
window.toggleSenha = function() {
  const input = document.getElementById('nu-senha');
  const ico = document.getElementById('ico-olho');
  if (!input) return;
  const show = input.type === 'password';
  input.type = show ? 'text' : 'password';
  ico.innerHTML = show
    ? '<path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/>'
    : '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>';
};
