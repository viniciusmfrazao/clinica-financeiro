// ============================================================
// NAVEGAÇÃO — ÚNICA, CORRETA
// ============================================================
const PAGINAS = {
  dashboard:       pgDashboard,
  nova_entrada:    pgNovaEntrada,
  saida_dia:       pgSaidaDia,
  saida_completa:  pgSaidaCompleta,
  entradas:        pgEntradas,
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
  relatorios:'Por Profissional', saidas_sec:'Minhas Saídas',
  admin:'Administração', configuracoes:'Configurações',
};

function navigate(page) {
  document.querySelectorAll('#sidebar nav a').forEach(a=>a.classList.toggle('active', a.dataset.page===page));
  const t=document.getElementById('topbar-title');
  if(t) t.textContent = TITULOS[page]||page;
  document.getElementById('content').innerHTML='<div style="text-align:center;padding:60px"><span class="spinner dark"></span></div>';
  const fn = PAGINAS[page];
  if(fn) fn(); else pgDashboard();
}





// ============================================================
// DASHBOARD
// ============================================================
async function pgDashboard() {
  const ct=document.getElementById('content');
  const mes=mesAtual(), ini=inicioMes(mes), fim=fimMes(mes);

  ct.innerHTML=`
    <div class="metrics-grid" id="dash-metrics">${[1,2,3,4,5,6].map(()=>'<div class="metric-card"><div class="metric-label">...</div><div class="metric-value">—</div></div>').join('')}</div>
    <div id="dash-meta-bar" style="margin-bottom:16px"></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px">
      <div class="card"><h3 style="margin-bottom:12px">Entradas vs Saídas 2026</h3><canvas id="c-anual" height="220"></canvas></div>
      <div class="card"><h3 style="margin-bottom:12px">Resultado mensal</h3><canvas id="c-resultado" height="220"></canvas></div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
      <div class="card"><h3 style="margin-bottom:12px">Por forma de pagamento</h3><div style="max-height:200px;display:flex;align-items:center;justify-content:center"><canvas id="c-forma"></canvas></div></div>
      <div class="card" id="dash-ultimas"><h3 style="margin-bottom:12px">Últimas entradas</h3><span class="spinner dark"></span></div>
    </div>`;

  const [rHoje,rMes,rFluxo,rForma,rUlt,rMeta] = await Promise.all([
    sb.from('entradas').select('valor_bruto,valor_liquido').eq('data_venda',hoje()),
    sb.from('entradas').select('valor_bruto,valor_liquido').gte('data_venda',ini).lte('data_venda',fim),
    sb.from('vw_fluxo_caixa').select('*').gte('mes','2026-01-01').lte('mes','2026-12-31').order('mes'),
    sb.from('entradas').select('forma,valor_bruto').gte('data_venda',ini).lte('data_venda',fim),
    sb.from('entradas').select('data_venda,paciente,procedimento_nome,valor_bruto,forma').order('created_at',{ascending:false}).limit(6),
    sb.from('metas').select('*').eq('mes',ini).maybeSingle(),
  ]);

  const totHoje=rHoje.data?.reduce((s,r)=>s+Number(r.valor_bruto),0)||0;
  const totMes=rMes.data?.reduce((s,r)=>s+Number(r.valor_bruto),0)||0;
  const liqMes=rMes.data?.reduce((s,r)=>s+Number(r.valor_liquido),0)||0;
  const ticket=rMes.data?.length?liqMes/rMes.data.length:0;
  const fluxo=rFluxo.data||[];
  const mesDados=fluxo.find(r=>r.mes?.slice(0,7)===mes);

  document.getElementById('dash-metrics').innerHTML=[
    {l:'Receita hoje',v:fmt(totHoje),s:'Valor bruto',c:''},
    {l:'Receita do mês',v:fmt(totMes),s:`${rMes.data?.length||0} atendimentos`,c:''},
    {l:'Líquido do mês',v:fmt(liqMes),s:'Após taxas',c:'info'},
    {l:'Ticket médio',v:fmt(ticket),s:'Por atendimento',c:'info'},
    {l:'Saídas do mês',v:fmt(mesDados?.total_saidas||0),s:'Todos os grupos',c:'danger'},
    {l:'Resultado do mês',v:fmt(mesDados?.resultado||0),s:'Caixa real',c:(mesDados?.resultado||0)>=0?'':'danger'},
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

  if(fluxo.length) {
    const labels=fluxo.map(r=>mesLabel(r.mes));
    new Chart(document.getElementById('c-anual'),{type:'bar',data:{labels,datasets:[
      {label:'Entradas',data:fluxo.map(r=>r.total_entradas||0),backgroundColor:'#117A65',borderRadius:4},
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
  document.getElementById('dash-ultimas').innerHTML=`<h3 style="margin-bottom:12px">Últimas entradas</h3>${ult.length?`<table><thead><tr><th>Data</th><th>Paciente</th><th>Procedimento</th><th style="text-align:right">Valor</th></tr></thead><tbody>${ult.map(r=>`<tr><td>${fmtData(r.data_venda)}</td><td style="font-weight:500">${r.paciente}</td><td>${r.procedimento_nome||'-'}</td><td style="text-align:right;font-weight:700;color:var(--primary)">${fmt(r.valor_bruto)}</td></tr>`).join('')}</tbody></table>`:'<div class="empty-state"><p>Nenhuma entrada ainda</p></div>'}`;
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
          <div class="form-group"><label>Procedimento <span class="req">*</span></label>
            <select id="f-proc" required><option value="">Selecione</option>${procs.map(p=>`<option value="${p.id}" data-nome="${p.nome}">${p.nome}</option>`).join('')}<option value="__novo__">+ Novo procedimento</option></select>
          </div>
          <div class="form-group"><label>Profissional <span class="req">*</span></label>
            <select id="f-prof" required><option value="">Selecione</option>${profs.map(p=>`<option value="${p.id}" data-nome="${p.nome}">${p.nome}</option>`).join('')}</select>
          </div>
        </div>
        <div class="form-grid c2">
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
            <select id="f-band"><option value="">Selecione</option>${bandeiras.map(b=>`<option>${b}</option>`).join('')}</select>
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
  function updPreview(){
    const val=parseFloat(document.getElementById('f-valor').value);
    if(!val||val<=0){document.getElementById('preview-pag').style.display='none';return;}
    const forma=fForma.value, band=fBand.value||null, data=document.getElementById('f-data').value;
    const taxa=buscarTaxa(forma,band), vt=Math.round(val*taxa*100)/100, liq=Math.round((val-vt)*100)/100;
    const n=nParc(forma), ant=ehParc(forma)&&data<MARCO;
    document.getElementById('preview-pag').style.display='';
    document.getElementById('pv-taxa').textContent=fmtPct(taxa);
    document.getElementById('pv-vtaxa').textContent=fmt(vt);
    document.getElementById('pv-liq').textContent=fmt(liq);
    document.getElementById('pv-parc').innerHTML=n>1?`<span class="badge ${ant?'badge-orange':'badge-green'}">${n}x · ${ant?'Com antecipação':'Sem antecipação — parcelas mensais'}</span>`:'';
  }
  function toggleBand(){const eh=fForma.value.startsWith('Crédito')||fForma.value==='Débito';document.getElementById('grp-band').style.display=eh?'':'none';if(!eh)fBand.value='';updPreview();}
  fForma.addEventListener('change',toggleBand);
  fBand.addEventListener('change',updPreview);
  document.getElementById('f-valor').addEventListener('input',updPreview);
  document.getElementById('f-data').addEventListener('change',updPreview);

  document.getElementById('f-proc').addEventListener('change',async e=>{
    if(e.target.value!=='__novo__')return; e.target.value='';
    openModal(`<div class="modal-header"><h3>Novo Procedimento</h3><button class="btn" onclick="closeModal()" style="background:none;font-size:18px;color:var(--gray4)">×</button></div>
      <div class="modal-body"><div class="form-group"><label>Nome</label><input id="m-proc" placeholder="Ex: Skinbooster" autofocus></div></div>
      <div class="modal-footer"><button class="btn btn-secondary" onclick="closeModal()">Cancelar</button><button class="btn btn-primary" onclick="salvarProc()">Salvar</button></div>`);
    setTimeout(()=>document.getElementById('m-proc')?.focus(),100);
  });

  document.getElementById('form-ent').addEventListener('submit',async e=>{
    e.preventDefault();
    const btn=document.getElementById('btn-ent'); btn.innerHTML=spinnerHTML; btn.disabled=true;
    const forma=fForma.value, band=fBand.value||null, data=document.getElementById('f-data').value;
    const val=parseFloat(document.getElementById('f-valor').value);
    const taxa=buscarTaxa(forma,band), vt=Math.round(val*taxa*100)/100, liq=Math.round((val-vt)*100)/100;
    const pOpt=document.getElementById('f-proc'), prOpt=document.getElementById('f-prof');
    const {error}=await sb.from('entradas').insert({
      data_venda:data, paciente:document.getElementById('f-pac').value.trim(),
      procedimento_id:pOpt.value||null, procedimento_nome:pOpt.options[pOpt.selectedIndex]?.dataset.nome||'',
      profissional_id:prOpt.value||null, profissional_nome:prOpt.options[prOpt.selectedIndex]?.dataset.nome||'',
      efetuou_venda:document.getElementById('f-efet').value||null,
      forma, bandeira:band, valor_bruto:val, taxa_pct:taxa, valor_taxa:vt, valor_liquido:liq,
      n_parcelas:nParc(forma), antecipacao:ehParc(forma)&&data<MARCO,
      observacoes:document.getElementById('f-obs').value||null, lancado_por:APP.user.id,
    });
    if(error) toast('Erro: '+error.message,'error');
    else { toast('Entrada lançada!'); document.getElementById('f-pac').value=''; document.getElementById('f-proc').value=''; document.getElementById('f-valor').value=''; document.getElementById('preview-pag').style.display='none'; }
    btn.innerHTML='Lançar Entrada'; btn.disabled=false;
  });
}

window.salvarProc=async function(){
  const nome=document.getElementById('m-proc')?.value?.trim();
  if(!nome)return toast('Digite o nome','warning');
  const {data,error}=await sb.from('procedimentos').insert({nome}).select().single();
  if(error)return toast('Erro: '+error.message,'error');
  toast('Cadastrado!'); APP.procs.push(data); closeModal();
  const sel=document.getElementById('f-proc');
  if(sel){const opt=document.createElement('option');opt.value=data.id;opt.dataset.nome=data.nome;opt.text=data.nome;opt.selected=true;sel.insertBefore(opt,sel.querySelector('option[value="__novo__"]'));}
};

// ============================================================
// SAÍDA DO DIA
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
    if(error)toast('Erro: '+error.message,'error'); else{toast('Saída registrada!');e.target.reset();document.getElementById('sd-data').value=hoje();}
    btn.innerHTML='Registrar Saída'; btn.disabled=false;
  });
}

// ============================================================
// SAÍDA COMPLETA
// ============================================================
async function pgSaidaCompleta(){
  const ct=document.getElementById('content');
  const dre=['CMV / Insumos','Despesas com Pessoal','Despesas Administrativas','Despesas com Vendas','Impostos e Obrigações','Despesas Financeiras','Outros'];
  ct.innerHTML=`<div style="max-width:680px"><div class="card">
    <h3 style="margin-bottom:4px">Saída Completa</h3>
    <p style="font-size:13px;color:var(--text2);margin-bottom:14px">Fornecedores, pessoal, impostos, marketing.</p>
    <form id="form-sc">
      <div class="form-grid c2">
        <div class="form-group"><label>Data <span class="req">*</span></label><input type="date" id="sc-data" value="${hoje()}" required></div>
        <div class="form-group"><label>Categoria DRE <span class="req">*</span></label><select id="sc-dre" required><option value="">Selecione</option>${dre.map(c=>`<option>${c}</option>`).join('')}</select></div>
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
    if(error)toast('Erro: '+error.message,'error'); else{toast('Saída lançada!');e.target.reset();document.getElementById('sc-data').value=hoje();document.getElementById('sc-banco').value='BB';}
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
      <input type="month" id="fil-mes" value="${mesAtual()}" style="width:155px">
      <input id="fil-busca" placeholder="Buscar paciente ou procedimento..." style="flex:1;min-width:180px">
      <select id="fil-prof" style="width:150px"><option value="">Todos profissionais</option>${APP.profs.map(p=>`<option>${p.nome}</option>`).join('')}</select>
      <select id="fil-forma" style="width:140px"><option value="">Todas as formas</option>${['Pix','Dinheiro','Débito','Crédito 1x','Crédito 2x','Crédito 3x','Crédito 4x','Crédito 5x','Crédito 6x','Crédito 7x','Crédito 8x','Crédito 9x','Crédito 10x','Crédito 11x','Crédito 12x'].map(f=>`<option>${f}</option>`).join('')}</select>
      <button class="btn btn-primary btn-sm" onclick="carregarEntradas()">Filtrar</button>
    </div>
    <div class="metrics-grid" id="ent-totais" style="grid-template-columns:repeat(${isGestora?3:1},1fr);margin-bottom:14px"></div>
    <div class="card" style="padding:0" id="ent-tabela"><div style="text-align:center;padding:40px"><span class="spinner dark"></span></div></div>`;
  await carregarEntradas();
  document.getElementById('fil-busca').addEventListener('input',carregarEntradas);
}

window.carregarEntradas=async function(){
  const mes=document.getElementById('fil-mes')?.value||mesAtual();
  const busca=(document.getElementById('fil-busca')?.value||'').toLowerCase();
  const prof=document.getElementById('fil-prof')?.value||'';
  const forma=document.getElementById('fil-forma')?.value||'';
  const isGestora=APP.user.perfil==='gestora';
  let q=sb.from('entradas').select('*').gte('data_venda',inicioMes(mes)).lte('data_venda',fimMes(mes)).order('data_venda',{ascending:false});
  if(prof)q=q.eq('profissional_nome',prof);
  if(forma)q=q.eq('forma',forma);
  const {data,error}=await q;
  if(error){toast('Erro: '+error.message,'error');return;}
  let rows=data||[];
  if(busca)rows=rows.filter(r=>(r.paciente||'').toLowerCase().includes(busca)||(r.procedimento_nome||'').toLowerCase().includes(busca));
  const totB=rows.reduce((s,r)=>s+Number(r.valor_bruto),0);
  const totL=rows.reduce((s,r)=>s+Number(r.valor_liquido),0);
  const totT=rows.reduce((s,r)=>s+Number(r.valor_taxa),0);
  const mTot=document.getElementById('ent-totais');
  if(mTot) mTot.innerHTML=isGestora
    ?[{l:'Total Bruto',v:fmt(totB),s:`${rows.length} lançamentos`,c:''},{l:'Total Líquido',v:fmt(totL),s:'Após taxas',c:'info'},{l:'Total Taxas',v:fmt(totT),s:'Operadora',c:'danger'}].map(c=>`<div class="metric-card ${c.c}"><div class="metric-label">${c.l}</div><div class="metric-value">${c.v}</div><div class="metric-sub">${c.s}</div></div>`).join('')
    :`<div class="metric-card" style="opacity:.8;max-width:240px"><div class="metric-label">Entradas do período</div><div class="metric-value" style="font-size:16px">${fmt(totB)}</div><div class="metric-sub">${rows.length} lançamentos</div></div>`;
  const tbl=document.getElementById('ent-tabela');
  if(!tbl)return;
  tbl.innerHTML=rows.length?`<div class="table-wrapper"><table>
    <thead><tr><th>Data</th><th>Paciente</th><th>Procedimento</th><th>Profissional</th><th>Efetuou Venda</th><th>Forma</th><th style="text-align:right">Bruto</th>${isGestora?'<th style="text-align:right">Taxa</th><th style="text-align:right">Líquido</th>':''}<th>Ações</th></tr></thead>
    <tbody>${rows.map(r=>{
      const podeEdit=isGestora||(APP.user.perfil==='secretaria'&&r.lancado_por===APP.user.id);
      return`<tr><td>${fmtData(r.data_venda)}</td><td style="font-weight:500">${r.paciente}</td><td>${r.procedimento_nome||'-'}</td><td>${r.profissional_nome||'-'}</td><td>${r.efetuou_venda||'-'}</td><td><span class="badge badge-blue">${r.forma}</span></td><td style="text-align:right">${fmt(r.valor_bruto)}</td>${isGestora?`<td style="text-align:right;color:var(--danger)">${fmtPct(r.taxa_pct)}</td><td style="text-align:right;font-weight:700;color:var(--primary)">${fmt(r.valor_liquido)}</td>`:''}<td>${podeEdit?`<button class="btn btn-secondary btn-sm" onclick="editEntrada('${r.id}')">✏</button>`:'-'}</td></tr>`;
    }).join('')}</tbody>
    ${isGestora?`<tfoot><tr><td colspan="6" style="font-weight:700">TOTAL</td><td style="text-align:right">${fmt(totB)}</td><td style="text-align:right;color:var(--danger)">${fmt(totT)}</td><td style="text-align:right;color:var(--primary)">${fmt(totL)}</td><td></td></tr></tfoot>`:''}
    </table></div>`:'<div class="empty-state"><p>Nenhuma entrada encontrada</p></div>';
};

window.editEntrada=async function(id){
  const {data:r}=await sb.from('entradas').select('*').eq('id',id).single();
  if(!r)return;
  const {procs,profs,usuarios}=APP;
  const efets=[...profs.map(p=>({nome:p.nome})),...usuarios.filter(u=>u.perfil==='secretaria').map(u=>({nome:u.nome}))];
  openModal(`<div class="modal-header"><h3>Editar Entrada</h3><button class="btn" onclick="closeModal()" style="background:none;font-size:18px;color:var(--gray4)">×</button></div>
    <div class="modal-body">
      <div class="form-grid c2">
        <div class="form-group"><label>Data</label><input type="date" id="ee-data" value="${r.data_venda}"></div>
        <div class="form-group"><label>Paciente</label><input id="ee-pac" value="${r.paciente}"></div>
      </div>
      <div class="form-grid c2">
        <div class="form-group"><label>Procedimento</label><select id="ee-proc"><option value="">Selecione</option>${procs.map(p=>`<option value="${p.id}" data-nome="${p.nome}" ${r.procedimento_id==p.id?'selected':''}>${p.nome}</option>`).join('')}</select></div>
        <div class="form-group"><label>Profissional</label><select id="ee-prof"><option value="">Selecione</option>${profs.map(p=>`<option value="${p.id}" data-nome="${p.nome}" ${r.profissional_id==p.id?'selected':''}>${p.nome}</option>`).join('')}</select></div>
      </div>
      <div class="form-grid c2">
        <div class="form-group"><label>Quem efetuou a venda</label><select id="ee-efet"><option value="">Selecione</option>${efets.map(e=>`<option value="${e.nome}" ${r.efetuou_venda===e.nome?'selected':''}>${e.nome}</option>`).join('')}</select></div>
        <div class="form-group"><label>Observações</label><input id="ee-obs" value="${r.observacoes||''}"></div>
      </div>
    </div>
    <div class="modal-footer"><button class="btn btn-secondary" onclick="closeModal()">Cancelar</button><button class="btn btn-primary" onclick="salvarEditEntrada('${id}')">Salvar</button></div>`);
};

window.salvarEditEntrada=async function(id){
  const pOpt=document.getElementById('ee-proc'), prOpt=document.getElementById('ee-prof');
  const {error}=await sb.from('entradas').update({
    data_venda:document.getElementById('ee-data').value, paciente:document.getElementById('ee-pac').value.trim(),
    procedimento_id:pOpt.value||null, procedimento_nome:pOpt.options[pOpt.selectedIndex]?.dataset.nome||'',
    profissional_id:prOpt.value||null, profissional_nome:prOpt.options[prOpt.selectedIndex]?.dataset.nome||'',
    efetuou_venda:document.getElementById('ee-efet').value||null, observacoes:document.getElementById('ee-obs').value||null,
  }).eq('id',id);
  if(error)return toast('Erro: '+error.message,'error');
  toast('Atualizado!'); closeModal(); carregarEntradas();
};

window.exportEntradas=async function(){
  const mes=document.getElementById('fil-mes')?.value||mesAtual();
  const {data}=await sb.from('entradas').select('*').gte('data_venda',inicioMes(mes)).lte('data_venda',fimMes(mes)).order('data_venda',{ascending:false});
  const cols=['data_venda','paciente','procedimento_nome','profissional_nome','efetuou_venda','forma','bandeira','valor_bruto','taxa_pct','valor_taxa','valor_liquido','n_parcelas','antecipacao','observacoes'];
  const csv=[cols.join(';'),...(data||[]).map(r=>cols.map(c=>String(r[c]??'').replace(/;/g,',')).join(';'))].join('\n');
  const a=document.createElement('a');a.href='data:text/csv;charset=utf-8,'+encodeURIComponent(csv);a.download=`entradas_${mes}.csv`;a.click();
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
  tbl.innerHTML=`<div style="padding:12px 14px;background:var(--gray1);display:flex;justify-content:space-between;align-items:center"><span style="font-size:13px;color:var(--gray4)">${rows.length} registros</span><span style="font-weight:700;color:var(--danger)">Total: ${fmt(tot)}</span></div>`+(rows.length?`<div class="table-wrapper"><table><thead><tr><th>Data</th><th>Categoria</th><th>Descrição</th><th style="text-align:right">Valor</th><th>Forma</th><th>Ações</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${fmtData(r.data_saida)}</td><td><span class="badge badge-gray">${r.categoria}</span></td><td>${r.descricao}</td><td style="text-align:right;color:var(--danger);font-weight:600">${fmt(r.valor)}</td><td>${r.forma_pag||'-'}</td><td><button class="btn btn-secondary btn-sm" onclick="editSaidaSec('${r.id}')">✏</button></td></tr>`).join('')}</tbody></table></div>`:'<div class="empty-state"><p>Nenhuma saída neste período</p></div>');
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
      <input type="month" id="s-mes-ini" value="2026-01" style="width:150px">
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
  const iniVal = document.getElementById('s-mes-ini')?.value || '2026-01';
  const fimVal = document.getElementById('s-mes-fim')?.value || mesAtual();
  const catFil = document.getElementById('s-cat-fil')?.value || '';
  const ini = inicioMes(iniVal), fim = fimMes(fimVal);

  let q = sb.from('saidas').select('*').gte('data_saida', ini).lte('data_saida', fim).order('data_saida', { ascending: false });
  if (catFil) q = q.eq('categoria_dre', catFil);
  const { data: rows, error } = await q;
  if (error) { toast('Erro: ' + error.message, 'error'); return; }

  const saidas = rows || [];
  const total = saidas.reduce((s, r) => s + Number(r.valor), 0);

  // Totais por categoria
  const porCat = {};
  saidas.forEach(r => {
    const c = r.categoria_dre || 'Outros';
    porCat[c] = (porCat[c] || 0) + Number(r.valor);
  });

  // Totais por mês para gráfico
  const porMes = {};
  saidas.forEach(r => {
    const m = r.data_saida.slice(0, 7);
    porMes[m] = (porMes[m] || 0) + Number(r.valor);
  });

  // Métricas
  const metrics = document.getElementById('saidas-metrics');
  if (metrics) {
    const topCat = Object.entries(porCat).sort((a, b) => b[1] - a[1])[0];
    metrics.innerHTML = [
      { l: 'Total de Saídas', v: fmt(total), s: saidas.length + ' lançamentos', c: 'danger' },
      { l: 'Média mensal', v: fmt(total / Math.max(1, Object.keys(porMes).length)), s: 'Por mês', c: '' },
      { l: 'Maior categoria', v: topCat ? topCat[0].split(' / ')[0] : '-', s: topCat ? fmt(topCat[1]) : '', c: 'info' },
      { l: 'Categorias', v: Object.keys(porCat).length, s: 'Tipos diferentes', c: '' },
    ].map(c => `<div class="metric-card ${c.c}"><div class="metric-label">${c.l}</div><div class="metric-value">${c.v}</div><div class="metric-sub">${c.s}</div></div>`).join('');
  }

  // Gráfico pizza por categoria
  const CORES_CAT = { 'CMV / Insumos': '#E57373', 'Despesas com Pessoal': '#64B5F6', 'Despesas Administrativas': '#FFD54F', 'Despesas com Vendas': '#81C784', 'Impostos e Obrigações': '#CE93D8', 'Despesas Financeiras': '#80DEEA', 'Outros': '#BCAAA4' };
  const catLabels = Object.keys(porCat);
  const catVals   = Object.values(porCat);
  const catCores  = catLabels.map(k => CORES_CAT[k] || '#BCAAA4');

  const pizzaEl = document.getElementById('c-saidas-pizza');
  if (pizzaEl) {
    new Chart(pizzaEl, {
      type: 'doughnut',
      data: { labels: catLabels, datasets: [{ data: catVals, backgroundColor: catCores, borderWidth: 2 }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right' }, tooltip: { callbacks: { label: ctx => ' ' + ctx.label + ': ' + fmt(ctx.raw) + ' (' + Math.round(ctx.raw / total * 100) + '%)' } } } }
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

  // Subtotais por categoria
  const catOrdem = ['CMV / Insumos', 'Despesas com Pessoal', 'Despesas Administrativas', 'Despesas com Vendas', 'Impostos e Obrigações', 'Despesas Financeiras', 'Outros'];
  const resumoHTML = `
    <div style="padding:14px 16px;border-bottom:1px solid var(--gray2)">
      <h3 style="margin-bottom:10px">Resumo por categoria</h3>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:8px">
        ${catOrdem.filter(c => porCat[c]).map(c => `
          <div style="background:var(--gray1);border-radius:7px;padding:10px;border-left:3px solid ${CORES_CAT[c]}">
            <div style="font-size:11px;color:var(--gray4);font-weight:700;text-transform:uppercase;margin-bottom:3px">${c}</div>
            <div style="font-size:15px;font-weight:800;color:var(--danger)">${fmt(porCat[c])}</div>
            <div style="font-size:11px;color:var(--gray3)">${Math.round(porCat[c] / total * 100)}% do total</div>
          </div>`).join('')}
      </div>
    </div>`;

  tbl.innerHTML = resumoHTML + (saidas.length ? `
    <div class="table-wrapper"><table>
      <thead><tr><th>Data</th><th>Categoria</th><th>Descrição</th><th style="text-align:right">Valor</th><th>Forma Pag.</th><th>Banco</th><th>Tipo</th></tr></thead>
      <tbody>${saidas.map(r => `<tr>
        <td>${fmtData(r.data_saida)}</td>
        <td><span class="badge badge-red" style="background:${CORES_CAT[r.categoria_dre] || '#BCAAA4'}22;color:${CORES_CAT[r.categoria_dre] || '#999'}">${r.categoria_dre || '-'}</span></td>
        <td style="font-weight:500">${r.descricao}</td>
        <td style="text-align:right;font-weight:700;color:var(--danger)">${fmt(r.valor)}</td>
        <td>${r.forma_pag || '-'}</td>
        <td>${r.banco || '-'}</td>
        <td><span class="badge ${r.tipo === 'Fixo' ? 'badge-blue' : 'badge-gray'}">${r.tipo || '-'}</span></td>
      </tr>`).join('')}</tbody>
      <tfoot><tr><td colspan="3" style="font-weight:700">TOTAL</td><td style="text-align:right;font-weight:800;color:var(--danger)">${fmt(total)}</td><td colspan="3"></td></tr></tfoot>
    </table></div>` : '<div class="empty-state"><p>Nenhuma saída no período</p></div>');
};

window.exportSaidas = async function() {
  const iniVal = document.getElementById('s-mes-ini')?.value || '2026-01';
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
  const {data,error}=await sb.from('vw_fluxo_caixa').select('*').gte('mes','2026-01-01').lte('mes','2026-12-31').order('mes');
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
  const {data}=await sb.from('vw_fluxo_caixa').select('*').gte('mes','2026-01-01').lte('mes','2026-12-31').order('mes');
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
  const {data}=await sb.from('parcelas').select('*,entradas(paciente,forma,profissional_nome)').gte('data_venc',hoje()).order('data_venc').limit(300);
  const rows=data||[], porMes={};
  rows.forEach(r=>{const m=r.data_venc?.slice(0,7);if(!porMes[m]){porMes[m]={total:0,rows:[]};}porMes[m].total+=Number(r.valor);porMes[m].rows.push(r);});
  const totG=rows.reduce((s,r)=>s+Number(r.valor),0);
  document.getElementById('recv-ct').innerHTML=`<div class="metrics-grid" style="grid-template-columns:repeat(2,1fr);margin-bottom:18px"><div class="metric-card"><div class="metric-label">Total a receber</div><div class="metric-value">${fmt(totG)}</div><div class="metric-sub">${rows.length} parcelas</div></div><div class="metric-card info"><div class="metric-label">Meses projetados</div><div class="metric-value">${Object.keys(porMes).length}</div></div></div>${Object.entries(porMes).map(([mes,d])=>`<div class="card" style="margin-bottom:12px"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px"><h3>${mesLabel(mes+'-01')}</h3><span style="font-weight:700;color:var(--primary);font-size:15px">${fmt(d.total)}</span></div><div class="table-wrapper"><table><thead><tr><th>Paciente</th><th>Profissional</th><th>Forma</th><th style="text-align:right">Vencimento</th><th style="text-align:right">Valor</th><th style="text-align:right">Parcela</th></tr></thead><tbody>${d.rows.map(p=>`<tr><td style="font-weight:500">${p.entradas?.paciente||'-'}</td><td>${p.entradas?.profissional_nome||'-'}</td><td><span class="badge badge-blue">${p.entradas?.forma||'-'}</span></td><td style="text-align:right">${fmtData(p.data_venc)}</td><td style="text-align:right;font-weight:700;color:var(--primary)">${fmt(p.valor)}</td><td style="text-align:right"><span class="badge badge-green">${p.numero}/${p.total}</span></td></tr>`).join('')}</tbody></table></div></div>`).join('')}${!Object.keys(porMes).length?'<div class="empty-state"><p>Nenhum recebível futuro</p></div>':''}`;
}

// ============================================================
// METAS MENSAIS
// ============================================================
async function pgMetas() {
  const ct = document.getElementById('content');
  ct.innerHTML =
    '<div class="page-header"><h2>Metas Mensais</h2></div>' +
    '<div style="display:grid;grid-template-columns:340px 1fr;gap:18px;align-items:start">' +
    '<div class="card">' +
    '<h3 style="margin-bottom:6px">Cadastrar / editar meta</h3>' +
    '<p style="font-size:13px;color:var(--text2);margin-bottom:16px">Defina o faturamento que quer atingir no mês. Aparece no Dashboard como barra de progresso.</p>' +
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
    ct.innerHTML = '<div class="card"><div class="empty-state"><p>Nenhuma meta cadastrada ainda.</p><p style="margin-top:8px;font-size:13px">Use o formulário ao lado para criar a primeira meta.</p></div></div>';
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
    const status  = r.pct >= 100
      ? '<span class="badge badge-green">✓ Meta atingida!</span>'
      : r.pct >= 70
      ? '<span class="badge badge-orange">Bom ritmo</span>'
      : '<span class="badge badge-red">Abaixo da meta</span>';
    const borda   = isAtual ? 'border-left:4px solid var(--primary)' : 'border-left:4px solid var(--gray2)';
    const destaque= isAtual ? '<span style="font-size:11px;color:var(--primary);font-weight:700;text-transform:uppercase;letter-spacing:.05em">● Mês atual</span><br>' : '';
    const atendH  = r.meta_atendimentos > 0
      ? '<div style="margin-top:11px;padding-top:11px;border-top:1px solid var(--gray2);display:flex;justify-content:space-between;align-items:center;gap:10px">'
        + '<span style="font-size:12px;color:var(--gray4);white-space:nowrap">Atendimentos: <strong>' + r.natend + '/' + r.meta_atendimentos + '</strong></span>'
        + '<div style="flex:1;background:var(--gray2);border-radius:10px;height:6px;overflow:hidden"><div style="height:100%;width:' + Math.min(100, Math.round(r.natend / r.meta_atendimentos * 100)) + '%;background:var(--info);border-radius:10px"></div></div>'
        + '<span style="font-size:12px;color:var(--gray4)">' + Math.min(100, Math.round(r.natend / r.meta_atendimentos * 100)) + '%</span></div>'
      : '';
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
      + '</div>' + atendH
      + '<button class="btn btn-secondary btn-sm" style="margin-top:11px" onclick="editarMeta(' + JSON.stringify(r.mes.slice(0,7)) + ',' + r.meta_receita + ',' + r.meta_atendimentos + ')">✏️ Editar meta</button>'
      + '</div>';
  }).join('');
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
    + '<input type="month" id="rel-ini" value="2026-01" style="width:150px">'
    + '<span style="color:var(--gray3);font-size:13px">até</span>'
    + '<input type="month" id="rel-fim" value="' + mesAtual() + '" style="width:150px">'
    + '<button class="btn btn-primary btn-sm" onclick="carregarRelatorio()">Filtrar</button>'
    + '</div>'
    + '<div id="rel-ct"><div style="text-align:center;padding:60px"><span class="spinner dark"></span></div></div>';
  await carregarRelatorio();
}

window.carregarRelatorio = async function() {
  const profFil = document.getElementById('rel-prof')?.value || '';
  const iniVal  = document.getElementById('rel-ini')?.value  || '2026-01';
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
  const {data}=await sb.from('usuarios').select('*').order('nome');
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
    <thead><tr><th>Nome</th><th>Perfil</th><th>Status</th><th>Ações</th></tr></thead>
    <tbody>${(data||[]).map(u=>`<tr>
      <td><div style="display:flex;align-items:center;gap:8px"><div style="width:28px;height:28px;border-radius:50%;background:var(--primary-light);color:var(--primary);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:11px">${initials(u.nome)}</div>${u.nome}</div></td>
      <td><span class="badge ${u.perfil==='gestora'?'badge-green':u.perfil==='contador'?'badge-blue':'badge-gray'}">${u.perfil}</span></td>
      <td><span class="badge ${u.ativo?'badge-green':'badge-red'}">${u.ativo?'Ativo':'Inativo'}</span></td>
      <td><button class="btn btn-secondary btn-sm" onclick="editUsuario('${u.id}','${u.nome}','${u.perfil}',${u.ativo})">✏ Editar</button></td>
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

window.editUsuario=function(id,nome,perfil,ativo){
  openModal(`<div class="modal-header"><h3>Editar Usuário</h3><button class="btn" onclick="closeModal()" style="background:none;font-size:18px;color:var(--gray4)">×</button></div>
    <div class="modal-body">
      <div class="form-grid"><div class="form-group"><label>Nome</label><input id="eu-nome" value="${nome}"></div>
        <div class="form-group"><label>Perfil</label><select id="eu-perfil"><option value="secretaria" ${perfil==='secretaria'?'selected':''}>Secretaria</option><option value="gestora" ${perfil==='gestora'?'selected':''}>Gestora</option><option value="contador" ${perfil==='contador'?'selected':''}>Contador</option></select></div>
        <div class="form-group"><label>Status</label><select id="eu-ativo"><option value="true" ${ativo?'selected':''}>Ativo</option><option value="false" ${!ativo?'selected':''}>Inativo</option></select></div>
      </div>
    </div>
    <div class="modal-footer"><button class="btn btn-secondary" onclick="closeModal()">Cancelar</button><button class="btn btn-primary" onclick="salvarEditUsuario('${id}')">Salvar</button></div>`);
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
  const cfg=APP.config;
  document.getElementById('content').innerHTML=`<h2 style="margin-bottom:18px">Configurações do Sistema</h2>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;align-items:start">
      <div class="card">
        <h3 style="margin-bottom:14px">Identidade visual</h3>
        <div class="form-grid"><div class="form-group"><label>Nome do sistema</label><input id="cfg-nome" value="${cfg.nome||'Clínica Financeiro'}"></div></div>
        <div class="form-group" style="margin-bottom:14px">
          <label>Cor principal</label>
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:7px">${CORES_PRESET.map(c=>`<div class="color-opt ${cfg.cor_primaria===c.c?'active':''}" style="background:${c.c}" title="${c.n}" onclick="selCor('${c.c}',this)"></div>`).join('')}</div>
          <div style="display:flex;align-items:center;gap:8px;margin-top:8px"><label style="font-size:12px;color:var(--gray4)">Personalizada:</label><input type="color" id="cfg-cor-custom" value="${cfg.cor_primaria||'#0B5345'}" style="width:40px;height:30px;padding:2px;cursor:pointer" oninput="selCorCustom(this.value)"></div>
          <input type="hidden" id="cfg-cor" value="${cfg.cor_primaria||'#0B5345'}">
        </div>
        <div class="form-group" style="margin-bottom:14px">
          <label>Logo (URL pública)</label>
          <input id="cfg-logo" placeholder="https://..." value="${cfg.logo_url||''}">
          <p style="font-size:11px;color:var(--gray3);margin-top:3px">Tamanho recomendado: 100×100px</p>
        </div>
        <button class="btn btn-primary btn-full" onclick="salvarConfig()">Salvar configurações</button>
      </div>
      <div class="card">
        <h3 style="margin-bottom:14px">Prévia</h3>
        <div style="border:1.5px solid var(--gray2);border-radius:8px;overflow:hidden">
          <div id="pv-sidebar" style="background:var(--primary);padding:13px 15px;color:#fff">
            <div style="font-weight:700;font-size:13px" id="pv-nome">${cfg.nome||'Clínica Financeiro'}</div>
            <div style="font-size:11px;opacity:.55;margin-top:2px">Gestora</div>
            <div style="margin-top:10px;display:flex;flex-direction:column;gap:3px">
              ${['Dashboard','Nova Entrada','DRE'].map((m,i)=>`<div style="padding:5px 7px;background:${i===0?'rgba(255,255,255,.18)':'transparent'};border-radius:4px;font-size:12px">${m}</div>`).join('')}
            </div>
          </div>
          <div style="padding:10px;background:#EEF1F3">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:7px">
              ${['Receita Hoje','Resultado Mês'].map(l=>`<div style="background:#fff;border-radius:5px;padding:9px;border-left:3px solid var(--primary)"><div style="font-size:9px;color:var(--gray4)">${l}</div><div style="font-weight:700;font-size:14px;margin-top:1px">R$ 0,00</div></div>`).join('')}
            </div>
          </div>
        </div>
        <div style="margin-top:13px">
          <h3 style="margin-bottom:10px">Exportação</h3>
          <div style="display:flex;flex-direction:column;gap:7px">
            <button class="btn btn-secondary btn-full" onclick="navigate('fluxo');setTimeout(()=>window.print(),400)">🖨 Imprimir Fluxo de Caixa</button>
            <button class="btn btn-secondary btn-full" onclick="navigate('dre');setTimeout(()=>window.print(),400)">🖨 Imprimir DRE</button>
            <button class="btn btn-secondary btn-full" onclick="exportarTudo()">↓ Exportar todos os dados (CSV)</button>
          </div>
        </div>
      </div>
    </div>`;
}

window.selCor=function(cor,el){document.getElementById('cfg-cor').value=cor;document.getElementById('cfg-cor-custom').value=cor;document.querySelectorAll('.color-opt').forEach(e=>e.classList.remove('active'));el.classList.add('active');aplicarCor(cor);document.getElementById('pv-sidebar').style.background=cor;};
window.selCorCustom=function(cor){document.getElementById('cfg-cor').value=cor;document.querySelectorAll('.color-opt').forEach(e=>e.classList.remove('active'));aplicarCor(cor);document.getElementById('pv-sidebar').style.background=cor;};
window.salvarConfig=async function(){
  const nome=document.getElementById('cfg-nome').value.trim(), cor=document.getElementById('cfg-cor').value, logo=document.getElementById('cfg-logo').value.trim()||null;
  const {error}=await sb.from('config_sistema').update({nome,cor_primaria:cor,logo_url:logo,updated_at:new Date().toISOString()}).eq('id',1);
  if(error)return toast('Erro: '+error.message,'error');
  APP.config={...APP.config,nome,cor_primaria:cor,logo_url:logo};
  document.querySelectorAll('#sys-nome,#login-nome').forEach(e=>e.textContent=nome); document.title=nome; document.getElementById('logo-char').textContent=nome[0].toUpperCase();
  document.getElementById('pv-nome').textContent=nome;
  toast('Configurações salvas!');
};
window.exportarTudo=async function(){
  toast('Preparando...','warning');
  const [e,s,ss]=await Promise.all([sb.from('entradas').select('*').order('data_venda'),sb.from('saidas').select('*').order('data_saida'),sb.from('saidas_secretaria').select('*').order('data_saida')]);
  const toCSV=(data,cols)=>[cols.join(';'),...(data||[]).map(r=>cols.map(c=>String(r[c]??'').replace(/;/g,',')).join(';'))].join('\n');
  [{nome:'entradas',data:e.data,cols:['data_venda','paciente','procedimento_nome','profissional_nome','efetuou_venda','forma','bandeira','valor_bruto','taxa_pct','valor_taxa','valor_liquido','n_parcelas','antecipacao']},{nome:'saidas',data:s.data,cols:['data_saida','categoria','categoria_dre','descricao','valor','forma_pag','banco','tipo']},{nome:'saidas_secretaria',data:ss.data,cols:['data_saida','categoria','descricao','valor','forma_pag','quem_pagou']}]
    .forEach(({nome,data,cols})=>{const a=document.createElement('a');a.href='data:text/csv;charset=utf-8,'+encodeURIComponent(toCSV(data,cols));a.download=`${nome}_${hoje()}.csv`;a.click();});
};

// ============================================================
// INICIALIZAÇÃO
// ============================================================
document.getElementById('topbar-data').textContent=new Date().toLocaleDateString('pt-BR',{weekday:'short',day:'2-digit',month:'long',year:'numeric'});

document.addEventListener('click',e=>{
  const panel=document.getElementById('notif-panel');
  if(panel&&!panel.contains(e.target)&&!e.target.closest('button[onclick="toggleNotif()"]')) panel.style.display='none';
});

(async function init(){
  await carregarConfig();
  const user=await checkAuth();
  if(!user){
    document.getElementById('login-screen').style.display='flex';
    document.getElementById('form-login').addEventListener('submit',async e=>{
      e.preventDefault();
      const btn=document.getElementById('btn-login'), erro=document.getElementById('l-erro');
      btn.innerHTML=spinnerHTML; btn.disabled=true; erro.style.display='none';
      const {data,error}=await sb.auth.signInWithPassword({email:document.getElementById('l-email').value,password:document.getElementById('l-senha').value});
      if(error){erro.textContent='E-mail ou senha incorretos';erro.style.display='block';btn.innerHTML='Entrar';btn.disabled=false;return;}
      const {data:usr}=await sb.from('usuarios').select('*').eq('id',data.user.id).single();
      if(!usr){erro.textContent='Usuário não cadastrado. Contate a gestora.';erro.style.display='block';btn.innerHTML='Entrar';btn.disabled=false;await sb.auth.signOut();return;}
      APP.user={...data.user,...usr};
      document.getElementById('login-screen').style.display='none';
      await iniciarApp();
    });
    return;
  }
  await iniciarApp();
})();

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

  const nav=[
    {p:'dashboard',l:'Dashboard',show:isG},
    {p:'nova_entrada',l:'Nova Entrada',show:isG||isSec},
    {p:'saida_dia',l:'Saída do Dia',show:isG||isSec},
    {p:'saida_completa',l:'Saída Completa',show:isG},
    {sec:'Relatórios'},
    {p:'entradas',l:'Entradas',show:isG||isSec||isCont},
    {p:'saidas_sec',l:'Minhas Saídas',show:isSec},
    {p:'saidas_relatorio',l:'Saídas',show:isG},
    {p:'fluxo',l:'Fluxo de Caixa',show:isG},
    {p:'relatorios',l:'Por Profissional',show:isG},
    {p:'metas',l:'Metas',show:isG},
    {p:'dre',l:'DRE',show:isG||isCont},
    {p:'recebiveis',l:'Recebíveis',show:isG},
    {sec:'Sistema'},
    {p:'admin',l:'Administração',show:isG},
    {p:'configuracoes',l:'Configurações',show:isG},
  ];

  document.getElementById('sidebar-nav').innerHTML=nav.filter(i=>i.show!==false).map(i=>{
    if(i.sec)return`<div class="nav-section">${i.sec}</div>`;
    return`<a data-page="${i.p}" onclick="navigate('${i.p}')">${i.l}</a>`;
  }).join('');

  // Navegar para página inicial
  const start=isG?'dashboard':isSec?'nova_entrada':'entradas';
  navigate(start);

  // Notificações
  if(isG){
    carregarNotificacoes();
    setInterval(carregarNotificacoes,60000);
    fetch(`${SB_URL}/functions/v1/notificacoes`,{method:'POST',headers:{'apikey':SB_ANON}}).catch(()=>{});
  }
}

function toggleSidebar(){const s=document.getElementById('sidebar'),o=document.getElementById('sidebar-overlay');const op=s.classList.toggle('open');o.style.display=op?'block':'none';}