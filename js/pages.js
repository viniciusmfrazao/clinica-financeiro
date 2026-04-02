// =============================================
// CLÍNICA FINANCEIRO — Páginas v3
// =============================================

function navigate(page) {
  document.querySelectorAll('#sidebar nav a').forEach(a => a.classList.toggle('active', a.dataset.page === page));
  document.getElementById('content').innerHTML = '<div style="text-align:center;padding:60px"><span class="spinner dark"></span></div>';
  document.getElementById('topbar-title').textContent = {
    dashboard:'Dashboard', nova_entrada:'Nova Entrada',
    saida_dia:'Saída do Dia a Dia', saida_completa:'Saída Completa',
    entradas:'Entradas', fluxo:'Fluxo de Caixa',
    dre:'DRE', recebiveis:'Recebíveis Futuros',
    admin:'Administração', configuracoes:'Configurações',
  }[page] || page;
  const pages = {
    dashboard: pgDashboard, nova_entrada: pgNovaEntrada,
    saida_dia: pgSaidaDia, saida_completa: pgSaidaCompleta,
    entradas: pgEntradas, fluxo: pgFluxo,
    dre: pgDRE, recebiveis: pgRecebiveis,
    admin: pgAdmin, configuracoes: pgConfiguracoes,
  };
  (pages[page] || pgDashboard)();
}

// ================================================================
// DASHBOARD
// ================================================================
async function pgDashboard() {
  const ct = document.getElementById('content');
  ct.innerHTML = `
    <div class="metrics-grid" id="dash-metrics">
      ${[1,2,3,4,5,6].map(()=>`<div class="metric-card"><div class="metric-label">Carregando...</div><div class="metric-value">—</div></div>`).join('')}
    </div>
    <div id="dash-meta-bar" style="margin-bottom:16px"></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">
      <div class="card"><h3 style="margin-bottom:14px">Entradas vs Saídas 2026</h3><canvas id="chart-anual" height="220"></canvas></div>
      <div class="card"><h3 style="margin-bottom:14px">Resultado mensal</h3><canvas id="chart-resultado" height="220"></canvas></div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
      <div class="card"><h3 style="margin-bottom:14px">Entradas por forma de pagamento</h3><div style="max-height:220px;display:flex;align-items:center;justify-content:center"><canvas id="chart-forma"></canvas></div></div>
      <div class="card" id="dash-ultimas"><h3 style="margin-bottom:14px">Últimas entradas</h3><div style="text-align:center;padding:20px"><span class="spinner dark"></span></div></div>
    </div>`;

  const mes = mesAtual(); const inicio = inicioMes(mes); const fim = fimMes(mes);
  const [rHoje,rMes,rFluxo,rForma,rUltimas] = await Promise.all([
    sb.from('entradas').select('valor_bruto,valor_liquido').eq('data_venda', hoje()),
    sb.from('entradas').select('valor_bruto,valor_liquido').gte('data_venda',inicio).lte('data_venda',fim),
    sb.from('vw_fluxo_caixa').select('*').gte('mes','2026-01-01').lte('mes','2026-12-31').order('mes'),
    sb.from('entradas').select('forma,valor_bruto').gte('data_venda',inicio).lte('data_venda',fim),
    sb.from('entradas').select('data_venda,paciente,procedimento_nome,valor_bruto,forma').order('created_at',{ascending:false}).limit(6),
  ]);
  const totalHoje = rHoje.data?.reduce((s,r)=>s+Number(r.valor_bruto),0)||0;
  const totalMes  = rMes.data?.reduce((s,r)=>s+Number(r.valor_bruto),0)||0;
  const liqMes    = rMes.data?.reduce((s,r)=>s+Number(r.valor_liquido),0)||0;
  const ticket    = rMes.data?.length ? liqMes/rMes.data.length : 0;
  const fluxo     = rFluxo.data||[];
  const mesDados  = fluxo.find(r=>r.mes?.slice(0,7)===mes);

  document.getElementById('dash-metrics').innerHTML = [
    {label:'Receita hoje',    val:fmt(totalHoje),              sub:'Valor bruto',          cls:''},
    {label:'Receita do mês',  val:fmt(totalMes),               sub:`${rMes.data?.length||0} atendimentos`, cls:''},
    {label:'Líquido do mês',  val:fmt(liqMes),                 sub:'Após taxas',           cls:'info'},
    {label:'Ticket médio',    val:fmt(ticket),                  sub:'Por atendimento',      cls:'info'},
    {label:'Saídas do mês',   val:fmt(mesDados?.total_saidas||0), sub:'Todos os grupos',   cls:'danger'},
    {label:'Resultado do mês',val:fmt(mesDados?.resultado||0),  sub:'Caixa real',          cls:(mesDados?.resultado||0)>=0?'':'danger'},
  ].map(c=>`<div class="metric-card ${c.cls}"><div class="metric-label">${c.label}</div><div class="metric-value">${c.val}</div><div class="metric-sub">${c.sub}</div></div>`).join('');

  if (fluxo.length) {
    const labels = fluxo.map(r=>mesLabel(r.mes));
    new Chart(document.getElementById('chart-anual'),{type:'bar',data:{labels,datasets:[
      {label:'Entradas',data:fluxo.map(r=>r.total_entradas||0),backgroundColor:'#117A65',borderRadius:4},
      {label:'Saídas',data:fluxo.map(r=>r.total_saidas||0),backgroundColor:'#E57373',borderRadius:4},
    ]},options:{responsive:true,plugins:{legend:{position:'bottom'}},scales:{y:{ticks:{callback:v=>fmt(v)},grid:{color:'#F0F0F0'}}}}});
    new Chart(document.getElementById('chart-resultado'),{type:'line',data:{labels,datasets:[{
      label:'Resultado',data:fluxo.map(r=>r.resultado||0),
      borderColor:'#1B4F72',backgroundColor:'rgba(27,79,114,.08)',fill:true,tension:.35,pointRadius:4,
    }]},options:{responsive:true,plugins:{legend:{display:false}},scales:{y:{ticks:{callback:v=>fmt(v)},grid:{color:'#F0F0F0'}}}}});
  }
  const formaMap={};
  rForma.data?.forEach(r=>{formaMap[r.forma]=(formaMap[r.forma]||0)+Number(r.valor_bruto);});
  const fL=Object.keys(formaMap),fD=Object.values(formaMap);
  const CORES=['#117A65','#1B4F72','#784212','#922B21','#1E8449','#8E44AD','#2E86C1','#D35400','#7D6608','#1A5276'];
  if(fL.length) new Chart(document.getElementById('chart-forma'),{type:'doughnut',data:{labels:fL,datasets:[{data:fD,backgroundColor:CORES,borderWidth:2}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'right'}}}});

  const ult=rUltimas.data||[];
  // Barra de meta do mês — busca pelo primeiro dia do mês atual
  const mesDateStr = inicio; // já é YYYY-MM-01
  const { data: metaMes } = await sb.from('metas').select('*').eq('mes', mesDateStr).maybeSingle();
  const barMeta = document.getElementById('dash-meta-bar');
  if (barMeta && metaMes) {
    const pctMeta = Math.min(100, Math.round((liqMes / metaMes.meta_receita) * 100));
    const corMeta = pctMeta >= 100 ? 'var(--primary)' : pctMeta >= 70 ? '#E67E22' : 'var(--danger)';
    barMeta.innerHTML = `<div class="card" style="padding:14px 20px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <span style="font-weight:600;font-size:14px">Meta do mês — ${mesLabel(mes+'-01')}</span>
        <span style="font-weight:800;font-size:20px;color:${corMeta}">${pctMeta}%</span>
      </div>
      <div style="background:var(--gray2);border-radius:20px;height:12px;overflow:hidden;margin-bottom:6px">
        <div style="height:100%;width:${pctMeta}%;background:${corMeta};border-radius:20px;transition:width .8s"></div>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--gray3)">
        <span>Realizado: <strong style="color:${corMeta}">${fmt(liqMes)}</strong></span>
        <span>Meta: <strong>${fmt(metaMes.meta_receita)}</strong></span>
        <span>Faltam: <strong>${fmt(Math.max(0, metaMes.meta_receita - liqMes))}</strong></span>
      </div>
    </div>`;
  } else if (barMeta) { barMeta.innerHTML = ''; }

  document.getElementById('dash-ultimas').innerHTML=`<h3 style="margin-bottom:14px">Últimas entradas</h3>
    ${ult.length?`<table><thead><tr><th>Data</th><th>Paciente</th><th>Procedimento</th><th style="text-align:right">Valor</th></tr></thead><tbody>
    ${ult.map(r=>`<tr><td>${fmtData(r.data_venda)}</td><td style="font-weight:500">${r.paciente}</td><td>${r.procedimento_nome||'-'}</td><td style="text-align:right;font-weight:600;color:var(--primary)">${fmt(r.valor_bruto)}</td></tr>`).join('')}
    </tbody></table>`:'<div class="empty-state"><p>Nenhuma entrada ainda</p></div>'}`;
}

