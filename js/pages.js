
window.toggleFiltrosAvancados = function() {
  const div = document.getElementById('filtros-avancados');
  const btn = document.getElementById('btn-filtros-av');
  if (!div) return;
  const open = div.style.display === 'none';
  div.style.display = open ? 'block' : 'none';
  if (btn) btn.textContent = open ? '− Filtros' : '+ Filtros';
};

window.limparFiltrosForma = function() {
  document.querySelectorAll('#fil-formas-wrap input').forEach(cb => cb.checked = false);
};


// ============================================================
// EXCLUSÃO COM CONFIRMAÇÃO
// ============================================================
window.confirmarExcluir = function(tipo, id, nome) {
  openModal(`<div class="modal-header">
    <h3 style="color:var(--danger)">⚠️ Confirmar exclusão</h3>
    <button class="btn" onclick="closeModal()" style="background:none;font-size:18px;color:var(--gray4)">×</button>
  </div>
  <div class="modal-body">
    <p style="font-size:15px;margin-bottom:8px">Tem certeza que deseja excluir?</p>
    <p style="font-weight:600;color:var(--danger);font-size:14px">${nome}</p>
    <p style="font-size:12px;color:var(--gray3);margin-top:8px">Esta ação não pode ser desfeita.</p>
  </div>
  <div class="modal-footer">
    <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
    <button class="btn btn-danger" onclick="executarExcluir('${tipo}','${id}')">Sim, excluir</button>
  </div>`);
};

window.executarExcluir = async function(tipo, id) {
  closeModal();
  let error;
  if (tipo === 'entrada') {
    await sb.from('parcelas').delete().eq('entrada_id', id);
    ({ error } = await sb.from('entradas').delete().eq('id', id));
    if (!error) {
      toast('Entrada excluída!');
      // Recarregar a view correta dependendo de qual está ativa
      if (document.getElementById('ent-tabela')) carregarEntradas();
      else if (APP.user.perfil === 'secretaria') pgPainelSecretaria();
    }
  } else if (tipo === 'saida_sec') {
    ({ error } = await sb.from('saidas_secretaria').delete().eq('id', id));
    if (!error) {
      toast('Saída excluída!');
      if (document.getElementById('ss-tbl')) carregarSaiasSec();
      else if (document.getElementById('sec-tbl-gas')) {
        const mes = mesAtual();
        const ini = inicioMes(mes), fim = fimMes(mes);
        _carregarPainelSec(ini, fim, mes);
      }
      else if (document.getElementById('saidas-tabela')) carregarSaidas();
    }
  } else if (tipo === 'saida_admin') {
    ({ error } = await sb.from('saidas').delete().eq('id', id));
    if (!error) { toast('Saída excluída!'); carregarSaidas(); }
  }
  if (error) toast('Erro: ' + error.message, 'error');
};


// ============================================================
// DICIONÁRIO DE CATEGORIAS DRE
// ============================================================
const DRE_DICAS = {
  'CMV / Insumos': {
    resumo: 'Tudo que você compra para realizar os procedimentos',
    exemplos: ['INNOVAPHARMA', 'SOUSAM', 'COSMO PHARMA', 'VICTALAB', 'CIMED', 'botox', 'preenchedor', 'fio de sustentação', 'materiais descartáveis', 'luvas', 'seringas', 'anestésicos']
  },
  'Despesas com Pessoal': {
    resumo: 'Qualquer pagamento por trabalho humano — fixo ou eventual',
    exemplos: ['salário de funcionários', 'pró-labore', 'comissão', 'profissional contratado por dia', 'diarista', 'freelancer', 'esteticista terceirizada', 'FGTS', 'férias', '13º salário']
  },
  'Despesas Administrativas': {
    resumo: 'Contas para manter a clínica funcionando',
    exemplos: ['aluguel', 'energia elétrica (DMAE)', 'água', 'internet', 'telefone (VIVO)', 'limpeza', 'sistema de gestão', 'CLINICORP', 'material de escritório', 'manutenção', 'seguro', 'tarifa bancária']
  },
  'Despesas com Vendas': {
    resumo: 'Tudo que você gasta para atrair clientes',
    exemplos: ['Instagram Ads', 'Google Ads', 'influenciadora', 'fotógrafo', 'designer', 'site', 'brinde para pacientes', 'material de divulgação']
  },
  'Impostos e Obrigações': {
    resumo: 'Pagamentos obrigatórios ao governo e órgãos reguladores',
    exemplos: ['DAS (Simples Nacional)', 'INSS', 'ISSQN', 'contabilidade', 'contador', 'anuidade CRM', 'anuidade CRF', 'alvará', 'taxa vigilância sanitária']
  },
  'Despesas Financeiras': {
    resumo: 'Custos do dinheiro em si — juros, parcelas de financiamento',
    exemplos: ['IOF', 'juros de boleto em atraso', 'parcela de consórcio (BB CONSÓRCIO)', 'empréstimo', 'cheque especial', 'PJBANK', 'SAFE2PAY', 'maquininha (taxa mensal)']
  },
  'Outros': {
    resumo: 'O que não se encaixa em nenhuma categoria acima',
    exemplos: ['SUPERMERCADOS BH (uso pessoal)', 'gastos mistos difíceis de categorizar']
  }
};


window.mostrarDicaImp = function(sel) {
  const cat = sel.value;
  const i = sel.dataset.i;
  const dicaEl = document.querySelector('.imp-dica-' + i);
  if (!dicaEl) return;
  if (!cat || !DRE_DICAS[cat]) { dicaEl.style.display='none'; return; }
  dicaEl.textContent = '💡 ' + DRE_DICAS[cat].resumo;
  dicaEl.style.display = 'block';
};
window.mostrarDicaDRE = function(cat) {
  const dicaEl  = document.getElementById('sc-dre-dica');
  const resumoEl= document.getElementById('sc-dre-resumo');
  const exemplosEl= document.getElementById('sc-dre-exemplos');
  if (!dicaEl) return;
  if (!cat || !DRE_DICAS[cat]) { dicaEl.style.display='none'; return; }
  const d = DRE_DICAS[cat];
  resumoEl.textContent = '💡 ' + d.resumo;
  exemplosEl.innerHTML = '<strong>Exemplos:</strong> ' + d.exemplos.join(', ');
  dicaEl.style.display = 'block';
};
// ============================================================
// NAVEGAÇÃO — ÚNICA, CORRETA
// ============================================================
const PAGINAS = {
  dashboard:       pgDashboard,
  nova_entrada:    pgNovaEntrada,
  saida_dia:       pgSaidaDia,
  saida_completa:  pgSaidaCompleta,
  entradas:        pgEntradas,
  historico_paciente:  pgHistoricoPaciente,
  tutorial:        pgTutorial,
  metas_proc:      pgMetasProcSec,
  auditoria:       pgAuditoria,
  importar_extrato: pgImportarExtrato,
  saidas_relatorio: pgSaidas,
  fluxo:           pgFluxo,
  dre:             pgDRE,
  recebiveis:      pgRecebiveis,
  metas:           pgMetas,
  relatorios:      pgRelatorios,
  saidas_sec:      pgSaidasSec,
  admin:           pgAdmin,
  configuracoes:   pgConfiguracoes,
};

const TITULOS = {
  dashboard:'Dashboard', nova_entrada:'Nova Entrada', saida_dia:'Saída do Dia',
  saida_completa:'Saída Completa', entradas:'Entradas', fluxo:'Fluxo de Caixa',
  dre:'DRE', recebiveis:'Recebíveis', metas:'Metas Mensais',
  historico_paciente:'Histórico do Paciente', relatorios:'Por Profissional', saidas_sec:'Minhas Saídas', tutorial:'Tutorial', metas_proc:'Metas', auditoria:'Auditoria', importar_extrato:'Importar Extrato',
  admin:'Administração', configuracoes:'Configurações',
};

function toggleNavSubmenu(el) {
  el.classList.toggle('open');
  const sub = el.nextElementSibling;
  if (sub) sub.classList.toggle('open');
}

function navigate(page) {
  // Atualizar links ativos
  document.querySelectorAll('#sidebar nav a').forEach(a => a.classList.toggle('active', a.dataset.page === page));

  // Se a página pertence ao submenu de saídas, manter submenu aberto
  const paginasSaidas = ['saida_dia','saida_completa','saidas_relatorio','importar_extrato'];
  const toggle = document.getElementById('submenu-saidas-toggle');
  const sub    = document.getElementById('submenu-saidas');
  if (toggle && sub) {
    if (paginasSaidas.includes(page)) {
      toggle.classList.add('open');
      sub.classList.add('open');
    }
  }

  const t = document.getElementById('topbar-title');
  if (t) t.textContent = TITULOS[page] || page;
  document.getElementById('content').innerHTML = '<div style="text-align:center;padding:60px"><span class="spinner dark"></span></div>';
  const fn = PAGINAS[page];
  if (fn) fn(); else pgDashboard();
}





// ============================================================
// DASHBOARD
// ============================================================
async function pgDashboard() {
  // Secretaria vê o painel próprio no dashboard
  if (APP.user.perfil === 'secretaria') return pgPainelSecretaria();

  const ct=document.getElementById('content');
  const mes=mesAtual(), ini=inicioMes(mes), fim=fimMes(mes);

  ct.innerHTML=`
    <div class="metrics-grid" id="dash-metrics">${[1,2,3,4,5,6].map(()=>'<div class="metric-card"><div class="metric-label">...</div><div class="metric-value">—</div></div>').join('')}</div>
    <div id="dash-meta-bar" style="margin-bottom:16px"></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px">
      <div class="card"><h3 style="margin-bottom:12px">Vendas vs Caixa vs Saídas 2026</h3><canvas id="c-anual" height="220"></canvas></div>
      <div class="card"><h3 style="margin-bottom:12px">Resultado mensal</h3><canvas id="c-resultado" height="220"></canvas></div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
      <div class="card"><h3 style="margin-bottom:12px">Por forma de pagamento</h3><div style="max-height:200px;display:flex;align-items:center;justify-content:center"><canvas id="c-forma"></canvas></div></div>
      <div class="card" id="dash-ultimas"><h3 style="margin-bottom:12px">Últimas entradas</h3><span class="spinner dark"></span></div>
    </div>`;

  const [rHoje,rMes,rFluxo,rForma,rUlt,rMeta,rVendas] = await Promise.all([
    sb.from('entradas').select('valor_bruto,valor_liquido').eq('data_venda',hoje()),
    sb.from('entradas').select('valor_bruto,valor_liquido').gte('data_venda',ini).lte('data_venda',fim),
    sb.from('vw_fluxo_caixa').select('*').gte('mes',`${new Date().getFullYear()}-01-01`).lte('mes',`${new Date().getFullYear()}-12-31`).order('mes'),
    sb.from('entradas').select('forma,valor_bruto').gte('data_venda',ini).lte('data_venda',fim),
    sb.from('entradas').select('data_venda,paciente,procedimento_nome,valor_bruto,forma').gte('data_venda',ini).lte('data_venda',fim).order('data_venda',{ascending:false}).limit(6),
    sb.from('metas').select('*').eq('mes',ini).maybeSingle(),
    // Receita real por mês (data_venda) para o gráfico
    sb.from('entradas').select('data_venda,valor_bruto').gte('data_venda',`${new Date().getFullYear()}-01-01`).lte('data_venda',`${new Date().getFullYear()}-12-31`),
  ]);

  const totHoje=rHoje.data?.reduce((s,r)=>s+Number(r.valor_bruto),0)||0;
  const totMes=rMes.data?.reduce((s,r)=>s+Number(r.valor_bruto),0)||0;
  const liqMes=rMes.data?.reduce((s,r)=>s+Number(r.valor_liquido),0)||0;
  const ticket=rMes.data?.length?liqMes/rMes.data.length:0;
  const fluxo=rFluxo.data||[];
  const mesDados=fluxo.find(r=>r.mes?.slice(0,7)===mes);
  // Resultado usa a view (inclui parcelas que vencem no mês)
  const saidasMes=mesDados?.total_saidas||0;
  const resultadoMes=mesDados?.resultado||0;

  document.getElementById('dash-metrics').innerHTML=[
    {l:'Receita hoje',v:fmt(totHoje),s:'Valor bruto',c:''},
    {l:'Receita do mês',v:fmt(totMes),s:`${rMes.data?.length||0} atendimentos`,c:''},
    {l:'Líquido do mês',v:fmt(liqMes),s:'Após taxas',c:'info'},
    {l:'Ticket médio',v:fmt(ticket),s:'Por atendimento',c:'info'},
    {l:'Saídas do mês',v:fmt(saidasMes),s:'Todos os grupos',c:'danger'},
    {l:'Resultado do mês',v:fmt(resultadoMes),s:'Caixa real (c/ parcelas)',c:resultadoMes>=0?'':'danger'},
  ].map(c=>`<div class="metric-card ${c.c}"><div class="metric-label">${c.l}</div><div class="metric-value">${c.v}</div><div class="metric-sub">${c.s}</div></div>`).join('');

  // Barra de meta
  const meta=rMeta.data;
  if(meta&&meta.meta_receita>0) {
    const pct=Math.min(100,Math.round(liqMes/meta.meta_receita*100));
    const cor=pct>=100?'var(--primary)':pct>=70?'var(--warning)':'var(--danger)';
    document.getElementById('dash-meta-bar').innerHTML=`<div class="card" style="padding:13px 18px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:7px">
        <span style="font-weight:600;font-size:13px">Meta de ${mesLabel(mes+'-01')}</span>
        <span style="font-weight:800;font-size:18px;color:${cor}">${pct}%</span>
      </div>
      <div style="background:var(--gray2);border-radius:20px;height:10px;overflow:hidden;margin-bottom:6px">
        <div style="height:100%;width:${pct}%;background:${cor};border-radius:20px;transition:width .8s"></div>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--gray3)">
        <span>Realizado: <strong style="color:${cor}">${fmt(liqMes)}</strong></span>
        <span>Meta: <strong>${fmt(meta.meta_receita)}</strong></span>
        <span>Faltam: <strong>${fmt(Math.max(0,meta.meta_receita-liqMes))}</strong></span>
      </div></div>`;
  }

  // Metas de procedimento no dashboard
  const { data: metasProc } = await sb.from('metas_procedimentos').select('*').eq('ativo', true);
  if (metasProc?.length) {
    const mesAtualStr = mesAtual();
    const metasAtivas = metasProc.filter(m => {
      if (m.periodo === 'mensal') return m.mes?.slice(0,7) === mesAtualStr;
      if (m.periodo === 'semanal') return m.semana_inicio <= hoje() && m.semana_fim >= hoje();
      return false;
    });
    if (metasAtivas.length) {
      const metasProcRows = await Promise.all(metasAtivas.map(async m => {
        const ini = m.periodo === 'mensal' ? m.mes.slice(0,10) : m.semana_inicio;
        const fim = m.periodo === 'mensal' ? fimMes(m.mes.slice(0,7)) : m.semana_fim;
        let q = sb.from('entradas').select('id').gte('data_venda', ini).lte('data_venda', fim).eq('procedimento_nome', m.procedimento_nome);
        if (m.profissional_nome) q = q.eq('profissional_nome', m.profissional_nome);
        const { data: e } = await q;
        const realizado = (e || []).length;
        const pct = Math.min(100, Math.round(realizado / m.quantidade_meta * 100));
        return { ...m, realizado, pct };
      }));

      const barraEl = document.getElementById('dash-meta-bar');
      if (barraEl) {
        const procHtml = metasProcRows.map(r => {
          const cor = r.pct >= 100 ? 'var(--primary)' : r.pct >= 70 ? 'var(--warning)' : 'var(--danger)';
          const faltam = r.quantidade_meta - r.realizado;
          return `<div class="card" style="padding:13px 18px;border-left:4px solid ${cor}">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:7px">
              <span style="font-weight:600;font-size:13px">${r.nome || r.procedimento_nome}${r.profissional_nome ? ' — ' + r.profissional_nome : ''}</span>
              <span style="font-weight:800;font-size:16px;color:${cor}">${r.realizado}/${r.quantidade_meta}</span>
            </div>
            <div style="background:var(--gray2);border-radius:20px;height:8px;overflow:hidden;margin-bottom:5px">
              <div style="height:100%;width:${r.pct}%;background:${cor};border-radius:20px;transition:width .8s"></div>
            </div>
            <div style="font-size:11px;color:var(--gray3)">${faltam > 0 ? `Faltam ${faltam} procedimentos` : '🏆 Meta atingida!'}</div>
          </div>`;
        }).join('');
        barraEl.innerHTML += `<div style="margin-top:10px"><div style="font-size:11px;font-weight:700;color:var(--gray4);text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px">Metas de procedimentos</div><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px">${procHtml}</div></div>`;
      }
    }
  }

  if(fluxo.length) {
    const labels=fluxo.map(r=>mesLabel(r.mes));

    // Agrupar receita real (data_venda) por mês
    const receitaPorMes={};
    (rVendas.data||[]).forEach(r=>{
      const m=r.data_venda?.slice(0,7)+'-01';
      receitaPorMes[m]=(receitaPorMes[m]||0)+Number(r.valor_bruto);
    });

    new Chart(document.getElementById('c-anual'),{type:'bar',data:{labels,datasets:[
      {label:'Receita de Vendas',data:fluxo.map(r=>receitaPorMes[r.mes]||0),backgroundColor:'rgba(17,122,101,0.35)',borderColor:'#117A65',borderWidth:1.5,borderRadius:4},
      {label:'Caixa (entradas)',data:fluxo.map(r=>r.total_entradas||0),backgroundColor:'#117A65',borderRadius:4},
      {label:'Saídas',data:fluxo.map(r=>r.total_saidas||0),backgroundColor:'#E57373',borderRadius:4},
    ]},options:{responsive:true,plugins:{legend:{position:'bottom'}},scales:{y:{ticks:{callback:v=>fmt(v)},grid:{color:'#F0F0F0'}}}}});

    new Chart(document.getElementById('c-resultado'),{type:'line',data:{labels,datasets:[{label:'Resultado',data:fluxo.map(r=>r.resultado||0),borderColor:'#1B4F72',backgroundColor:'rgba(27,79,114,.08)',fill:true,tension:.35,pointRadius:4}]},options:{responsive:true,plugins:{legend:{display:false}},scales:{y:{ticks:{callback:v=>fmt(v)},grid:{color:'#F0F0F0'}}}}});
  }

  const formaMap={};
  rForma.data?.forEach(r=>{formaMap[r.forma]=(formaMap[r.forma]||0)+Number(r.valor_bruto);});
  const fL=Object.keys(formaMap),fD=Object.values(formaMap);
  const CORES=['#117A65','#1B4F72','#784212','#922B21','#1E8449','#8E44AD','#2E86C1','#D35400','#7D6608'];
  if(fL.length) new Chart(document.getElementById('c-forma'),{type:'doughnut',data:{labels:fL,datasets:[{data:fD,backgroundColor:CORES,borderWidth:2}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'right'}}}});

  const ult=rUlt.data||[];
  document.getElementById('dash-ultimas').innerHTML=`<h3 style="margin-bottom:12px">Últimas entradas do mês</h3>${ult.length?`<table><thead><tr><th>Data</th><th>Paciente</th><th>Procedimento</th><th>Forma</th><th style="text-align:right">Valor</th></tr></thead><tbody>${ult.map(r=>`<tr><td>${fmtData(r.data_venda)}</td><td style="font-weight:500">${r.paciente}</td><td style="font-size:12px">${r.procedimento_nome||'-'}</td><td><span class="badge badge-gray" style="font-size:10px">${r.forma}</span></td><td style="text-align:right;font-weight:700;color:var(--primary)">${fmt(r.valor_bruto)}</td></tr>`).join('')}</tbody></table>`:'<div class="empty-state"><p>Nenhuma entrada neste mês</p></div>'}`;
}

