// ============================================================
// CONFIGURAÇÃO
// ============================================================
const SB_URL  = 'https://avdqqbaeormqcvikpawn.supabase.co';
const SB_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2ZHFxYmFlb3JtcWN2aWtwYXduIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwNzM1OTEsImV4cCI6MjA5MDY0OTU5MX0.EQHJI-ByJ8CRq1y_-GKDykj4vZe3UsngxYV25m3Mm3Y';
const sb = supabase.createClient(SB_URL, SB_ANON);
const MARCO = '2026-02-04';

const APP = { user: null, config: {}, procs: [], profs: [], usuarios: [], taxas: [] };

// ============================================================
// UTILS
// ============================================================
const fmt     = v => new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v||0);
const fmtPct  = v => ((v||0)*100).toFixed(2)+'%';
const fmtData = d => { if(!d) return ''; const [y,m,dd]=String(d).slice(0,10).split('-'); return `${dd}/${m}/${y}`; };
const mesLabel= m => { if(!m) return ''; const d=new Date(m+'T12:00:00'); return ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'][d.getMonth()]+'/'+String(d.getFullYear()).slice(2); };
const hoje    = () => new Date().toISOString().slice(0,10);
const mesAtual= () => hoje().slice(0,7);
const inicioMes= mes => `${mes}-01`;
const fimMes  = mes => { const [y,m]=mes.split('-').map(Number); return new Date(y,m,0).toISOString().slice(0,10); };
const nParc   = f => { const m=f?.match(/(\d+)x/); return m?parseInt(m[1]):0; };
const ehParc  = f => f?.includes('x') && f!=='Crédito 1x';
const initials= n => n?.split(' ').map(p=>p[0]).slice(0,2).join('').toUpperCase()||'?';
const spinnerHTML = '<span class="spinner"></span>';

function toast(msg, tipo='success') {
  const ct=document.getElementById('toast-ct');
  const el=document.createElement('div');
  el.className=`toast ${tipo}`; el.textContent=msg;
  ct.appendChild(el); setTimeout(()=>el.remove(),3200);
}
function openModal(html) {
  closeModal();
  const bd=document.createElement('div'); bd.className='modal-backdrop'; bd.id='modal-bd';
  bd.innerHTML=`<div class="modal">${html}</div>`;
  bd.addEventListener('click',e=>{if(e.target===bd)closeModal();});
  document.body.appendChild(bd);
}
function closeModal(){ document.getElementById('modal-bd')?.remove(); }

function aplicarCor(cor) {
  document.documentElement.style.setProperty('--primary', cor);
  const n=parseInt(cor.replace('#',''),16);
  const r=(n>>16),g=((n>>8)&0xFF),b=(n&0xFF);
  document.documentElement.style.setProperty('--primary-mid', `rgb(${Math.min(255,r+20)},${Math.min(255,g+20)},${Math.min(255,b+20)})`);
  document.documentElement.style.setProperty('--primary-dark', `rgb(${Math.max(0,r-20)},${Math.max(0,g-20)},${Math.max(0,b-20)})`);
  document.documentElement.style.setProperty('--primary-light', `rgba(${r},${g},${b},.10)`);
}

function buscarTaxa(forma, bandeira) {
  const row=APP.taxas.find(t=>t.forma===forma&&(t.bandeira===bandeira||(!t.bandeira&&!bandeira)));
  return row?.taxa||0;
}

// ============================================================
// AUTH
// ============================================================
async function checkAuth() {
  const { data:{session} } = await sb.auth.getSession();
  if(!session) return null;
  const { data:usr } = await sb.from('usuarios').select('*').eq('id',session.user.id).single();
  if(!usr) return null;
  APP.user = {...session.user,...usr};
  return APP.user;
}
async function logout() { await sb.auth.signOut(); location.reload(); }

async function carregarConfig() {
  const { data } = await sb.from('config_sistema').select('*').single();
  if(data) {
    APP.config=data;
    aplicarCor(data.cor_primaria||'#0B5345');
    const n=data.nome||'Clínica Financeiro';
    document.querySelectorAll('#sys-nome,#login-nome').forEach(el=>el.textContent=n);
    document.title=n;
    document.getElementById('logo-char').textContent=n[0].toUpperCase();
  }
}

async function carregarBase() {
  const [p,pr,u,t] = await Promise.all([
    sb.from('procedimentos').select('*').eq('ativo',true).order('nome'),
    sb.from('profissionais').select('*').eq('ativo',true).order('nome'),
    sb.from('usuarios').select('*').eq('ativo',true).order('nome'),
    sb.from('config_taxas').select('*'),
  ]);
  APP.procs=p.data||[]; APP.profs=pr.data||[];
  APP.usuarios=u.data||[]; APP.taxas=t.data||[];
}

// ============================================================
// NOTIFICAÇÕES
// ============================================================
async function carregarNotificacoes() {
  const { data } = await sb.from('notificacoes').select('*').eq('lida',false).eq('usuario_id',APP.user.id).order('created_at',{ascending:false}).limit(20);
  const notifs=data||[];
  const badge=document.getElementById('notif-badge');
  const lista=document.getElementById('notif-lista');
  if(badge){badge.textContent=notifs.length>0?notifs.length:'';badge.style.display=notifs.length>0?'flex':'none';}
  if(lista) lista.innerHTML=notifs.length===0
    ?'<div style="padding:18px;text-align:center;color:var(--gray3);font-size:13px">Nenhuma notificação</div>'
    :notifs.map(n=>`<div style="padding:11px 14px;border-bottom:1px solid var(--gray2);cursor:pointer" onclick="marcarLida('${n.id}','${n.link_page||''}')">
      <div style="display:flex;align-items:center;gap:7px;margin-bottom:3px">
        <span style="width:7px;height:7px;border-radius:50%;background:${n.tipo==='warning'?'var(--warning)':n.tipo==='success'?'#1E8449':'var(--info)'};flex-shrink:0"></span>
        <span style="font-weight:600;font-size:13px">${n.titulo}</span></div>
      <div style="font-size:12px;color:var(--text2);padding-left:14px">${n.mensagem}</div>
    </div>`).join('');
}
window.marcarLida=async function(id,page){await sb.from('notificacoes').update({lida:true}).eq('id',id);toggleNotif();await carregarNotificacoes();if(page)navigate(page);};
window.marcarTodasLidas=async function(){await sb.from('notificacoes').update({lida:true}).eq('usuario_id',APP.user.id).eq('lida',false);await carregarNotificacoes();};
function toggleNotif(){const p=document.getElementById('notif-panel');if(p)p.style.display=p.style.display==='none'?'block':'none';}