// ================================================================
// NOVA ENTRADA
// ================================================================
async function pgNovaEntrada() {
  const ct = document.getElementById('content');
  const {procs,profs,usuarios} = APP;
  const efetuadores=[
    ...profs.map(p=>({nome:p.nome,tipo:'Profissional'})),
    ...usuarios.filter(u=>u.perfil==='secretaria').map(u=>({nome:u.nome,tipo:'Secretaria'})),
  ];

  ct.innerHTML=`
    <div style="max-width:680px">
      <form id="form-entrada">
        <div class="card" style="margin-bottom:16px">
          <h3 style="margin-bottom:16px">Dados do atendimento</h3>
          <div class="form-grid cols-2">
            <div class="form-group"><label>Data <span class="required">*</span></label><input type="date" id="f-data" value="${hoje()}" required></div>
            <div class="form-group"><label>Paciente <span class="required">*</span></label><input id="f-paciente" placeholder="Nome da paciente" required></div>
          </div>
          <div class="form-grid cols-2">
            <div class="form-group"><label>Procedimento <span class="required">*</span></label>
              <select id="f-proc" required>
                <option value="">Selecione</option>
                ${procs.map(p=>`<option value="${p.id}" data-nome="${p.nome}">${p.nome}</option>`).join('')}
                <option value="__novo__">+ Cadastrar novo procedimento</option>
              </select>
            </div>
            <div class="form-group"><label>Profissional que realizou <span class="required">*</span></label>
              <select id="f-prof" required>
                <option value="">Selecione</option>
                ${profs.map(p=>`<option value="${p.id}" data-nome="${p.nome}">${p.nome}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="form-grid cols-2">
            <div class="form-group"><label>Quem efetuou a venda</label>
              <select id="f-efetuou">
                <option value="">Selecione</option>
                ${efetuadores.map(e=>`<option value="${e.nome}">${e.nome} (${e.tipo})</option>`).join('')}
              </select>
            </div>
            <div class="form-group"><label>Observações</label><input id="f-obs" placeholder="Opcional"></div>
          </div>
        </div>
        <div class="card" style="margin-bottom:16px">
          <h3 style="margin-bottom:16px">Pagamento</h3>
          <div class="form-grid cols-3">
            <div class="form-group"><label>Forma de Pagamento <span class="required">*</span></label>
              <select id="f-forma" required>
                ${['Pix','Dinheiro','Débito','Crédito 1x','Crédito 2x','Crédito 3x','Crédito 4x','Crédito 5x','Crédito 6x','Crédito 7x','Crédito 8x','Crédito 9x','Crédito 10x','Crédito 11x','Crédito 12x'].map(f=>`<option>${f}</option>`).join('')}
              </select>
            </div>
            <div class="form-group" id="grp-bandeira" style="display:none"><label>Bandeira</label>
              <select id="f-bandeira">
                <option value="">Selecione</option>
                ${['Visa','Mastercard','Amex, Elo, outros'].map(b=>`<option>${b}</option>`).join('')}
              </select>
            </div>
            <div class="form-group"><label>Valor Bruto (R$) <span class="required">*</span></label>
              <input type="number" id="f-valor" step="0.01" min="0.01" placeholder="0,00" required>
            </div>
          </div>
          <div id="preview-pagamento" style="display:none" class="preview-box">
            <div class="preview-grid">
              <div class="preview-item"><div class="pi-label">Taxa</div><div class="pi-value" id="pv-taxa">—</div></div>
              <div class="preview-item"><div class="pi-label">Valor Taxa</div><div class="pi-value" style="color:var(--danger)" id="pv-vtaxa">—</div></div>
              <div class="preview-item"><div class="pi-label">Valor Líquido</div><div class="pi-value" style="color:var(--primary)" id="pv-liq">—</div></div>
            </div>
            <div id="pv-parcelas" style="margin-top:10px"></div>
          </div>
        </div>
        <button type="submit" class="btn btn-primary btn-full" id="btn-salvar-entrada">Lançar Entrada</button>
      </form>
    </div>`;

  const fForma=document.getElementById('f-forma'), fBandeira=document.getElementById('f-bandeira');
  function toggleBandeira(){
    const eh=fForma.value.startsWith('Crédito')||fForma.value==='Débito';
    document.getElementById('grp-bandeira').style.display=eh?'':'none';
    if(!eh)fBandeira.value='';
    atualizarPreview();
  }
  fForma.addEventListener('change',toggleBandeira);
  fBandeira.addEventListener('change',atualizarPreview);
  document.getElementById('f-valor').addEventListener('input',atualizarPreview);
  document.getElementById('f-data').addEventListener('change',atualizarPreview);

  document.getElementById('f-proc').addEventListener('change',async e=>{
    if(e.target.value==='__novo__'){
      e.target.value='';
      openModal(`<div class="modal-header"><h3>Novo Procedimento</h3><button class="btn btn-icon" onclick="closeModal()">${Icons.close}</button></div>
        <div class="modal-body"><div class="form-group"><label>Nome</label><input id="m-proc-nome" placeholder="Ex: Skinbooster" autofocus></div></div>
        <div class="modal-footer"><button class="btn btn-secondary" onclick="closeModal()">Cancelar</button><button class="btn btn-primary" onclick="salvarNovoProcedimento()">Salvar</button></div>`);
      setTimeout(()=>document.getElementById('m-proc-nome')?.focus(),100);
    }
  });

  function atualizarPreview(){
    const valor=parseFloat(document.getElementById('f-valor').value);
    if(!valor||valor<=0){document.getElementById('preview-pagamento').style.display='none';return;}
    const forma=fForma.value, bandeira=fBandeira.value||null, data=document.getElementById('f-data').value;
    const taxa=buscarTaxa(forma,bandeira), vTaxa=Math.round(valor*taxa*100)/100, liquido=Math.round((valor-vTaxa)*100)/100;
    const n=nParcelas(forma), antecip=ehParcelado(forma)&&data<MARCO;
    document.getElementById('preview-pagamento').style.display='';
    document.getElementById('pv-taxa').textContent=fmtPct(taxa);
    document.getElementById('pv-vtaxa').textContent=fmt(vTaxa);
    document.getElementById('pv-liq').textContent=fmt(liquido);
    document.getElementById('pv-parcelas').innerHTML=n>1
      ?`<span class="badge ${antecip?'badge-orange':'badge-green'}">${n}x · ${antecip?'Com antecipação — total entra no mês da venda':`Sem antecipação — ${n} parcelas mensais a partir do mês seguinte`}</span>`:'';
  }

  document.getElementById('form-entrada').addEventListener('submit',async e=>{
    e.preventDefault();
    const btn=document.getElementById('btn-salvar-entrada');
    btn.innerHTML=spinnerHTML; btn.disabled=true;
    const forma=fForma.value, bandeira=fBandeira.value||null, data=document.getElementById('f-data').value;
    const valor=parseFloat(document.getElementById('f-valor').value);
    const taxa=buscarTaxa(forma,bandeira), vTaxa=Math.round(valor*taxa*100)/100, liquido=Math.round((valor-vTaxa)*100)/100;
    const procOpt=document.getElementById('f-proc'), profOpt=document.getElementById('f-prof');
    const {error}=await sb.from('entradas').insert({
      data_venda:data, paciente:document.getElementById('f-paciente').value.trim(),
      procedimento_id:procOpt.value||null,
      procedimento_nome:procOpt.options[procOpt.selectedIndex]?.dataset.nome||procOpt.options[procOpt.selectedIndex]?.text||'',
      profissional_id:profOpt.value||null,
      profissional_nome:profOpt.options[profOpt.selectedIndex]?.dataset.nome||profOpt.options[profOpt.selectedIndex]?.text||'',
      efetuou_venda:document.getElementById('f-efetuou').value||null,
      forma, bandeira, valor_bruto:valor, taxa_pct:taxa, valor_taxa:vTaxa, valor_liquido:liquido,
      antecipacao:ehParcelado(forma)&&data<MARCO,
      observacoes:document.getElementById('f-obs').value||null,
      lancado_por:APP.user.id,
    });
    if(error){toast('Erro ao salvar: '+error.message,'error');}
    else{
      toast('Entrada lançada com sucesso!');
      document.getElementById('f-paciente').value=''; document.getElementById('f-proc').value='';
      document.getElementById('f-valor').value=''; document.getElementById('f-obs').value='';
      document.getElementById('preview-pagamento').style.display='none';
    }
    btn.innerHTML='Lançar Entrada'; btn.disabled=false;
  });
}

window.salvarNovoProcedimento=async function(){
  const nome=document.getElementById('m-proc-nome')?.value?.trim();
  if(!nome)return toast('Digite o nome','warning');
  const {data,error}=await sb.from('procedimentos').insert({nome}).select().single();
  if(error)return toast('Erro: '+error.message,'error');
  toast('Procedimento cadastrado!'); APP.procs.push(data); closeModal();
  const sel=document.getElementById('f-proc');
  if(sel){const opt=document.createElement('option');opt.value=data.id;opt.dataset.nome=data.nome;opt.text=data.nome;opt.selected=true;sel.insertBefore(opt,sel.querySelector('option[value="__novo__"]'));}
};

// ================================================================
// SAÍDA DO DIA (Secretaria)
// ================================================================
async function pgSaidaDia(){
  const ct=document.getElementById('content');
  const cats=['Lanche / Alimentação','Limpeza / Higiene','Estacionamento / Capina','Material de escritório','Transporte / Uber','Outros - pequenas despesas'];
  ct.innerHTML=`
    <div style="max-width:580px">
      <div class="card">
        <h3 style="margin-bottom:4px">Saída do Dia a Dia</h3>
        <p style="font-size:13px;margin-bottom:16px">Lanches, limpeza, estacionamento, capina, materiais pequenos.</p>
        <form id="form-saida-dia">
          <div class="form-grid cols-2">
            <div class="form-group"><label>Data <span class="required">*</span></label><input type="date" id="sd-data" value="${hoje()}" required></div>
            <div class="form-group"><label>Categoria <span class="required">*</span></label>
              <select id="sd-cat" required><option value="">Selecione</option>${cats.map(c=>`<option>${c}</option>`).join('')}</select>
            </div>
          </div>
          <div class="form-grid"><div class="form-group"><label>Descrição <span class="required">*</span></label><input id="sd-desc" placeholder="Ex: Lanche — pão de queijo" required></div></div>
          <div class="form-grid cols-3">
            <div class="form-group"><label>Valor (R$) <span class="required">*</span></label><input type="number" id="sd-valor" step="0.01" min="0.01" placeholder="0,00" required></div>
            <div class="form-group"><label>Forma de Pag.</label>
              <select id="sd-forma"><option>Pix</option><option>Dinheiro</option><option>Cartão Débito</option><option>Cartão Crédito</option></select>
            </div>
            <div class="form-group"><label>Quem pagou</label><input id="sd-quem" placeholder="Ex: Amanda"></div>
          </div>
          <div class="form-grid"><div class="form-group"><label>Observações</label><input id="sd-obs" placeholder="Opcional"></div></div>
          <button type="submit" class="btn btn-primary btn-full" id="btn-sd">Registrar Saída</button>
        </form>
      </div>
    </div>`;
  document.getElementById('form-saida-dia').addEventListener('submit',async e=>{
    e.preventDefault();
    const btn=document.getElementById('btn-sd'); btn.innerHTML=spinnerHTML; btn.disabled=true;
    const {error}=await sb.from('saidas_secretaria').insert({
      data_saida:document.getElementById('sd-data').value,
      categoria:document.getElementById('sd-cat').value,
      descricao:document.getElementById('sd-desc').value.trim(),
      valor:parseFloat(document.getElementById('sd-valor').value),
      forma_pag:document.getElementById('sd-forma').value,
      quem_pagou:document.getElementById('sd-quem').value||null,
      observacoes:document.getElementById('sd-obs').value||null,
      lancado_por:APP.user.id,
    });
    if(error)toast('Erro: '+error.message,'error');
    else{toast('Saída registrada!');e.target.reset();document.getElementById('sd-data').value=hoje();}
    btn.innerHTML='Registrar Saída'; btn.disabled=false;
  });
}

// ================================================================
// SAÍDA COMPLETA (Gestora)
// ================================================================
async function pgSaidaCompleta(){
  const ct=document.getElementById('content');
  const cats_dre=['CMV / Insumos','Despesas com Pessoal','Despesas Administrativas','Despesas com Vendas','Impostos e Obrigações','Despesas Financeiras','Outros'];
  ct.innerHTML=`
    <div style="max-width:680px">
      <div class="card">
        <h3 style="margin-bottom:4px">Saída Completa</h3>
        <p style="font-size:13px;margin-bottom:16px">Fornecedores, pessoal, impostos, marketing e demais despesas.</p>
        <form id="form-saida">
          <div class="form-grid cols-2">
            <div class="form-group"><label>Data <span class="required">*</span></label><input type="date" id="s-data" value="${hoje()}" required></div>
            <div class="form-group"><label>Categoria DRE <span class="required">*</span></label>
              <select id="s-dre" required><option value="">Selecione</option>${cats_dre.map(c=>`<option>${c}</option>`).join('')}</select>
            </div>
          </div>
          <div class="form-grid cols-2">
            <div class="form-group"><label>Categoria Original</label><input id="s-cat" placeholder="Ex: FORNECEDORES / INSUMOS"></div>
            <div class="form-group"><label>Tipo</label><select id="s-tipo"><option>Variável</option><option>Fixo</option></select></div>
          </div>
          <div class="form-grid"><div class="form-group"><label>Descrição / Fornecedor <span class="required">*</span></label><input id="s-desc" placeholder="Ex: INNOVAPHARMA BRASIL" required></div></div>
          <div class="form-grid cols-3">
            <div class="form-group"><label>Valor (R$) <span class="required">*</span></label><input type="number" id="s-valor" step="0.01" min="0.01" placeholder="0,00" required></div>
            <div class="form-group"><label>Forma Pag.</label><input id="s-forma" placeholder="Pix, Boleto..."></div>
            <div class="form-group"><label>Banco</label><input id="s-banco" placeholder="BB" value="BB"></div>
          </div>
          <div class="form-grid"><div class="form-group"><label>Observações</label><input id="s-obs" placeholder="Opcional"></div></div>
          <button type="submit" class="btn btn-primary btn-full" id="btn-s">Lançar Saída</button>
        </form>
      </div>
    </div>`;
  document.getElementById('form-saida').addEventListener('submit',async e=>{
    e.preventDefault();
    const btn=document.getElementById('btn-s'); btn.innerHTML=spinnerHTML; btn.disabled=true;
    const {error}=await sb.from('saidas').insert({
      data_saida:document.getElementById('s-data').value,
      categoria:document.getElementById('s-cat').value||document.getElementById('s-dre').value,
      categoria_dre:document.getElementById('s-dre').value,
      descricao:document.getElementById('s-desc').value.trim(),
      valor:parseFloat(document.getElementById('s-valor').value),
      forma_pag:document.getElementById('s-forma').value||null,
      banco:document.getElementById('s-banco').value||null,
      tipo:document.getElementById('s-tipo').value,
      observacoes:document.getElementById('s-obs').value||null,
      lancado_por:APP.user.id,
    });
    if(error)toast('Erro: '+error.message,'error');
    else{toast('Saída lançada!');e.target.reset();document.getElementById('s-data').value=hoje();document.getElementById('s-banco').value='BB';}
    btn.innerHTML='Lançar Saída'; btn.disabled=false;
  });
}

// ================================================================
// ENTRADAS — Secretaria vê todas, pode editar as suas
// ================================================================
async function pgEntradas(){
  const ct=document.getElementById('content');
  const isGestora=APP.user.perfil==='gestora';
  ct.innerHTML=`
    <div class="page-header">
      <h2>Entradas</h2>
      <div class="page-header-actions">
        ${isGestora?`<button class="btn btn-secondary btn-sm" onclick="exportarEntradas()">${Icons.export} Exportar CSV</button>`:''}
        <button class="btn btn-secondary btn-sm no-print" onclick="window.print()">${Icons.print} Imprimir</button>
      </div>
    </div>
    <div class="filter-bar">
      <input type="month" id="fil-mes" value="${mesAtual()}" style="width:160px">
      <input id="fil-busca" placeholder="Buscar paciente ou procedimento..." style="flex:1;min-width:180px">
      <select id="fil-prof" style="width:150px"><option value="">Todos profissionais</option>${APP.profs.map(p=>`<option>${p.nome}</option>`).join('')}</select>
      <button class="btn btn-primary btn-sm" onclick="carregarEntradas()">Filtrar</button>
    </div>
    <div class="metrics-grid" id="ent-totais" style="grid-template-columns:repeat(3,1fr);margin-bottom:16px"></div>
    <div class="card" style="padding:0" id="ent-tabela"><div style="text-align:center;padding:40px"><span class="spinner dark"></span></div></div>`;
  await carregarEntradas();
  document.getElementById('fil-busca').addEventListener('input',carregarEntradas);
}

window.carregarEntradas=async function(){
  const mes=document.getElementById('fil-mes')?.value||mesAtual();
  const busca=(document.getElementById('fil-busca')?.value||'').toLowerCase();
  const prof=document.getElementById('fil-prof')?.value||'';
  const isGestora=APP.user.perfil==='gestora';

  let q=sb.from('entradas').select('*').gte('data_venda',inicioMes(mes)).lte('data_venda',fimMes(mes)).order('data_venda',{ascending:false});
  if(prof)q=q.eq('profissional_nome',prof);
  const {data,error}=await q;
  if(error){toast('Erro ao carregar: '+error.message,'error');return;}

  let rows=data||[];
  if(busca)rows=rows.filter(r=>(r.paciente||'').toLowerCase().includes(busca)||(r.procedimento_nome||'').toLowerCase().includes(busca));

  const totBruto=rows.reduce((s,r)=>s+Number(r.valor_bruto),0);
  const totLiq=rows.reduce((s,r)=>s+Number(r.valor_liquido),0);
  const totTaxa=rows.reduce((s,r)=>s+Number(r.valor_taxa),0);

  // Secretaria: total de forma discreta (menor, sem destaque exagerado)
  const metricasTotais = isGestora
    ? [
        {label:'Total Bruto',val:fmt(totBruto),sub:`${rows.length} lançamentos`,cls:''},
        {label:'Total Líquido',val:fmt(totLiq),sub:'Após taxas',cls:'info'},
        {label:'Total Taxas',val:fmt(totTaxa),sub:'Pago à operadora',cls:'danger'},
      ]
    : [
        {label:'Entradas do período',val:fmt(totBruto),sub:`${rows.length} lançamentos`,cls:''},
      ];

  const mTotais=document.getElementById('ent-totais');
  if(mTotais) mTotais.innerHTML=metricasTotais.map(c=>`<div class="metric-card ${c.cls}" style="${!isGestora?'opacity:.8;max-width:240px':''}">
    <div class="metric-label">${c.label}</div>
    <div class="metric-value" style="${!isGestora?'font-size:16px':''}">${c.val}</div>
    <div class="metric-sub">${c.sub}</div>
  </div>`).join('');

  const tbl=document.getElementById('ent-tabela');
  if(!tbl)return;
  tbl.innerHTML=rows.length?`
    <div class="table-wrapper"><table>
      <thead><tr>
        <th>Data</th><th>Paciente</th><th>Procedimento</th><th>Profissional</th><th>Efetuou Venda</th><th>Forma</th>
        <th style="text-align:right">Bruto</th>${isGestora?`<th style="text-align:right">Taxa</th><th style="text-align:right">Líquido</th>`:''}
        <th>Parcelas</th><th>Ações</th>
      </tr></thead>
      <tbody>${rows.map(r=>{
        const podeEditar=isGestora||(APP.user.perfil==='secretaria'&&r.lancado_por===APP.user.id);
        return`<tr>
          <td>${fmtData(r.data_venda)}</td>
          <td style="font-weight:500">${r.paciente}</td>
          <td>${r.procedimento_nome||'-'}</td>
          <td>${r.profissional_nome||'-'}</td>
          <td>${r.efetuou_venda||'-'}</td>
          <td><span class="badge badge-blue">${r.forma}</span></td>
          <td style="text-align:right">${fmt(r.valor_bruto)}</td>
          ${isGestora?`<td style="text-align:right;color:var(--danger)">${fmtPct(r.taxa_pct)}</td><td style="text-align:right;font-weight:700;color:var(--primary)">${fmt(r.valor_liquido)}</td>`:''}
          <td>${r.n_parcelas>1?`<span class="badge ${r.antecipacao?'badge-orange':'badge-green'}">${r.n_parcelas}x ${r.antecipacao?'antecip.':'s/ antecip.'}</span>`:'-'}</td>
          <td>${podeEditar?`<button class="btn btn-secondary btn-sm" onclick="editarEntrada('${r.id}')">${Icons.edit}</button>`:'-'}</td>
        </tr>`;
      }).join('')}</tbody>
      ${isGestora?`<tfoot><tr><td colspan="6" style="font-weight:700">TOTAL</td><td style="text-align:right">${fmt(totBruto)}</td><td style="text-align:right;color:var(--danger)">${fmt(totTaxa)}</td><td style="text-align:right;color:var(--primary)">${fmt(totLiq)}</td><td colspan="2"></td></tr></tfoot>`:''}
    </table></div>`:'<div class="empty-state"><p>Nenhuma entrada encontrada</p></div>';
};

window.editarEntrada=async function(id){
  const {data:r}=await sb.from('entradas').select('*').eq('id',id).single();
  if(!r)return toast('Entrada não encontrada','error');
  const {procs,profs,usuarios}=APP;
  const efetuadores=[...profs.map(p=>({nome:p.nome,tipo:'Profissional'})),...usuarios.filter(u=>u.perfil==='secretaria').map(u=>({nome:u.nome,tipo:'Secretaria'}))];
  openModal(`
    <div class="modal-header"><h3>Editar Entrada</h3><button class="btn btn-icon" onclick="closeModal()">${Icons.close}</button></div>
    <div class="modal-body">
      <div class="form-grid cols-2">
        <div class="form-group"><label>Data</label><input type="date" id="ee-data" value="${r.data_venda}"></div>
        <div class="form-group"><label>Paciente</label><input id="ee-paciente" value="${r.paciente}"></div>
      </div>
      <div class="form-grid cols-2">
        <div class="form-group"><label>Procedimento</label>
          <select id="ee-proc">
            <option value="">Selecione</option>
            ${procs.map(p=>`<option value="${p.id}" data-nome="${p.nome}" ${r.procedimento_id==p.id?'selected':''}>${p.nome}</option>`).join('')}
          </select>
        </div>
        <div class="form-group"><label>Profissional</label>
          <select id="ee-prof">
            <option value="">Selecione</option>
            ${profs.map(p=>`<option value="${p.id}" data-nome="${p.nome}" ${r.profissional_id==p.id?'selected':''}>${p.nome}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-grid cols-2">
        <div class="form-group"><label>Quem efetuou a venda</label>
          <select id="ee-efetuou">
            <option value="">Selecione</option>
            ${efetuadores.map(e=>`<option value="${e.nome}" ${r.efetuou_venda===e.nome?'selected':''}>${e.nome} (${e.tipo})</option>`).join('')}
          </select>
        </div>
        <div class="form-group"><label>Observações</label><input id="ee-obs" value="${r.observacoes||''}"></div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-primary" onclick="salvarEdicaoEntrada('${id}')">Salvar</button>
    </div>`);
};

window.salvarEdicaoEntrada=async function(id){
  const procOpt=document.getElementById('ee-proc'), profOpt=document.getElementById('ee-prof');
  const {error}=await sb.from('entradas').update({
    data_venda:document.getElementById('ee-data').value,
    paciente:document.getElementById('ee-paciente').value.trim(),
    procedimento_id:procOpt.value||null,
    procedimento_nome:procOpt.options[procOpt.selectedIndex]?.dataset.nome||'',
    profissional_id:profOpt.value||null,
    profissional_nome:profOpt.options[profOpt.selectedIndex]?.dataset.nome||'',
    efetuou_venda:document.getElementById('ee-efetuou').value||null,
    observacoes:document.getElementById('ee-obs').value||null,
  }).eq('id',id);
  if(error)return toast('Erro: '+error.message,'error');
  toast('Entrada atualizada!'); closeModal(); carregarEntradas();
};

window.exportarEntradas=async function(){
  const mes=document.getElementById('fil-mes')?.value||mesAtual();
  const {data}=await sb.from('entradas').select('*').gte('data_venda',inicioMes(mes)).lte('data_venda',fimMes(mes)).order('data_venda',{ascending:false});
  const cols=['data_venda','paciente','procedimento_nome','profissional_nome','efetuou_venda','forma','bandeira','valor_bruto','taxa_pct','valor_taxa','valor_liquido','n_parcelas','antecipacao','observacoes'];
  const csv=[cols.join(';'),...(data||[]).map(r=>cols.map(c=>String(r[c]??'').replace(/;/g,',')).join(';'))].join('\n');
  const a=document.createElement('a');a.href='data:text/csv;charset=utf-8,'+encodeURIComponent(csv);a.download=`entradas_${mes}.csv`;a.click();
};

// ================================================================
// SAÍDAS SECRETARIA — vê e edita apenas as suas
// ================================================================
async function pgSaidasSecretaria(){
  const ct=document.getElementById('content');
  ct.innerHTML=`
    <div class="page-header"><h2>Minhas Saídas</h2></div>
    <div class="filter-bar">
      <input type="month" id="ss-mes" value="${mesAtual()}" style="width:160px">
      <button class="btn btn-primary btn-sm" onclick="carregarSaidasSec()">Filtrar</button>
    </div>
    <div class="card" style="padding:0" id="ss-tabela"><div style="text-align:center;padding:40px"><span class="spinner dark"></span></div></div>`;
  await carregarSaidasSec();
}

window.carregarSaidasSec=async function(){
  const mes=document.getElementById('ss-mes')?.value||mesAtual();
  const {data,error}=await sb.from('saidas_secretaria').select('*')
    .gte('data_saida',inicioMes(mes)).lte('data_saida',fimMes(mes))
    .eq('lancado_por',APP.user.id).order('data_saida',{ascending:false});
  if(error){toast('Erro: '+error.message,'error');return;}
  const rows=data||[];
  const total=rows.reduce((s,r)=>s+Number(r.valor),0);
  const tbl=document.getElementById('ss-tabela');
  tbl.innerHTML=`
    <div style="padding:14px 16px;background:var(--gray1);display:flex;justify-content:space-between;align-items:center">
      <span style="font-size:13px;color:var(--gray4)">${rows.length} registros</span>
      <span style="font-weight:700;color:var(--danger)">Total: ${fmt(total)}</span>
    </div>
    ${rows.length?`<div class="table-wrapper"><table>
      <thead><tr><th>Data</th><th>Categoria</th><th>Descrição</th><th style="text-align:right">Valor</th><th>Forma</th><th>Ações</th></tr></thead>
      <tbody>${rows.map(r=>`<tr>
        <td>${fmtData(r.data_saida)}</td>
        <td><span class="badge badge-gray">${r.categoria}</span></td>
        <td>${r.descricao}</td>
        <td style="text-align:right;color:var(--danger);font-weight:600">${fmt(r.valor)}</td>
        <td>${r.forma_pag||'-'}</td>
        <td><button class="btn btn-secondary btn-sm" onclick="editarSaidaSec('${r.id}')">${Icons.edit}</button></td>
      </tr>`).join('')}</tbody>
    </table></div>`:'<div class="empty-state"><p>Nenhuma saída registrada neste período</p></div>'}`;
};

window.editarSaidaSec=async function(id){
  const {data:r}=await sb.from('saidas_secretaria').select('*').eq('id',id).single();
  if(!r)return;
  const cats=['Lanche / Alimentação','Limpeza / Higiene','Estacionamento / Capina','Material de escritório','Transporte / Uber','Outros - pequenas despesas'];
  openModal(`
    <div class="modal-header"><h3>Editar Saída</h3><button class="btn btn-icon" onclick="closeModal()">${Icons.close}</button></div>
    <div class="modal-body">
      <div class="form-grid cols-2">
        <div class="form-group"><label>Data</label><input type="date" id="es-data" value="${r.data_saida}"></div>
        <div class="form-group"><label>Categoria</label>
          <select id="es-cat">${cats.map(c=>`<option ${r.categoria===c?'selected':''}>${c}</option>`).join('')}</select>
        </div>
      </div>
      <div class="form-grid"><div class="form-group"><label>Descrição</label><input id="es-desc" value="${r.descricao}"></div></div>
      <div class="form-grid cols-2">
        <div class="form-group"><label>Valor (R$)</label><input type="number" id="es-valor" step="0.01" value="${r.valor}"></div>
        <div class="form-group"><label>Forma</label><input id="es-forma" value="${r.forma_pag||''}"></div>
      </div>
      <div class="form-grid"><div class="form-group"><label>Observações</label><input id="es-obs" value="${r.observacoes||''}"></div></div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-primary" onclick="salvarEdicaoSaidaSec('${id}')">Salvar</button>
    </div>`);
};

window.salvarEdicaoSaidaSec=async function(id){
  const {error}=await sb.from('saidas_secretaria').update({
    data_saida:document.getElementById('es-data').value,
    categoria:document.getElementById('es-cat').value,
    descricao:document.getElementById('es-desc').value.trim(),
    valor:parseFloat(document.getElementById('es-valor').value),
    forma_pag:document.getElementById('es-forma').value||null,
    observacoes:document.getElementById('es-obs').value||null,
  }).eq('id',id);
  if(error)return toast('Erro: '+error.message,'error');
  toast('Saída atualizada!'); closeModal(); carregarSaidasSec();
};

// ================================================================
// FLUXO, DRE, RECEBÍVEIS (igual v2)
// ================================================================
async function pgFluxo(){
  const ct=document.getElementById('content');
  ct.innerHTML=`
    <div class="page-header">
      <div><h2>Fluxo de Caixa Real</h2><p style="font-size:13px">Jan/2026: antecipação · A partir de 04/02/2026: parcelas mês a mês</p></div>
      <button class="btn btn-secondary btn-sm no-print" onclick="window.print()">${Icons.print} Imprimir</button>
    </div>
    <div class="card" style="padding:0;margin-bottom:16px" id="fluxo-tabela"><div style="text-align:center;padding:40px"><span class="spinner dark"></span></div></div>
    <div class="card"><h3 style="margin-bottom:14px">Evolução do Saldo Acumulado</h3><canvas id="chart-saldo" height="80"></canvas></div>`;
  const {data,error}=await sb.from('vw_fluxo_caixa').select('*').gte('mes','2026-01-01').lte('mes','2026-12-31').order('mes');
  if(error){toast('Erro: '+error.message,'error');return;}
  const rows=data||[]; let saldoAcum=0;
  const rowsS=rows.map(r=>{saldoAcum+=Number(r.resultado||0);return{...r,saldo_acum:saldoAcum};});
  document.getElementById('fluxo-tabela').innerHTML=`<div class="table-wrapper"><table>
    <thead><tr><th>Mês</th><th style="text-align:right">Vista</th><th style="text-align:right">Antecip.</th><th style="text-align:right">Parcelas</th><th style="text-align:right">Total Entradas</th><th style="text-align:right">Taxas</th><th style="text-align:right">Saídas</th><th style="text-align:right">Resultado</th><th style="text-align:right">Saldo Acum.</th></tr></thead>
    <tbody>${rowsS.map(r=>{const res=Number(r.resultado||0),sal=Number(r.saldo_acum||0);return`<tr>
      <td style="font-weight:600">${mesLabel(r.mes)}</td>
      <td style="text-align:right;color:var(--info)">${fmt(r.entrada_vista)}</td>
      <td style="text-align:right;color:var(--warning)">${Number(r.entrada_antecip)>0?fmt(r.entrada_antecip):'-'}</td>
      <td style="text-align:right;color:var(--primary)">${Number(r.entrada_parcelas)>0?fmt(r.entrada_parcelas):'-'}</td>
      <td style="text-align:right;font-weight:700;color:var(--primary)">${fmt(r.total_entradas)}</td>
      <td style="text-align:right;color:var(--danger)">${Number(r.total_taxas)>0?fmt(r.total_taxas):'-'}</td>
      <td style="text-align:right;color:var(--danger);font-weight:500">${Number(r.total_saidas)>0?fmt(r.total_saidas):'-'}</td>
      <td style="text-align:right;font-weight:800;color:${res>=0?'var(--primary)':'var(--danger)'}">${fmt(res)}</td>
      <td style="text-align:right;font-weight:600;color:${sal>=0?'var(--info)':'var(--danger)'}">${fmt(sal)}</td>
    </tr>`;}).join('')}</tbody>
    <tfoot><tr><td style="font-weight:700">TOTAL</td>
      ${['entrada_vista','entrada_antecip','entrada_parcelas','total_entradas','total_taxas','total_saidas'].map(k=>`<td style="text-align:right">${fmt(rows.reduce((s,r)=>s+Number(r[k]||0),0))}</td>`).join('')}
      <td style="text-align:right;font-weight:800">${fmt(rows.reduce((s,r)=>s+Number(r.resultado||0),0))}</td><td></td>
    </tr></tfoot>
  </table></div>`;
  if(rowsS.length) new Chart(document.getElementById('chart-saldo'),{type:'line',data:{labels:rowsS.map(r=>mesLabel(r.mes)),datasets:[{label:'Saldo Acumulado',data:rowsS.map(r=>r.saldo_acum),borderColor:'#1B4F72',backgroundColor:'rgba(27,79,114,.08)',fill:true,tension:.35,pointRadius:5,pointBackgroundColor:rowsS.map(r=>r.saldo_acum>=0?'#117A65':'#922B21')}]},options:{responsive:true,plugins:{legend:{display:false}},scales:{y:{ticks:{callback:v=>fmt(v)},grid:{color:'#F0F0F0'}}}}});
}

async function pgDRE(){
  const ct=document.getElementById('content');
  ct.innerHTML=`
    <div class="page-header">
      <div><h2>DRE — Demonstrativo de Resultado</h2><p style="font-size:13px">Grupos conforme o contador Alan César Freitas – Mentor 5G Company</p></div>
      <button class="btn btn-secondary btn-sm no-print" onclick="window.print()">${Icons.print} Imprimir</button>
    </div>
    <div class="card" style="padding:0;overflow:auto" id="dre-tabela"><div style="text-align:center;padding:40px"><span class="spinner dark"></span></div></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:16px">
      <div class="card"><h3 style="margin-bottom:14px">Composição das Saídas</h3><div style="max-height:260px;display:flex;align-items:center;justify-content:center"><canvas id="chart-dre-pizza"></canvas></div></div>
      <div class="card"><h3 style="margin-bottom:14px">CMV vs Resultado</h3><canvas id="chart-dre-bar" height="120"></canvas></div>
    </div>`;
  const {data}=await sb.from('vw_fluxo_caixa').select('*').gte('mes','2026-01-01').lte('mes','2026-12-31').order('mes');
  const rows=data||[], meses_cols=rows.map(r=>mesLabel(r.mes));
  const linhas=[
    {l:'(+) RECEITA BRUTA',fn:r=>r.total_entradas,bold:true,bg:'var(--primary-light)',cor:'var(--primary-dark)'},
    {l:'   Entradas à vista',fn:r=>Number(r.total_entradas)-Number(r.entrada_antecip||0)-Number(r.entrada_parcelas||0),indent:true},
    {l:'   Cartão c/ antecip.',fn:r=>r.entrada_antecip||0,indent:true,cor:'var(--warning)'},
    {l:'   Cartão s/ antecip.',fn:r=>r.entrada_parcelas||0,indent:true,cor:'var(--primary)'},
    {l:'(-) Taxas de cartão',fn:r=>-r.total_taxas,cor:'var(--danger)'},
    {l:'(=) RECEITA LÍQUIDA',fn:r=>Number(r.total_entradas)-Number(r.total_taxas),bold:true,bg:'var(--gray1)'},
    {l:'(-) CMV — Insumos',fn:r=>-r.cmv,cor:'var(--danger)',indent:true},
    {l:'(=) LUCRO BRUTO',fn:r=>Number(r.total_entradas)-Number(r.total_taxas)-Number(r.cmv),bold:true,bg:'var(--gray1)'},
    {l:'(-) Desp. Pessoal',fn:r=>-r.pessoal,cor:'var(--danger)',indent:true},
    {l:'(-) Desp. Administrativas',fn:r=>-r.administrativo,cor:'var(--danger)',indent:true},
    {l:'(-) Desp. Vendas/Mktg',fn:r=>-r.vendas,cor:'var(--danger)',indent:true},
    {l:'(-) Impostos',fn:r=>-r.impostos,cor:'var(--danger)',indent:true},
    {l:'(-) Desp. Financeiras',fn:r=>-r.financeiro,cor:'var(--danger)',indent:true},
    {l:'(-) Saídas Secretaria',fn:r=>-(r.saidas_secretaria||0),cor:'var(--danger)',indent:true},
    {l:'(=) RESULTADO / EBITDA',fn:r=>r.resultado,bold:true,bg:'var(--info-light)',cor:'var(--info)'},
  ];
  document.getElementById('dre-tabela').innerHTML=`<table style="min-width:900px">
    <thead><tr><th style="min-width:220px">Conta</th>${meses_cols.map(m=>`<th style="text-align:right;min-width:110px">${m}</th>`).join('')}<th style="text-align:right;border-left:2px solid var(--gray2)">Total</th></tr></thead>
    <tbody>${linhas.map(linha=>`<tr style="background:${linha.bg||'transparent'}">
      <td style="font-weight:${linha.bold?700:400};padding-left:${linha.indent?28:14}px;color:${linha.cor||'inherit'};font-size:${linha.bold?14:13}px">${linha.l}</td>
      ${rows.map(r=>{const v=Number(linha.fn(r)||0);return`<td style="text-align:right;font-weight:${linha.bold?700:400};color:${linha.cor||(v<0?'var(--danger)':'inherit')};font-size:${linha.bold?14:13}px">${Math.abs(v)>0.01?fmt(v):'-'}</td>`;}).join('')}
      <td style="text-align:right;font-weight:700;border-left:2px solid var(--gray2);color:${linha.cor||'inherit'}">${fmt(rows.reduce((s,r)=>s+Number(linha.fn(r)||0),0))}</td>
    </tr>`).join('')}</tbody></table>`;
  const totS={CMV:0,Pessoal:0,Admin:0,Vendas:0,Impostos:0,Financeiro:0};
  rows.forEach(r=>{totS.CMV+=Number(r.cmv||0);totS.Pessoal+=Number(r.pessoal||0);totS.Admin+=Number(r.administrativo||0);totS.Vendas+=Number(r.vendas||0);totS.Impostos+=Number(r.impostos||0);totS.Financeiro+=Number(r.financeiro||0);});
  new Chart(document.getElementById('chart-dre-pizza'),{type:'doughnut',data:{labels:Object.keys(totS),datasets:[{data:Object.values(totS),backgroundColor:['#E57373','#64B5F6','#FFD54F','#81C784','#CE93D8','#80DEEA'],borderWidth:2}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'right'}}}});
  new Chart(document.getElementById('chart-dre-bar'),{type:'bar',data:{labels:meses_cols,datasets:[{label:'CMV',data:rows.map(r=>r.cmv||0),backgroundColor:'#E57373',borderRadius:3},{label:'Resultado',data:rows.map(r=>r.resultado||0),backgroundColor:'#64B5F6',borderRadius:3}]},options:{responsive:true,plugins:{legend:{position:'bottom'}},scales:{y:{ticks:{callback:v=>fmt(v)},grid:{color:'#F0F0F0'}}}}});
}