// ============================================================
// NOVA ENTRADA
// ============================================================
async function pgNovaEntrada() {
  const ct=document.getElementById('content');
  const {procs,profs,usuarios}=APP;
  const efets=[...profs.map(p=>({nome:p.nome,tipo:'Profissional'})),...usuarios.filter(u=>u.perfil==='secretaria').map(u=>({nome:u.nome,tipo:'Secretaria'}))];
  const formas=['Pix','Dinheiro','Débito','Crédito 1x','Crédito 2x','Crédito 3x','Crédito 4x','Crédito 5x','Crédito 6x','Crédito 7x','Crédito 8x','Crédito 9x','Crédito 10x','Crédito 11x','Crédito 12x'];
  const bandeiras=['Visa','Mastercard','Amex, Elo, outros'];

  ct.innerHTML=`<div style="max-width:680px">
    <form id="form-ent">
      <div class="card" style="margin-bottom:14px">
        <h3 style="margin-bottom:14px">Dados do atendimento</h3>
        <div class="form-grid c2">
          <div class="form-group"><label>Data <span class="req">*</span></label><input type="date" id="f-data" value="${hoje()}" required></div>
          <div class="form-group"><label>Paciente <span class="req">*</span></label><input id="f-pac" placeholder="Nome da paciente" required></div>
        </div>
        <div class="form-grid c2">
          <div class="form-group">
            <label>Procedimento(s) <span class="req">*</span></label>
            <div id="proc-tags-box" style="display:flex;flex-wrap:wrap;gap:6px;min-height:36px;padding:6px 8px;border:1px solid var(--gray2);border-radius:8px;background:#fff;cursor:text;align-items:center" onclick="document.getElementById('f-proc-add').focus()">
              <span id="proc-tags-list" style="display:contents"></span>
              <select id="f-proc-add" style="border:none;outline:none;background:transparent;font-size:13px;color:var(--gray4);flex:1;min-width:120px;cursor:pointer">
                <option value="">+ Adicionar procedimento</option>
                ${procs.map(p=>`<option value="${p.id}" data-nome="${p.nome}">${p.nome}</option>`).join('')}
                <option value="__novo__">+ Novo procedimento</option>
              </select>
            </div>
            <input type="hidden" id="f-proc-nomes" required>
          </div>
          <div class="form-group"><label>Profissional <span class="req">*</span></label>
            <select id="f-prof" required><option value="">Selecione</option>${profs.map(p=>`<option value="${p.id}" data-nome="${p.nome}">${p.nome}</option>`).join('')}</select>
          </div>
        </div>
        <div class="form-grid c3">
          <div class="form-group"><label>CPF <span style="font-size:11px;color:var(--gray4)">(opcional)</span></label><input id="f-cpf" placeholder="000.000.000-00" maxlength="14" oninput="mascararCPF(this)"></div>
          <div class="form-group"><label>Quem efetuou a venda</label>
            <select id="f-efet"><option value="">Selecione</option>${efets.map(e=>`<option value="${e.nome}">${e.nome} (${e.tipo})</option>`).join('')}</select>
          </div>
          <div class="form-group"><label>Observações</label><input id="f-obs" placeholder="Opcional"></div>
        </div>
      </div>
      <div class="card" style="margin-bottom:14px">
        <h3 style="margin-bottom:14px">Pagamento</h3>
        <div class="form-grid c3">
          <div class="form-group"><label>Forma <span class="req">*</span></label>
            <select id="f-forma" required>${formas.map(f=>`<option>${f}</option>`).join('')}</select>
          </div>
          <div class="form-group" id="grp-band" style="display:none"><label>Bandeira</label>
            <select id="f-band"><option value="">Selecione a bandeira</option>${bandeiras.map(b=>`<option>${b}</option>`).join('')}</select>
          </div>
          <div class="form-group"><label>Valor Bruto (R$) <span class="req">*</span></label>
            <input type="number" id="f-valor" step="0.01" min="0.01" placeholder="0,00" required>
          </div>
        </div>
        <div id="preview-pag" style="display:none" class="preview-box">
          <div class="preview-grid">
            <div class="preview-item"><div class="pi-label">Taxa</div><div class="pi-value" id="pv-taxa">—</div></div>
            <div class="preview-item"><div class="pi-label">Valor Taxa</div><div class="pi-value" style="color:var(--danger)" id="pv-vtaxa">—</div></div>
            <div class="preview-item"><div class="pi-label">Valor Líquido</div><div class="pi-value" style="color:var(--primary)" id="pv-liq">—</div></div>
          </div>
          <div id="pv-parc" style="margin-top:8px"></div>
        </div>
      </div>
      <button type="submit" class="btn btn-primary btn-full" id="btn-ent">Lançar Entrada</button>
    </form></div>`;

  const fForma=document.getElementById('f-forma'), fBand=document.getElementById('f-band');
  fBand.disabled = true; // Pix é o padrão, sem bandeira
  function updPreview(){
    const val=parseFloat(document.getElementById('f-valor').value);
    if(!val||val<=0){document.getElementById('preview-pag').style.display='none';return;}
    const forma=fForma.value, band=fBand.value||null, data=document.getElementById('f-data').value;
    const n=nParc(forma), ant=ehParc(forma)&&data<MARCO;
    const taxa=buscarTaxa(forma,band,ant), vt=Math.round(val*taxa*100)/100, liq=Math.round((val-vt)*100)/100;
    const dias=buscarDiasRecebimento(forma,band,ant);
    document.getElementById('preview-pag').style.display='';
    document.getElementById('pv-taxa').textContent=fmtPct(taxa);
    document.getElementById('pv-vtaxa').textContent=fmt(vt);
    document.getElementById('pv-liq').textContent=fmt(liq);
    let parcInfo='';
    if(n>1&&ant) parcInfo=`<span class="badge badge-orange">${n}x · Com antecipação${dias?' · recebe em '+dias+'d':''}</span>`;
    else if(n>1) parcInfo=`<span class="badge badge-green">${n}x · Sem antecipação — parcelas mensais</span>`;
    document.getElementById('pv-parc').innerHTML=parcInfo;
  }
  function toggleBand(){const eh=fForma.value.startsWith('Crédito')||fForma.value==='Débito';document.getElementById('grp-band').style.display=eh?'':'none';fBand.disabled=!eh;if(!eh)fBand.value='';updPreview();}
  fForma.addEventListener('change',toggleBand);
  fBand.addEventListener('change',updPreview);
  document.getElementById('f-valor').addEventListener('input',updPreview);
  document.getElementById('f-data').addEventListener('change',updPreview);

  // ── Multi-procedimentos ─────────────────────────────────────────────────
  let _procsEscolhidos = []; // [{id, nome}]

  function renderProcTags() {
    const list = document.getElementById('proc-tags-list');
    const hidden = document.getElementById('f-proc-nomes');
    if (!list) return;
    list.innerHTML = _procsEscolhidos.map((p,i) =>
      `<span style="display:inline-flex;align-items:center;gap:4px;background:var(--primary-light,#ede9f8);color:var(--primary);border-radius:20px;padding:2px 10px;font-size:12px;font-weight:600">
        ${p.nome}
        <span onclick="removerProcTag(${i})" style="cursor:pointer;font-size:14px;line-height:1;color:var(--gray4);margin-left:2px">×</span>
      </span>`
    ).join('');
    hidden.value = _procsEscolhidos.map(p=>p.nome).join(' + ');
  }

  window.removerProcTag = function(idx) {
    _procsEscolhidos.splice(idx, 1);
    renderProcTags();
  };

  document.getElementById('f-proc-add').addEventListener('change', async e => {
    const val = e.target.value;
    if (!val) return;
    if (val === '__novo__') {
      e.target.value = '';
      openModal(`<div class="modal-header"><h3>Novo Procedimento</h3><button class="btn" onclick="closeModal()" style="background:none;font-size:18px;color:var(--gray4)">×</button></div>
        <div class="modal-body"><div class="form-group"><label>Nome</label><input id="m-proc" placeholder="Ex: Skinbooster" autofocus></div></div>
        <div class="modal-footer"><button class="btn btn-secondary" onclick="closeModal()">Cancelar</button><button class="btn btn-primary" onclick="salvarProc()">Salvar</button></div>`);
      setTimeout(()=>document.getElementById('m-proc')?.focus(),100);
      return;
    }
    const opt = e.target.options[e.target.selectedIndex];
    const nome = opt.dataset.nome || opt.text;
    if (!_procsEscolhidos.find(p => p.id == val)) {
      _procsEscolhidos.push({ id: val, nome });
      renderProcTags();
    }
    e.target.value = '';
  });

  document.getElementById('form-ent').addEventListener('submit',async e=>{
    e.preventDefault();
    const btn=document.getElementById('btn-ent'); btn.innerHTML=spinnerHTML; btn.disabled=true;
    const forma=fForma.value, band=fBand.value||null, data=document.getElementById('f-data').value;
    const val=parseFloat(document.getElementById('f-valor').value);
    const _ant=ehParc(forma)&&data<MARCO;
    const taxa=buscarTaxa(forma,band,_ant), vt=Math.round(val*taxa*100)/100, liq=Math.round((val-vt)*100)/100;
    const prOpt=document.getElementById('f-prof');
    if(_procsEscolhidos.length===0){
      toast('Selecione ao menos um procedimento','warning');
      btn.innerHTML='Lançar Entrada'; btn.disabled=false; return;
    }
    if((forma.startsWith('Crédito')||forma==='Débito')&&!band){
      toast('Selecione a bandeira do cartão','warning');
      btn.innerHTML='Lançar Entrada'; btn.disabled=false; return;
    }
    const procId = _procsEscolhidos.length === 1 ? _procsEscolhidos[0].id : null;
    const procNome = _procsEscolhidos.map(p=>p.nome).join(' + ');
    const {error}=await sb.from('entradas').insert({
      data_venda:data, paciente:document.getElementById('f-pac').value.trim(),
      cpf:document.getElementById('f-cpf').value.trim()||null,
      procedimento_id:procId||null, procedimento_nome:procNome,
      profissional_id:prOpt.value||null, profissional_nome:prOpt.options[prOpt.selectedIndex]?.dataset.nome||'',
      efetuou_venda:document.getElementById('f-efet').value||null,
      forma, bandeira:band, valor_bruto:val, taxa_pct:taxa, valor_taxa:vt, valor_liquido:liq,
      n_parcelas:nParc(forma), antecipacao:ehParc(forma)&&data<MARCO,
      observacoes:document.getElementById('f-obs').value||null, lancado_por:APP.user.id,
    });
    if(error) toast('Erro: '+error.message,'error');
    else {
      toast('Entrada lançada!');
      registrarAuditoria('NOVA_ENTRADA','entradas','',`Paciente: ${document.getElementById('f-pac').value.trim()} | Procedimento: ${procNome} | Valor: ${val}`);
      document.getElementById('f-pac').value='';
      _procsEscolhidos=[];
      renderProcTags();
      document.getElementById('f-valor').value='';
      document.getElementById('preview-pag').style.display='none';
    }
    btn.innerHTML='Lançar Entrada'; btn.disabled=false;
  });
}

window.salvarProc=async function(){
  const nome=document.getElementById('m-proc')?.value?.trim();
  if(!nome)return toast('Digite o nome','warning');
  const {data,error}=await sb.from('procedimentos').insert({nome}).select().single();
  if(error)return toast('Erro: '+error.message,'error');
  toast('Cadastrado!'); APP.procs.push(data); closeModal();
  // Adicionar ao dropdown de multi-proc
  const sel=document.getElementById('f-proc-add');
  if(sel){
    const opt=document.createElement('option');
    opt.value=data.id; opt.dataset.nome=data.nome; opt.text=data.nome;
    sel.insertBefore(opt,sel.querySelector('option[value="__novo__"]'));
  }
  // Já adicionar como tag selecionada
  if(window._procsEscolhidos!==undefined){
    // _procsEscolhidos está no escopo da função pgNovaEntrada — precisa disparar via select
    if(sel){ sel.value=data.id; sel.dispatchEvent(new Event('change')); }
  }
};


// ============================================================
// FICHA DO PACIENTE
// ============================================================
async function pgHistoricoPaciente() {
  const ct = document.getElementById('content');
  ct.innerHTML = `
    <div class="page-header"><h2>Histórico do Paciente</h2></div>
    <div class="card" style="margin-bottom:14px">
      <div style="display:flex;gap:10px;align-items:flex-end;flex-wrap:wrap">
        <div class="form-group" style="margin:0;flex:1;min-width:220px">
          <label style="font-size:12px;color:var(--gray4);font-weight:700;text-transform:uppercase">Buscar por nome ou CPF</label>
          <input id="fp-busca" placeholder="Ex: Jessica ou 000.000.000-00" style="margin-top:4px">
        </div>
        <button class="btn btn-primary" onclick="buscarHistoricoPaciente()">Buscar</button>
      </div>
    </div>
    <div id="fp-ranking" style="margin-bottom:14px"></div>
    <div id="fp-resultado"></div>`;

  // Carregar ranking automaticamente
  await carregarRankingHistorico();

  document.getElementById('fp-busca').addEventListener('keydown', e => {
    if (e.key === 'Enter') buscarHistoricoPaciente();
  });
}

async function carregarRankingHistorico() {
  const { data } = await sb.from('entradas').select('paciente,cpf,valor_bruto,valor_liquido,data_venda,procedimento_nome')
    .order('data_venda', { ascending: false });
  if (!data?.length) return;

  // Agrupar por CPF (se tiver) ou por nome
  const mapa = {};
  data.forEach(r => {
    const chave = r.cpf ? r.cpf.replace(/\D/g,'') : '__nome__' + (r.paciente||'').toLowerCase().trim();
    if (!mapa[chave]) mapa[chave] = { nomes: new Set(), cpf: r.cpf||null, atendimentos: 0, total: 0, liquido: 0, ultima: '', procs: {} };
    const p = mapa[chave];
    p.nomes.add(r.paciente);
    p.atendimentos++;
    p.total += Number(r.valor_bruto);
    p.liquido += Number(r.valor_liquido);
    if (!p.ultima || r.data_venda > p.ultima) p.ultima = r.data_venda;
    if (r.procedimento_nome) p.procs[r.procedimento_nome] = (p.procs[r.procedimento_nome]||0)+1;
  });

  const lista = Object.values(mapa).map(p => ({
    ...p,
    nome: [...p.nomes].join(' / '),
    ticket: p.atendimentos ? p.total / p.atendimentos : 0,
  })).sort((a,b) => b.total - a.total);

  const top10 = lista.slice(0, 10);
  const el = document.getElementById('fp-ranking');
  if (!el) return;

  // Tabs ranking
  el.innerHTML = `
    <div class="card" style="padding:0">
      <div style="padding:14px 18px;border-bottom:1px solid var(--gray2);display:flex;justify-content:space-between;align-items:center">
        <h3 style="margin:0">🏆 Ranking de Pacientes</h3>
        <div style="display:flex;gap:6px">
          <button class="btn btn-sm btn-primary" id="rank-btn-total" onclick="mostrarRanking('total')">💰 Maior gasto</button>
          <button class="btn btn-sm btn-secondary" id="rank-btn-freq" onclick="mostrarRanking('freq')">📅 Mais visitas</button>
          <button class="btn btn-sm btn-secondary" id="rank-btn-ticket" onclick="mostrarRanking('ticket')">🎯 Maior ticket</button>
        </div>
      </div>
      <div id="rank-lista" style="padding:0"></div>
    </div>`;

  // Guardar lista para os rankings
  window._rankingHistorico = lista;
  mostrarRanking('total');
}

window.mostrarRanking = function(tipo) {
  const lista = window._rankingHistorico || [];
  let ordenada;
  if (tipo === 'total')  ordenada = [...lista].sort((a,b) => b.total - a.total).slice(0,10);
  if (tipo === 'freq')   ordenada = [...lista].sort((a,b) => b.atendimentos - a.atendimentos).slice(0,10);
  if (tipo === 'ticket') ordenada = [...lista].sort((a,b) => b.ticket - a.ticket).slice(0,10);

  // Atualizar botões
  ['total','freq','ticket'].forEach(t => {
    const btn = document.getElementById('rank-btn-'+t);
    if (btn) btn.className = 'btn btn-sm ' + (t===tipo?'btn-primary':'btn-secondary');
  });

  const medalhas = ['🥇','🥈','🥉'];
  const el = document.getElementById('rank-lista');
  if (!el) return;
  el.innerHTML = `<div class="table-wrapper"><table>
    <thead><tr><th>#</th><th>Paciente</th><th>CPF</th><th style="text-align:right">Total gasto</th><th style="text-align:center">Visitas</th><th style="text-align:right">Ticket médio</th><th>Última visita</th><th></th></tr></thead>
    <tbody>${ordenada.map((p,i) => `<tr>
      <td style="font-weight:700;font-size:16px">${medalhas[i]||'#'+(i+1)}</td>
      <td style="font-weight:600">${p.nome}</td>
      <td style="font-size:12px;color:var(--gray4)">${p.cpf||'—'}</td>
      <td style="text-align:right;font-weight:700;color:var(--primary)">${fmt(p.total)}</td>
      <td style="text-align:center">${p.atendimentos}</td>
      <td style="text-align:right">${fmt(p.ticket)}</td>
      <td style="font-size:12px">${fmtData(p.ultima)}</td>
      <td><button class="btn btn-secondary btn-sm" onclick="verHistoricoPorNome('${p.nome.replace(/'/g,'').split(' / ')[0]}','${p.cpf||''}')"">Ver histórico</button></td>
    </tr>`).join('')}
    </tbody></table></div>`;
};

window.verHistoricoPorNome = function(nome, cpf) {
  const busca = document.getElementById('fp-busca');
  if (busca) busca.value = cpf || nome;
  buscarHistoricoPaciente();
};

window.buscarHistoricoPaciente = async function() {
  const termo = (document.getElementById('fp-busca')?.value || '').trim();
  if (!termo) return toast('Digite um nome ou CPF', 'warning');
  const el = document.getElementById('fp-resultado');
  if (!el) return;
  el.innerHTML = '<div style="text-align:center;padding:30px"><span class="spinner dark"></span></div>';

  // Buscar por CPF (só dígitos) ou por nome
  const soDig = termo.replace(/\D/g,'');
  let q = sb.from('entradas').select('*').order('data_venda', { ascending: false });
  if (soDig.length >= 6) {
    // Busca por CPF — filtra no cliente pois LIKE no cpf com máscara
    const { data: todos } = await q;
    const rows = (todos||[]).filter(r => (r.cpf||'').replace(/\D/g,'').includes(soDig));
    renderHistorico(rows, termo);
  } else {
    const { data: rows } = await q.ilike('paciente', '%'+termo+'%');
    renderHistorico(rows||[], termo);
  }
};

function renderHistorico(rows, termo) {
  const el = document.getElementById('fp-resultado');
  if (!el) return;
  if (!rows.length) {
    el.innerHTML = '<div class="card"><div class="empty-state"><p>Nenhum paciente encontrado para "'+termo+'"</p></div></div>';
    return;
  }

  // Agrupar por paciente (podem ter nomes ligeiramente diferentes)
  const totB   = rows.reduce((s,r)=>s+Number(r.valor_bruto),0);
  const totL   = rows.reduce((s,r)=>s+Number(r.valor_liquido),0);
  const ticket = rows.length ? totB/rows.length : 0;
  const procs  = {};
  rows.forEach(r=>{ if(r.procedimento_nome) procs[r.procedimento_nome]=(procs[r.procedimento_nome]||0)+1; });
  const topProcs = Object.entries(procs).sort((a,b)=>b[1]-a[1]);
  const cpfAtual = rows.find(r=>r.cpf)?.cpf || null;
  const nomePrincipal = rows[0].paciente;

  el.innerHTML = `
    <div class="card" style="margin-bottom:14px;border-top:4px solid var(--primary)">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px;flex-wrap:wrap;gap:10px">
        <div>
          <h2 style="margin:0;font-size:20px">${nomePrincipal}</h2>
          <div style="display:flex;align-items:center;gap:8px;margin-top:6px">
            <span style="font-size:13px;color:var(--gray4)">CPF:</span>
            <span id="fp-cpf-display" style="font-size:13px;font-weight:600">${cpfAtual||'Não informado'}</span>
            <button onclick="editarCPFHistorico('${nomePrincipal.replace(/'/g,'')}')" class="btn btn-secondary btn-sm">✏ ${cpfAtual?'Alterar CPF':'Adicionar CPF'}</button>
          </div>
        </div>
        <div style="font-size:12px;color:var(--gray4)">
          <div>Primeira visita: <strong>${fmtData(rows[rows.length-1].data_venda)}</strong></div>
          <div>Última visita: <strong>${fmtData(rows[0].data_venda)}</strong></div>
        </div>
      </div>
      <div class="metrics-grid" style="grid-template-columns:repeat(4,1fr);margin-bottom:16px">
        <div class="metric-card"><div class="metric-label">Total gasto</div><div class="metric-value" style="font-size:18px">${fmt(totB)}</div></div>
        <div class="metric-card info"><div class="metric-label">Total líquido</div><div class="metric-value" style="font-size:18px">${fmt(totL)}</div></div>
        <div class="metric-card"><div class="metric-label">Atendimentos</div><div class="metric-value" style="font-size:18px">${rows.length}</div></div>
        <div class="metric-card"><div class="metric-label">Ticket médio</div><div class="metric-value" style="font-size:18px">${fmt(ticket)}</div></div>
      </div>
      ${topProcs.length ? `
      <div style="margin-bottom:16px">
        <div style="font-size:11px;font-weight:700;color:var(--gray4);text-transform:uppercase;margin-bottom:8px">Procedimentos realizados</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px">
          ${topProcs.map(([proc,qtd])=>`<span class="badge badge-blue" style="font-size:12px;padding:5px 10px">${proc} <strong>(${qtd}x)</strong></span>`).join('')}
        </div>
      </div>` : ''}
      <div style="font-size:11px;font-weight:700;color:var(--gray4);text-transform:uppercase;margin-bottom:8px">Histórico de atendimentos</div>
      <div class="table-wrapper"><table>
        <thead><tr><th>Data</th><th>Procedimento</th><th>Profissional</th><th>Forma</th><th style="text-align:right">Valor</th><th>Ações</th></tr></thead>
        <tbody>${rows.map(r=>`<tr>
          <td>${fmtData(r.data_venda)}</td>
          <td>${r.procedimento_nome||'-'}</td>
          <td>${r.profissional_nome||'-'}</td>
          <td><span class="badge badge-blue" style="font-size:11px">${r.forma}</span></td>
          <td style="text-align:right;font-weight:700">${fmt(r.valor_bruto)}</td>
          <td><button class="btn btn-secondary btn-sm" onclick="editEntrada('${r.id}')">✏</button></td>
        </tr>`).join('')}
        </tbody>
      </table></div>
    </div>`;
}

window.editarCPFHistorico = async function(nome) {
  // Buscar CPF atual
  const { data } = await sb.from('entradas').select('id,cpf').ilike('paciente', '%'+nome+'%').limit(1);
  const cpfAtual = data?.[0]?.cpf || '';
  openModal(`<div class="modal-header"><h3>CPF do Paciente</h3><button class="btn" onclick="closeModal()" style="background:none;font-size:18px;color:var(--gray4)">×</button></div>
    <div class="modal-body">
      <p style="font-size:13px;margin-bottom:12px">Atualizando CPF de <strong>${nome}</strong> em todos os atendimentos.</p>
      <div class="form-group">
        <label>CPF</label>
        <input id="fp-cpf-input" value="${cpfAtual}" placeholder="000.000.000-00" maxlength="14" oninput="mascararCPF(this)">
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-primary" onclick="salvarCPFHistorico('${nome.replace(/'/g,'')}')">Salvar em todos os atendimentos</button>
    </div>`);
  setTimeout(()=>document.getElementById('fp-cpf-input')?.focus(),100);
};

window.salvarCPFHistorico = async function(nome) {
  const cpf = document.getElementById('fp-cpf-input')?.value.trim() || null;
  // Atualizar em todas as entradas desse paciente
  const { error } = await sb.from('entradas').update({ cpf }).ilike('paciente', '%'+nome+'%');
  if (error) return toast('Erro: '+error.message, 'error');
  const qtd = await sb.from('entradas').select('id', {count:'exact',head:true}).ilike('paciente','%'+nome+'%');
  toast('CPF atualizado em todos os atendimentos!');
  closeModal();
  buscarHistoricoPaciente();
};


// ============================================================
// SAÍDA DO DIA — formulário simples (ambos os perfis)
// ============================================================
async function pgSaidaDia(){
  const ct=document.getElementById('content');
  const cats=['Lanche / Alimentação','Limpeza / Higiene','Estacionamento / Capina','Material de escritório','Transporte / Uber','Outros'];
  ct.innerHTML=`<div style="max-width:580px"><div class="card">
    <h3 style="margin-bottom:4px">Saída do Dia a Dia</h3>
    <p style="font-size:13px;color:var(--text2);margin-bottom:14px">Lanches, limpeza, estacionamento, materiais pequenos.</p>
    <form id="form-sd">
      <div class="form-grid c2">
        <div class="form-group"><label>Data <span class="req">*</span></label><input type="date" id="sd-data" value="${hoje()}" required></div>
        <div class="form-group"><label>Categoria <span class="req">*</span></label><select id="sd-cat" required><option value="">Selecione</option>${cats.map(c=>`<option>${c}</option>`).join('')}</select></div>
      </div>
      <div class="form-grid"><div class="form-group"><label>Descrição <span class="req">*</span></label><input id="sd-desc" placeholder="Ex: Lanche" required></div></div>
      <div class="form-grid c3">
        <div class="form-group"><label>Valor (R$) <span class="req">*</span></label><input type="number" id="sd-val" step="0.01" min="0.01" placeholder="0,00" required></div>
        <div class="form-group"><label>Forma</label><select id="sd-forma"><option>Pix</option><option>Dinheiro</option><option>Cartão Débito</option><option>Cartão Crédito</option></select></div>
        <div class="form-group"><label>Quem pagou</label><input id="sd-quem" placeholder="Ex: Amanda"></div>
      </div>
      <button type="submit" class="btn btn-primary btn-full" id="btn-sd">Registrar Saída</button>
    </form></div></div>`;
  document.getElementById('form-sd').addEventListener('submit',async e=>{
    e.preventDefault(); const btn=document.getElementById('btn-sd'); btn.innerHTML=spinnerHTML; btn.disabled=true;
    const {error}=await sb.from('saidas_secretaria').insert({
      data_saida:document.getElementById('sd-data').value, categoria:document.getElementById('sd-cat').value,
      descricao:document.getElementById('sd-desc').value.trim(), valor:parseFloat(document.getElementById('sd-val').value),
      forma_pag:document.getElementById('sd-forma').value, quem_pagou:document.getElementById('sd-quem').value||null, lancado_por:APP.user.id,
    });
    if(error) toast('Erro: '+error.message,'error');
    else { toast('Saída registrada!'); registrarAuditoria('NOVA_SAIDA_DIA','saidas_secretaria','',`Desc: ${document.getElementById('sd-desc').value.trim()} | Valor: ${document.getElementById('sd-val').value}`); e.target.reset(); document.getElementById('sd-data').value=hoje(); }
    btn.innerHTML='Registrar Saída'; btn.disabled=false;
  });
}

async function pgPainelSecretaria(){
  const ct = document.getElementById('content');
  const mes = mesAtual(), ini = inicioMes(mes), fim = fimMes(mes);

  ct.innerHTML = `
    <div class="page-header"><h2>Meu Painel</h2></div>
    <div class="metrics-grid" id="sec-metrics" style="margin-bottom:16px">
      ${[1,2,3,4].map(()=>'<div class="metric-card"><div class="metric-label">...</div><div class="metric-value">—</div></div>').join('')}
    </div>
    <div id="sec-metas" style="margin-bottom:16px"></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:16px">
      <div class="card" id="card-sec-ent"><h3 style="margin-bottom:12px">Entradas do mês por dia</h3><canvas id="c-sec-ent" height="200"></canvas></div>
      <div class="card" id="card-sec-gas"><h3 style="margin-bottom:12px">Meus gastos por categoria</h3><div style="display:flex;align-items:center;justify-content:center;height:200px"><canvas id="c-sec-gas"></canvas></div></div>
    </div>
    <div class="card" style="padding:0;margin-bottom:16px" id="sec-tbl-gas">
      <div style="padding:12px 16px;border-bottom:1px solid var(--gray2);font-weight:600;font-size:13px">Meus gastos do mês</div>
      <div style="text-align:center;padding:30px"><span class="spinner dark"></span></div>
    </div>`;

  await _carregarPainelSec(ini, fim, mes);
}