async function pgRecebiveis(){
  const ct=document.getElementById('content');
  ct.innerHTML=`<div class="page-header"><div><h2>Recebíveis Futuros</h2><p style="font-size:13px">Parcelas de cartão a receber (sem antecipação – a partir de 04/02/2026)</p></div></div>
    <div id="recv-content"><div style="text-align:center;padding:40px"><span class="spinner dark"></span></div></div>`;
  const {data}=await sb.from('parcelas').select('*,entradas(paciente,forma,profissional_nome,data_venda)').gte('data_venc',hoje()).order('data_venc').limit(300);
  const rows=data||[], porMes={};
  rows.forEach(r=>{const m=r.data_venc?.slice(0,7);if(!porMes[m]){porMes[m]={total:0,rows:[]};}porMes[m].total+=Number(r.valor);porMes[m].rows.push(r);});
  const totalGeral=rows.reduce((s,r)=>s+Number(r.valor),0);
  document.getElementById('recv-content').innerHTML=`
    <div class="metrics-grid" style="grid-template-columns:repeat(2,1fr);margin-bottom:20px">
      <div class="metric-card"><div class="metric-label">Total a receber</div><div class="metric-value">${fmt(totalGeral)}</div><div class="metric-sub">${rows.length} parcelas</div></div>
      <div class="metric-card info"><div class="metric-label">Meses projetados</div><div class="metric-value">${Object.keys(porMes).length}</div></div>
    </div>
    ${Object.entries(porMes).map(([mes,d])=>`<div class="card" style="margin-bottom:14px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px"><h3>${mesLabel(mes+'-01')}</h3><span style="font-weight:700;color:var(--primary);font-size:16px">${fmt(d.total)}</span></div>
      <div class="table-wrapper"><table><thead><tr><th>Paciente</th><th>Profissional</th><th>Forma</th><th style="text-align:right">Vencimento</th><th style="text-align:right">Valor</th><th style="text-align:right">Parcela</th></tr></thead>
      <tbody>${d.rows.map(p=>`<tr><td style="font-weight:500">${p.entradas?.paciente||'-'}</td><td>${p.entradas?.profissional_nome||'-'}</td><td><span class="badge badge-blue">${p.entradas?.forma||'-'}</span></td><td style="text-align:right">${fmtData(p.data_venc)}</td><td style="text-align:right;font-weight:700;color:var(--primary)">${fmt(p.valor)}</td><td style="text-align:right"><span class="badge badge-green">${p.numero}/${p.total}</span></td></tr>`).join('')}</tbody>
      </table></div></div>`).join('')}
    ${!Object.keys(porMes).length?'<div class="empty-state"><p>Nenhum recebível futuro</p></div>':''}`;
}