async function _carregarPainelSec(ini, fim, mes) {
  const [rEnt, rGas, rMeta, rMetasProc] = await Promise.all([
    sb.from('entradas').select('data_venda,valor_bruto').gte('data_venda',ini).lte('data_venda',fim).order('data_venda',{ascending:false}),
    sb.from('saidas_secretaria').select('*').gte('data_saida',ini).lte('data_saida',fim).eq('lancado_por',APP.user.id).order('data_saida',{ascending:false}),
    sb.from('metas').select('*').eq('mes',ini).maybeSingle(),
    sb.from('metas_procedimentos').select('*').eq('ativo',true),
  ]);

  const entradas = rEnt.data||[], gastos = rGas.data||[];
  const totEnt = entradas.reduce((s,r)=>s+Number(r.valor_bruto),0);
  const totGas = gastos.reduce((s,r)=>s+Number(r.valor),0);
  const meta   = rMeta.data;
  const entHoje = entradas.filter(r=>r.data_venda===hoje()).reduce((s,r)=>s+Number(r.valor_bruto),0);
  const pctMeta = meta?.meta_receita>0 ? Math.min(100,Math.round(totEnt/meta.meta_receita*100)) : null;

  // KPIs
  document.getElementById('sec-metrics').innerHTML=[
    {l:'Entradas hoje',     v:fmt(entHoje), s:'Valor bruto', c:''},
    {l:'Entradas do mês',   v:fmt(totEnt),  s:`${entradas.length} atendimentos`, c:''},
    {l:'Meus gastos do mês',v:fmt(totGas),  s:`${gastos.length} lançamentos`, c:'danger'},
    {l:'Meta do mês',       v:pctMeta!==null?pctMeta+'%':'—', s:meta?.meta_receita>0?`de ${fmt(meta.meta_receita)}`:'Sem meta definida', c:''},
  ].map(c=>`<div class="metric-card ${c.c}"><div class="metric-label">${c.l}</div><div class="metric-value">${c.v}</div><div class="metric-sub">${c.s}</div></div>`).join('');

  // Metas
  let metasHtml = '';
  if (meta?.meta_receita>0) {
    const pct = Math.min(100,Math.round(totEnt/meta.meta_receita*100));
    const cor = pct>=100?'var(--primary)':pct>=70?'var(--warning)':'var(--danger)';
    metasHtml += `<div class="card" style="padding:13px 18px;margin-bottom:10px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:7px">
        <span style="font-weight:600;font-size:13px">🎯 Meta de receita — ${mesLabel(mes+'-01')}</span>
        <span style="font-weight:800;font-size:18px;color:${cor}">${pct}%</span>
      </div>
      <div style="background:var(--gray2);border-radius:20px;height:10px;overflow:hidden;margin-bottom:6px">
        <div style="height:100%;width:${pct}%;background:${cor};border-radius:20px;transition:width .8s"></div>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--gray3)">
        <span>Realizado: <strong style="color:${cor}">${fmt(totEnt)}</strong></span>
        <span>Meta: <strong>${fmt(meta.meta_receita)}</strong></span>
        <span>${pct>=100?'🏆 Meta atingida!':'Faltam: <strong>'+fmt(meta.meta_receita-totEnt)+'</strong>'}</span>
      </div></div>`;
  }

  const mesAtualStr = mesAtual();
  const metasAtivas = (rMetasProc.data||[]).filter(m=>{
    if(m.periodo==='mensal') return m.mes?.slice(0,7)===mesAtualStr;
    if(m.periodo==='semanal') return m.semana_inicio<=hoje()&&m.semana_fim>=hoje();
    return false;
  });
  if (metasAtivas.length) {
    const mpRows = await Promise.all(metasAtivas.map(async m=>{
      const mIni = m.periodo==='mensal'?m.mes.slice(0,10):m.semana_inicio;
      const mFim = m.periodo==='mensal'?fimMes(m.mes.slice(0,7)):m.semana_fim;
      let q = sb.from('entradas').select('id').gte('data_venda',mIni).lte('data_venda',mFim).eq('procedimento_nome',m.procedimento_nome);
      if(m.profissional_nome) q=q.eq('profissional_nome',m.profissional_nome);
      const {data:e}=await q;
      const realizado=(e||[]).length;
      return {...m,realizado,pct:Math.min(100,Math.round(realizado/m.quantidade_meta*100))};
    }));
    metasHtml += `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px;margin-bottom:10px">
      ${mpRows.map(r=>{
        const cor=r.pct>=100?'var(--primary)':r.pct>=70?'var(--warning)':'var(--danger)';
        return `<div class="card" style="padding:13px 18px;border-left:4px solid ${cor}">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:7px">
            <span style="font-weight:600;font-size:13px">${r.nome||r.procedimento_nome}</span>
            <span style="font-weight:800;font-size:16px;color:${cor}">${r.realizado}/${r.quantidade_meta}</span>
          </div>
          <div style="background:var(--gray2);border-radius:20px;height:8px;overflow:hidden;margin-bottom:4px">
            <div style="height:100%;width:${r.pct}%;background:${cor};border-radius:20px;transition:width .8s"></div>
          </div>
          <div style="font-size:11px;color:var(--gray3)">${r.pct>=100?'🏆 Meta atingida!':'Faltam '+(r.quantidade_meta-r.realizado)+' procedimentos'}</div>
        </div>`;
      }).join('')}</div>`;
  }
  document.getElementById('sec-metas').innerHTML = metasHtml;

  // Gráfico entradas por dia
  const porDia={};
  entradas.forEach(r=>{ porDia[r.data_venda]=(porDia[r.data_venda]||0)+Number(r.valor_bruto); });
  const diasSort=Object.keys(porDia).sort();
  const cEnt = document.getElementById('c-sec-ent');
  if(cEnt && diasSort.length) {
    new Chart(cEnt,{type:'bar',data:{labels:diasSort.map(d=>fmtData(d)),datasets:[{label:'Entradas',data:diasSort.map(d=>porDia[d]),backgroundColor:'#117A65',borderRadius:4}]},options:{responsive:true,plugins:{legend:{display:false}},scales:{y:{ticks:{callback:v=>fmt(v)},grid:{color:'#F0F0F0'}}}}});
  } else if(document.getElementById('card-sec-ent')) {
    document.getElementById('card-sec-ent').innerHTML='<h3 style="margin-bottom:12px">Entradas do mês por dia</h3><div class="empty-state" style="padding:30px"><p>Nenhuma entrada neste mês</p></div>';
  }

  // Gráfico gastos por categoria
  const porCat={};
  gastos.forEach(r=>{ porCat[r.categoria]=(porCat[r.categoria]||0)+Number(r.valor); });
  const cGas = document.getElementById('c-sec-gas');
  if(cGas && Object.keys(porCat).length) {
    new Chart(cGas,{type:'doughnut',data:{labels:Object.keys(porCat),datasets:[{data:Object.values(porCat),backgroundColor:['#E57373','#64B5F6','#FFD54F','#81C784','#CE93D8','#80DEEA'],borderWidth:2}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'right'}}}});
  } else if(document.getElementById('card-sec-gas')) {
    document.getElementById('card-sec-gas').innerHTML='<h3 style="margin-bottom:12px">Meus gastos por categoria</h3><div class="empty-state" style="padding:30px"><p>Nenhum gasto registrado neste mês</p></div>';
  }

  // Tabela gastos com editar/excluir
  const tblGas = document.getElementById('sec-tbl-gas');
  if (tblGas) tblGas.innerHTML = `
    <div style="padding:12px 16px;border-bottom:1px solid var(--gray2);display:flex;justify-content:space-between;align-items:center">
      <span style="font-weight:600;font-size:13px">Meus gastos do mês</span>
      ${gastos.length?`<span style="font-weight:700;color:var(--danger)">${fmt(totGas)}</span>`:''}
    </div>
    ${gastos.length?`<div class="table-wrapper"><table>
      <thead><tr><th>Data</th><th>Categoria</th><th>Descrição</th><th>Forma</th><th style="text-align:right">Valor</th><th>Ações</th></tr></thead>
      <tbody>${gastos.map(r=>`<tr>
        <td>${fmtData(r.data_saida)}</td>
        <td><span class="badge badge-gray">${r.categoria}</span></td>
        <td>${r.descricao}</td>
        <td style="font-size:12px">${r.forma_pag||'-'}</td>
        <td style="text-align:right;font-weight:700;color:var(--danger)">${fmt(r.valor)}</td>
        <td style="display:flex;gap:4px">
          <button class="btn btn-secondary btn-sm" onclick="editSaidaSec('${r.id}')">✏</button>
          <button class="btn btn-sm" style="background:var(--danger-light);color:var(--danger)" onclick="confirmarExcluir('saida_sec','${r.id}','${(r.descricao||'').replace(/'/g,'')}')">🗑</button>
        </td>
      </tr>`).join('')}</tbody>
    </table></div>`:'<div class="empty-state" style="padding:30px"><p>Nenhum gasto registrado neste mês</p></div>'}`;
}


async function pgSaidaCompleta(){
  const ct=document.getElementById('content');
  const dre=['CMV / Insumos','Despesas com Pessoal','Despesas Administrativas','Despesas com Vendas','Impostos e Obrigações','Despesas Financeiras','Outros'];
  ct.innerHTML=`<div style="max-width:680px"><div class="card">
    <h3 style="margin-bottom:4px">Saída Completa</h3>
    <p style="font-size:13px;color:var(--text2);margin-bottom:14px">Fornecedores, pessoal, impostos, marketing.</p>
    <form id="form-sc">
      <div class="form-grid c2">
        <div class="form-group"><label>Data <span class="req">*</span></label><input type="date" id="sc-data" value="${hoje()}" required></div>
        <div class="form-group">
          <label>Categoria DRE <span class="req">*</span></label>
          <select id="sc-dre" required onchange="mostrarDicaDRE(this.value)">
            <option value="">Selecione</option>${dre.map(c=>`<option>${c}</option>`).join('')}
          </select>
          <div id="sc-dre-dica" style="display:none;margin-top:8px;padding:10px 12px;background:var(--info-light);border-radius:var(--rsm);font-size:12px;color:var(--info);border-left:3px solid var(--info)">
            <div id="sc-dre-resumo" style="font-weight:600;margin-bottom:5px"></div>
            <div id="sc-dre-exemplos" style="color:var(--text2)"></div>
          </div>
        </div>
      </div>
      <div class="form-grid c2">
        <div class="form-group"><label>Categoria Original</label><input id="sc-cat" placeholder="Ex: FORNECEDORES"></div>
        <div class="form-group"><label>Tipo</label><select id="sc-tipo"><option>Variável</option><option>Fixo</option></select></div>
      </div>
      <div class="form-grid"><div class="form-group"><label>Descrição / Fornecedor <span class="req">*</span></label><input id="sc-desc" placeholder="Ex: INNOVAPHARMA" required></div></div>
      <div class="form-grid c3">
        <div class="form-group"><label>Valor (R$) <span class="req">*</span></label><input type="number" id="sc-val" step="0.01" min="0.01" placeholder="0,00" required></div>
        <div class="form-group"><label>Forma Pag.</label><input id="sc-forma" placeholder="Pix, Boleto..."></div>
        <div class="form-group"><label>Banco</label><input id="sc-banco" value="BB"></div>
      </div>
      <button type="submit" class="btn btn-primary btn-full" id="btn-sc">Lançar Saída</button>
    </form></div></div>`;
  document.getElementById('form-sc').addEventListener('submit',async e=>{
    e.preventDefault(); const btn=document.getElementById('btn-sc'); btn.innerHTML=spinnerHTML; btn.disabled=true;
    const {error}=await sb.from('saidas').insert({
      data_saida:document.getElementById('sc-data').value, categoria:document.getElementById('sc-cat').value||document.getElementById('sc-dre').value,
      categoria_dre:document.getElementById('sc-dre').value, descricao:document.getElementById('sc-desc').value.trim(),
      valor:parseFloat(document.getElementById('sc-val').value), forma_pag:document.getElementById('sc-forma').value||null,
      banco:document.getElementById('sc-banco').value||null, tipo:document.getElementById('sc-tipo').value, lancado_por:APP.user.id,
    });
    if(error)toast('Erro: '+error.message,'error'); else{toast('Saída lançada!'); registrarAuditoria('NOVA_SAIDA_COMPLETA', 'saidas', '', `Desc: ${document.getElementById('sc-desc').value.trim()} | Valor: ${document.getElementById('sc-val').value}`);e.target.reset();document.getElementById('sc-data').value=hoje();document.getElementById('sc-banco').value='BB';}
    btn.innerHTML='Lançar Saída'; btn.disabled=false;
  });
}

// ============================================================
// ENTRADAS
// ============================================================
async function pgEntradas(){
  const ct=document.getElementById('content');
  const isGestora=APP.user.perfil==='gestora';
  ct.innerHTML=`
    <div class="page-header"><h2>Entradas</h2><div style="display:flex;gap:8px">
      ${isGestora?`<button class="btn btn-secondary btn-sm no-print" onclick="exportEntradas()">↓ CSV</button>`:''}
      <button class="btn btn-secondary btn-sm no-print" onclick="window.print()">🖨 Imprimir</button>
    </div></div>
    <div class="filter-bar">
      <input type="date" id="fil-ini" value="${inicioMes(mesAtual())}" style="width:145px"><span style="color:var(--gray3);font-size:13px">até</span><input type="date" id="fil-fim" value="${hoje()}" style="width:145px">
      <input id="fil-busca" placeholder="Buscar paciente..." style="width:180px">
      <select id="fil-proc-filtro" style="width:165px"><option value="">Todos procedimentos</option>${APP.procs.map(p=>`<option>${p.nome}</option>`).join('')}</select>
      <select id="fil-prof" style="width:145px"><option value="">Todos profissionais</option>${APP.profs.map(p=>`<option>${p.nome}</option>`).join('')}</select>
      <select id="fil-efet" style="width:145px"><option value="">Quem efetuou</option>${[...APP.profs.map(p=>p.nome),...APP.usuarios.filter(u=>u.perfil==='secretaria').map(u=>u.nome)].map(n=>`<option>${n}</option>`).join('')}</select>
      <select id="fil-nf" style="width:155px">
        <option value="">Nota fiscal — todas</option>
        <option value="pendente">⚠️ Pendentes (sem NF)</option>
        <option value="emitida">✅ NF emitida</option>
      </select>
      <button class="btn btn-primary btn-sm" onclick="toggleFiltrosAvancados()" id="btn-filtros-av" style="background:var(--gray1);color:var(--text);border:1.5px solid var(--gray2)">+ Filtros</button>
      <button class="btn btn-primary btn-sm" onclick="carregarEntradas()">Filtrar</button>
    </div>
    <div id="filtros-avancados" style="display:none;background:var(--gray1);border-radius:var(--rsm);padding:12px;margin-bottom:12px;border:1.5px solid var(--gray2)">
      <div style="font-size:11px;font-weight:700;color:var(--gray4);text-transform:uppercase;margin-bottom:8px">Filtrar por forma de pagamento (selecione uma ou mais)</div>
      <div style="display:flex;flex-wrap:wrap;gap:6px" id="fil-formas-wrap">
        ${['Pix','Dinheiro','Débito','Crédito 1x','Crédito 2x','Crédito 3x','Crédito 4x','Crédito 5x','Crédito 6x','Crédito 7x','Crédito 8x','Crédito 9x','Crédito 10x','Crédito 11x','Crédito 12x'].map(f=>`
          <label style="display:flex;align-items:center;gap:5px;background:var(--white);border:1.5px solid var(--gray2);border-radius:20px;padding:4px 10px;cursor:pointer;font-size:12px;font-weight:500;user-select:none">
            <input type="checkbox" value="${f}" style="width:auto;accent-color:var(--primary)"> ${f}
          </label>`).join('')}
      </div>
      <div style="margin-top:10px;display:flex;gap:8px">
        <button class="btn btn-secondary btn-sm" onclick="limparFiltrosForma()">Limpar seleção</button>
      </div>
    </div>
    <div class="metrics-grid" id="ent-totais" style="grid-template-columns:repeat(${isGestora?3:1},1fr);margin-bottom:14px"></div>
    <div class="card" style="padding:0" id="ent-tabela"><div style="text-align:center;padding:40px"><span class="spinner dark"></span></div></div>`;
  await carregarEntradas();
  document.getElementById('fil-busca').addEventListener('input',carregarEntradas);
}

window.carregarEntradas=async function(){
  const ini=document.getElementById('fil-ini')?.value||inicioMes(mesAtual());
  const fim=document.getElementById('fil-fim')?.value||hoje();
  const busca=(document.getElementById('fil-busca')?.value||'').toLowerCase();
  const prof=document.getElementById('fil-prof')?.value||'';
  const efet=document.getElementById('fil-efet')?.value||'';
  const proc=document.getElementById('fil-proc-filtro')?.value||'';
  const filNF=document.getElementById('fil-nf')?.value||'';
  const isGestora=APP.user.perfil==='gestora';
  const formasSel=[...document.querySelectorAll('#fil-formas-wrap input:checked')].map(cb=>cb.value);
  let q=sb.from('entradas').select('*').gte('data_venda',ini).lte('data_venda',fim).order('data_venda',{ascending:false});
  if(prof)q=q.eq('profissional_nome',prof);
  if(efet)q=q.eq('efetuou_venda',efet);
  if(proc)q=q.eq('procedimento_nome',proc);
  if(filNF==='emitida')q=q.eq('nota_fiscal_emitida',true);
  else if(filNF==='pendente')q=q.or('nota_fiscal_emitida.is.null,nota_fiscal_emitida.eq.false');
  if(formasSel.length===1)q=q.eq('forma',formasSel[0]);
  else if(formasSel.length>1)q=q.in('forma',formasSel);
  const {data,error}=await q;
  if(error){toast('Erro: '+error.message,'error');return;}
  let rows=data||[];
  if(busca)rows=rows.filter(r=>
    (r.paciente||'').toLowerCase().includes(busca)||
    (r.procedimento_nome||'').toLowerCase().includes(busca)||
    (r.cpf||'').replace(/\D/g,'').includes(busca.replace(/\D/g,''))
  );
  const totB=rows.reduce((s,r)=>s+Number(r.valor_bruto),0);
  const totL=rows.reduce((s,r)=>s+Number(r.valor_liquido),0);
  const totT=rows.reduce((s,r)=>s+Number(r.valor_taxa),0);
  const mTot=document.getElementById('ent-totais');
  if(mTot) mTot.innerHTML=isGestora
    ?[{l:'Total Bruto',v:fmt(totB),s:`${rows.length} lançamentos`,c:''},{l:'Total Líquido',v:fmt(totL),s:'Após taxas',c:'info'},{l:'Total Taxas',v:fmt(totT),s:'Operadora',c:'danger'}].map(c=>`<div class="metric-card ${c.c}"><div class="metric-label">${c.l}</div><div class="metric-value">${c.v}</div><div class="metric-sub">${c.s}</div></div>`).join('')
    :`<div class="metric-card" style="opacity:.8;max-width:240px"><div class="metric-label">Entradas do período</div><div class="metric-value" style="font-size:16px">${fmt(totB)}</div><div class="metric-sub">${rows.length} lançamentos</div></div>`;
  const tbl=document.getElementById('ent-tabela');
  if(!tbl)return;
  if(!rows.length){tbl.innerHTML='<div class="empty-state"><p>Nenhuma entrada encontrada</p></div>';return;}
  tbl.innerHTML=`<div class="table-wrapper"><table>
    <thead><tr><th>Data</th><th>Paciente</th><th>CPF</th><th>Procedimento</th><th>Profissional</th><th>Efetuou Venda</th><th>Forma</th><th style="text-align:right">Bruto</th>${isGestora?'<th style="text-align:right">Taxa</th><th style="text-align:right">Líquido</th>':''}<th style="text-align:center">Nota Fiscal Emitida</th><th>Ações</th></tr></thead>
    <tbody>${rows.map(r=>{
      const podeEdit=isGestora||(APP.user.perfil==='secretaria');
      const nfEmitida=r.nota_fiscal_emitida===true;
      const nfIcon=nfEmitida?'✅':'⬜';
      const nfTip=nfEmitida?'Desmarcar nota fiscal':'Marcar como emitida';
      return `<tr>
        <td>${fmtData(r.data_venda)}</td>
        <td style="font-weight:500">${r.paciente}</td>
        <td style="font-size:12px;color:var(--gray4)">${r.cpf||'-'}</td>
        <td>${r.procedimento_nome||'-'}</td>
        <td>${r.profissional_nome||'-'}</td>
        <td>${r.efetuou_venda||'-'}</td>
        <td><span class="badge badge-blue">${r.forma}</span></td>
        <td style="text-align:right">${fmt(r.valor_bruto)}</td>
        ${isGestora?`<td style="text-align:right;color:var(--danger)">${fmtPct(r.taxa_pct)}</td><td style="text-align:right;font-weight:700;color:var(--primary)">${fmt(r.valor_liquido)}</td>`:''}
        <td style="text-align:center"><button onclick="toggleNotaFiscal(this,'${r.id}','${nfEmitida}')" title="${nfTip}" style="background:none;border:none;cursor:pointer;font-size:18px;padding:2px 6px">${nfIcon}</button></td>
        <td style="display:flex;gap:4px">
          ${podeEdit?`<button class="btn btn-secondary btn-sm" onclick="editEntrada('${r.id}')">✏</button><button class="btn btn-sm" style="background:var(--danger-light);color:var(--danger)" onclick="confirmarExcluir('entrada','${r.id}','${(r.paciente||'').replace(/\'/g,'').replace(/"/g,'')}')">🗑</button>`:'-'}
        </td>
      </tr>`;
    }).join('')}</tbody>
    ${isGestora?`<tfoot><tr><td colspan="7" style="font-weight:700">TOTAL</td><td style="text-align:right">${fmt(totB)}</td><td style="text-align:right;color:var(--danger)">${fmt(totT)}</td><td style="text-align:right;color:var(--primary)">${fmt(totL)}</td><td colspan="2"></td></tr></tfoot>`:''}
    </table></div>`;
};

window.toggleNotaFiscal = async function(btn, id, emitidaStr) {
  const eraEmitida = emitidaStr === 'true';
  const novoValor = !eraEmitida;
  // Atualizar visual imediatamente para feedback rápido
  btn.textContent = novoValor ? '✅' : '⬜';
  btn.title = novoValor ? 'Desmarcar nota fiscal' : 'Marcar como emitida';
  btn.setAttribute('onclick', `toggleNotaFiscal(this,'${id}','${novoValor}')`);
  const {error} = await sb.from('entradas').update({nota_fiscal_emitida: novoValor}).eq('id', id);
  if(error) {
    // Reverter se deu erro
    btn.textContent = eraEmitida ? '✅' : '⬜';
    btn.setAttribute('onclick', `toggleNotaFiscal(this,'${id}','${eraEmitida}')`);
    return toast('Erro: '+error.message, 'error');
  }
  toast(novoValor ? '✅ Nota fiscal emitida!' : 'Nota fiscal desmarcada', novoValor?'success':'warning');
};

window.editEntrada=async function(id){
  const {data:r}=await sb.from('entradas').select('*').eq('id',id).single();
  if(!r)return;
  const {procs,profs,usuarios}=APP;
  const efets=[...profs.map(p=>({nome:p.nome})),...usuarios.filter(u=>u.perfil==='secretaria').map(u=>({nome:u.nome}))];
  const formas=['Pix','Dinheiro','Débito','Crédito 1x','Crédito 2x','Crédito 3x','Crédito 4x','Crédito 5x','Crédito 6x','Crédito 7x','Crédito 8x','Crédito 9x','Crédito 10x','Crédito 11x','Crédito 12x'];
  const bandeiras=['Visa','Mastercard','Amex, Elo, outros'];
  const ehCartao = r.forma?.startsWith('Crédito')||r.forma==='Débito';
  openModal(`<div class="modal-header"><h3>Editar Entrada</h3><button class="btn" onclick="closeModal()" style="background:none;font-size:18px;color:var(--gray4)">×</button></div>
    <div class="modal-body">
      <div class="form-grid c2">
        <div class="form-group"><label>Data</label><input type="date" id="ee-data" value="${r.data_venda}"></div>
        <div class="form-group"><label>Paciente</label><input id="ee-pac" value="${r.paciente||''}"></div>
      </div>
      <div class="form-grid c2">
        <div class="form-group"><label>CPF <span style="font-size:11px;color:var(--gray4)">(opcional)</span></label><input id="ee-cpf" value="${r.cpf||''}" placeholder="000.000.000-00" maxlength="14" oninput="mascararCPF(this)"></div>
        <div class="form-group"><label>Quem efetuou a venda</label><select id="ee-efet"><option value="">Selecione</option>${efets.map(e=>`<option value="${e.nome}" ${r.efetuou_venda===e.nome?'selected':''}>${e.nome}</option>`).join('')}</select></div>
      </div>
      <div class="form-grid c2">
        <div class="form-group"><label>Procedimento</label><select id="ee-proc"><option value="">Selecione</option>${procs.map(p=>`<option value="${p.id}" data-nome="${p.nome}" ${r.procedimento_id==p.id?'selected':''}>${p.nome}</option>`).join('')}</select></div>
        <div class="form-group"><label>Profissional</label><select id="ee-prof"><option value="">Selecione</option>${profs.map(p=>`<option value="${p.id}" data-nome="${p.nome}" ${r.profissional_id==p.id?'selected':''}>${p.nome}</option>`).join('')}</select></div>
      </div>
      <div class="form-grid c3">
        <div class="form-group"><label>Forma de Pagamento</label>
          <select id="ee-forma" onchange="eeToggleBand()">${formas.map(f=>`<option ${r.forma===f?'selected':''}>${f}</option>`).join('')}</select>
        </div>
        <div class="form-group" id="ee-grp-band" style="display:${ehCartao?'block':'none'}"><label>Bandeira</label>
          <select id="ee-band"><option value="">Sem bandeira</option>${bandeiras.map(b=>`<option ${r.bandeira===b?'selected':''}>${b}</option>`).join('')}</select>
        </div>
        <div class="form-group"><label>Valor Bruto (R$)</label>
          <input type="number" id="ee-valor" step="0.01" value="${r.valor_bruto}" oninput="eeAtualizarPreview()">
        </div>
      </div>
      <div id="ee-preview" style="background:var(--gray1);border-radius:var(--rsm);padding:11px;margin-bottom:12px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px">
        <div><div style="font-size:10px;color:var(--gray4);font-weight:700;text-transform:uppercase">Taxa</div><div id="ee-ptaxa" style="font-weight:700">—</div></div>
        <div><div style="font-size:10px;color:var(--gray4);font-weight:700;text-transform:uppercase">Valor Taxa</div><div id="ee-pvtaxa" style="font-weight:700;color:var(--danger)">—</div></div>
        <div><div style="font-size:10px;color:var(--gray4);font-weight:700;text-transform:uppercase">Líquido</div><div id="ee-pliq" style="font-weight:700;color:var(--primary)">—</div></div>
      </div>
      <div class="form-grid c2">
        <div class="form-group"><label>Observações</label><input id="ee-obs" value="${r.observacoes||''}"></div>
      </div>
    </div>
    <div class="modal-footer"><button class="btn btn-secondary" onclick="closeModal()">Cancelar</button><button class="btn btn-primary" onclick="salvarEditEntrada('${id}')">Salvar</button></div>`);
  eeAtualizarPreview();
};

window.eeToggleBand = function() {
  const forma = document.getElementById('ee-forma')?.value || '';
  const eh = forma.startsWith('Crédito') || forma === 'Débito';
  const grp = document.getElementById('ee-grp-band');
  if (grp) grp.style.display = eh ? 'block' : 'none';
  if (!eh && document.getElementById('ee-band')) document.getElementById('ee-band').value = '';
  eeAtualizarPreview();
};

window.eeAtualizarPreview = function() {
  const forma = document.getElementById('ee-forma')?.value || 'Pix';
  const band  = document.getElementById('ee-band')?.value || null;
  const val   = parseFloat(document.getElementById('ee-valor')?.value) || 0;
  const data  = document.getElementById('ee-data')?.value || hoje();
  const antEe = ehParc(forma) && data < MARCO;
  const taxa  = buscarTaxa(forma, band || null, antEe);
  const vt    = Math.round(val * taxa * 100) / 100;
  const liq   = Math.round((val - vt) * 100) / 100;
  const ptaxa = document.getElementById('ee-ptaxa');
  const pvtaxa= document.getElementById('ee-pvtaxa');
  const pliq  = document.getElementById('ee-pliq');
  if (ptaxa)  ptaxa.textContent  = (taxa * 100).toFixed(2) + '%';
  if (pvtaxa) pvtaxa.textContent = fmt(vt);
  if (pliq)   pliq.textContent   = fmt(liq);
};

window.salvarEditEntrada=async function(id){
  const pOpt=document.getElementById('ee-proc'), prOpt=document.getElementById('ee-prof');
  const forma = document.getElementById('ee-forma')?.value || 'Pix';
  const band  = document.getElementById('ee-band')?.value || null;
  const val   = parseFloat(document.getElementById('ee-valor')?.value) || 0;
  const data  = document.getElementById('ee-data').value;
  const ant   = ehParc(forma) && data < MARCO;
  const taxa  = buscarTaxa(forma, band || null, ant);
  const vt    = Math.round(val * taxa * 100) / 100;
  const liq   = Math.round((val - vt) * 100) / 100;
  const n     = nParc(forma);
  const {error}=await sb.from('entradas').update({
    data_venda: data,
    paciente:   document.getElementById('ee-pac').value.trim(),
    cpf:        document.getElementById('ee-cpf')?.value.trim()||null,
    procedimento_id:  pOpt.value||null,
    procedimento_nome: pOpt.options[pOpt.selectedIndex]?.dataset.nome||'',
    profissional_id:  prOpt.value||null,
    profissional_nome: prOpt.options[prOpt.selectedIndex]?.dataset.nome||'',
    efetuou_venda: document.getElementById('ee-efet')?.value||null,
    observacoes:   document.getElementById('ee-obs').value||null,
    forma, bandeira: band||null,
    valor_bruto: val, taxa_pct: taxa, valor_taxa: vt, valor_liquido: liq,
    n_parcelas: n, antecipacao: ant,
  }).eq('id', id);
  if (error) return toast('Erro: '+error.message,'error');
  // Recriar parcelas se necessário
  await sb.from('parcelas').delete().eq('entrada_id', id);
  if (n > 1 && !ant) {
    const parcs = [];
    for (let i = 1; i <= n; i++) {
      const dt = new Date(data + 'T12:00:00');
      dt.setMonth(dt.getMonth() + i);
      parcs.push({ entrada_id: id, numero: i, total: n, data_venc: dt.toISOString().slice(0,10), valor: Math.round(liq/n*100)/100 });
    }
    await sb.from('parcelas').insert(parcs);
  }
  toast('Atualizado!'); registrarAuditoria('EDITAR_ENTRADA', 'entradas', id, 'Entrada editada'); closeModal(); carregarEntradas();
};

window.exportEntradas=async function(){
  const ini=document.getElementById('fil-ini')?.value||inicioMes(mesAtual());
  const fim=document.getElementById('fil-fim')?.value||hoje();
  const {data}=await sb.from('entradas').select('*').gte('data_venda',ini).lte('data_venda',fim).order('data_venda',{ascending:false});
  const cols=['data_venda','paciente','procedimento_nome','profissional_nome','efetuou_venda','forma','bandeira','valor_bruto','taxa_pct','valor_taxa','valor_liquido','n_parcelas','antecipacao','observacoes'];
  const csv=[cols.join(';'),...(data||[]).map(r=>cols.map(c=>String(r[c]??'').replace(/;/g,',')).join(';'))].join('\n');
  const a=document.createElement('a');a.href='data:text/csv;charset=utf-8,'+encodeURIComponent(csv);a.download=`entradas_${mesAtual()}.csv`;a.click();
};

// ============================================================
// SAÍDAS SECRETARIA
// ============================================================
async function pgSaidasSec(){
  const ct=document.getElementById('content');
  ct.innerHTML=`<div class="page-header"><h2>Minhas Saídas</h2></div>
    <div class="filter-bar"><input type="month" id="ss-mes" value="${mesAtual()}" style="width:155px"><button class="btn btn-primary btn-sm" onclick="carregarSaiasSec()">Filtrar</button></div>
    <div class="card" style="padding:0" id="ss-tbl"><div style="text-align:center;padding:40px"><span class="spinner dark"></span></div></div>`;
  await carregarSaiasSec();
}