// ================================================================
// ADMIN — inclui cadastro de usuário com criação via Auth API
// ================================================================
async function pgAdmin(){
  document.getElementById('content').innerHTML=`
    <h2 style="margin-bottom:20px">Administração</h2>
    <div class="tabs">
      <button class="tab-btn active" onclick="abaAdmin('usuarios',this)">Usuários / Logins</button>
      <button class="tab-btn" onclick="abaAdmin('profissionais',this)">Profissionais</button>
      <button class="tab-btn" onclick="abaAdmin('procedimentos',this)">Procedimentos</button>
    </div>
    <div id="admin-content"></div>`;
  abaAdmin('usuarios',document.querySelector('.tab-btn.active'));
}

window.abaAdmin=function(aba,btn){
  document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  ({usuarios:adminUsuarios,profissionais:adminProfissionais,procedimentos:adminProcedimentos})[aba]();
};

async function adminUsuarios(){
  const ct=document.getElementById('admin-content');
  ct.innerHTML='<div style="text-align:center;padding:40px"><span class="spinner dark"></span></div>';
  const {data}=await sb.from('usuarios').select('*').order('nome');
  ct.innerHTML=`
    <div style="margin-bottom:16px">
      <div style="background:var(--info-light);border-radius:8px;padding:12px 16px;font-size:13px;color:var(--info);margin-bottom:12px">
        <strong>Como funciona:</strong> Preencha o formulário abaixo com nome, e-mail e senha da funcionária. O sistema cria o acesso automaticamente e registra o perfil dela.
      </div>
      <div class="card" style="margin-bottom:16px">
        <h3 style="margin-bottom:4px">Cadastrar nova funcionária</h3>
        <p style="font-size:13px;margin-bottom:16px">Preencha os dados abaixo. O acesso é criado automaticamente — ela já pode entrar no sistema com o e-mail e senha definidos aqui.</p>
        <div class="form-grid cols-2">
          <div class="form-group"><label>Nome completo <span class="required">*</span></label><input id="nu-nome" placeholder="Ex: Amanda Silva" autocomplete="off"></div>
          <div class="form-group"><label>Perfil de acesso <span class="required">*</span></label>
            <select id="nu-perfil">
              <option value="secretaria">Secretaria</option>
              <option value="gestora">Gestora (acesso total)</option>
              <option value="contador">Contador (somente leitura)</option>
            </select>
          </div>
        </div>
        <div class="form-grid cols-2">
          <div class="form-group"><label>E-mail de acesso <span class="required">*</span></label><input type="email" id="nu-email" placeholder="amanda@suaclinica.com.br" autocomplete="off"></div>
          <div class="form-group">
            <label>Senha de acesso <span class="required">*</span></label>
            <div style="position:relative">
              <input type="password" id="nu-senha" placeholder="Mínimo 6 caracteres" autocomplete="new-password" style="padding-right:44px">
              <button type="button" onclick="toggleSenha()" style="position:absolute;right:10px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:var(--gray4);padding:4px" title="Mostrar/ocultar senha">
                <svg id="ico-olho" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              </button>
            </div>
            <p style="font-size:11px;color:var(--gray3);margin-top:4px">Comunique a senha à funcionária após o cadastro</p>
          </div>
        </div>
        <button class="btn btn-primary" id="btn-criar-usuario" onclick="criarUsuario()" style="min-width:160px">Criar acesso</button>
      </div>
    </div>
    <h3 style="margin-bottom:12px">Usuários cadastrados</h3>
    <div class="card" style="padding:0"><div class="table-wrapper"><table>
      <thead><tr><th>Nome</th><th>Perfil</th><th>Status</th><th>Ações</th></tr></thead>
      <tbody>${(data||[]).map(u=>`<tr>
        <td><div style="display:flex;align-items:center;gap:8px">
          <div style="width:30px;height:30px;border-radius:50%;background:var(--primary-light);color:var(--primary);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:11px;flex-shrink:0">${initials(u.nome)}</div>
          ${u.nome}
        </div></td>
        <td><span class="badge ${u.perfil==='gestora'?'badge-green':u.perfil==='contador'?'badge-blue':'badge-gray'}">${u.perfil}</span></td>
        <td><span class="badge ${u.ativo?'badge-green':'badge-red'}">${u.ativo?'Ativo':'Inativo'}</span></td>
        <td><button class="btn btn-secondary btn-sm" onclick="modalEditarUsuario('${u.id}','${u.nome}','${u.perfil}',${u.ativo})">${Icons.edit} Editar</button></td>
      </tr>`).join('')}</tbody>
    </table></div></div>`;
}