window.carregarSaiasSec=async function(){
  const mes=document.getElementById('ss-mes')?.value||mesAtual();
  const {data,error}=await sb.from('saidas_secretaria').select('*').gte('data_saida',inicioMes(mes)).lte('data_saida',fimMes(mes)).eq('lancado_por',APP.user.id).order('data_saida',{ascending:false});
  if(error){toast('Erro: '+error.message,'error');return;}
  const rows=data||[], tot=rows.reduce((s,r)=>s+Number(r.valor),0);
  const tbl=document.getElementById('ss-tbl');
  tbl.innerHTML=`<div style="padding:12px 14px;background:var(--gray1);display:flex;justify-content:space-between;align-items:center"><span style="font-size:13px;color:var(--gray4)">${rows.length} registros</span><span style="font-weight:700;color:var(--danger)">Total: ${fmt(tot)}</span></div>`+(rows.length?`<div class="table-wrapper"><table><thead><tr><th>Data</th><th>Categoria</th><th>Descrição</th><th style="text-align:right">Valor</th><th>Forma</th><th>Ações</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${fmtData(r.data_saida)}</td><td><span class="badge badge-gray">${r.categoria}</span></td><td>${r.descricao}</td><td style="text-align:right;color:var(--danger);font-weight:600">${fmt(r.valor)}</td><td>${r.forma_pag||'-'}</td><td style="display:flex;gap:4px"><button class="btn btn-secondary btn-sm" onclick="editSaidaSec('${r.id}')">✏</button><button class="btn btn-sm" style="background:var(--danger-light);color:var(--danger)" onclick="confirmarExcluir('saida_sec','${r.id}','${(r.descricao||'').replace(/'/g,'')}')">🗑</button></td></tr>`).join('')}</tbody></table></div>`:'<div class="empty-state"><p>Nenhuma saída neste período</p></div>');
};

window.editSaidaSec=async function(id){
  const {data:r}=await sb.from('saidas_secretaria').select('*').eq('id',id).single();
  if(!r)return;
  const cats=['Lanche / Alimentação','Limpeza / Higiene','Estacionamento / Capina','Material de escritório','Transporte / Uber','Outros'];
  openModal(`<div class="modal-header"><h3>Editar Saída</h3><button class="btn" onclick="closeModal()" style="background:none;font-size:18px;color:var(--gray4)">×</button></div>
    <div class="modal-body">
      <div class="form-grid c2"><div class="form-group"><label>Data</label><input type="date" id="es-data" value="${r.data_saida}"></div>
        <div class="form-group"><label>Categoria</label><select id="es-cat">${cats.map(c=>`<option ${r.categoria===c?'selected':''}>${c}</option>`).join('')}</select></div></div>
      <div class="form-grid"><div class="form-group"><label>Descrição</label><input id="es-desc" value="${r.descricao}"></div></div>
      <div class="form-grid c2"><div class="form-group"><label>Valor (R$)</label><input type="number" id="es-val" step="0.01" value="${r.valor}"></div>
        <div class="form-group"><label>Forma</label><input id="es-forma" value="${r.forma_pag||''}"></div></div>
    </div>
    <div class="modal-footer"><button class="btn btn-secondary" onclick="closeModal()">Cancelar</button><button class="btn btn-primary" onclick="salvarEditSaidaSec('${id}')">Salvar</button></div>`);
};
window.salvarEditSaidaSec=async function(id){
  const {error}=await sb.from('saidas_secretaria').update({data_saida:document.getElementById('es-data').value,categoria:document.getElementById('es-cat').value,descricao:document.getElementById('es-desc').value.trim(),valor:parseFloat(document.getElementById('es-val').value),forma_pag:document.getElementById('es-forma').value||null}).eq('id',id);
  if(error)return toast('Erro: '+error.message,'error');
  toast('Atualizado!'); closeModal(); carregarSaiasSec();
};

// ============================================================
// RELATÓRIO DE SAÍDAS
// ============================================================
async function pgSaidas() {
  const ct = document.getElementById('content');
  ct.innerHTML = `
    <div class="page-header">
      <h2>Relatório de Saídas</h2>
      <div style="display:flex;gap:8px">
        <button class="btn btn-secondary btn-sm no-print" onclick="exportSaidas()">↓ CSV</button>
        <button class="btn btn-secondary btn-sm no-print" onclick="window.print()">🖨 Imprimir</button>
      </div>
    </div>
    <div class="filter-bar">
      <input type="month" id="s-mes-ini" value="${new Date().getFullYear()}-01" style="width:150px">
      <span style="color:var(--gray3);font-size:13px">até</span>
      <input type="month" id="s-mes-fim" value="${mesAtual()}" style="width:150px">
      <select id="s-cat-fil" style="width:200px">
        <option value="">Todas as categorias</option>
        <option>CMV / Insumos</option>
        <option>Despesas com Pessoal</option>
        <option>Despesas Administrativas</option>
        <option>Despesas com Vendas</option>
        <option>Impostos e Obrigações</option>
        <option>Despesas Financeiras</option>
        <option>Outros</option>
      </select>
      <button class="btn btn-primary btn-sm" onclick="carregarSaidas()">Filtrar</button>
    </div>
    <div id="saidas-metrics" class="metrics-grid" style="grid-template-columns:repeat(4,1fr);margin-bottom:16px"></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:16px">
      <div class="card"><h3 style="margin-bottom:12px">Por categoria DRE</h3><div style="max-height:220px;display:flex;align-items:center;justify-content:center"><canvas id="c-saidas-pizza"></canvas></div></div>
      <div class="card"><h3 style="margin-bottom:12px">Evolução mensal</h3><canvas id="c-saidas-bar" height="220"></canvas></div>
    </div>
    <div class="card" style="padding:0" id="saidas-tabela">
      <div style="text-align:center;padding:40px"><span class="spinner dark"></span></div>
    </div>`;
  await carregarSaidas();
}

window.carregarSaidas = async function() {
  const iniVal = document.getElementById('s-mes-ini')?.value || `${new Date().getFullYear()}-01`;
  const fimVal = document.getElementById('s-mes-fim')?.value || mesAtual();
  const catFil = document.getElementById('s-cat-fil')?.value || '';
  const ini = inicioMes(iniVal), fim = fimMes(fimVal);

  let q = sb.from('saidas').select('*').gte('data_saida', ini).lte('data_saida', fim).order('data_saida', { ascending: false });
  if (catFil) q = q.eq('categoria_dre', catFil);
  const [{ data: rowsAdmin, error }, { data: rowsSec }] = await Promise.all([
    q,
    sb.from('saidas_secretaria').select('*').gte('data_saida', ini).lte('data_saida', fim).order('data_saida', { ascending: false }),
  ]);
  if (error) { toast('Erro: ' + error.message, 'error'); return; }

  const saidas    = rowsAdmin || [];
  // Resolve nome do usuário via APP.usuarios (FK do Supabase não está configurada)
  const saidasSec = (rowsSec || []).map(r => {
    const usr = APP.usuarios.find(u => u.id === r.lancado_por);
    return { ...r, _tipo: 'sec', categoria_dre: 'Saídas Secretaria', lancado_nome: usr?.nome || '—' };
  });
  const total     = saidas.reduce((s, r) => s + Number(r.valor), 0);
  const totalSec  = saidasSec.reduce((s, r) => s + Number(r.valor), 0);
  const totalGeral= total + totalSec;

  // Totais por categoria (apenas saidas admin para o DRE)
  const porCat = {};
  saidas.forEach(r => { const c = r.categoria_dre || 'Outros'; porCat[c] = (porCat[c] || 0) + Number(r.valor); });
  if (totalSec > 0) porCat['Saídas Secretaria'] = totalSec;

  // Totais por mês
  const porMes = {};
  [...saidas, ...saidasSec].forEach(r => { const m = r.data_saida.slice(0, 7); porMes[m] = (porMes[m] || 0) + Number(r.valor); });

  // Métricas
  const metrics = document.getElementById('saidas-metrics');
  if (metrics) {
    const topCat = Object.entries(porCat).sort((a, b) => b[1] - a[1])[0];
    metrics.innerHTML = [
      { l: 'Total de Saídas', v: fmt(totalGeral), s: (saidas.length + saidasSec.length) + ' lançamentos', c: 'danger' },
      { l: 'Saídas Admin', v: fmt(total), s: saidas.length + ' lançamentos', c: '' },
      { l: 'Saídas Secretaria', v: fmt(totalSec), s: saidasSec.length + ' lançamentos', c: '' },
      { l: 'Maior categoria', v: topCat ? topCat[0].split(' / ')[0] : '-', s: topCat ? fmt(topCat[1]) : '', c: 'info' },
    ].map(c => `<div class="metric-card ${c.c}"><div class="metric-label">${c.l}</div><div class="metric-value">${c.v}</div><div class="metric-sub">${c.s}</div></div>`).join('');
  }

  // Gráfico pizza por categoria
  const CORES_CAT = { 'CMV / Insumos': '#E57373', 'Despesas com Pessoal': '#64B5F6', 'Despesas Administrativas': '#FFD54F', 'Despesas com Vendas': '#81C784', 'Impostos e Obrigações': '#CE93D8', 'Despesas Financeiras': '#80DEEA', 'Saídas Secretaria': '#A5D6A7', 'Outros': '#BCAAA4' };
  const catLabels = Object.keys(porCat);
  const catVals   = Object.values(porCat);
  const catCores  = catLabels.map(k => CORES_CAT[k] || '#BCAAA4');

  const pizzaEl = document.getElementById('c-saidas-pizza');
  if (pizzaEl) {
    new Chart(pizzaEl, {
      type: 'doughnut',
      data: { labels: catLabels, datasets: [{ data: catVals, backgroundColor: catCores, borderWidth: 2 }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right' }, tooltip: { callbacks: { label: ctx => ' ' + ctx.label + ': ' + fmt(ctx.raw) + ' (' + Math.round(ctx.raw / totalGeral * 100) + '%)' } } } }
    });
  }

  // Gráfico barras por mês
  const mesesSort = Object.keys(porMes).sort();
  const barEl = document.getElementById('c-saidas-bar');
  if (barEl) {
    new Chart(barEl, {
      type: 'bar',
      data: { labels: mesesSort.map(m => mesLabel(m + '-01')), datasets: [{ label: 'Saídas', data: mesesSort.map(m => porMes[m]), backgroundColor: '#E57373', borderRadius: 4 }] },
      options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { ticks: { callback: v => fmt(v) }, grid: { color: '#F0F0F0' } } } }
    });
  }

  // Tabela
  const tbl = document.getElementById('saidas-tabela');
  if (!tbl) return;

  const catOrdem = ['CMV / Insumos', 'Despesas com Pessoal', 'Despesas Administrativas', 'Despesas com Vendas', 'Impostos e Obrigações', 'Despesas Financeiras', 'Outros', 'Saídas Secretaria'];
  const resumoHTML = `
    <div style="padding:14px 16px;border-bottom:1px solid var(--gray2)">
      <h3 style="margin-bottom:10px">Resumo por categoria</h3>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:8px">
        ${catOrdem.filter(c => porCat[c]).map(c => `
          <div style="background:var(--gray1);border-radius:7px;padding:10px;border-left:3px solid ${CORES_CAT[c]}">
            <div style="font-size:11px;color:var(--gray4);font-weight:700;text-transform:uppercase;margin-bottom:3px">${c}</div>
            <div style="font-size:15px;font-weight:800;color:var(--danger)">${fmt(porCat[c])}</div>
            <div style="font-size:11px;color:var(--gray3)">${Math.round(porCat[c] / totalGeral * 100)}% do total</div>
          </div>`).join('')}
      </div>
    </div>`;

  // Linhas admin
  const linhasAdmin = saidas.map(r => `<tr>
    <td>${fmtData(r.data_saida)}</td>
    <td><span class="badge" style="background:${CORES_CAT[r.categoria_dre]||'#BCAAA4'}22;color:${CORES_CAT[r.categoria_dre]||'#888'};font-size:11px">${r.categoria_dre||'-'}</span></td>
    <td style="font-weight:500">${r.descricao}</td>
    <td style="text-align:right;font-weight:700;color:var(--danger)">${fmt(r.valor)}</td>
    <td>${r.forma_pag||'-'}</td>
    <td>${r.banco||'-'}</td>
    <td><span class="badge ${r.tipo==='Fixo'?'badge-blue':'badge-gray'}">${r.tipo||'-'}</span></td>
    <td style="display:flex;gap:4px">
      <button class="btn btn-secondary btn-sm" onclick="editSaidaAdmin('${r.id}')">✏</button>
      <button class="btn btn-sm" style="background:var(--danger-light);color:var(--danger)" onclick="confirmarExcluir('saida_admin','${r.id}','${(r.descricao||'').replace(/'/g,'')}')">🗑</button>
    </td>
  </tr>`).join('');

  // Linhas secretaria
  const linhasSec = saidasSec.map(r => {
    const nomeSafe = (r.descricao||'').replace(/'/g,'').replace(/"/g,'');
    return `<tr style="background:var(--gray1)">
    <td>${fmtData(r.data_saida)}</td>
    <td><span class="badge" style="background:#A5D6A722;color:#2E7D32;font-size:11px">Secretaria</span></td>
    <td style="font-weight:500">${r.descricao} <span style="font-size:11px;color:var(--gray4)">(${r.lancado_nome})</span></td>
    <td style="text-align:right;font-weight:700;color:var(--danger)">${fmt(r.valor)}</td>
    <td>${r.forma_pag||'-'}</td>
    <td><span class="badge badge-gray">${r.categoria}</span></td>
    <td>—</td>
    <td style="display:flex;gap:4px">
      <button class="btn btn-secondary btn-sm" onclick="editSaidaSec('${r.id}')">✏</button>
      <button class="btn btn-sm" style="background:var(--danger-light);color:var(--danger)" onclick="confirmarExcluir('saida_sec','${r.id}','${nomeSafe}')">🗑</button>
    </td>
  </tr>`;
  }).join('');

  tbl.innerHTML = resumoHTML + ((saidas.length + saidasSec.length) ? `
    <div class="table-wrapper"><table>
      <thead><tr><th>Data</th><th>Categoria</th><th>Descrição</th><th style="text-align:right">Valor</th><th>Forma</th><th>Banco/Cat.</th><th>Tipo</th><th>Ações</th></tr></thead>
      <tbody>${linhasAdmin}${linhasSec}</tbody>
      <tfoot><tr><td colspan="3" style="font-weight:700">TOTAL GERAL</td><td style="text-align:right;font-weight:800;color:var(--danger)">${fmt(totalGeral)}</td><td colspan="4"></td></tr></tfoot>
    </table></div>` : '<div class="empty-state"><p>Nenhuma saída no período</p></div>');
};

window.editSaidaAdmin = async function(id) {
  const { data: r } = await sb.from('saidas').select('*').eq('id', id).single();
  if (!r) return;
  const dre = ['CMV / Insumos','Despesas com Pessoal','Despesas Administrativas','Despesas com Vendas','Impostos e Obrigações','Despesas Financeiras','Outros'];
  openModal(`<div class="modal-header"><h3>Editar Saída</h3><button class="btn" onclick="closeModal()" style="background:none;font-size:18px;color:var(--gray4)">×</button></div>
    <div class="modal-body">
      <div class="form-grid c2">
        <div class="form-group"><label>Data</label><input type="date" id="ea-data" value="${r.data_saida}"></div>
        <div class="form-group"><label>Categoria DRE</label><select id="ea-dre">${dre.map(c=>`<option ${r.categoria_dre===c?'selected':''}>${c}</option>`).join('')}</select></div>
      </div>
      <div class="form-grid"><div class="form-group"><label>Descrição</label><input id="ea-desc" value="${r.descricao}"></div></div>
      <div class="form-grid c3">
        <div class="form-group"><label>Valor (R$)</label><input type="number" id="ea-val" step="0.01" value="${r.valor}"></div>
        <div class="form-group"><label>Forma Pag.</label><input id="ea-forma" value="${r.forma_pag||''}"></div>
        <div class="form-group"><label>Banco</label><input id="ea-banco" value="${r.banco||''}"></div>
      </div>
    </div>
    <div class="modal-footer"><button class="btn btn-secondary" onclick="closeModal()">Cancelar</button><button class="btn btn-primary" onclick="salvarEditSaidaAdmin('${id}')">Salvar</button></div>`);
};

window.salvarEditSaidaAdmin = async function(id) {
  const { error } = await sb.from('saidas').update({
    data_saida:    document.getElementById('ea-data').value,
    categoria_dre: document.getElementById('ea-dre').value,
    categoria:     document.getElementById('ea-dre').value,
    descricao:     document.getElementById('ea-desc').value.trim(),
    valor:         parseFloat(document.getElementById('ea-val').value),
    forma_pag:     document.getElementById('ea-forma').value || null,
    banco:         document.getElementById('ea-banco').value || null,
  }).eq('id', id);
  if (error) return toast('Erro: ' + error.message, 'error');
  toast('Atualizado!'); closeModal(); carregarSaidas();
};

window.exportSaidas = async function() {
  const iniVal = document.getElementById('s-mes-ini')?.value || `${new Date().getFullYear()}-01`;
  const fimVal = document.getElementById('s-mes-fim')?.value || mesAtual();
  const { data } = await sb.from('saidas').select('*').gte('data_saida', inicioMes(iniVal)).lte('data_saida', fimMes(fimVal)).order('data_saida', { ascending: false });
  const cols = ['data_saida', 'categoria', 'categoria_dre', 'descricao', 'valor', 'forma_pag', 'banco', 'tipo', 'observacoes'];
  const csv = [cols.join(';'), ...(data || []).map(r => cols.map(c => String(r[c] ?? '').replace(/;/g, ',')).join(';'))].join('\n');
  const a = document.createElement('a'); a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv); a.download = `saidas_${iniVal}_${fimVal}.csv`; a.click();
};

// ============================================================
// FLUXO DE CAIXA
// ============================================================
async function pgFluxo(){
  const ct=document.getElementById('content');
  ct.innerHTML=`<div class="page-header"><h2>Fluxo de Caixa Real</h2><button class="btn btn-secondary btn-sm no-print" onclick="window.print()">🖨 Imprimir</button></div>
    <div class="card" style="padding:0;margin-bottom:14px" id="fluxo-tbl"><div style="text-align:center;padding:40px"><span class="spinner dark"></span></div></div>
    <div class="card"><h3 style="margin-bottom:12px">Saldo Acumulado</h3><canvas id="c-saldo" height="80"></canvas></div>`;
  const anoAtual=new Date().getFullYear();
  const {data,error}=await sb.from('vw_fluxo_caixa').select('*').gte('mes',`${anoAtual}-01-01`).lte('mes',`${anoAtual}-12-31`).order('mes');
  if(error){toast('Erro: '+error.message,'error');return;}
  const rows=data||[]; let acum=0;
  const rowsS=rows.map(r=>{acum+=Number(r.resultado||0);return{...r,acum};});
  document.getElementById('fluxo-tbl').innerHTML=`<div class="table-wrapper"><table>
    <thead><tr><th>Mês</th><th style="text-align:right">Vista</th><th style="text-align:right">Antecip.</th><th style="text-align:right">Parcelas</th><th style="text-align:right">Total Entradas</th><th style="text-align:right">Taxas</th><th style="text-align:right">Saídas</th><th style="text-align:right">Resultado</th><th style="text-align:right">Saldo Acum.</th></tr></thead>
    <tbody>${rowsS.map(r=>{const res=Number(r.resultado||0),sal=Number(r.acum||0);return`<tr>
      <td style="font-weight:600">${mesLabel(r.mes)}</td>
      <td style="text-align:right;color:var(--info)">${fmt(r.entrada_vista)}</td>
      <td style="text-align:right;color:var(--warning)">${Number(r.entrada_antecip)>0?fmt(r.entrada_antecip):'-'}</td>
      <td style="text-align:right;color:var(--primary)">${Number(r.entrada_parcelas)>0?fmt(r.entrada_parcelas):'-'}</td>
      <td style="text-align:right;font-weight:700;color:var(--primary)">${fmt(r.total_entradas)}</td>
      <td style="text-align:right;color:var(--danger)">${Number(r.total_taxas)>0?fmt(r.total_taxas):'-'}</td>
      <td style="text-align:right;color:var(--danger)">${Number(r.total_saidas)>0?fmt(r.total_saidas):'-'}</td>
      <td style="text-align:right;font-weight:800;color:${res>=0?'var(--primary)':'var(--danger)'}">${fmt(res)}</td>
      <td style="text-align:right;font-weight:600;color:${sal>=0?'var(--info)':'var(--danger)'}">${fmt(sal)}</td>
    </tr>`;}).join('')}</tbody>
    <tfoot><tr><td style="font-weight:700">TOTAL</td>${['entrada_vista','entrada_antecip','entrada_parcelas','total_entradas','total_taxas','total_saidas'].map(k=>`<td style="text-align:right">${fmt(rows.reduce((s,r)=>s+Number(r[k]||0),0))}</td>`).join('')}<td style="text-align:right;font-weight:800">${fmt(rows.reduce((s,r)=>s+Number(r.resultado||0),0))}</td><td></td></tr></tfoot>
    </table></div>`;
  if(rowsS.length) new Chart(document.getElementById('c-saldo'),{type:'line',data:{labels:rowsS.map(r=>mesLabel(r.mes)),datasets:[{label:'Saldo Acumulado',data:rowsS.map(r=>r.acum),borderColor:'#1B4F72',backgroundColor:'rgba(27,79,114,.08)',fill:true,tension:.35,pointRadius:5,pointBackgroundColor:rowsS.map(r=>r.acum>=0?'#117A65':'#922B21')}]},options:{responsive:true,plugins:{legend:{display:false}},scales:{y:{ticks:{callback:v=>fmt(v)},grid:{color:'#F0F0F0'}}}}});
}

// ============================================================
// DRE
// ============================================================
async function pgDRE(){
  const ct=document.getElementById('content');
  ct.innerHTML=`<div class="page-header"><h2>DRE — Demonstrativo de Resultado</h2><button class="btn btn-secondary btn-sm no-print" onclick="window.print()">🖨 Imprimir</button></div>
    <div class="card" style="padding:0;overflow:auto" id="dre-tbl"><div style="text-align:center;padding:40px"><span class="spinner dark"></span></div></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:14px">
      <div class="card"><h3 style="margin-bottom:12px">Composição das Saídas</h3><div style="max-height:240px;display:flex;align-items:center;justify-content:center"><canvas id="c-dre-pizza"></canvas></div></div>
      <div class="card"><h3 style="margin-bottom:12px">CMV vs Resultado</h3><canvas id="c-dre-bar" height="120"></canvas></div>
    </div>`;
  const anoAtualDRE=new Date().getFullYear();
  const {data}=await sb.from('vw_fluxo_caixa').select('*').gte('mes',`${anoAtualDRE}-01-01`).lte('mes',`${anoAtualDRE}-12-31`).order('mes');
  const rows=data||[], mc=rows.map(r=>mesLabel(r.mes));
  const linhas=[
    {l:'(+) RECEITA BRUTA',fn:r=>r.total_entradas,bold:true,bg:'var(--primary-light)',cor:'var(--primary-dark)'},
    {l:'   Entradas à vista',fn:r=>Number(r.total_entradas)-Number(r.entrada_antecip||0)-Number(r.entrada_parcelas||0),indent:true},
    {l:'   Cartão c/ antecip.',fn:r=>r.entrada_antecip||0,indent:true,cor:'var(--warning)'},
    {l:'   Cartão s/ antecip.',fn:r=>r.entrada_parcelas||0,indent:true,cor:'var(--primary)'},
    {l:'(-) Taxas',fn:r=>-r.total_taxas,cor:'var(--danger)'},
    {l:'(=) RECEITA LÍQUIDA',fn:r=>Number(r.total_entradas)-Number(r.total_taxas),bold:true,bg:'var(--gray1)'},
    {l:'(-) CMV — Insumos',fn:r=>-r.cmv,cor:'var(--danger)',indent:true},
    {l:'(=) LUCRO BRUTO',fn:r=>Number(r.total_entradas)-Number(r.total_taxas)-Number(r.cmv),bold:true,bg:'var(--gray1)'},
    {l:'(-) Desp. Pessoal',fn:r=>-r.pessoal,cor:'var(--danger)',indent:true},
    {l:'(-) Desp. Administrativas',fn:r=>-r.administrativo,cor:'var(--danger)',indent:true},
    {l:'(-) Desp. Vendas',fn:r=>-r.vendas,cor:'var(--danger)',indent:true},
    {l:'(-) Impostos',fn:r=>-r.impostos,cor:'var(--danger)',indent:true},
    {l:'(-) Desp. Financeiras',fn:r=>-r.financeiro,cor:'var(--danger)',indent:true},
    {l:'(-) Saídas Secretaria',fn:r=>-(r.saidas_secretaria||0),cor:'var(--danger)',indent:true},
    {l:'(=) RESULTADO / EBITDA',fn:r=>r.resultado,bold:true,bg:'var(--info-light)',cor:'var(--info)'},
  ];
  document.getElementById('dre-tbl').innerHTML=`<table style="min-width:900px"><thead><tr><th style="min-width:220px">Conta</th>${mc.map(m=>`<th style="text-align:right;min-width:110px">${m}</th>`).join('')}<th style="text-align:right;border-left:2px solid var(--gray2)">Total</th></tr></thead><tbody>${linhas.map(l=>`<tr style="background:${l.bg||'transparent'}"><td style="font-weight:${l.bold?700:400};padding-left:${l.indent?26:13}px;color:${l.cor||'inherit'};font-size:${l.bold?14:13}px">${l.l}</td>${rows.map(r=>{const v=Number(l.fn(r)||0);return`<td style="text-align:right;font-weight:${l.bold?700:400};color:${l.cor||(v<0?'var(--danger)':'inherit')};font-size:${l.bold?14:13}px">${Math.abs(v)>0.01?fmt(v):'-'}</td>`;}).join('')}<td style="text-align:right;font-weight:700;border-left:2px solid var(--gray2);color:${l.cor||'inherit'}">${fmt(rows.reduce((s,r)=>s+Number(l.fn(r)||0),0))}</td></tr>`).join('')}</tbody></table>`;
  const totS={CMV:0,Pessoal:0,Admin:0,Vendas:0,Impostos:0,Financeiro:0};
  rows.forEach(r=>{totS.CMV+=Number(r.cmv||0);totS.Pessoal+=Number(r.pessoal||0);totS.Admin+=Number(r.administrativo||0);totS.Vendas+=Number(r.vendas||0);totS.Impostos+=Number(r.impostos||0);totS.Financeiro+=Number(r.financeiro||0);});
  new Chart(document.getElementById('c-dre-pizza'),{type:'doughnut',data:{labels:Object.keys(totS),datasets:[{data:Object.values(totS),backgroundColor:['#E57373','#64B5F6','#FFD54F','#81C784','#CE93D8','#80DEEA'],borderWidth:2}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'right'}}}});
  new Chart(document.getElementById('c-dre-bar'),{type:'bar',data:{labels:mc,datasets:[{label:'CMV',data:rows.map(r=>r.cmv||0),backgroundColor:'#E57373',borderRadius:3},{label:'Resultado',data:rows.map(r=>r.resultado||0),backgroundColor:'#64B5F6',borderRadius:3}]},options:{responsive:true,plugins:{legend:{position:'bottom'}},scales:{y:{ticks:{callback:v=>fmt(v)}}}}});
}

// ============================================================
// RECEBÍVEIS
// ============================================================
async function pgRecebiveis(){
  const ct=document.getElementById('content');
  ct.innerHTML=`<div class="page-header"><h2>Recebíveis Futuros</h2></div><div id="recv-ct"><div style="text-align:center;padding:60px"><span class="spinner dark"></span></div></div>`;
  // Busca a partir do início do mês atual para não perder parcelas já vencidas no mês
  const iniMes = inicioMes(mesAtual());
  const {data}=await sb.from('parcelas').select('*,entradas(paciente,forma,profissional_nome)').gte('data_venc',iniMes).order('data_venc').limit(600);
  const rows=data||[], porMes={};
  rows.forEach(r=>{const m=r.data_venc?.slice(0,7);if(!porMes[m]){porMes[m]={total:0,rows:[]};}porMes[m].total+=Number(r.valor);porMes[m].rows.push(r);});
  const totG=rows.reduce((s,r)=>s+Number(r.valor),0);
  const meses=Object.entries(porMes);
  // Separar vencidos no mês atual vs futuros
  const mesAtualStr=mesAtual();
  document.getElementById('recv-ct').innerHTML=
    `<div class="metrics-grid" style="grid-template-columns:repeat(3,1fr);margin-bottom:18px">
      <div class="metric-card"><div class="metric-label">Total a receber</div><div class="metric-value">${fmt(totG)}</div><div class="metric-sub">${rows.length} parcelas em ${meses.length} meses</div></div>
      <div class="metric-card info"><div class="metric-label">Só meses futuros</div><div class="metric-value">${fmt(rows.filter(r=>r.data_venc?.slice(0,7)>mesAtualStr).reduce((s,r)=>s+Number(r.valor),0))}</div><div class="metric-sub">A partir do próximo mês</div></div>
      <div class="metric-card warn"><div class="metric-label">Vence este mês</div><div class="metric-value">${fmt(rows.filter(r=>r.data_venc?.slice(0,7)===mesAtualStr).reduce((s,r)=>s+Number(r.valor),0))}</div><div class="metric-sub">${mesLabel(mesAtualStr+'-01')}</div></div>
    </div>` +
    meses.map(([mes,d],idx)=>{
      const aberto = idx===0;
      const isAtualMes = mes===mesAtualStr;
      return `<div class="card" style="margin-bottom:8px;padding:0;overflow:hidden">
        <div onclick="toggleRecebivelMes('recv-mes-${mes.replace('-','')}')" style="display:flex;justify-content:space-between;align-items:center;padding:14px 18px;cursor:pointer;user-select:none;background:${aberto?'var(--primary-light)':'var(--white)'}">
          <div style="display:flex;align-items:center;gap:10px">
            <span id="recv-ico-${mes.replace('-','')}" style="font-size:16px;transition:transform .2s">${aberto?'▼':'▶'}</span>
            <div>
              <div style="font-weight:700;font-size:15px">${mesLabel(mes+'-01')} ${isAtualMes?'<span class="badge badge-orange" style="font-size:10px">mês atual</span>':''}</div>
              <div style="font-size:12px;color:var(--gray3)">${d.rows.length} parcela${d.rows.length>1?'s':''}</div>
            </div>
          </div>
          <span style="font-weight:800;color:var(--primary);font-size:16px">${fmt(d.total)}</span>
        </div>
        <div id="recv-mes-${mes.replace('-','')}" style="display:${aberto?'block':'none'}">
          <div class="table-wrapper"><table>
            <thead><tr><th>Paciente</th><th>Profissional</th><th>Forma</th><th style="text-align:right">Vencimento</th><th style="text-align:right">Valor</th><th style="text-align:right">Parcela</th></tr></thead>
            <tbody>${d.rows.map(p=>`<tr>
              <td style="font-weight:500">${p.entradas?.paciente||'-'}</td>
              <td>${p.entradas?.profissional_nome||'-'}</td>
              <td><span class="badge badge-blue">${p.entradas?.forma||'-'}</span></td>
              <td style="text-align:right">${fmtData(p.data_venc)}</td>
              <td style="text-align:right;font-weight:700;color:var(--primary)">${fmt(p.valor)}</td>
              <td style="text-align:right"><span class="badge badge-green">${p.numero}/${p.total}</span></td>
            </tr>`).join('')}</tbody>
          </table></div>
        </div>
      </div>`;
    }).join('') +
    (!meses.length?'<div class="empty-state"><p>Nenhum recebível</p></div>':'');
}

window.toggleRecebivelMes = function(id) {
  const div = document.getElementById(id);
  const key = id.replace('recv-mes-','');
  const ico = document.getElementById('recv-ico-'+key);
  if (!div) return;
  const open = div.style.display === 'none';
  div.style.display = open ? 'block' : 'none';
  if (ico) ico.textContent = open ? '▼' : '▶';
  // Mudar cor do header
  const header = div.previousElementSibling;
  if (header) header.style.background = open ? 'var(--primary-light)' : 'var(--white)';
};

// ============================================================
// METAS
// ============================================================
async function pgMetas() {
  const ct = document.getElementById('content');
  ct.innerHTML = `
    <div class="page-header"><h2>🎯 Metas</h2></div>
    <div class="tabs">
      <button class="tab-btn active" onclick="abaMetas('receita',this)">Meta de Receita</button>
      <button class="tab-btn" onclick="abaMetas('procedimentos',this)">Metas de Procedimentos</button>
    </div>
    <div id="metas-ct"></div>`;
  abaMetas('receita', document.querySelector('#content .tab-btn.active'));
}

window.abaMetas = function(aba, btn) {
  document.querySelectorAll('#content .tab-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  if (aba === 'receita') renderMetaReceita();
  else renderMetasProcedimentos();
};

// ── ABA RECEITA ──────────────────────────────────────────────
async function renderMetaReceita() {
  const ct = document.getElementById('metas-ct');
  ct.innerHTML = '<div style="text-align:center;padding:40px"><span class="spinner dark"></span></div>';
  
  ct.innerHTML =
    '<div style="display:grid;grid-template-columns:340px 1fr;gap:18px;align-items:start">' +
    '<div class="card">' +
    '<h3 style="margin-bottom:6px">Cadastrar / editar meta</h3>' +
    '<p style="font-size:13px;color:var(--text2);margin-bottom:16px">Defina o faturamento que quer atingir no mês.</p>' +
    '<div class="form-group" style="margin-bottom:11px"><label>Mês</label><input type="month" id="meta-mes" value="' + mesAtual() + '"></div>' +
    '<div class="form-group" style="margin-bottom:11px"><label>Meta de Receita (R$)</label><input type="number" id="meta-receita" step="500" min="0" placeholder="Ex: 50000"></div>' +
    '<div class="form-group" style="margin-bottom:15px"><label>Meta de Atendimentos <span style="font-size:11px;color:var(--gray3)">(opcional)</span></label><input type="number" id="meta-atend" min="0" placeholder="Ex: 80"></div>' +
    '<button class="btn btn-primary btn-full" onclick="salvarMeta()" id="btn-meta">Salvar Meta</button>' +
    '</div>' +
    '<div id="metas-lista"><div style="text-align:center;padding:40px"><span class="spinner dark"></span></div></div>' +
    '</div>';
  await carregarMetas();
}

window.salvarMeta = async function() {
  const mesVal  = document.getElementById('meta-mes').value;
  const receita = parseFloat(document.getElementById('meta-receita').value);
  const atend   = parseInt(document.getElementById('meta-atend').value) || 0;
  if (!mesVal || !receita || receita <= 0) return toast('Informe o mês e a meta de receita', 'warning');
  const btn = document.getElementById('btn-meta');
  btn.innerHTML = spinnerHTML; btn.disabled = true;
  const { error } = await sb.from('metas').upsert(
    { mes: mesVal + '-01', meta_receita: receita, meta_atendimentos: atend, updated_at: new Date().toISOString(), created_by: APP.user.id },
    { onConflict: 'mes' }
  );
  btn.innerHTML = 'Salvar Meta'; btn.disabled = false;
  if (error) return toast('Erro: ' + error.message, 'error');
  toast('Meta salva!');
  await carregarMetas();
};

window.editarMeta = function(mes, receita, atend) {
  document.getElementById('meta-mes').value     = mes;
  document.getElementById('meta-receita').value = receita;
  document.getElementById('meta-atend').value   = atend || '';
  document.getElementById('meta-receita').focus();
  toast('Edite os valores e clique em Salvar Meta', 'warning');
};

async function carregarMetas() {
  const ct = document.getElementById('metas-lista');
  if (!ct) return;
  const { data: metas } = await sb.from('metas').select('*').order('mes', { ascending: false }).limit(12);
  if (!metas || !metas.length) {
    ct.innerHTML = '<div class="card"><div class="empty-state"><p>Nenhuma meta cadastrada ainda.</p></div></div>';
    return;
  }
  const rows = await Promise.all(metas.map(async m => {
    const ini = m.mes.slice(0, 10), fim = fimMes(m.mes.slice(0, 7));
    const { data: e } = await sb.from('entradas').select('valor_liquido').gte('data_venda', ini).lte('data_venda', fim);
    const real = (e || []).reduce((s, x) => s + Number(x.valor_liquido), 0);
    const pct  = m.meta_receita > 0 ? Math.min(100, Math.round(real / m.meta_receita * 100)) : 0;
    return { ...m, real, natend: (e || []).length, pct };
  }));
  ct.innerHTML = rows.map(r => {
    const cor     = r.pct >= 100 ? 'var(--primary)' : r.pct >= 70 ? 'var(--warning)' : 'var(--danger)';
    const isAtual = r.mes.slice(0, 7) === mesAtual();
    const faltaV  = r.meta_receita - r.real;
    const status  = r.pct >= 100 ? '<span class="badge badge-green">✓ Meta atingida!</span>'
      : r.pct >= 70 ? '<span class="badge badge-orange">Bom ritmo</span>'
      : '<span class="badge badge-red">Abaixo da meta</span>';
    const borda   = isAtual ? 'border-left:4px solid var(--primary)' : 'border-left:4px solid var(--gray2)';
    const destaque= isAtual ? '<span style="font-size:11px;color:var(--primary);font-weight:700;text-transform:uppercase">● Mês atual</span><br>' : '';
    return '<div class="card" style="margin-bottom:13px;' + borda + '">'
      + '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:13px">'
      + '<div>' + destaque + '<div style="font-size:17px;font-weight:700">' + mesLabel(r.mes) + '</div>' + status + '</div>'
      + '<div style="text-align:right"><div style="font-size:30px;font-weight:900;color:' + cor + ';line-height:1">' + r.pct + '%</div><div style="font-size:11px;color:var(--gray3)">da meta</div></div></div>'
      + '<div style="background:var(--gray2);border-radius:20px;height:13px;overflow:hidden;margin-bottom:13px">'
      + '<div style="height:100%;width:' + r.pct + '%;background:' + cor + ';border-radius:20px;transition:width .8s ease"></div></div>'
      + '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:9px">'
      + '<div style="background:var(--gray1);border-radius:7px;padding:11px"><div style="font-size:10px;color:var(--gray4);font-weight:700;text-transform:uppercase;margin-bottom:3px">Realizado</div><div style="font-size:15px;font-weight:800;color:' + cor + '">' + fmt(r.real) + '</div></div>'
      + '<div style="background:var(--gray1);border-radius:7px;padding:11px"><div style="font-size:10px;color:var(--gray4);font-weight:700;text-transform:uppercase;margin-bottom:3px">Meta</div><div style="font-size:15px;font-weight:800">' + fmt(r.meta_receita) + '</div></div>'
      + '<div style="background:var(--gray1);border-radius:7px;padding:11px"><div style="font-size:10px;color:var(--gray4);font-weight:700;text-transform:uppercase;margin-bottom:3px">Faltam</div><div style="font-size:15px;font-weight:800;color:' + (faltaV > 0 ? 'var(--danger)' : 'var(--primary)') + '">' + (faltaV > 0 ? fmt(faltaV) : 'Atingida!') + '</div></div>'
      + '</div>'
      + (r.meta_atendimentos > 0
        ? '<div style="margin-top:11px;padding-top:11px;border-top:1px solid var(--gray2);display:flex;justify-content:space-between;align-items:center;gap:10px">'
          + '<span style="font-size:12px;color:var(--gray4);white-space:nowrap">Atendimentos: <strong>' + r.natend + '/' + r.meta_atendimentos + '</strong></span>'
          + '<div style="flex:1;background:var(--gray2);border-radius:10px;height:6px;overflow:hidden"><div style="height:100%;width:' + Math.min(100, Math.round(r.natend / r.meta_atendimentos * 100)) + '%;background:var(--info);border-radius:10px"></div></div>'
          + '<span style="font-size:12px;color:var(--gray4)">' + Math.min(100, Math.round(r.natend / r.meta_atendimentos * 100)) + '%</span></div>'
        : '')
      + '<button class="btn btn-secondary btn-sm" style="margin-top:11px" onclick="editarMeta(' + JSON.stringify(r.mes.slice(0,7)) + ',' + r.meta_receita + ',' + r.meta_atendimentos + ')">✏️ Editar meta</button>'
      + '</div>';
  }).join('');
}

// ── ABA PROCEDIMENTOS ─────────────────────────────────────────
async function renderMetasProcedimentos() {
  const ct = document.getElementById('metas-ct');
  ct.innerHTML = '<div style="text-align:center;padding:40px"><span class="spinner dark"></span></div>';

  const { data: metasProc } = await sb.from('metas_procedimentos').select('*').order('ativo', {ascending:false}).order('created_at', {ascending:false});
  const lista = metasProc || [];

  // Calcular progresso de cada meta
  const agora = new Date();
  const rows = await Promise.all(lista.map(async m => {
    let ini, fim;
    if (m.periodo === 'mensal' && m.mes) {
      ini = m.mes.slice(0,10);
      fim = fimMes(m.mes.slice(0,7));
    } else if (m.periodo === 'semanal' && m.semana_inicio) {
      ini = m.semana_inicio;
      fim = m.semana_fim;
    } else {
      ini = inicioMes(mesAtual());
      fim = fimMes(mesAtual());
    }
    let q = sb.from('entradas').select('id').gte('data_venda', ini).lte('data_venda', fim).eq('procedimento_nome', m.procedimento_nome);
    if (m.profissional_nome) q = q.eq('profissional_nome', m.profissional_nome);
    const { data: ents } = await q;
    const realizado = (ents || []).length;
    const pct = Math.min(100, Math.round(realizado / m.quantidade_meta * 100));
    return { ...m, realizado, pct, ini, fim };
  }));

  ct.innerHTML = `
    <div style="display:grid;grid-template-columns:360px 1fr;gap:18px;align-items:start">
      <div class="card">
        <h3 style="margin-bottom:6px">Nova meta de procedimento</h3>
        <p style="font-size:13px;color:var(--text2);margin-bottom:14px">Crie metas independentes por procedimento, profissional e período.</p>
        <div class="form-group" style="margin-bottom:11px">
          <label>Nome da meta</label>
          <input id="mp-nome" placeholder="Ex: Botox Abril, Preenchedor Semana 1">
        </div>
        <div class="form-group" style="margin-bottom:11px">
          <label>Procedimento <span class="req">*</span></label>
          <select id="mp-proc">
            <option value="">Selecione</option>
            ${APP.procs.map(p => `<option value="${p.id}" data-nome="${p.nome}">${p.nome}</option>`).join('')}
          </select>
        </div>
        <div class="form-group" style="margin-bottom:11px">
          <label>Profissional <span style="font-size:11px;color:var(--gray3)">(opcional — vazio = todas)</span></label>
          <select id="mp-prof">
            <option value="">Todas as profissionais</option>
            ${APP.profs.map(p => `<option value="${p.id}" data-nome="${p.nome}">${p.nome}</option>`).join('')}
          </select>
        </div>
        <div class="form-grid c2" style="margin-bottom:11px">
          <div class="form-group">
            <label>Quantidade meta <span class="req">*</span></label>
            <input type="number" id="mp-qtd" min="1" placeholder="Ex: 20">
          </div>
          <div class="form-group">
            <label>Período</label>
            <select id="mp-periodo" onchange="togglePeriodoMeta()">
              <option value="mensal">Mensal</option>
              <option value="semanal">Semanal</option>
            </select>
          </div>
        </div>
        <div id="mp-periodo-campos">
          <div class="form-group" style="margin-bottom:11px">
            <label>Mês</label>
            <input type="month" id="mp-mes" value="${mesAtual()}">
          </div>
        </div>
        <button class="btn btn-primary btn-full" onclick="salvarMetaProc()" id="btn-mp">Salvar Meta</button>
      </div>

      <div id="mp-lista">
        ${rows.length === 0 ? '<div class="card"><div class="empty-state"><p>Nenhuma meta de procedimento cadastrada ainda.</p></div></div>' :
          rows.map(r => renderCardMetaProc(r)).join('')}
      </div>
    </div>`;
}

window.togglePeriodoMeta = function() {
  const periodo = document.getElementById('mp-periodo')?.value;
  const ct = document.getElementById('mp-periodo-campos');
  if (!ct) return;
  if (periodo === 'semanal') {
    ct.innerHTML = `
      <div class="form-grid c2" style="margin-bottom:11px">
        <div class="form-group"><label>Início da semana</label><input type="date" id="mp-sem-ini" value="${hoje()}"></div>
        <div class="form-group"><label>Fim da semana</label><input type="date" id="mp-sem-fim"></div>
      </div>`;
    // Auto-calcular fim da semana (+6 dias)
    const ini = document.getElementById('mp-sem-ini');
    if (ini) ini.addEventListener('change', () => {
      const d = new Date(ini.value + 'T12:00:00');
      d.setDate(d.getDate() + 6);
      const fim = document.getElementById('mp-sem-fim');
      if (fim) fim.value = d.toISOString().slice(0,10);
    });
    ini.dispatchEvent(new Event('change'));
  } else {
    ct.innerHTML = `<div class="form-group" style="margin-bottom:11px"><label>Mês</label><input type="month" id="mp-mes" value="${mesAtual()}"></div>`;
  }
};

function renderCardMetaProc(r) {
  const cor = r.pct >= 100 ? 'var(--primary)' : r.pct >= 70 ? 'var(--warning)' : 'var(--danger)';
  const status = r.pct >= 100 ? '<span class="badge badge-green">✓ Meta atingida!</span>'
    : r.pct >= 70 ? '<span class="badge badge-orange">Bom ritmo</span>'
    : '<span class="badge badge-red">Abaixo da meta</span>';
  const periodoLabel = r.periodo === 'semanal'
    ? `Semana ${fmtData(r.semana_inicio)} a ${fmtData(r.semana_fim)}`
    : mesLabel(r.mes);

  return `<div class="card" style="margin-bottom:12px;border-left:4px solid ${r.ativo ? cor : 'var(--gray3)'}; opacity:${r.ativo ? '1' : '0.55'}">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px">
      <div>
        <div style="font-size:15px;font-weight:700">${r.nome || r.procedimento_nome}</div>
        <div style="font-size:12px;color:var(--gray4);margin-top:2px">
          ${r.procedimento_nome}${r.profissional_nome ? ' · ' + r.profissional_nome : ' · Todas'}
          · ${periodoLabel}
        </div>
        <div style="margin-top:5px">${status}</div>
      </div>
      <div style="text-align:right;flex-shrink:0;margin-left:12px">
        <div style="font-size:26px;font-weight:900;color:${cor};line-height:1">${r.pct}%</div>
        <div style="font-size:11px;color:var(--gray3)">${r.realizado}/${r.quantidade_meta}</div>
      </div>
    </div>
    <div style="background:var(--gray2);border-radius:20px;height:10px;overflow:hidden;margin-bottom:10px">
      <div style="height:100%;width:${r.pct}%;background:${cor};border-radius:20px;transition:width .8s ease"></div>
    </div>
    <div style="display:flex;gap:8px">
      <button class="btn btn-secondary btn-sm" onclick="toggleMetaProc(${r.id}, ${!r.ativo})">
        ${r.ativo ? '⏸ Desativar' : '▶ Ativar'}
      </button>
      <button class="btn btn-sm" style="background:var(--danger-light);color:var(--danger)" onclick="excluirMetaProc(${r.id})">🗑</button>
    </div>
  </div>`;
}

window.salvarMetaProc = async function() {
  const nomeV    = document.getElementById('mp-nome')?.value?.trim();
  const procEl   = document.getElementById('mp-proc');
  const profEl   = document.getElementById('mp-prof');
  const qtd      = parseInt(document.getElementById('mp-qtd')?.value);
  const periodo  = document.getElementById('mp-periodo')?.value;
  const procNome = procEl?.options[procEl.selectedIndex]?.dataset.nome || '';
  const profNome = profEl?.value ? profEl.options[profEl.selectedIndex]?.dataset.nome : null;

  if (!procEl?.value || !procNome) return toast('Selecione o procedimento', 'warning');
  if (!qtd || qtd < 1) return toast('Informe a quantidade', 'warning');

  let mes = null, semIni = null, semFim = null;
  if (periodo === 'mensal') {
    mes = (document.getElementById('mp-mes')?.value || mesAtual()) + '-01';
  } else {
    semIni = document.getElementById('mp-sem-ini')?.value;
    semFim = document.getElementById('mp-sem-fim')?.value;
    if (!semIni || !semFim) return toast('Informe o período da semana', 'warning');
  }

  const btn = document.getElementById('btn-mp');
  btn.innerHTML = spinnerHTML; btn.disabled = true;

  const { error } = await sb.from('metas_procedimentos').insert({
    nome: nomeV || null,
    procedimento_id: parseInt(procEl.value),
    procedimento_nome: procNome,
    profissional_id: profEl?.value ? parseInt(profEl.value) : null,
    profissional_nome: profNome || null,
    quantidade_meta: qtd,
    periodo,
    mes: mes || null,
    semana_inicio: semIni || null,
    semana_fim: semFim || null,
    created_by: APP.user.id,
  });

  btn.innerHTML = 'Salvar Meta'; btn.disabled = false;
  if (error) return toast('Erro: ' + error.message, 'error');
  toast('Meta criada!');
  renderMetasProcedimentos();
};

window.toggleMetaProc = async function(id, ativo) {
  const { error } = await sb.from('metas_procedimentos').update({ ativo }).eq('id', id);
  if (error) return toast('Erro: ' + error.message, 'error');
  toast(ativo ? 'Meta ativada!' : 'Meta desativada!');
  renderMetasProcedimentos();
};

window.excluirMetaProc = async function(id) {
  openModal(`<div class="modal-header">
    <h3 style="color:var(--danger)">⚠️ Excluir meta?</h3>
    <button class="btn" onclick="closeModal()" style="background:none;font-size:18px;color:var(--gray4)">×</button>
  </div>
  <div class="modal-body"><p>Esta ação não pode ser desfeita.</p></div>
  <div class="modal-footer">
    <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
    <button class="btn btn-danger" onclick="confirmarExcluirMetaProc(${id})">Sim, excluir</button>
  </div>`);
};

window.confirmarExcluirMetaProc = async function(id) {
  closeModal();
  const { error } = await sb.from('metas_procedimentos').delete().eq('id', id);
  if (error) return toast('Erro: ' + error.message, 'error');
  toast('Meta excluída!');
  renderMetasProcedimentos();
};

// ── TELA DA SECRETARIA ────────────────────────────────────────
async function pgMetasProcSec() {
  const ct = document.getElementById('content');
  ct.innerHTML = `<div class="page-header"><h2>🎯 Metas do Período</h2></div>
    <div id="metas-sec-ct"><div style="text-align:center;padding:40px"><span class="spinner dark"></span></div></div>`;

  const { data: lista } = await sb.from('metas_procedimentos').select('*').eq('ativo', true).order('created_at', {ascending:false});

  if (!lista?.length) {
    document.getElementById('metas-sec-ct').innerHTML = '<div class="card"><div class="empty-state"><p>Nenhuma meta ativa no momento.</p></div></div>';
    return;
  }

  const rows = await Promise.all((lista || []).map(async m => {
    const ini = m.periodo === 'mensal' ? m.mes?.slice(0,10) || inicioMes(mesAtual()) : m.semana_inicio;
    const fim = m.periodo === 'mensal' ? fimMes((m.mes || hoje()).slice(0,7)) : m.semana_fim;
    let q = sb.from('entradas').select('id').gte('data_venda', ini).lte('data_venda', fim).eq('procedimento_nome', m.procedimento_nome);
    if (m.profissional_nome) q = q.eq('profissional_nome', m.profissional_nome);
    const { data: ents } = await q;
    const realizado = (ents || []).length;
    const pct = Math.min(100, Math.round(realizado / m.quantidade_meta * 100));
    return { ...m, realizado, pct, ini, fim };
  }));

  document.getElementById('metas-sec-ct').innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:14px">
      ${rows.map(r => {
        const cor = r.pct >= 100 ? 'var(--primary)' : r.pct >= 70 ? 'var(--warning)' : 'var(--danger)';
        const emoji = r.pct >= 100 ? '🏆' : r.pct >= 70 ? '🔥' : '💪';
        const faltam = r.quantidade_meta - r.realizado;
        return `<div class="card" style="border-top:4px solid ${cor}">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px">
            <div>
              <div style="font-size:16px;font-weight:700">${emoji} ${r.nome || r.procedimento_nome}</div>
              <div style="font-size:12px;color:var(--gray4);margin-top:2px">
                ${r.profissional_nome || 'Todas'} · ${r.periodo === 'semanal' ? 'Esta semana' : mesLabel(r.mes)}
              </div>
            </div>
            <div style="font-size:24px;font-weight:900;color:${cor}">${r.pct}%</div>
          </div>
          <div style="background:var(--gray2);border-radius:20px;height:12px;overflow:hidden;margin-bottom:10px">
            <div style="height:100%;width:${r.pct}%;background:${cor};border-radius:20px;transition:width .8s"></div>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:13px">
            <span>✅ Realizados: <strong style="color:${cor}">${r.realizado}</strong></span>
            <span>🎯 Meta: <strong>${r.quantidade_meta}</strong></span>
            <span>${faltam > 0 ? `⏳ Faltam: <strong style="color:var(--danger)">${faltam}</strong>` : '<strong style="color:var(--primary)">Atingida! 🎉</strong>'}</span>
          </div>
        </div>`;
      }).join('')}
    </div>`;
}

// ============================================================
// POR PROFISSIONAL
// ============================================================
async function pgRelatorios() {
  const ct = document.getElementById('content');
  ct.innerHTML =
    '<div class="page-header"><h2>Desempenho por Profissional</h2></div>'
    + '<div class="filter-bar">'
    + '<select id="rel-prof" style="width:180px"><option value="">Todas as profissionais</option>' + APP.profs.map(p => '<option>' + p.nome + '</option>').join('') + '</select>'
    + '<input type="month" id="rel-ini" value="' + new Date().getFullYear() + '-01" style="width:150px">'
    + '<span style="color:var(--gray3);font-size:13px">até</span>'
    + '<input type="month" id="rel-fim" value="' + mesAtual() + '" style="width:150px">'
    + '<button class="btn btn-primary btn-sm" onclick="carregarRelatorio()">Filtrar</button>'
    + '</div>'
    + '<div id="rel-ct"><div style="text-align:center;padding:60px"><span class="spinner dark"></span></div></div>';
  await carregarRelatorio();
}

window.carregarRelatorio = async function() {
  const profFil = document.getElementById('rel-prof')?.value || '';
  const iniVal  = document.getElementById('rel-ini')?.value  || `${new Date().getFullYear()}-01`;
  const fimVal  = document.getElementById('rel-fim')?.value  || mesAtual();
  const ini = inicioMes(iniVal), fim = fimMes(fimVal);
  const ct  = document.getElementById('rel-ct');
  if (ct) ct.innerHTML = '<div style="text-align:center;padding:40px"><span class="spinner dark"></span></div>';

  let q = sb.from('entradas').select('*').gte('data_venda', ini).lte('data_venda', fim).order('data_venda', { ascending: false });
  if (profFil) q = q.eq('profissional_nome', profFil);
  const { data: rows } = await q;

  if (!rows?.length) {
    if (ct) ct.innerHTML = '<div class="card"><div class="empty-state"><p>Nenhuma entrada no período.</p></div></div>';
    return;
  }

  const porProf = {};
  rows.forEach(r => {
    const n = r.profissional_nome || 'Não informado';
    if (!porProf[n]) porProf[n] = { liq: 0, bruto: 0, taxa: 0, atend: 0, procs: {} };
    porProf[n].liq   += Number(r.valor_liquido);
    porProf[n].bruto += Number(r.valor_bruto);
    porProf[n].taxa  += Number(r.valor_taxa);
    porProf[n].atend++;
    const proc = r.procedimento_nome || 'Outro';
    porProf[n].procs[proc] = (porProf[n].procs[proc] || 0) + 1;
  });

  const totLiq   = rows.reduce((s, r) => s + Number(r.valor_liquido), 0);
  const totAtend = rows.length;
  const profNomes = Object.keys(porProf).sort((a, b) => porProf[b].liq - porProf[a].liq);
  const CORES = ['#117A65', '#1B4F72', '#8E44AD', '#D35400', '#C0392B'];
  const mesesSet = [...new Set(rows.map(r => r.data_venda.slice(0, 7)))].sort();
  const medalhas = ['🥇', '🥈', '🥉'];

  const cardsHTML = profNomes.map((nome, i) => {
    const p      = porProf[nome];
    const ticket = p.atend ? p.liq / p.atend : 0;
    const pct    = totLiq > 0 ? Math.round(p.liq / totLiq * 100) : 0;
    const cor    = CORES[i % CORES.length];
    const topProcs = Object.entries(p.procs).sort((a, b) => b[1] - a[1]).slice(0, 3);

    const procsHTML = topProcs.map((entry, idx) => {
      const [procNome, procQtd] = entry;
      const procEnts = rows.filter(r => r.profissional_nome === nome && r.procedimento_nome === procNome);
      const ticketP  = procEnts.length ? procEnts.reduce((s, r) => s + Number(r.valor_liquido), 0) / procEnts.length : 0;
      return '<div style="display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:1px solid var(--gray2)">'
        + '<div><div style="font-weight:600;font-size:13px">' + medalhas[idx] + ' ' + procNome + '</div>'
        + '<div style="font-size:11px;color:var(--gray3)">ticket médio: ' + fmt(ticketP) + '</div></div>'
        + '<span class="badge badge-blue">' + procQtd + 'x</span></div>';
    }).join('');

    return '<div class="card" style="margin-bottom:15px;border-top:4px solid ' + cor + '">'
      + '<div style="display:flex;align-items:center;gap:11px;margin-bottom:14px;padding-bottom:13px;border-bottom:1px solid var(--gray2)">'
      + '<div style="width:46px;height:46px;border-radius:50%;background:' + cor + '22;color:' + cor + ';display:flex;align-items:center;justify-content:center;font-weight:800;font-size:16px;flex-shrink:0">' + initials(nome) + '</div>'
      + '<div><div style="font-size:18px;font-weight:700">' + nome + '</div>'
      + '<div style="font-size:12px;color:var(--gray4)">' + pct + '% do faturamento total do período</div></div></div>'
      + '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:9px;margin-bottom:14px">'
      + '<div style="background:var(--gray1);border-radius:7px;padding:11px;text-align:center"><div style="font-size:10px;color:var(--gray4);font-weight:700;text-transform:uppercase;margin-bottom:3px">Receita Líquida</div><div style="font-size:17px;font-weight:800;color:' + cor + '">' + fmt(p.liq) + '</div></div>'
      + '<div style="background:var(--gray1);border-radius:7px;padding:11px;text-align:center"><div style="font-size:10px;color:var(--gray4);font-weight:700;text-transform:uppercase;margin-bottom:3px">Atendimentos</div><div style="font-size:17px;font-weight:800">' + p.atend + '</div></div>'
      + '<div style="background:var(--gray1);border-radius:7px;padding:11px;text-align:center"><div style="font-size:10px;color:var(--gray4);font-weight:700;text-transform:uppercase;margin-bottom:3px">Ticket Médio</div><div style="font-size:17px;font-weight:800">' + fmt(ticket) + '</div></div>'
      + '</div>'
      + '<div style="margin-bottom:14px"><div style="display:flex;justify-content:space-between;font-size:12px;color:var(--gray4);margin-bottom:4px"><span>Participação no faturamento</span><span style="font-weight:700;color:' + cor + '">' + pct + '%</span></div>'
      + '<div style="background:var(--gray2);border-radius:10px;height:8px;overflow:hidden"><div style="height:100%;width:' + pct + '%;background:' + cor + ';border-radius:10px"></div></div></div>'
      + '<div style="font-size:11px;color:var(--gray4);font-weight:700;text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px">Top Procedimentos — qtd e ticket médio</div>'
      + procsHTML
      + '</div>';
  }).join('');

  if (ct) ct.innerHTML =
    '<div class="metrics-grid" style="margin-bottom:18px">'
    + '<div class="metric-card"><div class="metric-label">Total líquido do período</div><div class="metric-value">' + fmt(totLiq) + '</div><div class="metric-sub">' + totAtend + ' atendimentos</div></div>'
    + '<div class="metric-card info"><div class="metric-label">Ticket médio geral</div><div class="metric-value">' + fmt(totAtend ? totLiq / totAtend : 0) + '</div></div>'
    + '<div class="metric-card"><div class="metric-label">Profissionais ativas</div><div class="metric-value">' + profNomes.length + '</div></div>'
    + '</div>'
    + '<div style="display:grid;grid-template-columns:2fr 1fr;gap:14px;margin-bottom:18px">'
    + '<div class="card"><h3 style="margin-bottom:12px">Receita líquida por mês</h3><canvas id="c-prof" height="160"></canvas></div>'
    + '<div class="card"><h3 style="margin-bottom:12px">Participação total</h3><div style="display:flex;align-items:center;justify-content:center;height:160px"><canvas id="c-pizza"></canvas></div></div>'
    + '</div>'
    + cardsHTML;

  const byMes = mesesSet.map(m => {
    const obj = { mes: mesLabel(m + '-01') };
    profNomes.forEach(n => { obj[n] = rows.filter(r => r.data_venda.slice(0, 7) === m && r.profissional_nome === n).reduce((s, r) => s + Number(r.valor_liquido), 0); });
    return obj;
  });

  new Chart(document.getElementById('c-prof'), {
    type: 'bar',
    data: { labels: byMes.map(d => d.mes), datasets: profNomes.map((n, i) => ({ label: n, data: byMes.map(d => d[n] || 0), backgroundColor: CORES[i % CORES.length], borderRadius: 4 })) },
    options: { responsive: true, plugins: { legend: { position: 'bottom' } }, scales: { y: { ticks: { callback: v => fmt(v) }, grid: { color: '#F0F0F0' } } } }
  });

  new Chart(document.getElementById('c-pizza'), {
    type: 'doughnut',
    data: { labels: profNomes, datasets: [{ data: profNomes.map(n => porProf[n].liq), backgroundColor: CORES, borderWidth: 3 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right' }, tooltip: { callbacks: { label: ctx => ' ' + ctx.label + ': ' + fmt(ctx.raw) + ' (' + Math.round(ctx.raw / totLiq * 100) + '%)' } } } }
  });
};

// ============================================================
// ADMIN
// ============================================================
async function pgAdmin(){
  document.getElementById('content').innerHTML=`<h2 style="margin-bottom:18px">Administração</h2>
    <div class="tabs"><button class="tab-btn active" onclick="abaAdmin('usuarios',this)">Usuários / Logins</button><button class="tab-btn" onclick="abaAdmin('profissionais',this)">Profissionais</button><button class="tab-btn" onclick="abaAdmin('procedimentos',this)">Procedimentos</button></div>
    <div id="admin-ct"></div>`;
  abaAdmin('usuarios',document.querySelector('.tab-btn.active'));
}

window.abaAdmin=function(aba,btn){document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));btn.classList.add('active');({usuarios:adminUsuarios,profissionais:adminProfs,procedimentos:adminProcs})[aba]();};

async function adminUsuarios(){
  const ct=document.getElementById('admin-ct'); ct.innerHTML='<div style="text-align:center;padding:40px"><span class="spinner dark"></span></div>';
  const {data}=await sb.from('vw_usuarios').select('*').order('nome');
  ct.innerHTML=`<div class="card" style="margin-bottom:14px">
    <h3 style="margin-bottom:6px">Cadastrar nova funcionária</h3>
    <p style="font-size:13px;color:var(--text2);margin-bottom:14px">Preencha os dados abaixo. O acesso é criado automaticamente.</p>
    <div class="form-grid c2">
      <div class="form-group"><label>Nome completo</label><input id="nu-nome" placeholder="Ex: Amanda Silva" autocomplete="off"></div>
      <div class="form-group"><label>Perfil</label><select id="nu-perfil"><option value="secretaria">Secretaria</option><option value="gestora">Gestora (acesso total)</option><option value="contador">Contador (somente leitura)</option></select></div>
    </div>
    <div class="form-grid c2">
      <div class="form-group"><label>E-mail</label><input type="email" id="nu-email" placeholder="amanda@clinica.com.br" autocomplete="off"></div>
      <div class="form-group"><label>Senha</label>
        <div style="position:relative"><input type="password" id="nu-senha" placeholder="Mínimo 6 caracteres" autocomplete="new-password" style="padding-right:40px">
        <button type="button" onclick="toggleSenha()" style="position:absolute;right:8px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:var(--gray4);font-size:16px">👁</button></div>
      </div>
    </div>
    <button class="btn btn-primary" id="btn-criar" onclick="criarUsuario()" style="min-width:160px">Criar acesso</button>
  </div>
  <div class="card" style="padding:0"><div class="table-wrapper"><table>
    <thead><tr><th>Nome</th><th>E-mail</th><th>Perfil</th><th>Status</th><th>Ações</th></tr></thead>
    <tbody>${(data||[]).map(u=>`<tr>
      <td><div style="display:flex;align-items:center;gap:8px"><div style="width:28px;height:28px;border-radius:50%;background:var(--primary-light);color:var(--primary);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:11px">${initials(u.nome)}</div><span style="font-weight:500">${u.nome}</span></div></td>
      <td style="font-size:12px;color:var(--gray4)">${u.email||'—'}</td>
      <td><span class="badge ${u.perfil==='gestora'?'badge-green':u.perfil==='contador'?'badge-blue':'badge-gray'}">${u.perfil}</span></td>
      <td><span class="badge ${u.ativo?'badge-green':'badge-red'}">${u.ativo?'Ativo':'Inativo'}</span></td>
      <td><button class="btn btn-secondary btn-sm" onclick="editUsuario('${u.id}','${u.nome}','${u.perfil}',${u.ativo},'${u.email||''}')">✏ Editar</button></td>
    </tr>`).join('')}</tbody>
  </table></div></div>`;
}

window.toggleSenha=function(){const i=document.getElementById('nu-senha');if(i)i.type=i.type==='password'?'text':'password';};

window.criarUsuario=async function(){
  const nome=document.getElementById('nu-nome')?.value?.trim();
  const email=document.getElementById('nu-email')?.value?.trim();
  const senha=document.getElementById('nu-senha')?.value;
  const perfil=document.getElementById('nu-perfil')?.value;
  if(!nome||!email||!senha)return toast('Preencha todos os campos','warning');
  if(senha.length<6)return toast('Senha deve ter mínimo 6 caracteres','warning');
  const btn=document.getElementById('btn-criar'); btn.innerHTML=spinnerHTML; btn.disabled=true;
  try {
    const res=await fetch(`${SB_URL}/functions/v1/criar-usuario`,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${(await sb.auth.getSession()).data.session.access_token}`,'apikey':SB_ANON},body:JSON.stringify({nome,email,senha,perfil})});
    const result=await res.json();
    if(!res.ok||result.error)toast(result.error||'Erro ao criar usuário','error');
    else{toast(`Acesso criado para ${nome}!`);document.getElementById('nu-nome').value='';document.getElementById('nu-email').value='';document.getElementById('nu-senha').value='';await carregarBase();adminUsuarios();}
  } catch(err){toast('Erro de conexão: '+err.message,'error');}
  btn.innerHTML='Criar acesso'; btn.disabled=false;
};

window.editUsuario=function(id,nome,perfil,ativo,email){
  openModal(`<div class="modal-header"><h3>Editar Usuário</h3><button class="btn" onclick="closeModal()" style="background:none;font-size:18px;color:var(--gray4)">×</button></div>
    <div class="modal-body">
      <div class="form-grid">
        <div class="form-group"><label>Nome</label><input id="eu-nome" value="${nome}"></div>
        <div class="form-group"><label>E-mail</label><input id="eu-email" value="${email||''}" type="email" placeholder="email@exemplo.com"></div>
      </div>
      <div class="form-grid c2">
        <div class="form-group"><label>Perfil</label><select id="eu-perfil"><option value="secretaria" ${perfil==='secretaria'?'selected':''}>Secretaria</option><option value="gestora" ${perfil==='gestora'?'selected':''}>Gestora</option><option value="contador" ${perfil==='contador'?'selected':''}>Contador</option></select></div>
        <div class="form-group"><label>Status</label><select id="eu-ativo"><option value="true" ${ativo?'selected':''}>Ativo</option><option value="false" ${!ativo?'selected':''}>Inativo</option></select></div>
      </div>
      <div style="margin-top:4px;padding-top:14px;border-top:1px solid var(--gray2)">
        <p style="font-size:12px;color:var(--gray4);margin-bottom:10px">Redefinir senha do usuário</p>
        <div style="display:flex;gap:8px;align-items:flex-end">
          <div class="form-group" style="flex:1;margin-bottom:0">
            <label>Nova senha</label>
            <div style="position:relative">
              <input type="password" id="eu-nova-senha" placeholder="Mínimo 6 caracteres" style="padding-right:36px">
              <button type="button" onclick="document.getElementById('eu-nova-senha').type=document.getElementById('eu-nova-senha').type==='password'?'text':'password'" style="position:absolute;right:8px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:var(--gray4)">👁</button>
            </div>
          </div>
          <button class="btn btn-secondary btn-sm" style="flex-shrink:0;height:38px" onclick="adminRedefinirSenha('${id}')">Redefinir</button>
        </div>
      </div>
    </div>
    <div class="modal-footer"><button class="btn btn-secondary" onclick="closeModal()">Cancelar</button><button class="btn btn-primary" onclick="salvarEditUsuario('${id}')">Salvar</button></div>`);
};

window.adminRedefinirSenha = async function(id) {
  const senha = document.getElementById('eu-nova-senha')?.value;
  if (!senha || senha.length < 6) return toast('Digite uma senha com mínimo 6 caracteres', 'warning');
  const btn = document.querySelector('[onclick="adminRedefinirSenha(\'' + id + '\')"]');
  if (btn) { btn.innerHTML = spinnerHTML; btn.disabled = true; }
  try {
    const res = await fetch(`${SB_URL}/functions/v1/redefinir-senha`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${(await sb.auth.getSession()).data.session.access_token}`,
        'apikey': SB_ANON,
      },
      body: JSON.stringify({ usuario_id: id, nova_senha: senha }),
    });
    const result = await res.json();
    if (!res.ok || result.error) toast(result.error || 'Erro ao redefinir senha', 'error');
    else {
      toast('Senha redefinida com sucesso!');
      document.getElementById('eu-nova-senha').value = '';
      registrarAuditoria('REDEFINIR_SENHA', 'usuarios', id, 'Senha redefinida pelo admin');
    }
  } catch(err) { toast('Erro de conexão: ' + err.message, 'error'); }
  if (btn) { btn.innerHTML = 'Redefinir'; btn.disabled = false; }
};
window.salvarEditUsuario=async function(id){
  const {error}=await sb.from('usuarios').update({nome:document.getElementById('eu-nome').value.trim(),perfil:document.getElementById('eu-perfil').value,ativo:document.getElementById('eu-ativo').value==='true'}).eq('id',id);
  if(error)return toast('Erro: '+error.message,'error');
  toast('Atualizado!');closeModal();await carregarBase();adminUsuarios();
};