window.criarUsuario=async function(){
  const nome=document.getElementById('nu-nome')?.value?.trim();
  const email=document.getElementById('nu-email')?.value?.trim();
  const senha=document.getElementById('nu-senha')?.value;
  const perfil=document.getElementById('nu-perfil')?.value;

  if(!nome||!email||!senha)return toast('Preencha todos os campos obrigatórios','warning');
  if(senha.length<6)return toast('A senha deve ter pelo menos 6 caracteres','warning');

  const btn=document.getElementById('btn-criar-usuario');
  btn.innerHTML=spinnerHTML; btn.disabled=true;

  try {
    // Usar Edge Function com service role — funciona em qualquer plano
    const { data: { session } } = await sb.auth.getSession();
    const res = await fetch(
      `${SUPABASE_URL}/functions/v1/criar-usuario`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': SUPABASE_ANON,
        },
        body: JSON.stringify({ nome, email, senha, perfil }),
      }
    );
    const result = await res.json();

    if (!res.ok || result.error) {
      toast(result.error || 'Erro ao criar usuário', 'error');
    } else {
      toast(`Acesso criado para ${nome}! Ela já pode entrar no sistema.`);
      document.getElementById('nu-nome').value='';
      document.getElementById('nu-email').value='';
      document.getElementById('nu-senha').value='';
      await carregarDadosBase();
      adminUsuarios();
    }
  } catch(err) {
    toast('Erro de conexão: '+err.message,'error');
  }

  btn.innerHTML='Criar acesso'; btn.disabled=false;
};



window.modalEditarUsuario=function(id,nome,perfil,ativo){
  openModal(`
    <div class="modal-header"><h3>Editar Usuário</h3><button class="btn btn-icon" onclick="closeModal()">${Icons.close}</button></div>
    <div class="modal-body">
      <div class="form-grid">
        <div class="form-group"><label>Nome</label><input id="eu-nome" value="${nome}"></div>
        <div class="form-group"><label>Perfil</label>
          <select id="eu-perfil">
            <option value="secretaria" ${perfil==='secretaria'?'selected':''}>Secretaria</option>
            <option value="gestora" ${perfil==='gestora'?'selected':''}>Gestora</option>
            <option value="contador" ${perfil==='contador'?'selected':''}>Contador</option>
          </select>
        </div>
        <div class="form-group"><label>Status</label>
          <select id="eu-ativo"><option value="true" ${ativo?'selected':''}>Ativo</option><option value="false" ${!ativo?'selected':''}>Inativo</option></select>
        </div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-primary" onclick="salvarEdicaoUsuario('${id}')">Salvar</button>
    </div>`);
};

window.salvarEdicaoUsuario=async function(id){
  const {error}=await sb.from('usuarios').update({nome:document.getElementById('eu-nome').value.trim(),perfil:document.getElementById('eu-perfil').value,ativo:document.getElementById('eu-ativo').value==='true'}).eq('id',id);
  if(error)return toast('Erro: '+error.message,'error');
  toast('Atualizado!'); closeModal(); await carregarDadosBase(); adminUsuarios();
};

async function adminProfissionais(){
  const ct=document.getElementById('admin-content');
  const {data}=await sb.from('profissionais').select('*').order('nome');
  ct.innerHTML=`<div style="display:flex;justify-content:flex-end;margin-bottom:12px"><button class="btn btn-primary btn-sm" onclick="modalNovoCadastro('profissional')">+ Nova Profissional</button></div>
    <div class="card" style="padding:0"><div class="table-wrapper"><table>
      <thead><tr><th>Nome</th><th>Status</th><th>Ações</th></tr></thead>
      <tbody>${(data||[]).map(p=>`<tr><td style="font-weight:500">${p.nome}</td><td><span class="badge ${p.ativo?'badge-green':'badge-red'}">${p.ativo?'Ativa':'Inativa'}</span></td><td><button class="btn btn-secondary btn-sm" onclick="modalEditarCadastro('profissional','${p.id}','${p.nome}',${p.ativo})">${Icons.edit}</button></td></tr>`).join('')}
      </tbody></table></div></div>`;
}

async function adminProcedimentos(){
  const ct=document.getElementById('admin-content');
  const {data}=await sb.from('procedimentos').select('*').order('nome');
  ct.innerHTML=`<div style="display:flex;justify-content:flex-end;margin-bottom:12px"><button class="btn btn-primary btn-sm" onclick="modalNovoCadastro('procedimento')">+ Novo Procedimento</button></div>
    <div class="card" style="padding:0"><div class="table-wrapper"><table>
      <thead><tr><th>Nome</th><th>Status</th><th>Ações</th></tr></thead>
      <tbody>${(data||[]).map(p=>`<tr><td style="font-weight:500">${p.nome}</td><td><span class="badge ${p.ativo?'badge-green':'badge-red'}">${p.ativo?'Ativo':'Inativo'}</span></td><td><button class="btn btn-secondary btn-sm" onclick="modalEditarCadastro('procedimento','${p.id}','${p.nome}',${p.ativo})">${Icons.edit}</button></td></tr>`).join('')}
      </tbody></table></div></div>`;
}

window.modalNovoCadastro=function(tipo){
  openModal(`<div class="modal-header"><h3>Nova ${tipo==='profissional'?'Profissional':'Procedimento'}</h3><button class="btn btn-icon" onclick="closeModal()">${Icons.close}</button></div>
    <div class="modal-body"><div class="form-group"><label>Nome</label><input id="nc-nome" placeholder="Ex: ${tipo==='profissional'?'Dra. Juliana':'Skinbooster'}" autofocus></div></div>
    <div class="modal-footer"><button class="btn btn-secondary" onclick="closeModal()">Cancelar</button><button class="btn btn-primary" onclick="salvarNovoCadastro('${tipo}')">Salvar</button></div>`);
  setTimeout(()=>document.getElementById('nc-nome')?.focus(),100);
};

window.salvarNovoCadastro=async function(tipo){
  const nome=document.getElementById('nc-nome')?.value?.trim();
  if(!nome)return toast('Digite o nome','warning');
  const {error}=await sb.from(tipo==='profissional'?'profissionais':'procedimentos').insert({nome});
  if(error)return toast('Erro: '+error.message,'error');
  toast('Cadastrado!'); closeModal(); await carregarDadosBase();
  tipo==='profissional'?adminProfissionais():adminProcedimentos();
};

window.modalEditarCadastro=function(tipo,id,nome,ativo){
  openModal(`<div class="modal-header"><h3>Editar</h3><button class="btn btn-icon" onclick="closeModal()">${Icons.close}</button></div>
    <div class="modal-body"><div class="form-grid">
      <div class="form-group"><label>Nome</label><input id="ec-nome" value="${nome}"></div>
      <div class="form-group"><label>Status</label><select id="ec-ativo"><option value="true" ${ativo?'selected':''}>Ativo</option><option value="false" ${!ativo?'selected':''}>Inativo</option></select></div>
    </div></div>
    <div class="modal-footer"><button class="btn btn-secondary" onclick="closeModal()">Cancelar</button><button class="btn btn-primary" onclick="salvarEdicaoCadastro('${tipo}','${id}')">Salvar</button></div>`);
};

window.salvarEdicaoCadastro=async function(tipo,id){
  const {error}=await sb.from(tipo==='profissional'?'profissionais':'procedimentos').update({nome:document.getElementById('ec-nome').value.trim(),ativo:document.getElementById('ec-ativo').value==='true'}).eq('id',id);
  if(error)return toast('Erro: '+error.message,'error');
  toast('Atualizado!'); closeModal(); await carregarDadosBase();
  tipo==='profissional'?adminProfissionais():adminProcedimentos();
};

// ================================================================
// CONFIGURAÇÕES
// ================================================================
const CORES_PRESET=[
  {cor:'#0B5345',nome:'Verde Clínica'},{cor:'#1A237E',nome:'Azul Profundo'},
  {cor:'#880E4F',nome:'Rosa Escuro'},{cor:'#1B5E20',nome:'Verde Floresta'},
  {cor:'#37474F',nome:'Grafite'},{cor:'#4A148C',nome:'Roxo'},
  {cor:'#BF360C',nome:'Terracota'},{cor:'#006064',nome:'Teal'},
];

async function pgConfiguracoes(){
  const cfg=APP.config;
  document.getElementById('content').innerHTML=`
    <h2 style="margin-bottom:20px">Configurações do Sistema</h2>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;align-items:start">
      <div class="card">
        <h3 style="margin-bottom:16px">Identidade visual</h3>
        <div class="form-grid"><div class="form-group"><label>Nome do sistema</label><input id="cfg-nome" value="${cfg.nome||'Clínica Financeiro'}"></div></div>
        <div class="form-group" style="margin-bottom:16px">
          <label>Cor principal</label>
          <div class="color-picker-row">${CORES_PRESET.map(c=>`<div class="color-opt ${cfg.cor_primaria===c.cor?'active':''}" style="background:${c.cor}" title="${c.nome}" onclick="selecionarCor('${c.cor}',this)"></div>`).join('')}</div>
          <div style="display:flex;align-items:center;gap:10px;margin-top:10px">
            <label style="font-size:12px;color:var(--gray4)">Personalizada:</label>
            <input type="color" id="cfg-cor-custom" value="${cfg.cor_primaria||'#0B5345'}" style="width:44px;height:32px;padding:2px;cursor:pointer" oninput="selecionarCorCustom(this.value)">
          </div>
          <input type="hidden" id="cfg-cor" value="${cfg.cor_primaria||'#0B5345'}">
        </div>
        <div class="form-group" style="margin-bottom:16px">
          <label>Logo (URL pública)</label>
          <input id="cfg-logo" placeholder="https://... (JPG, PNG, SVG)" value="${cfg.logo_url||''}">
          <p style="font-size:11px;color:var(--gray3);margin-top:4px">Tamanho recomendado: 100×100px</p>
        </div>
        <button class="btn btn-primary btn-full" onclick="salvarConfig()">Salvar configurações</button>
      </div>
      <div class="card">
        <h3 style="margin-bottom:16px">Prévia</h3>
        <div style="border:1.5px solid var(--gray2);border-radius:8px;overflow:hidden">
          <div id="pv-sidebar-mini" style="background:var(--primary);padding:14px 16px;color:#fff">
            <div style="font-weight:700;font-size:14px" id="pv-nome">${cfg.nome||'Clínica Financeiro'}</div>
            <div style="font-size:11px;opacity:.6;margin-top:2px">Gestora</div>
            <div style="margin-top:12px;display:flex;flex-direction:column;gap:4px">
              ${['Dashboard','Nova Entrada','DRE'].map((m,i)=>`<div style="padding:6px 8px;background:${i===0?'rgba(255,255,255,.18)':'transparent'};border-radius:4px;font-size:12px;border-left:${i===0?'2px solid #fff':'2px solid transparent'}">${m}</div>`).join('')}
            </div>
          </div>
          <div style="padding:12px;background:#EEF1F3">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
              ${['Receita Hoje','Resultado Mês'].map(l=>`<div style="background:#fff;border-radius:6px;padding:10px;border-left:3px solid var(--primary)"><div style="font-size:10px;color:var(--gray4)">${l}</div><div style="font-weight:700;font-size:15px;margin-top:2px">R$ 0,00</div></div>`).join('')}
            </div>
          </div>
        </div>
        <div style="margin-top:14px">
          <h3 style="margin-bottom:12px">Exportação e impressão</h3>
          <div style="display:flex;flex-direction:column;gap:8px">
            <button class="btn btn-outline btn-full" onclick="navigate('fluxo');setTimeout(()=>window.print(),400)">${Icons.print} Imprimir Fluxo de Caixa</button>
            <button class="btn btn-outline btn-full" onclick="navigate('dre');setTimeout(()=>window.print(),400)">${Icons.print} Imprimir DRE</button>
            <button class="btn btn-secondary btn-full" onclick="exportarTodosCSV()">${Icons.export} Exportar todos os dados (CSV)</button>
          </div>
        </div>
      </div>
    </div>`;
}