async function adminProfs(){
  const {data}=await sb.from('profissionais').select('*').order('nome');
  document.getElementById('admin-ct').innerHTML=`<div style="display:flex;justify-content:flex-end;margin-bottom:10px"><button class="btn btn-primary btn-sm" onclick="modalNovoCad('profissional')">+ Nova Profissional</button></div>
    <div class="card" style="padding:0"><div class="table-wrapper"><table><thead><tr><th>Nome</th><th>Status</th><th>Ações</th></tr></thead>
    <tbody>${(data||[]).map(p=>`<tr><td style="font-weight:500">${p.nome}</td><td><span class="badge ${p.ativo?'badge-green':'badge-red'}">${p.ativo?'Ativa':'Inativa'}</span></td><td><button class="btn btn-secondary btn-sm" onclick="modalEditCad('profissional','${p.id}','${p.nome}',${p.ativo})">✏</button></td></tr>`).join('')}</tbody>
    </table></div></div>`;
}

async function adminProcs(){
  const {data}=await sb.from('procedimentos').select('*').order('nome');
  document.getElementById('admin-ct').innerHTML=`<div style="display:flex;justify-content:flex-end;margin-bottom:10px"><button class="btn btn-primary btn-sm" onclick="modalNovoCad('procedimento')">+ Novo Procedimento</button></div>
    <div class="card" style="padding:0"><div class="table-wrapper"><table><thead><tr><th>Nome</th><th>Status</th><th>Ações</th></tr></thead>
    <tbody>${(data||[]).map(p=>`<tr><td style="font-weight:500">${p.nome}</td><td><span class="badge ${p.ativo?'badge-green':'badge-red'}">${p.ativo?'Ativo':'Inativo'}</span></td><td><button class="btn btn-secondary btn-sm" onclick="modalEditCad('procedimento','${p.id}','${p.nome}',${p.ativo})">✏</button></td></tr>`).join('')}</tbody>
    </table></div></div>`;
}

window.modalNovoCad=function(tipo){
  openModal(`<div class="modal-header"><h3>Nova ${tipo==='profissional'?'Profissional':'Procedimento'}</h3><button class="btn" onclick="closeModal()" style="background:none;font-size:18px;color:var(--gray4)">×</button></div>
    <div class="modal-body"><div class="form-group"><label>Nome</label><input id="nc-nome" placeholder="Ex: ${tipo==='profissional'?'Dra. Juliana':'Skinbooster'}" autofocus></div></div>
    <div class="modal-footer"><button class="btn btn-secondary" onclick="closeModal()">Cancelar</button><button class="btn btn-primary" onclick="salvarNovoCad('${tipo}')">Salvar</button></div>`);
  setTimeout(()=>document.getElementById('nc-nome')?.focus(),100);
};
window.salvarNovoCad=async function(tipo){
  const nome=document.getElementById('nc-nome')?.value?.trim();
  if(!nome)return toast('Digite o nome','warning');
  const {error}=await sb.from(tipo==='profissional'?'profissionais':'procedimentos').insert({nome});
  if(error)return toast('Erro: '+error.message,'error');
  toast('Cadastrado!');closeModal();await carregarBase();tipo==='profissional'?adminProfs():adminProcs();
};
window.modalEditCad=function(tipo,id,nome,ativo){
  openModal(`<div class="modal-header"><h3>Editar</h3><button class="btn" onclick="closeModal()" style="background:none;font-size:18px;color:var(--gray4)">×</button></div>
    <div class="modal-body"><div class="form-grid"><div class="form-group"><label>Nome</label><input id="ec-nome" value="${nome}"></div>
      <div class="form-group"><label>Status</label><select id="ec-ativo"><option value="true" ${ativo?'selected':''}>Ativo</option><option value="false" ${!ativo?'selected':''}>Inativo</option></select></div></div></div>
    <div class="modal-footer"><button class="btn btn-secondary" onclick="closeModal()">Cancelar</button><button class="btn btn-primary" onclick="salvarEditCad('${tipo}','${id}')">Salvar</button></div>`);
};
window.salvarEditCad=async function(tipo,id){
  const {error}=await sb.from(tipo==='profissional'?'profissionais':'procedimentos').update({nome:document.getElementById('ec-nome').value.trim(),ativo:document.getElementById('ec-ativo').value==='true'}).eq('id',id);
  if(error)return toast('Erro: '+error.message,'error');
  toast('Atualizado!');closeModal();await carregarBase();tipo==='profissional'?adminProfs():adminProcs();
};

// ============================================================
// CONFIGURAÇÕES
// ============================================================
const CORES_PRESET=[{c:'#0B5345',n:'Verde Clínica'},{c:'#1A237E',n:'Azul Profundo'},{c:'#880E4F',n:'Rosa Escuro'},{c:'#1B5E20',n:'Verde Floresta'},{c:'#37474F',n:'Grafite'},{c:'#4A148C',n:'Roxo'},{c:'#BF360C',n:'Terracota'},{c:'#006064',n:'Teal'}];

async function pgConfiguracoes(){
  document.getElementById('content').innerHTML=`<h2 style="margin-bottom:18px">Configurações do Sistema</h2>
    <div class="tabs">
      <button class="tab-btn active" onclick="abaCfg('visual',this)">Identidade Visual</button>
      <button class="tab-btn" onclick="abaCfg('taxas',this)">Taxas & Antecipação</button>
    </div>
    <div id="cfg-ct"></div>`;
  abaCfg('visual', document.querySelector('#content .tab-btn.active'));
}

window.abaCfg = function(aba, btn) {
  document.querySelectorAll('#content .tab-btn').forEach(b=>b.classList.remove('active'));
  if(btn) btn.classList.add('active');
  if (aba==='visual') renderCfgVisual();
  else renderCfgTaxas();
};

async function renderCfgVisual(){
  const cfg = APP.config;
  const ct = document.getElementById('cfg-ct');
  if (!ct) return;

  let html = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;align-items:start">';
  html += '<div class="card">';
  html += '<h3 style="margin-bottom:14px">Identidade visual</h3>';
  html += '<div class="form-grid"><div class="form-group"><label>Nome do sistema</label><input id="cfg-nome" value="' + (cfg.nome||'Clínica Financeiro') + '"></div></div>';
  html += '<div class="form-group" style="margin-bottom:14px"><label>Cor principal</label>';
  html += '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:7px">';
  CORES_PRESET.forEach(c => {
    html += '<div class="color-opt ' + (cfg.cor_primaria===c.c?'active':'') + '" style="background:' + c.c + '" title="' + c.n + '" onclick="selCor(' + "'" + c.c + "'" + ',this)"></div>';
  });
  html += '</div>';
  html += '<div style="display:flex;align-items:center;gap:8px;margin-top:8px"><label style="font-size:12px;color:var(--gray4)">Personalizada:</label>';
  html += '<input type="color" id="cfg-cor-custom" value="' + (cfg.cor_primaria||'#0B5345') + '" style="width:40px;height:30px;padding:2px;cursor:pointer" oninput="selCorCustom(this.value)"></div>';
  html += '<input type="hidden" id="cfg-cor" value="' + (cfg.cor_primaria||'#0B5345') + '"></div>';
  html += '<div class="form-group" style="margin-bottom:14px"><label>Logo (URL pública)</label>';
  html += '<input id="cfg-logo" placeholder="https://..." value="' + (cfg.logo_url||'') + '"></div>';
  html += '<button class="btn btn-primary btn-full" onclick="salvarConfig()">Salvar configurações</button></div>';
  html += '<div class="card"><h3 style="margin-bottom:14px">Prévia</h3>';
  html += '<div style="border:1.5px solid var(--gray2);border-radius:8px;overflow:hidden">';
  html += '<div id="pv-sidebar" style="background:var(--primary);padding:13px 15px;color:#fff">';
  html += '<div style="font-weight:700;font-size:13px" id="pv-nome">' + (cfg.nome||'Clínica Financeiro') + '</div>';
  html += '<div style="font-size:11px;opacity:.55;margin-top:2px">Gestora</div></div>';
  html += '<div style="padding:10px;background:#EEF1F3"><div style="display:grid;grid-template-columns:1fr 1fr;gap:7px">';
  ['Receita Hoje','Resultado Mês'].forEach(l => {
    html += '<div style="background:#fff;border-radius:5px;padding:9px;border-left:3px solid var(--primary)"><div style="font-size:9px;color:var(--gray4)">' + l + '</div><div style="font-weight:700;font-size:14px;margin-top:1px">R$ 0,00</div></div>';
  });
  html += '</div></div></div>';
  html += '<div style="margin-top:13px"><h3 style="margin-bottom:10px">Exportação</h3>';
  html += '<div style="display:flex;flex-direction:column;gap:7px">';
  html += '<button class="btn btn-secondary btn-full" onclick="exportarTudo()">↓ Exportar todos os dados (CSV)</button>';
  html += '</div></div></div></div>';
  ct.innerHTML = html;
}

async function renderCfgTaxas(){
  const { data: taxas } = await sb.from('config_taxas').select('*').order('forma').order('bandeira').order('antecipado');
  const { data: cfgSys } = await sb.from('config_sistema').select('*').single();
  const antecipacao = cfgSys?.antecipacao_ativa !== false;
  const marco = cfgSys?.marco_antecipacao || '2026-02-04';
  const ct = document.getElementById('cfg-ct');
  if (!ct) return;

  const taxasSem = (taxas||[]).filter(t => !t.antecipado);
  const taxasCom = (taxas||[]).filter(t => t.antecipado);

  function tabelaTaxas(lista) {
    let h = '<div class="table-wrapper"><table><thead><tr><th>Forma</th><th>Bandeira</th><th style="text-align:right">Taxa %</th><th style="text-align:center">Dias p/ receber</th><th>Ação</th></tr></thead><tbody>';
    lista.forEach(t => {
      // Usar data-attributes para evitar problemas de escaping com acentos e aspas
      h += '<tr>';
      h += '<td style="font-size:12px">' + t.forma + '</td>';
      h += '<td style="font-size:12px">' + (t.bandeira||'—') + '</td>';
      h += '<td style="text-align:right;font-weight:600">' + (t.taxa*100).toFixed(3) + '%</td>';
      h += '<td style="text-align:center;color:var(--gray4);font-size:12px">' + (t.dias_recebimento ? t.dias_recebimento+'d' : '—') + '</td>';
      h += '<td><button class="btn btn-secondary btn-sm" onclick="editarTaxaById(this)"'
        + ' data-id="' + t.id + '"'
        + ' data-forma="' + t.forma + '"'
        + ' data-bandeira="' + (t.bandeira||'') + '"'
        + ' data-taxa="' + t.taxa + '"'
        + ' data-ant="' + (t.antecipado?'1':'0') + '"'
        + ' data-dias="' + (t.dias_recebimento||0) + '"'
        + '>✏</button></td>';
      h += '</tr>';
    });
    h += '</tbody></table></div>';
    return h;
  }

  let html = '<div class="card" style="margin-bottom:14px">';
  html += '<h3 style="margin-bottom:4px">Configuração de Antecipação</h3>';
  html += '<p style="font-size:13px;color:var(--text2);margin-bottom:14px">Vendas parceladas antes do marco entram como antecipação (100% no mês da venda) com taxas diferenciadas.</p>';
  html += '<div class="form-grid c2" style="margin-bottom:12px">';
  html += '<div class="form-group"><label>Data marco</label><input type="date" id="cfg-marco" value="' + marco + '"></div>';
  html += '<div class="form-group"><label>Antecipação ativa na clínica?</label>';
  html += '<select id="cfg-ant"><option value="true" ' + (antecipacao?'selected':'') + '>Sim — a clínica antecipa</option><option value="false" ' + (!antecipacao?'selected':'') + '>Não — sem antecipação</option></select></div></div>';
  html += '<button class="btn btn-primary" onclick="salvarCfgAnt()">Salvar configuração</button></div>';

  html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">';

  // Tabela SEM antecipação
  html += '<div class="card"><h3 style="margin-bottom:4px">💳 Taxas — Sem Antecipação</h3>';
  html += '<p style="font-size:12px;color:var(--text2);margin-bottom:10px">Parcelas mensais — o dinheiro cai conforme as parcelas vencem.</p>';
  html += tabelaTaxas(taxasSem);
  html += '</div>';

  // Tabela COM antecipação
  html += '<div class="card"><h3 style="margin-bottom:4px">⚡ Taxas — Com Antecipação</h3>';
  html += '<p style="font-size:12px;color:var(--text2);margin-bottom:10px">100% do valor cai no mês da venda. Taxa maior, recebimento em dias.</p>';
  html += tabelaTaxas(taxasCom);
  html += '</div>';

  html += '</div>';
  ct.innerHTML = html;
}

window.salvarCfgAnt = async function() {
  const marco = document.getElementById('cfg-marco').value;
  const ant   = document.getElementById('cfg-ant').value === 'true';
  const { error } = await sb.from('config_sistema').update({ marco_antecipacao: marco, antecipacao_ativa: ant }).eq('id', APP.config.id || 1);
  if (error) return toast('Erro: '+error.message,'error');
  toast('Configuração salva!');
};

window.editarTaxaById = function(btn) {
  const id        = parseInt(btn.dataset.id);
  const forma     = btn.dataset.forma;
  const bandeira  = btn.dataset.bandeira;
  const taxaAtual = parseFloat(btn.dataset.taxa);
  const antecipado= btn.dataset.ant === '1';
  const diasAtual = parseInt(btn.dataset.dias) || 0;
  editarTaxa(id, forma, bandeira, taxaAtual, antecipado, diasAtual);
};

window.editarTaxa = function(id, forma, bandeira, taxaAtual, antecipado, diasAtual) {
  const titulo = antecipado ? '⚡ Taxa com Antecipação' : '💳 Taxa sem Antecipação';
  const diasHtml = antecipado ? `
    <div class="form-group" style="margin-top:10px"><label>Dias para receber após a venda</label>
      <input type="number" id="taxa-dias" min="1" max="30" value="${diasAtual||2}" placeholder="Ex: 2">
      <p style="font-size:11px;color:var(--gray3);margin-top:4px">Geralmente 1 ou 2 dias úteis dependendo da operadora.</p>
    </div>` : '';
  openModal(`<div class="modal-header"><h3>${titulo}</h3><button class="btn" onclick="closeModal()" style="background:none;font-size:18px;color:var(--gray4)">×</button></div>
    <div class="modal-body">
      <p style="margin-bottom:12px;font-size:13px"><strong>${forma}</strong>${bandeira?' — '+bandeira:''}</p>
      <div class="form-group"><label>Taxa (%)</label>
        <input type="number" id="taxa-val" step="0.001" min="0" max="100" value="${(taxaAtual*100).toFixed(3)}" placeholder="Ex: 1.700">
        <p style="font-size:11px;color:var(--gray3);margin-top:4px">Digite em porcentagem. Ex: 1.7 para 1,7%</p>
      </div>
      ${diasHtml}
    </div>
    <div class="modal-footer"><button class="btn btn-secondary" onclick="closeModal()">Cancelar</button><button class="btn btn-primary" onclick="salvarTaxa(${id},${antecipado})">Salvar</button></div>`);
  setTimeout(()=>document.getElementById('taxa-val')?.focus(),100);
};

window.salvarTaxa = async function(id, antecipado) {
  const pct = parseFloat(document.getElementById('taxa-val').value);
  if (isNaN(pct) || pct < 0) return toast('Taxa inválida','warning');
  const taxa = Math.round(pct / 100 * 100000) / 100000;
  const upd = { taxa };
  if (antecipado) {
    const dias = parseInt(document.getElementById('taxa-dias')?.value);
    if (dias > 0) upd.dias_recebimento = dias;
  }
  const { error } = await sb.from('config_taxas').update(upd).eq('id', id);
  if (error) return toast('Erro: '+error.message,'error');
  // Atualizar APP.taxas em memória
  const t = APP.taxas.find(t=>t.id==id);
  if (t) { t.taxa = taxa; if (upd.dias_recebimento) t.dias_recebimento = upd.dias_recebimento; }
  toast('Taxa atualizada!'); closeModal();
  renderCfgTaxas();
};

window.selCor = function(cor, el) {
  document.querySelectorAll('.color-opt').forEach(e => e.classList.remove('active'));
  el.classList.add('active');
  document.getElementById('cfg-cor').value = cor;
  const custom = document.getElementById('cfg-cor-custom');
  if (custom) custom.value = cor;
  aplicarCor(cor);
  const pv = document.getElementById('pv-sidebar');
  if (pv) pv.style.background = cor;
};

window.selCorCustom = function(cor) {
  document.querySelectorAll('.color-opt').forEach(e => e.classList.remove('active'));
  document.getElementById('cfg-cor').value = cor;
  aplicarCor(cor);
  const pv = document.getElementById('pv-sidebar');
  if (pv) pv.style.background = cor;
};

window.salvarConfig = async function() {
  const nome = document.getElementById('cfg-nome')?.value?.trim();
  const cor  = document.getElementById('cfg-cor')?.value || '#0B5345';
  const logo = document.getElementById('cfg-logo')?.value?.trim() || null;
  if (!nome) return toast('Digite o nome do sistema', 'warning');
  const { error } = await sb.from('config_sistema').update({ nome, cor_primaria: cor, logo_url: logo }).eq('id', APP.config.id || 1);
  if (error) return toast('Erro: ' + error.message, 'error');
  APP.config.nome = nome;
  APP.config.cor_primaria = cor;
  APP.config.logo_url = logo;
  document.querySelectorAll('#sys-nome,#login-nome').forEach(el => el.textContent = nome);
  document.title = nome;
  document.getElementById('logo-char').textContent = nome[0].toUpperCase();
  const pvNome = document.getElementById('pv-nome');
  if (pvNome) pvNome.textContent = nome;
  toast('Configurações salvas!');
};

window.exportarTudo = async function() {
  const btn = document.querySelector('[onclick="exportarTudo()"]');
  if (btn) { btn.textContent = 'Exportando...'; btn.disabled = true; }
  try {
    const [rEnt, rSai, rSaiSec, rParc] = await Promise.all([
      sb.from('entradas').select('*').order('data_venda', { ascending: false }),
      sb.from('saidas').select('*').order('data_saida', { ascending: false }),
      sb.from('saidas_secretaria').select('*').order('data_saida', { ascending: false }),
      sb.from('parcelas').select('*').order('data_venc', { ascending: false }),
    ]);
    const toCSV = (rows, cols) => {
      if (!rows?.length) return cols.join(';') + '\n';
      return [cols.join(';'), ...rows.map(r => cols.map(c => String(r[c] ?? '').replace(/;/g, ',')).join(';'))].join('\n');
    };
    const colsEnt   = ['data_venda','paciente','procedimento_nome','profissional_nome','forma','bandeira','valor_bruto','taxa_pct','valor_taxa','valor_liquido','n_parcelas','antecipacao','observacoes'];
    const colsSai   = ['data_saida','categoria','categoria_dre','descricao','valor','forma_pag','banco','tipo'];
    const colsSaiSec= ['data_saida','categoria','descricao','valor','forma_pag'];
    const colsParc  = ['entrada_id','numero','total','data_venc','valor'];
    const zip = (nome, conteudo) => `\n\n===== ${nome} =====\n` + conteudo;
    const conteudo = zip('ENTRADAS', toCSV(rEnt.data, colsEnt))
      + zip('SAIDAS_ADMIN', toCSV(rSai.data, colsSai))
      + zip('SAIDAS_SECRETARIA', toCSV(rSaiSec.data, colsSaiSec))
      + zip('PARCELAS', toCSV(rParc.data, colsParc));
    const a = document.createElement('a');
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(conteudo);
    a.download = `clinica_backup_${hoje()}.csv`;
    a.click();
    toast('Exportação concluída!');
  } catch(e) {
    toast('Erro na exportação: ' + e.message, 'error');
  }
  if (btn) { btn.textContent = '↓ Exportar todos os dados (CSV)'; btn.disabled = false; }
};

async function iniciarApp(){
  const user=APP.user;
  document.getElementById('app').style.display='flex';
  document.getElementById('login-screen').style.display='none';
  document.getElementById('u-avatar').textContent=initials(user.nome);
  document.getElementById('u-nome').textContent=user.nome;
  document.getElementById('u-perfil').textContent={gestora:'Gestora',secretaria:'Secretaria',contador:'Contador'}[user.perfil]||user.perfil;
  document.getElementById('logo-char').textContent=(APP.config.nome||'C')[0].toUpperCase();

  await carregarBase();

  const isG=user.perfil==='gestora', isSec=user.perfil==='secretaria', isCont=user.perfil==='contador';

  let navHTML = '';

  if (isG) {
    navHTML = `
      <a data-page="dashboard" onclick="navigate('dashboard')">Dashboard</a>
      <a data-page="nova_entrada" onclick="navigate('nova_entrada')">Nova Entrada</a>
      <div class="nav-submenu-toggle" onclick="toggleNavSubmenu(this)" id="submenu-saidas-toggle">
        <span>💸 Saídas</span><span class="arrow">▶</span>
      </div>
      <div class="nav-submenu" id="submenu-saidas">
        <a data-page="saida_dia" onclick="navigate('saida_dia')">Saída do Dia</a>
        <a data-page="saida_completa" onclick="navigate('saida_completa')">Saída Completa</a>
        <a data-page="saidas_relatorio" onclick="navigate('saidas_relatorio')">Relatório de Saídas</a>
        <a data-page="importar_extrato" onclick="navigate('importar_extrato')">📥 Importar Extrato</a>
      </div>
      <div class="nav-section">Relatórios</div>
      <a data-page="entradas" onclick="navigate('entradas')">Entradas</a>
      <a data-page="historico_paciente" onclick="navigate('historico_paciente')">👤 Histórico do Paciente</a>
      <a data-page="fluxo" onclick="navigate('fluxo')">Fluxo de Caixa</a>
      <a data-page="relatorios" onclick="navigate('relatorios')">Por Profissional</a>
      <a data-page="metas" onclick="navigate('metas')">Metas</a>
      <a data-page="dre" onclick="navigate('dre')">DRE</a>
      <a data-page="recebiveis" onclick="navigate('recebiveis')">Recebíveis</a>
      <div class="nav-section">Sistema</div>
      <a data-page="tutorial" onclick="navigate('tutorial')">📖 Tutorial</a>
      <a data-page="auditoria" onclick="navigate('auditoria')">🔍 Auditoria</a>
      <a data-page="admin" onclick="navigate('admin')">Administração</a>
      <a data-page="configuracoes" onclick="navigate('configuracoes')">Configurações</a>
    `;
  } else if (isSec) {
    navHTML = `
      <a data-page="dashboard" onclick="navigate('dashboard')">Dashboard</a>
      <a data-page="nova_entrada" onclick="navigate('nova_entrada')">Nova Entrada</a>
      <a data-page="saida_dia" onclick="navigate('saida_dia')">Saída do Dia</a>
      <div class="nav-section">Relatórios</div>
      <a data-page="entradas" onclick="navigate('entradas')">Entradas</a>
      <a data-page="historico_paciente" onclick="navigate('historico_paciente')">👤 Histórico do Paciente</a>
      <a data-page="metas_proc" onclick="navigate('metas_proc')">🎯 Metas</a>
      <a data-page="saidas_sec" onclick="navigate('saidas_sec')">Minhas Saídas</a>
      <div class="nav-section">Sistema</div>
      <a data-page="tutorial" onclick="navigate('tutorial')">📖 Tutorial</a>
    `;
  } else { // contador
    navHTML = `
      <div class="nav-section">Relatórios</div>
      <a data-page="entradas" onclick="navigate('entradas')">Entradas</a>
      <a data-page="dre" onclick="navigate('dre')">DRE</a>
      <a data-page="fluxo" onclick="navigate('fluxo')">Fluxo de Caixa</a>
      <div class="nav-section">Sistema</div>
      <a data-page="tutorial" onclick="navigate('tutorial')">📖 Tutorial</a>
    `;
  }

  document.getElementById('sidebar-nav').innerHTML = navHTML;

  // Navegar para página inicial
  const start = isG ? 'dashboard' : isSec ? 'dashboard' : 'entradas';
  navigate(start);

  // Notificações
  if(isG){
    carregarNotificacoes();
    setInterval(carregarNotificacoes,60000);
    fetch(`${SB_URL}/functions/v1/notificacoes`,{method:'POST',headers:{'apikey':SB_ANON}}).catch(()=>{});
  }
}