window.selecionarCor=function(cor,el){
  document.getElementById('cfg-cor').value=cor; document.getElementById('cfg-cor-custom').value=cor;
  document.querySelectorAll('.color-opt').forEach(e=>e.classList.remove('active')); el.classList.add('active');
  aplicarCor(cor); document.getElementById('pv-sidebar-mini').style.background=cor;
};
window.selecionarCorCustom=function(cor){
  document.getElementById('cfg-cor').value=cor; document.querySelectorAll('.color-opt').forEach(e=>e.classList.remove('active'));
  aplicarCor(cor); document.getElementById('pv-sidebar-mini').style.background=cor;
};
window.salvarConfig=async function(){
  const nome=document.getElementById('cfg-nome').value.trim();
  const cor=document.getElementById('cfg-cor').value;
  const logo=document.getElementById('cfg-logo').value.trim()||null;
  const {error}=await sb.from('config_sistema').update({nome,cor_primaria:cor,logo_url:logo,updated_at:new Date().toISOString()}).eq('id',1);
  if(error)return toast('Erro: '+error.message,'error');
  APP.config={...APP.config,nome,cor_primaria:cor,logo_url:logo};
  document.querySelectorAll('.sistema-nome').forEach(e=>e.textContent=nome);
  document.title=nome; document.getElementById('pv-nome').textContent=nome;
  if(logo){document.querySelectorAll('.logo-img').forEach(e=>{e.src=logo;e.style.display='';});document.querySelectorAll('.logo-placeholder').forEach(e=>e.style.display='none');}
  toast('Configurações salvas!');
};
window.exportarTodosCSV=async function(){
  toast('Preparando exportação...','warning');
  const [e,s,ss]=await Promise.all([sb.from('entradas').select('*').order('data_venda'),sb.from('saidas').select('*').order('data_saida'),sb.from('saidas_secretaria').select('*').order('data_saida')]);
  const toCSV=(data,cols)=>[cols.join(';'),...(data||[]).map(r=>cols.map(c=>String(r[c]??'').replace(/;/g,',')).join(';'))].join('\n');
  [{nome:'entradas',data:e.data,cols:['data_venda','paciente','procedimento_nome','profissional_nome','efetuou_venda','forma','bandeira','valor_bruto','taxa_pct','valor_taxa','valor_liquido','n_parcelas','antecipacao']},{nome:'saidas',data:s.data,cols:['data_saida','categoria','categoria_dre','descricao','valor','forma_pag','banco','tipo']},{nome:'saidas_secretaria',data:ss.data,cols:['data_saida','categoria','descricao','valor','forma_pag','quem_pagou']}]
    .forEach(({nome,data,cols})=>{const a=document.createElement('a');a.href='data:text/csv;charset=utf-8,'+encodeURIComponent(toCSV(data,cols));a.download=`${nome}_${hoje()}.csv`;a.click();});
};

// ================================================================
// NOTIFICAÇÕES
// ================================================================
window.APP_NOTIF = { total: 0 };

async function carregarNotificacoes() {
  const { data } = await sb.from('notificacoes')
    .select('*').eq('lida', false)
    .eq('usuario_id', APP.user.id)
    .order('created_at', { ascending: false })
    .limit(20);

  const notifs = data || [];
  APP_NOTIF.total = notifs.length;
  const badge = document.getElementById('notif-badge');
  const lista = document.getElementById('notif-lista');
  if (badge) badge.textContent = notifs.length > 0 ? notifs.length : '';
  if (badge) badge.style.display = notifs.length > 0 ? 'flex' : 'none';
  if (lista) {
    lista.innerHTML = notifs.length === 0
      ? '<div style="padding:20px;text-align:center;color:var(--gray3);font-size:13px">Nenhuma notificação</div>'
      : notifs.map(n => `
        <div style="padding:12px 16px;border-bottom:1px solid var(--gray2);cursor:pointer" onclick="marcarLida('${n.id}','${n.link_page||''}')">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
            <span style="width:8px;height:8px;border-radius:50%;background:${n.tipo==='warning'?'var(--warning)':n.tipo==='success'?'var(--success)':'var(--info)'};flex-shrink:0"></span>
            <span style="font-weight:600;font-size:13px">${n.titulo}</span>
          </div>
          <div style="font-size:12px;color:var(--text2);padding-left:16px">${n.mensagem}</div>
          <div style="font-size:11px;color:var(--gray3);padding-left:16px;margin-top:3px">${new Date(n.created_at).toLocaleDateString('pt-BR')}</div>
        </div>`).join('');
  }
}

window.marcarLida = async function(id, page) {
  await sb.from('notificacoes').update({ lida: true }).eq('id', id);
  toggleNotifPanel();
  await carregarNotificacoes();
  if (page) navigate(page);
};

window.marcarTodasLidas = async function() {
  await sb.from('notificacoes').update({ lida: true }).eq('usuario_id', APP.user.id).eq('lida', false);
  await carregarNotificacoes();
};

window.toggleNotifPanel = function() {
  const panel = document.getElementById('notif-panel');
  if (!panel) return;
  panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
};

// ================================================================
// METAS MENSAIS
// ================================================================
async function pgMetas() {
  const ct = document.getElementById('content');
  ct.innerHTML = `
    <div class="page-header"><h2>Metas Mensais</h2></div>
    <div style="display:grid;grid-template-columns:360px 1fr;gap:20px;align-items:start">

      <!-- FORMULÁRIO -->
      <div class="card">
        <h3 style="margin-bottom:6px">Definir meta do mês</h3>
        <p style="font-size:13px;color:var(--text2);margin-bottom:16px">Escolha o mês e informe quanto quer faturar. Vai aparecer no Dashboard como barra de progresso.</p>
        <div class="form-grid">
          <div class="form-group">
            <label>Mês <span class="required">*</span></label>
            <input type="month" id="meta-mes" value="${mesAtual()}">
          </div>
          <div class="form-group">
            <label>Meta de Receita (R$) <span class="required">*</span></label>
            <input type="number" id="meta-receita" step="100" min="0" placeholder="Ex: 50000">
          </div>
          <div class="form-group">
            <label>Meta de Atendimentos</label>
            <input type="number" id="meta-atend" min="0" placeholder="Ex: 80 (opcional)">
          </div>
        </div>
        <button class="btn btn-primary btn-full" onclick="salvarMeta()" id="btn-meta">Salvar Meta</button>
      </div>

      <!-- LISTA DE METAS -->
      <div id="metas-lista">
        <div style="text-align:center;padding:40px"><span class="spinner dark"></span></div>
      </div>
    </div>`;

  await carregarMetas();
}

window.salvarMeta = async function() {
  const mesVal   = document.getElementById('meta-mes').value;
  const receita  = parseFloat(document.getElementById('meta-receita').value);
  const atend    = parseInt(document.getElementById('meta-atend').value) || 0;
  if (!mesVal || !receita || receita <= 0) return toast('Informe o mês e a meta de receita', 'warning');

  const btn = document.getElementById('btn-meta');
  btn.innerHTML = spinnerHTML; btn.disabled = true;

  const mesDate = mesVal + '-01';
  const { error } = await sb.from('metas').upsert(
    { mes: mesDate, meta_receita: receita, meta_atendimentos: atend, updated_at: new Date().toISOString(), created_by: APP.user.id },
    { onConflict: 'mes' }
  );
  btn.innerHTML = 'Salvar Meta'; btn.disabled = false;

  if (error) return toast('Erro ao salvar: ' + error.message, 'error');
  toast('Meta salva com sucesso!');
  await carregarMetas();
};

async function carregarMetas() {
  const ct = document.getElementById('metas-lista');
  if (!ct) return;
  ct.innerHTML = '<div style="text-align:center;padding:20px"><span class="spinner dark"></span></div>';

  const { data: metas, error } = await sb.from('metas').select('*').order('mes', { ascending: false }).limit(12);
  if (error || !metas?.length) {
    ct.innerHTML = `<div class="card"><div class="empty-state">
      <svg width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24" style="margin-bottom:12px;opacity:.3"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
      <p>Nenhuma meta cadastrada ainda.<br>Use o formulário ao lado para criar a primeira.</p>
    </div></div>`;
    return;
  }

  // Buscar realizado de cada mês em paralelo
  const rows = await Promise.all(metas.map(async meta => {
    const inicio = meta.mes.slice(0, 10);
    const fim    = fimMes(meta.mes.slice(0, 7));
    const { data: ents } = await sb.from('entradas').select('valor_liquido,valor_bruto')
      .gte('data_venda', inicio).lte('data_venda', fim);
    const realizado = ents?.reduce((s, r) => s + Number(r.valor_liquido), 0) || 0;
    const atendimentos = ents?.length || 0;
    const pct = meta.meta_receita > 0 ? Math.min(100, Math.round((realizado / meta.meta_receita) * 100)) : 0;
    return { ...meta, realizado, atendimentos, pct };
  }));

  ct.innerHTML = rows.map(r => {
    const cor = r.pct >= 100 ? 'var(--primary)' : r.pct >= 70 ? '#E67E22' : 'var(--danger)';
    const icone = r.pct >= 100 ? '🎯' : r.pct >= 70 ? '📈' : '⚠️';
    const isMesAtual = r.mes.slice(0, 7) === mesAtual();
    return `<div class="card" style="margin-bottom:14px${isMesAtual ? ';border-left:4px solid var(--primary)' : ''}">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px">
        <div>
          <div style="font-size:12px;color:var(--gray4);font-weight:600;text-transform:uppercase;letter-spacing:.05em">${isMesAtual ? '● Mês atual' : mesLabel(r.mes)}</div>
          <div style="font-size:18px;font-weight:700;margin-top:2px">${isMesAtual ? mesLabel(r.mes) : ''}</div>
        </div>
        <div style="text-align:right">
          <div style="font-size:28px;font-weight:800;color:${cor};line-height:1">${r.pct}%</div>
          <div style="font-size:12px;color:var(--gray3)">da meta</div>
        </div>
      </div>

      <!-- Barra de progresso -->
      <div style="background:var(--gray2);border-radius:20px;height:12px;overflow:hidden;margin-bottom:10px">
        <div style="height:100%;width:${r.pct}%;background:${cor};border-radius:20px;transition:width .6s ease"></div>
      </div>

      <!-- Números -->
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:10px">
        <div style="background:var(--gray1);border-radius:8px;padding:10px">
          <div style="font-size:10px;color:var(--gray4);font-weight:700;text-transform:uppercase;margin-bottom:3px">Realizado</div>
          <div style="font-size:15px;font-weight:700;color:${cor}">${fmt(r.realizado)}</div>
        </div>
        <div style="background:var(--gray1);border-radius:8px;padding:10px">
          <div style="font-size:10px;color:var(--gray4);font-weight:700;text-transform:uppercase;margin-bottom:3px">Meta</div>
          <div style="font-size:15px;font-weight:700">${fmt(r.meta_receita)}</div>
        </div>
        <div style="background:var(--gray1);border-radius:8px;padding:10px">
          <div style="font-size:10px;color:var(--gray4);font-weight:700;text-transform:uppercase;margin-bottom:3px">Faltam</div>
          <div style="font-size:15px;font-weight:700;color:${r.pct >= 100 ? 'var(--primary)' : 'var(--danger)'}">${r.pct >= 100 ? 'Meta atingida!' : fmt(r.meta_receita - r.realizado)}</div>
        </div>
      </div>

      ${r.meta_atendimentos > 0 ? `
      <div style="display:flex;align-items:center;gap:8px;font-size:12px;color:var(--gray4);padding-top:8px;border-top:1px solid var(--gray2)">
        <span>Atendimentos:</span>
        <strong style="color:var(--text)">${r.atendimentos} / ${r.meta_atendimentos}</strong>
        <div style="flex:1;background:var(--gray2);border-radius:10px;height:6px;overflow:hidden">
          <div style="height:100%;width:${Math.min(100, Math.round(r.atendimentos/r.meta_atendimentos*100))}%;background:var(--info);border-radius:10px"></div>
        </div>
        <span>${Math.min(100, Math.round(r.atendimentos/r.meta_atendimentos*100))}%</span>
      </div>` : ''}

      <div style="margin-top:10px;display:flex;gap:8px">
        <button class="btn btn-secondary btn-sm" onclick="editarMeta('${r.mes.slice(0,7)}', ${r.meta_receita}, ${r.meta_atendimentos})">✏️ Editar</button>
      </div>
    </div>`;
  }).join('');
}

window.editarMeta = function(mes, receita, atend) {
  document.getElementById('meta-mes').value    = mes;
  document.getElementById('meta-receita').value = receita;
  document.getElementById('meta-atend').value   = atend || '';
  document.getElementById('meta-mes').scrollIntoView({ behavior: 'smooth' });
  document.getElementById('meta-receita').focus();
  toast('Edite os valores e clique em Salvar Meta', 'warning');
};

// ================================================================
// RELATÓRIO POR PROFISSIONAL
// ================================================================
async function pgRelatorios() {
  const ct = document.getElementById('content');
  ct.innerHTML = `
    <div class="page-header">
      <h2>Relatório por Profissional</h2>
      <button class="btn btn-secondary btn-sm no-print" onclick="window.print()">${Icons.print} Imprimir</button>
    </div>
    <div class="filter-bar">
      <select id="rel-prof" style="width:180px">
        <option value="">Todas as profissionais</option>
        ${APP.profs.map(p => `<option>${p.nome}</option>`).join('')}
      </select>
      <input type="month" id="rel-mes-ini" value="2026-01" style="width:150px">
      <span style="color:var(--gray3);font-size:13px">até</span>
      <input type="month" id="rel-mes-fim" value="${mesAtual()}" style="width:150px">
      <button class="btn btn-primary btn-sm" onclick="carregarRelatorio()">Filtrar</button>
    </div>
    <div id="rel-content">
      <div style="text-align:center;padding:60px"><span class="spinner dark"></span></div>
    </div>`;

  await carregarRelatorio();
}