function toggleSidebar(){const s=document.getElementById('sidebar'),o=document.getElementById('sidebar-overlay');const op=s.classList.toggle('open');o.style.display=op?'block':'none';}
// ============================================================
// TUTORIAL
// ============================================================
async function pgTutorial() {
  const ct = document.getElementById('content');
  ct.innerHTML = `
    <div class="page-header"><h2>📖 Tutorial do Sistema</h2></div>
    <div style="max-width:780px">

      <div class="card" style="margin-bottom:14px;border-left:4px solid var(--primary)">
        <h3 style="margin-bottom:6px;color:var(--primary)">👋 Bem-vinda ao Clínica Financeiro</h3>
        <p style="color:var(--text2);font-size:14px">Este sistema foi criado para facilitar o controle financeiro da clínica. Aqui você lança entradas, saídas, acompanha relatórios e metas — tudo em um só lugar.</p>
      </div>

      <!-- ENTRADAS -->
      <div class="card" style="margin-bottom:14px">
        <h3 style="margin-bottom:14px;display:flex;align-items:center;gap:8px">💰 Como lançar uma Entrada</h3>
        <div style="display:flex;flex-direction:column;gap:10px">
          ${[
            ['1. Clique em "Nova Entrada" no menu', 'Disponível para Gestora e Secretaria.'],
            ['2. Preencha a data, paciente, procedimento e profissional', 'Todos os campos com * são obrigatórios.'],
            ['3. Escolha a forma de pagamento', 'Pix, Dinheiro, Débito ou Crédito parcelado.'],
            ['4. Se for cartão (Débito ou Crédito), selecione a bandeira', '⚠️ Obrigatório! A bandeira define a taxa aplicada. Sem ela o cálculo fica errado.'],
            ['5. Digite o valor bruto', 'O sistema mostra automaticamente a taxa, desconto e valor líquido.'],
            ['6. Clique em "Lançar Entrada"', 'Pronto! A entrada aparece no relatório de Entradas.'],
          ].map(([titulo, desc]) => `
            <div style="display:flex;gap:12px;align-items:flex-start;padding:10px;background:var(--gray1);border-radius:var(--rsm)">
              <div style="flex:1">
                <div style="font-weight:600;font-size:13px;margin-bottom:2px">${titulo}</div>
                <div style="font-size:12px;color:var(--text2)">${desc}</div>
              </div>
            </div>`).join('')}
        </div>
      </div>

      <!-- SAÍDAS -->
      <div class="card" style="margin-bottom:14px">
        <h3 style="margin-bottom:14px">💸 Como lançar Saídas</h3>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div style="padding:14px;background:var(--gray1);border-radius:var(--rsm);border-top:3px solid var(--warning)">
            <div style="font-weight:700;margin-bottom:6px">Saída do Dia (Secretaria)</div>
            <div style="font-size:12px;color:var(--text2)">Para pequenas despesas do dia a dia: lanche, limpeza, estacionamento, material de escritório, Uber. Use este para gastos rápidos e pequenos.</div>
          </div>
          <div style="padding:14px;background:var(--gray1);border-radius:var(--rsm);border-top:3px solid var(--danger)">
            <div style="font-weight:700;margin-bottom:6px">Saída Completa (Gestora)</div>
            <div style="font-size:12px;color:var(--text2)">Para despesas maiores: fornecedores, pessoal, impostos, marketing. Inclui categorização DRE para aparecer nos relatórios gerenciais.</div>
          </div>
        </div>
      </div>

      <!-- RELATÓRIOS -->
      <div class="card" style="margin-bottom:14px">
        <h3 style="margin-bottom:14px">📊 Relatórios disponíveis</h3>
        <div style="display:flex;flex-direction:column;gap:8px">
          ${[
            ['Entradas', 'Lista todas as entradas com filtro por mês, profissional e busca por paciente. Exporta CSV.'],
            ['Saídas', 'Relatório completo de despesas com gráficos por categoria DRE.'],
            ['Fluxo de Caixa', 'Visão mensal de entradas x saídas x resultado. Mostra saldo acumulado.'],
            ['DRE', 'Demonstrativo de Resultado — receita bruta, taxas, CMV, despesas e lucro por mês.'],
            ['Recebíveis', 'Parcelas futuras de vendas no cartão. Organizado por mês de vencimento.'],
            ['Por Profissional', 'Desempenho individual: receita líquida, atendimentos, ticket médio e top procedimentos.'],
            ['Metas', 'Defina uma meta mensal de faturamento e acompanhe o progresso em tempo real.'],
          ].map(([nome, desc]) => `
            <div style="display:flex;gap:10px;padding:10px 14px;border-radius:var(--rsm);border:1.5px solid var(--gray2)">
              <div style="font-weight:600;font-size:13px;min-width:140px;color:var(--primary)">${nome}</div>
              <div style="font-size:12px;color:var(--text2)">${desc}</div>
            </div>`).join('')}
        </div>
      </div>

      <!-- ANTECIPAÇÃO -->
      <div class="card" style="margin-bottom:14px;border-left:4px solid var(--warning)">
        <h3 style="margin-bottom:10px">⚡ Antecipação de Recebíveis</h3>
        <p style="font-size:13px;color:var(--text2);margin-bottom:8px">Vendas parceladas feitas <strong>antes do marco de antecipação</strong> (04/02/2026) entram 100% no mês da venda — porque a clínica recebeu antecipado.</p>
        <p style="font-size:13px;color:var(--text2)">Vendas parceladas <strong>após</strong> o marco entram no Fluxo de Caixa mês a mês, conforme o vencimento de cada parcela.</p>
      </div>

      <!-- PERFIS -->
      <div class="card" style="margin-bottom:14px">
        <h3 style="margin-bottom:14px">👥 Perfis de acesso</h3>
        <div style="display:flex;flex-direction:column;gap:8px">
          ${[
            ['Gestora', 'badge-green', 'Acesso total: dashboard, todos os relatórios, DRE, metas, configurações e administração.'],
            ['Secretaria', 'badge-gray', 'Pode lançar entradas e saídas do dia. Vê apenas suas próprias saídas. Acessa relatório de entradas.'],
            ['Contador', 'badge-blue', 'Somente leitura: acessa entradas, DRE e fluxo de caixa. Não pode lançar nada.'],
          ].map(([perfil, badge, desc]) => `
            <div style="display:flex;gap:10px;align-items:flex-start;padding:10px 14px;border-radius:var(--rsm);background:var(--gray1)">
              <span class="badge ${badge}" style="margin-top:2px;flex-shrink:0">${perfil}</span>
              <div style="font-size:12px;color:var(--text2)">${desc}</div>
            </div>`).join('')}
        </div>
      </div>

      <!-- DICAS -->
      <div class="card" style="border-left:4px solid var(--info)">
        <h3 style="margin-bottom:12px;color:var(--info)">💡 Dicas rápidas</h3>
        <div style="display:flex;flex-direction:column;gap:8px">
          ${[
            '🔴 Sempre selecione a bandeira ao usar cartão (Débito ou Crédito) — ela define a taxa correta.',
            '📅 Lançar entradas no dia correto garante precisão no Fluxo de Caixa mensal.',
            '🎯 Cadastre a meta do mês em Metas para ver a barra de progresso no Dashboard.',
            '📤 Exporte os dados em CSV (Entradas → botão CSV) para análises externas.',
            '👤 Crie acesso para novas funcionárias em Administração → Usuários.',
            '🎨 Personalize a cor do sistema em Configurações → Identidade visual.',
          ].map(tip => `<div style="font-size:13px;padding:8px 12px;background:var(--gray1);border-radius:var(--rsm)">${tip}</div>`).join('')}
        </div>
      </div>

    </div>`;
}

// ============================================================
// AUDITORIA
// ============================================================
async function pgAuditoria() {
  const ct = document.getElementById('content');
  ct.innerHTML = `
    <div class="page-header">
      <h2>🔍 Auditoria do Sistema</h2>
      <button class="btn btn-secondary btn-sm" onclick="exportAuditoria()">↓ CSV</button>
    </div>
    <div class="filter-bar">
      <input type="date" id="aud-ini" value="${inicioMes(mesAtual())}" style="width:145px">
      <span style="color:var(--gray3);font-size:13px">até</span>
      <input type="date" id="aud-fim" value="${hoje()}" style="width:145px">
      <select id="aud-user" style="width:170px">
        <option value="">Todos os usuários</option>
        ${APP.usuarios.map(u => `<option value="${u.nome}">${u.nome}</option>`).join('')}
      </select>
      <select id="aud-acao" style="width:170px">
        <option value="">Todas as ações</option>
        <option value="LOGIN">Login</option>
        <option value="NOVA_ENTRADA">Nova Entrada</option>
        <option value="EDITAR_ENTRADA">Editar Entrada</option>
        <option value="NOVA_SAIDA_DIA">Saída do Dia</option>
        <option value="NOVA_SAIDA_COMPLETA">Saída Completa</option>
      </select>
      <button class="btn btn-primary btn-sm" onclick="carregarAuditoria()">Filtrar</button>
    </div>
    <div class="card" style="padding:0" id="aud-tabela">
      <div style="text-align:center;padding:40px"><span class="spinner dark"></span></div>
    </div>`;
  await carregarAuditoria();
}

window.carregarAuditoria = async function() {
  const ini  = document.getElementById('aud-ini')?.value || inicioMes(mesAtual());
  const fim  = document.getElementById('aud-fim')?.value || hoje();
  const user = document.getElementById('aud-user')?.value || '';
  const acao = document.getElementById('aud-acao')?.value || '';

  let q = sb.from('auditoria').select('*')
    .gte('created_at', ini + 'T00:00:00')
    .lte('created_at', fim + 'T23:59:59')
    .order('created_at', { ascending: false })
    .limit(300);

  if (user) q = q.eq('usuario_nome', user);
  if (acao) q = q.eq('acao', acao);

  const { data, error } = await q;
  const tbl = document.getElementById('aud-tabela');
  if (!tbl) return;
  if (error) { tbl.innerHTML = `<div class="empty-state"><p>Erro: ${error.message}</p></div>`; return; }

  const rows = data || [];

  const BADGE = {
    LOGIN:            'badge-blue',
    NOVA_ENTRADA:     'badge-green',
    EDITAR_ENTRADA:   'badge-orange',
    NOVA_SAIDA_DIA:   'badge-red',
    NOVA_SAIDA_COMPLETA: 'badge-red',
  };

  const LABEL = {
    LOGIN:            'Login',
    NOVA_ENTRADA:     'Nova Entrada',
    EDITAR_ENTRADA:   'Editou Entrada',
    NOVA_SAIDA_DIA:   'Saída do Dia',
    NOVA_SAIDA_COMPLETA: 'Saída Completa',
  };

  tbl.innerHTML = rows.length ? `
    <div style="padding:10px 14px;background:var(--gray1);font-size:12px;color:var(--gray4)">
      ${rows.length} registro${rows.length > 1 ? 's' : ''} encontrado${rows.length > 1 ? 's' : ''}
    </div>
    <div class="table-wrapper"><table>
      <thead><tr>
        <th>Data / Hora</th>
        <th>Usuário</th>
        <th>Ação</th>
        <th>Detalhe</th>
      </tr></thead>
      <tbody>
        ${rows.map(r => {
          const dt = new Date(r.created_at);
          const dtStr = dt.toLocaleDateString('pt-BR') + ' ' + dt.toLocaleTimeString('pt-BR', {hour:'2-digit',minute:'2-digit'});
          return `<tr>
            <td style="white-space:nowrap;color:var(--gray4);font-size:12px">${dtStr}</td>
            <td style="font-weight:600">${r.usuario_nome || '—'}</td>
            <td><span class="badge ${BADGE[r.acao] || 'badge-gray'}">${LABEL[r.acao] || r.acao}</span></td>
            <td style="font-size:12px;color:var(--text2)">${r.detalhe || '—'}</td>
          </tr>`;
        }).join('')}
      </tbody>
    </table></div>` :
    '<div class="empty-state"><p>Nenhum registro no período</p></div>';
};

window.exportAuditoria = async function() {
  const ini = document.getElementById('aud-ini')?.value || inicioMes(mesAtual());
  const fim = document.getElementById('aud-fim')?.value || hoje();
  const { data } = await sb.from('auditoria').select('*')
    .gte('created_at', ini + 'T00:00:00')
    .lte('created_at', fim + 'T23:59:59')
    .order('created_at', { ascending: false });
  const cols = ['created_at', 'usuario_nome', 'acao', 'tabela', 'registro_id', 'detalhe'];
  const csv = [cols.join(';'), ...(data || []).map(r => cols.map(c => String(r[c] ?? '').replace(/;/g, ',')).join(';'))].join('\n');
  const a = document.createElement('a');
  a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
  a.download = `auditoria_${ini}_${fim}.csv`;
  a.click();
};

// ============================================================
// IMPORTAR EXTRATO
// ============================================================

// Parsers para cada banco
const PARSERS = {
  bb: {
    nome: 'Banco do Brasil',
    encoding: 'latin1',
    parse: (linhas) => {
      const resultado = [];
      for (const linha of linhas) {
        const cols = linha.match(/"([^"]*)"/g)?.map(c => c.replace(/"/g,'')) || linha.split(',');
        if (!cols || cols.length < 6) continue;
        const [data, lancamento, detalhes, ndoc, valorRaw, tipo] = cols;
        if (!data || data === 'Data' || data === '00/00/0000') continue;
        if (tipo !== 'Saída') continue;
        const valor = Math.abs(parseFloat(valorRaw.replace(/\./g,'').replace(',','.')));
        if (!valor || isNaN(valor)) continue;
        const desc = detalhes?.trim() || lancamento?.trim() || '';
        resultado.push({ data: parseBRDate(data), descricao: desc || lancamento, valor, tipo_lancamento: lancamento });
      }
      return resultado;
    }
  },
  c6: {
    nome: 'C6 Bank',
    encoding: 'utf8',
    parse: (linhas) => {
      const resultado = [];
      let cabecalhoEncontrado = false;
      for (const linha of linhas) {
        if (linha.includes('Data Lançamento') || linha.includes('Data Lan')) { cabecalhoEncontrado = true; continue; }
        if (!cabecalhoEncontrado) continue;
        const cols = linha.split(',');
        if (cols.length < 6) continue;
        const [dataLanc,,titulo,descricao, entradaRaw, saidaRaw] = cols;
        const saida = parseFloat(saidaRaw?.trim());
        if (!saida || saida <= 0) continue;
        const [d,m,a] = dataLanc.split('/');
        if (!d || !m || !a) continue;
        // Usar título como nome principal (ex: "Pix enviado para AMANDA PAULA FERREIRA CUNHA")
        const desc = titulo?.trim() || descricao?.trim() || '';
        resultado.push({ data: `${a}-${m}-${d}`, descricao: desc, valor: saida, tipo_lancamento: titulo?.trim() });
      }
      return resultado;
    }
  }
};

function parseBRDate(str) {
  const [d,m,a] = str.split('/');
  return `${a}-${m}-${d}`;
}

// Estado global da importação
let EXTRATO_LINHAS = [];
let EXTRATO_BANCO = '';
let MAPA_FORNECEDORES = {};

async function pgImportarExtrato() {
  const ct = document.getElementById('content');
  ct.innerHTML = `
    <div class="page-header"><h2>📥 Importar Extrato</h2></div>
    <div style="max-width:700px">
      <div class="card" style="margin-bottom:14px">
        <h3 style="margin-bottom:14px">1. Selecione o banco e o arquivo CSV</h3>
        <div class="form-grid c2">
          <div class="form-group">
            <label>Banco</label>
            <select id="imp-banco">
              <option value="">Selecione</option>
              <option value="bb">Banco do Brasil</option>
              <option value="c6">C6 Bank</option>
            </select>
          </div>
          <div class="form-group">
            <label>Arquivo CSV do extrato</label>
            <input type="file" id="imp-arquivo" accept=".csv" style="padding:6px">
          </div>
        </div>
        <button class="btn btn-primary" onclick="processarExtrato()">Carregar extrato</button>
      </div>
      <div id="imp-resultado"></div>
    </div>`;

  // Carregar mapeamentos salvos
  const { data } = await sb.from('extrato_fornecedores').select('*');
  MAPA_FORNECEDORES = {};
  (data || []).forEach(r => { MAPA_FORNECEDORES[r.descricao_original] = r; });
}

window.processarExtrato = function() {
  const banco = document.getElementById('imp-banco').value;
  const arquivo = document.getElementById('imp-arquivo').files[0];
  if (!banco) return toast('Selecione o banco', 'warning');
  if (!arquivo) return toast('Selecione o arquivo CSV', 'warning');

  EXTRATO_BANCO = banco;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const texto = e.target.result;
      const linhas = texto.split(/\r?\n/).filter(l => l.trim());
      const parser = PARSERS[banco];
      EXTRATO_LINHAS = parser.parse(linhas);
      if (!EXTRATO_LINHAS.length) {
        toast('Nenhuma saída encontrada no arquivo. Verifique o banco selecionado.', 'warning');
        return;
      }
      renderizarExtrato();
    } catch(e) {
      toast('Erro ao ler o arquivo: ' + e.message, 'error');
    }
  };
  reader.readAsText(arquivo, banco === 'bb' ? 'latin1' : 'utf-8');
};

const CATS_DRE = ['CMV / Insumos','Despesas com Pessoal','Despesas Administrativas','Despesas com Vendas','Impostos e Obrigações','Despesas Financeiras','Outros'];

function renderizarExtrato() {
  const total = EXTRATO_LINHAS.reduce((s, r) => s + r.valor, 0);
  const res = document.getElementById('imp-resultado');

  res.innerHTML = `
    <div class="card" style="margin-bottom:14px;border-left:4px solid var(--primary)">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div>
          <div style="font-weight:700">${EXTRATO_LINHAS.length} saídas encontradas</div>
          <div style="font-size:12px;color:var(--text2)">Marque as que são da clínica e defina a categoria de cada uma</div>
        </div>
        <div style="font-size:18px;font-weight:800;color:var(--danger)">${fmt(total)}</div>
      </div>
    </div>

    <div class="card" style="padding:0;margin-bottom:14px">
      <div style="padding:10px 14px;background:var(--gray1);display:flex;justify-content:space-between;align-items:center">
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:13px;font-weight:600">
          <input type="checkbox" id="sel-todos" onchange="selecionarTodos(this.checked)" style="width:auto;accent-color:var(--primary)">
          Selecionar todos
        </label>
        <span id="imp-contagem" style="font-size:12px;color:var(--gray4)">0 selecionados</span>
      </div>
      <div class="table-wrapper">
        <table>
          <thead><tr>
            <th style="width:36px"></th>
            <th>Data</th>
            <th>Descrição</th>
            <th style="text-align:right">Valor</th>
            <th style="min-width:180px">Categoria DRE</th>
          </tr></thead>
          <tbody id="imp-tbody">
            ${EXTRATO_LINHAS.map((r, i) => {
              const mapeado = MAPA_FORNECEDORES[r.descricao];
              const catSugerida = mapeado?.categoria_dre || '';
              return `<tr id="imp-row-${i}">
                <td><input type="checkbox" class="imp-check" data-i="${i}" onchange="atualizarContagem()" style="width:auto;accent-color:var(--primary)" ${catSugerida ? 'checked' : ''}></td>
                <td style="white-space:nowrap;font-size:12px">${fmtData(r.data)}</td>
                <td style="font-size:12px;font-weight:500">
                  <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
                    <input 
                      class="imp-desc" 
                      data-i="${i}" 
                      value="${r.descricao}" 
                      style="font-size:12px;padding:4px 8px;border:1.5px solid var(--gray2);border-radius:var(--rsm);flex:1;min-width:180px;font-weight:500"
                      title="Edite a descrição se necessário"
                    >
                    ${catSugerida ? '<span class="badge badge-green" style="flex-shrink:0;font-size:10px">✓ reconhecido</span>' : ''}
                  </div>
                </td>
                <td style="text-align:right;font-weight:700;color:var(--danger);white-space:nowrap">${fmt(r.valor)}</td>
                <td>
                  <div>
                    <select class="imp-cat" data-i="${i}" style="font-size:12px;padding:5px 8px" onchange="mostrarDicaImp(this)">
                      <option value="">Selecione</option>
                      ${CATS_DRE.map(c => `<option value="${c}" ${catSugerida===c?'selected':''}>${c}</option>`).join('')}
                    </select>
                    <div class="imp-dica-${i}" style="display:${catSugerida && DRE_DICAS[catSugerida] ? 'block' : 'none'};margin-top:5px;padding:6px 8px;background:var(--info-light);border-radius:4px;font-size:11px;color:var(--info)">
                      ${catSugerida && DRE_DICAS[catSugerida] ? '💡 ' + DRE_DICAS[catSugerida].resumo : ''}
                    </div>
                  </div>
                </td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <div style="display:flex;justify-content:flex-end;gap:10px">
      <button class="btn btn-secondary" onclick="pgImportarExtrato()">Cancelar</button>
      <button class="btn btn-primary" onclick="confirmarImportacao()" id="btn-importar">
        Importar selecionados
      </button>
    </div>`;

  atualizarContagem();
}

window.selecionarTodos = function(checked) {
  document.querySelectorAll('.imp-check').forEach(cb => cb.checked = checked);
  atualizarContagem();
};

window.atualizarContagem = function() {
  const total = document.querySelectorAll('.imp-check:checked').length;
  const el = document.getElementById('imp-contagem');
  if (el) el.textContent = `${total} selecionados`;
};

window.confirmarImportacao = async function() {
  const selecionados = [...document.querySelectorAll('.imp-check:checked')].map(cb => {
    const i = parseInt(cb.dataset.i);
    const cat = document.querySelectorAll('.imp-cat')[i]?.value;
    const descEditada = document.querySelectorAll('.imp-desc')[i]?.value?.trim() || EXTRATO_LINHAS[i].descricao;
    return { ...EXTRATO_LINHAS[i], descricao: descEditada, categoria_dre: cat, idx: i };
  });

  if (!selecionados.length) return toast('Selecione ao menos uma saída', 'warning');

  const semCategoria = selecionados.filter(r => !r.categoria_dre);
  if (semCategoria.length) {
    toast(`${semCategoria.length} saída(s) sem categoria. Selecione a categoria de todas.`, 'warning');
    return;
  }

  const btn = document.getElementById('btn-importar');
  btn.innerHTML = spinnerHTML + ' Importando...'; btn.disabled = true;

  // Inserir saídas
  const saidas = selecionados.map(r => ({
    data_saida: r.data,
    categoria: r.descricao,
    categoria_dre: r.categoria_dre,
    descricao: r.descricao,
    valor: r.valor,
    forma_pag: 'Extrato ' + (PARSERS[EXTRATO_BANCO]?.nome || EXTRATO_BANCO),
    banco: PARSERS[EXTRATO_BANCO]?.nome || EXTRATO_BANCO,
    tipo: 'Variável',
    lancado_por: APP.user.id,
  }));

  const { error } = await sb.from('saidas').insert(saidas);
  if (error) {
    toast('Erro ao importar: ' + error.message, 'error');
    btn.innerHTML = 'Importar selecionados'; btn.disabled = false;
    return;
  }

  // Salvar mapeamentos novos para reconhecimento futuro
  const novos = selecionados.filter(r => !MAPA_FORNECEDORES[r.descricao]);
  if (novos.length) {
    await sb.from('extrato_fornecedores').upsert(
      novos.map(r => ({ descricao_original: r.descricao, categoria_dre: r.categoria_dre, banco: EXTRATO_BANCO })),
      { onConflict: 'descricao_original' }
    );
  }

  registrarAuditoria('IMPORTAR_EXTRATO', 'saidas', '', `${selecionados.length} saídas importadas do ${PARSERS[EXTRATO_BANCO]?.nome}`);
  toast(`${selecionados.length} saídas importadas com sucesso!`);
  pgImportarExtrato();
};