window.carregarRelatorio = async function() {
  const profFil  = document.getElementById('rel-prof')?.value || '';
  const mesIni   = document.getElementById('rel-mes-ini')?.value || '2026-01';
  const mesFim   = document.getElementById('rel-mes-fim')?.value || mesAtual();
  const dataIni  = inicioMes(mesIni);
  const dataFim  = fimMes(mesFim);

  const ct = document.getElementById('rel-content');
  ct.innerHTML = '<div style="text-align:center;padding:40px"><span class="spinner dark"></span></div>';

  // Buscar entradas do período
  let q = sb.from('entradas').select('*')
    .gte('data_venda', dataIni).lte('data_venda', dataFim)
    .order('data_venda', { ascending: false });
  if (profFil) q = q.eq('profissional_nome', profFil);
  const { data: entradas, error } = await q;
  if (error) { toast('Erro: ' + error.message, 'error'); return; }

  const rows = entradas || [];
  if (!rows.length) {
    ct.innerHTML = '<div class="card"><div class="empty-state"><p>Nenhuma entrada encontrada no período</p></div></div>';
    return;
  }

  // Agrupar por profissional
  const porProf = {};
  rows.forEach(r => {
    const nome = r.profissional_nome || 'Não informado';
    if (!porProf[nome]) porProf[nome] = { receita_bruta: 0, receita_liq: 0, taxas: 0, atend: 0, proc: {}, formas: {} };
    const p = porProf[nome];
    p.receita_bruta += Number(r.valor_bruto);
    p.receita_liq   += Number(r.valor_liquido);
    p.taxas         += Number(r.valor_taxa);
    p.atend++;
    p.proc[r.procedimento_nome || 'Outro'] = (p.proc[r.procedimento_nome || 'Outro'] || 0) + 1;
    p.formas[r.forma] = (p.formas[r.forma] || 0) + 1;
  });

  // Totais gerais
  const totBruto = rows.reduce((s, r) => s + Number(r.valor_bruto), 0);
  const totLiq   = rows.reduce((s, r) => s + Number(r.valor_liquido), 0);
  const totAtend = rows.length;

  // Agrupar por mês e profissional para os gráficos
  const mesesSet = [...new Set(rows.map(r => r.data_venda.slice(0, 7)))].sort();
  const profNomes = Object.keys(porProf);
  const CORES = ['#117A65', '#1B4F72', '#8E44AD', '#D35400', '#C0392B'];

  ct.innerHTML = `
    <!-- Cards totais gerais -->
    <div class="metrics-grid" style="margin-bottom:20px">
      <div class="metric-card"><div class="metric-label">Total de entradas</div><div class="metric-value">${fmt(totBruto)}</div><div class="metric-sub">${totAtend} atendimentos</div></div>
      <div class="metric-card info"><div class="metric-label">Total líquido</div><div class="metric-value">${fmt(totLiq)}</div><div class="metric-sub">Após taxas</div></div>
      <div class="metric-card"><div class="metric-label">Ticket médio geral</div><div class="metric-value">${fmt(totLiq / totAtend)}</div><div class="metric-sub">Por atendimento</div></div>
    </div>

    <!-- Cards por profissional -->
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;margin-bottom:20px">
      ${profNomes.map((nome, i) => {
        const p = porProf[nome];
        const ticket = p.atend ? p.receita_liq / p.atend : 0;
        const pct = totLiq > 0 ? Math.round(p.receita_liq / totLiq * 100) : 0;
        const topProc = Object.entries(p.proc).sort((a,b) => b[1]-a[1])[0];
        return `<div class="card" style="border-left:4px solid ${CORES[i % CORES.length]}">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
            <div style="width:36px;height:36px;border-radius:50%;background:${CORES[i%CORES.length]}22;color:${CORES[i%CORES.length]};display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;flex-shrink:0">${initials(nome)}</div>
            <div>
              <div style="font-weight:700;font-size:14px">${nome}</div>
              <div style="font-size:11px;color:var(--gray3)">${pct}% do total</div>
            </div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
            <div style="background:var(--gray1);border-radius:6px;padding:8px">
              <div style="font-size:10px;color:var(--gray4);text-transform:uppercase;font-weight:700">Líquido</div>
              <div style="font-weight:800;font-size:15px;color:${CORES[i%CORES.length]}">${fmt(p.receita_liq)}</div>
            </div>
            <div style="background:var(--gray1);border-radius:6px;padding:8px">
              <div style="font-size:10px;color:var(--gray4);text-transform:uppercase;font-weight:700">Atend.</div>
              <div style="font-weight:800;font-size:15px">${p.atend}</div>
            </div>
            <div style="background:var(--gray1);border-radius:6px;padding:8px">
              <div style="font-size:10px;color:var(--gray4);text-transform:uppercase;font-weight:700">Ticket</div>
              <div style="font-weight:700;font-size:13px">${fmt(ticket)}</div>
            </div>
            <div style="background:var(--gray1);border-radius:6px;padding:8px">
              <div style="font-size:10px;color:var(--gray4);text-transform:uppercase;font-weight:700">Top proc.</div>
              <div style="font-weight:700;font-size:11px;color:var(--text2)">${topProc ? topProc[0].slice(0,14) : '-'}</div>
            </div>
          </div>
        </div>`;
      }).join('')}
    </div>

    <!-- Gráficos -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px">
      <div class="card">
        <h3 style="margin-bottom:14px">Receita líquida por profissional</h3>
        <canvas id="chart-prof-barras" height="200"></canvas>
      </div>
      <div class="card">
        <h3 style="margin-bottom:14px">Participação no faturamento</h3>
        <div style="max-height:200px;display:flex;align-items:center;justify-content:center">
          <canvas id="chart-prof-pizza"></canvas>
        </div>
      </div>
    </div>

    <!-- Tabela detalhada por procedimento -->
    <div class="card" style="padding:0">
      <div style="padding:14px 16px;font-weight:600;border-bottom:1px solid var(--gray2);display:flex;justify-content:space-between;align-items:center">
        <span>Procedimentos realizados no período</span>
      </div>
      <div class="table-wrapper"><table>
        <thead><tr><th>Procedimento</th>${profNomes.map(n => `<th style="text-align:right">${n}</th>`).join('')}<th style="text-align:right">Total</th></tr></thead>
        <tbody>${(() => {
          const todosProcs = [...new Set(rows.map(r => r.procedimento_nome || 'Outro'))].sort();
          return todosProcs.map(proc => {
            const countPorProf = profNomes.map(nome => {
              const ents = rows.filter(r => (r.procedimento_nome || 'Outro') === proc && r.profissional_nome === nome);
              return ents.length;
            });
            const total = countPorProf.reduce((s, v) => s + v, 0);
            if (total === 0) return '';
            return `<tr>
              <td style="font-weight:500">${proc}</td>
              ${countPorProf.map(c => `<td style="text-align:right">${c > 0 ? `<span class="badge badge-blue">${c}</span>` : '-'}</td>`).join('')}
              <td style="text-align:right;font-weight:700">${total}</td>
            </tr>`;
          }).join('');
        })()}</tbody>
      </table></div>
    </div>`;

  // Gráfico de barras por mês e profissional
  const dadosPorMes = mesesSet.map(m => {
    const obj = { mes: mesLabel(m + '-01') };
    profNomes.forEach(nome => {
      obj[nome] = rows.filter(r => r.data_venda.slice(0, 7) === m && r.profissional_nome === nome)
        .reduce((s, r) => s + Number(r.valor_liquido), 0);
    });
    return obj;
  });

  new Chart(document.getElementById('chart-prof-barras'), {
    type: 'bar',
    data: {
      labels: dadosPorMes.map(d => d.mes),
      datasets: profNomes.map((nome, i) => ({
        label: nome,
        data: dadosPorMes.map(d => d[nome] || 0),
        backgroundColor: CORES[i % CORES.length],
        borderRadius: 4,
      })),
    },
    options: {
      responsive: true,
      plugins: { legend: { position: 'bottom' } },
      scales: { y: { ticks: { callback: v => fmt(v) }, grid: { color: '#F0F0F0' } } },
    },
  });

  // Pizza por profissional
  new Chart(document.getElementById('chart-prof-pizza'), {
    type: 'doughnut',
    data: {
      labels: profNomes,
      datasets: [{ data: profNomes.map(n => porProf[n].receita_liq), backgroundColor: CORES, borderWidth: 3 }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { position: 'right' },
        tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${fmt(ctx.raw)} (${Math.round(ctx.raw / totLiq * 100)}%)` } },
      },
    },
  });
};

// ================================================================
// NOTIFICAÇÕES
// ================================================================
window.APP_NOTIF = { total: 0 };

async function carregarNotificacoes() {
  const { data } = await sb.from('notificacoes')
    .select('*').eq('lida', false)
    .eq('usuario_id', APP.user.id)
    .order('created_at', { ascending: false })
    .limit(20);

  const notifs = data || [];
  APP_NOTIF.total = notifs.length;
  const badge = document.getElementById('notif-badge');
  const lista = document.getElementById('notif-lista');
  if (badge) badge.textContent = notifs.length > 0 ? notifs.length : '';
  if (badge) badge.style.display = notifs.length > 0 ? 'flex' : 'none';
  if (lista) {
    lista.innerHTML = notifs.length === 0
      ? '<div style="padding:20px;text-align:center;color:var(--gray3);font-size:13px">Nenhuma notificação</div>'
      : notifs.map(n => `
        <div style="padding:12px 16px;border-bottom:1px solid var(--gray2);cursor:pointer" onclick="marcarLida('${n.id}','${n.link_page||''}')">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
            <span style="width:8px;height:8px;border-radius:50%;background:${n.tipo==='warning'?'var(--warning)':n.tipo==='success'?'var(--success)':'var(--info)'};flex-shrink:0"></span>
            <span style="font-weight:600;font-size:13px">${n.titulo}</span>
          </div>
          <div style="font-size:12px;color:var(--text2);padding-left:16px">${n.mensagem}</div>
          <div style="font-size:11px;color:var(--gray3);padding-left:16px;margin-top:3px">${new Date(n.created_at).toLocaleDateString('pt-BR')}</div>
        </div>`).join('');
  }
}

window.marcarLida = async function(id, page) {
  await sb.from('notificacoes').update({ lida: true }).eq('id', id);
  toggleNotifPanel();
  await carregarNotificacoes();
  if (page) navigate(page);
};

window.marcarTodasLidas = async function() {
  await sb.from('notificacoes').update({ lida: true }).eq('usuario_id', APP.user.id).eq('lida', false);
  await carregarNotificacoes();
};

window.toggleNotifPanel = function() {
  const panel = document.getElementById('notif-panel');
  if (!panel) return;
  panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
};

// ================================================================
// METAS MENSAIS
// ================================================================
async function pgMetas() {
  const ct = document.getElementById('content');
  ct.innerHTML = `
    <div class="page-header"><h2>Metas Mensais</h2></div>
    <div style="display:grid;grid-template-columns:360px 1fr;gap:20px;align-items:start">

      <!-- FORMULÁRIO -->
      <div class="card">
        <h3 style="margin-bottom:6px">Definir meta do mês</h3>
        <p style="font-size:13px;color:var(--text2);margin-bottom:16px">Escolha o mês e informe quanto quer faturar. Vai aparecer no Dashboard como barra de progresso.</p>
        <div class="form-grid">
          <div class="form-group">
            <label>Mês <span class="required">*</span></label>
            <input type="month" id="meta-mes" value="${mesAtual()}">
          </div>
          <div class="form-group">
            <label>Meta de Receita (R$) <span class="required">*</span></label>
            <input type="number" id="meta-receita" step="100" min="0" placeholder="Ex: 50000">
          </div>
          <div class="form-group">
            <label>Meta de Atendimentos</label>
            <input type="number" id="meta-atend" min="0" placeholder="Ex: 80 (opcional)">
          </div>
        </div>
        <button class="btn btn-primary btn-full" onclick="salvarMeta()" id="btn-meta">Salvar Meta</button>
      </div>

      <!-- LISTA DE METAS -->
      <div id="metas-lista">
        <div style="text-align:center;padding:40px"><span class="spinner dark"></span></div>
      </div>
    </div>`;

  await carregarMetas();
}

window.salvarMeta = async function() {
  const mesVal   = document.getElementById('meta-mes').value;
  const receita  = parseFloat(document.getElementById('meta-receita').value);
  const atend    = parseInt(document.getElementById('meta-atend').value) || 0;
  if (!mesVal || !receita || receita <= 0) return toast('Informe o mês e a meta de receita', 'warning');

  const btn = document.getElementById('btn-meta');
  btn.innerHTML = spinnerHTML; btn.disabled = true;

  const mesDate = mesVal + '-01';
  const { error } = await sb.from('metas').upsert(
    { mes: mesDate, meta_receita: receita, meta_atendimentos: atend, updated_at: new Date().toISOString(), created_by: APP.user.id },
    { onConflict: 'mes' }
  );
  btn.innerHTML = 'Salvar Meta'; btn.disabled = false;

  if (error) return toast('Erro ao salvar: ' + error.message, 'error');
  toast('Meta salva com sucesso!');
  await carregarMetas();
};

async function carregarMetas() {
  const ct = document.getElementById('metas-lista');
  if (!ct) return;
  ct.innerHTML = '<div style="text-align:center;padding:20px"><span class="spinner dark"></span></div>';

  const { data: metas, error } = await sb.from('metas').select('*').order('mes', { ascending: false }).limit(12);
  if (error || !metas?.length) {
    ct.innerHTML = `<div class="card"><div class="empty-state">
      <svg width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24" style="margin-bottom:12px;opacity:.3"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
      <p>Nenhuma meta cadastrada ainda.<br>Use o formulário ao lado para criar a primeira.</p>
    </div></div>`;
    return;
  }

  // Buscar realizado de cada mês em paralelo
  const rows = await Promise.all(metas.map(async meta => {
    const inicio = meta.mes.slice(0, 10);
    const fim    = fimMes(meta.mes.slice(0, 7));
    const { data: ents } = await sb.from('entradas').select('valor_liquido,valor_bruto')
      .gte('data_venda', inicio).lte('data_venda', fim);
    const realizado = ents?.reduce((s, r) => s + Number(r.valor_liquido), 0) || 0;
    const atendimentos = ents?.length || 0;
    const pct = meta.meta_receita > 0 ? Math.min(100, Math.round((realizado / meta.meta_receita) * 100)) : 0;
    return { ...meta, realizado, atendimentos, pct };
  }));

  ct.innerHTML = rows.map(r => {
    const cor = r.pct >= 100 ? 'var(--primary)' : r.pct >= 70 ? '#E67E22' : 'var(--danger)';
    const icone = r.pct >= 100 ? '🎯' : r.pct >= 70 ? '📈' : '⚠️';
    const isMesAtual = r.mes.slice(0, 7) === mesAtual();
    return `<div class="card" style="margin-bottom:14px${isMesAtual ? ';border-left:4px solid var(--primary)' : ''}">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px">
        <div>
          <div style="font-size:12px;color:var(--gray4);font-weight:600;text-transform:uppercase;letter-spacing:.05em">${isMesAtual ? '● Mês atual' : mesLabel(r.mes)}</div>
          <div style="font-size:18px;font-weight:700;margin-top:2px">${isMesAtual ? mesLabel(r.mes) : ''}</div>
        </div>
        <div style="text-align:right">
          <div style="font-size:28px;font-weight:800;color:${cor};line-height:1">${r.pct}%</div>
          <div style="font-size:12px;color:var(--gray3)">da meta</div>
        </div>
      </div>

      <!-- Barra de progresso -->
      <div style="background:var(--gray2);border-radius:20px;height:12px;overflow:hidden;margin-bottom:10px">
        <div style="height:100%;width:${r.pct}%;background:${cor};border-radius:20px;transition:width .6s ease"></div>
      </div>

      <!-- Números -->
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:10px">
        <div style="background:var(--gray1);border-radius:8px;padding:10px">
          <div style="font-size:10px;color:var(--gray4);font-weight:700;text-transform:uppercase;margin-bottom:3px">Realizado</div>
          <div style="font-size:15px;font-weight:700;color:${cor}">${fmt(r.realizado)}</div>
        </div>
        <div style="background:var(--gray1);border-radius:8px;padding:10px">
          <div style="font-size:10px;color:var(--gray4);font-weight:700;text-transform:uppercase;margin-bottom:3px">Meta</div>
          <div style="font-size:15px;font-weight:700">${fmt(r.meta_receita)}</div>
        </div>
        <div style="background:var(--gray1);border-radius:8px;padding:10px">
          <div style="font-size:10px;color:var(--gray4);font-weight:700;text-transform:uppercase;margin-bottom:3px">Faltam</div>
          <div style="font-size:15px;font-weight:700;color:${r.pct >= 100 ? 'var(--primary)' : 'var(--danger)'}">${r.pct >= 100 ? 'Meta atingida!' : fmt(r.meta_receita - r.realizado)}</div>
        </div>
      </div>

      ${r.meta_atendimentos > 0 ? `
      <div style="display:flex;align-items:center;gap:8px;font-size:12px;color:var(--gray4);padding-top:8px;border-top:1px solid var(--gray2)">
        <span>Atendimentos:</span>
        <strong style="color:var(--text)">${r.atendimentos} / ${r.meta_atendimentos}</strong>
        <div style="flex:1;background:var(--gray2);border-radius:10px;height:6px;overflow:hidden">
          <div style="height:100%;width:${Math.min(100, Math.round(r.atendimentos/r.meta_atendimentos*100))}%;background:var(--info);border-radius:10px"></div>
        </div>
        <span>${Math.min(100, Math.round(r.atendimentos/r.meta_atendimentos*100))}%</span>
      </div>` : ''}

      <div style="margin-top:10px;display:flex;gap:8px">
        <button class="btn btn-secondary btn-sm" onclick="editarMeta('${r.mes.slice(0,7)}', ${r.meta_receita}, ${r.meta_atendimentos})">✏️ Editar</button>
      </div>
    </div>`;
  }).join('');
}

window.editarMeta = function(mes, receita, atend) {
  document.getElementById('meta-mes').value    = mes;
  document.getElementById('meta-receita').value = receita;
  document.getElementById('meta-atend').value   = atend || '';
  document.getElementById('meta-mes').scrollIntoView({ behavior: 'smooth' });
  document.getElementById('meta-receita').focus();
  toast('Edite os valores e clique em Salvar Meta', 'warning');
};

// ================================================================
// RELATÓRIO POR PROFISSIONAL
// ================================================================
async function pgRelatorios() {
  const ct = document.getElementById('content');
  ct.innerHTML = `
    <div class="page-header">
      <h2>Relatório por Profissional</h2>
      <button class="btn btn-secondary btn-sm no-print" onclick="window.print()">${Icons.print} Imprimir</button>
    </div>
    <div class="filter-bar">
      <select id="rel-prof" style="width:180px">
        <option value="">Todas as profissionais</option>
        ${APP.profs.map(p => `<option>${p.nome}</option>`).join('')}
      </select>
      <select id="rel-ano" style="width:120px"><option value="2026">2026</option></select>
      <button class="btn btn-primary btn-sm" onclick="carregarRelatorio()">Filtrar</button>
    </div>
    <div id="rel-content"><div style="text-align:center;padding:40px"><span class="spinner dark"></span></div></div>`;
  await carregarRelatorio();
}

window.carregarRelatorio = async function() {
  const prof = document.getElementById('rel-prof')?.value || '';
  let q = sb.from('vw_relatorio_profissional').select('*');
  if (prof) q = q.eq('profissional_nome', prof);
  const { data, error } = await q.order('mes', { ascending: false });
  if (error) { toast('Erro: ' + error.message, 'error'); return; }
  const rows = data || [];

  // Totais por profissional
  const totais = {};
  rows.forEach(r => {
    if (!totais[r.profissional_nome]) totais[r.profissional_nome] = { receita: 0, atend: 0, taxa: 0 };
    totais[r.profissional_nome].receita += Number(r.receita_liquida);
    totais[r.profissional_nome].atend   += Number(r.total_atendimentos);
    totais[r.profissional_nome].taxa    += Number(r.total_taxas);
  });

  // Procedimentos mais feitos
  const { data: procs } = await sb.from('vw_relatorio_procedimentos').select('*').limit(50);

  const ct = document.getElementById('rel-content');
  ct.innerHTML = `
    <div class="metrics-grid" style="margin-bottom:20px">
      ${Object.entries(totais).map(([nome, t]) => `
        <div class="metric-card">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
            <div style="width:32px;height:32px;border-radius:50%;background:var(--primary-light);color:var(--primary);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px">${initials(nome)}</div>
            <div class="metric-label" style="margin:0">${nome}</div>
          </div>
          <div class="metric-value">${fmt(t.receita)}</div>
          <div class="metric-sub">${t.atend} atendimentos · ticket ${fmt(t.receita/t.atend)}</div>
        </div>`).join('')}
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px">
      <div class="card"><h3 style="margin-bottom:14px">Receita por profissional</h3>
        <canvas id="chart-rel-prof" height="160"></canvas></div>
      <div class="card"><h3 style="margin-bottom:14px">Top procedimentos</h3>
        <canvas id="chart-rel-proc" height="160"></canvas></div>
    </div>

    <div class="card" style="padding:0;margin-bottom:16px">
      <div style="padding:14px 16px;font-weight:600;border-bottom:1px solid var(--gray2)">Detalhamento mensal</div>
      <div class="table-wrapper"><table>
        <thead><tr><th>Mês</th><th>Profissional</th><th style="text-align:right">Atendimentos</th><th style="text-align:right">Receita Bruta</th><th style="text-align:right">Receita Líquida</th><th style="text-align:right">Ticket Médio</th><th style="text-align:right">Parceladas</th></tr></thead>
        <tbody>${rows.map(r => `<tr>
          <td style="font-weight:500">${mesLabel(r.mes)}</td>
          <td><div style="display:flex;align-items:center;gap:6px">
            <div style="width:24px;height:24px;border-radius:50%;background:var(--primary-light);color:var(--primary);display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700">${initials(r.profissional_nome)}</div>
            ${r.profissional_nome}
          </div></td>
          <td style="text-align:right;font-weight:600">${r.total_atendimentos}</td>
          <td style="text-align:right">${fmt(r.receita_bruta)}</td>
          <td style="text-align:right;font-weight:700;color:var(--primary)">${fmt(r.receita_liquida)}</td>
          <td style="text-align:right">${fmt(r.ticket_medio)}</td>
          <td style="text-align:right"><span class="badge badge-blue">${r.vendas_parceladas}</span></td>
        </tr>`).join('')}</tbody>
      </table></div>
    </div>`;

  // Gráfico por profissional
  const profNomes = [...new Set(rows.map(r => r.profissional_nome))];
  const mesesUniq = [...new Set(rows.map(r => mesLabel(r.mes)))].reverse();
  const CORES_PROF = ['#117A65', '#1B4F72', '#8E44AD', '#D35400'];
  new Chart(document.getElementById('chart-rel-prof'), {
    type: 'bar',
    data: {
      labels: mesesUniq,
      datasets: profNomes.map((nome, i) => ({
        label: nome,
        data: mesesUniq.map(m => {
          const row = rows.find(r => mesLabel(r.mes) === m && r.profissional_nome === nome);
          return row ? Number(row.receita_liquida) : 0;
        }),
        backgroundColor: CORES_PROF[i % CORES_PROF.length],
        borderRadius: 4,
      })),
    },
    options: { responsive: true, plugins: { legend: { position: 'bottom' } }, scales: { y: { ticks: { callback: v => fmt(v) }, stacked: false } } },
  });

  // Gráfico procedimentos
  const procTotais = {};
  (procs || []).forEach(p => { procTotais[p.procedimento_nome] = (procTotais[p.procedimento_nome] || 0) + Number(p.total); });
  const sortedProcs = Object.entries(procTotais).sort((a, b) => b[1] - a[1]).slice(0, 8);
  new Chart(document.getElementById('chart-rel-proc'), {
    type: 'bar',
    data: {
      labels: sortedProcs.map(p => p[0]),
      datasets: [{ label: 'Qtd', data: sortedProcs.map(p => p[1]), backgroundColor: '#1B4F72', borderRadius: 4 }],
    },
    options: { indexAxis: 'y', responsive: true, plugins: { legend: { display: false } }, scales: { x: { ticks: { stepSize: 1 } } } },
  });
};
