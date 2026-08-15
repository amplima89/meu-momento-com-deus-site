"use strict";
(async()=>{
  let d=await MMCD.carregar();
  if(window.MemoryConfigReady) await window.MemoryConfigReady;
  const memoryConfig=window.MemoryConfig;
  const EXT_KEY="memory_metas_ext_v69";
  let extState={versao:1,itens:{}};
  if(memoryConfig){
    try{
      const saved=await memoryConfig.read(EXT_KEY,{versao:1,itens:{}});
      extState={versao:1,itens:saved?.itens&&typeof saved.itens==="object"?saved.itens:{}};
    }catch(error){console.warn("Metas: extensões de programação indisponíveis.",error)}
  }

  const $=s=>document.querySelector(s);
  const days=['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
  const levels={facil:'Fácil',medio:'Médio',dificil:'Difícil'};

  function extFor(id){return extState.itens?.[id]||{}}
  function mergeExtensions(){
    for(const meta of d.metas||[]){
      const extra=extFor(meta.id);
      if(extra&&typeof extra==="object") Object.assign(meta,extra);
      if(!meta.modoProgramacao) meta.modoProgramacao='dias';
      if(meta.modoProgramacao==='semanal_flexivel'){
        meta.frequencia='semanal';
        meta.metaSemanal=Math.max(1,Number(meta.metaSemanal||meta.quantidade||1));
      }
      if(meta.modoProgramacao==='mensal_flexivel'){
        meta.frequencia='mensal';
        meta.metaMensal=Math.max(1,Number(meta.metaMensal||meta.quantidade||1));
      }
    }
  }
  mergeExtensions();

  async function saveExtensions(){
    if(!memoryConfig) return;
    extState.atualizadoEm=new Date().toISOString();
    await memoryConfig.write(EXT_KEY,extState);
  }

  function setExtension(meta){
    extState.itens||={};
    extState.itens[meta.id]={
      modoProgramacao:meta.modoProgramacao||'dias',
      metaSemanal:Math.max(1,Number(meta.metaSemanal||meta.quantidade||1)),
      metaMensal:Math.max(1,Number(meta.metaMensal||meta.quantidade||1)),
      frequencia:meta.frequencia||'diaria',
      associadaTreinoFisico:meta.associadaTreinoFisico===true,
      associacaoTreinoTipo:'musculacao'
    };
  }

  function refreshWorkoutIntegration(){
    const card=document.querySelector('.workout-integration-card');
    if(card) card.classList.toggle('is-enabled',Boolean($('#goal-workout-link')?.checked));
  }

  $('#weekdays').innerHTML=days.map((x,i)=>`<label><input type="checkbox" value="${i}" checked> ${x}</label>`).join('');
  $('#english-levels-by-day').innerHTML=days.map((x,i)=>`<label class="english-day-level" data-day-level="${i}"><span>${x}</span><select data-english-level-day="${i}"><option value="facil">Fácil</option><option value="medio">Médio</option><option value="dificil">Difícil</option></select></label>`).join('');

  function scheduleMode(){return $('#goal-schedule-mode')?.value||'dias'}
  function isWeeklyFlexibleForm(){return scheduleMode()==='semanal_flexivel'}
  function isMonthlyFlexibleForm(){return scheduleMode()==='mensal_flexivel'}
  function isFlexibleForm(){return isWeeklyFlexibleForm()||isMonthlyFlexibleForm()}
  function refreshScheduleMode(){
    const flex=isFlexibleForm();
    const weeklyFlex=isWeeklyFlexibleForm();
    const monthlyFlex=isMonthlyFlexibleForm();
    const fixed=$('#fixed-days-card');
    const info=$('#weekly-flex-info');
    const monthlyInfo=$('#monthly-flex-info');
    const freq=$('#goal-frequency');
    if(fixed) fixed.hidden=flex;
    if(info) info.hidden=!weeklyFlex;
    if(monthlyInfo) monthlyInfo.hidden=!monthlyFlex;
    if(freq){
      if(weeklyFlex){freq.value='semanal';freq.disabled=true}
      else if(monthlyFlex){freq.value='mensal';freq.disabled=true}
      else freq.disabled=false;
    }
    const label=$('#goal-quantity-label');
    if(label) label.textContent=weeklyFlex?'Vezes por semana':monthlyFlex?'Vezes no mês':'Quantidade';
    const unit=$('#goal-unit');
    if(flex&&unit&&!unit.value) unit.placeholder='vezes, consultas, sessões...';
    refreshEnglishLevels();
  }

  function isEnglishForm(){
    const text=(($('#goal-name').value||'')+' '+($('#goal-category').value||'')).toLowerCase();
    return text.includes('ingl')||text.includes('english');
  }

  function refreshEnglishLevels(){
    const card=$('#english-levels-card');
    const english=isEnglishForm()&&!isFlexibleForm();
    card.hidden=!english;
    const selected=new Set([...document.querySelectorAll('#weekdays input:checked')].map(x=>+x.value));
    document.querySelectorAll('[data-day-level]').forEach(row=>{row.hidden=!selected.has(+row.dataset.dayLevel)});
  }

  function legacyLevels(m){
    const out={...(m?.nivelInglesPorDia||{})};
    if(m?.nivelIngles){for(const day of (m.diasSemana||[])) if(!out[String(day)]) out[String(day)]=m.nivelIngles}
    return out;
  }

  function open(m){
    const extra=m?extFor(m.id):{};
    $('#goal-form-card').hidden=false;
    $('#form-title').textContent=m?'Editar meta':'Nova meta';
    $('#goal-id').value=m?.id||'';
    $('#goal-name').value=m?.nome||'';
    $('#goal-category').value=m?.categoria||'';
    $('#goal-icon').value=m?.icone||'✓';
    $('#goal-type').value=m?.tipo||'check';
    $('#goal-frequency').value=extra?.frequencia||m?.frequencia||'diaria';
    $('#goal-schedule-mode').value=extra?.modoProgramacao||m?.modoProgramacao||'dias';
    $('#goal-description').value=m?.descricao||'';
    $('#goal-start').value=m?.inicioVigencia||new Date().toISOString().slice(0,10);
    $('#goal-end').value=m?.fimVigencia||'';
    $('#goal-quantity').value=(extra?.modoProgramacao||m?.modoProgramacao)==='mensal_flexivel'?(extra?.metaMensal||m?.metaMensal||m?.quantidade||1):(extra?.metaSemanal||m?.metaSemanal||m?.quantidade||1);
    $('#goal-unit').value=m?.unidade||'';
    $('#goal-active').value=String(m?.ativa??true);
    $('#goal-workout-link').checked=Boolean(extra?.associadaTreinoFisico??m?.associadaTreinoFisico);
    refreshWorkoutIntegration();
    document.querySelectorAll('#weekdays input').forEach(x=>x.checked=(m?.diasSemana||[0,1,2,3,4,5,6]).includes(+x.value));
    const perDay=legacyLevels(m);
    document.querySelectorAll('[data-english-level-day]').forEach(sel=>sel.value=perDay[sel.dataset.englishLevelDay]||'facil');
    refreshScheduleMode();
    scrollTo({top:0,behavior:'smooth'});
  }

  function close(){
    $('#goal-form-card').hidden=true;
    $('#goal-form').reset();
    $('#goal-schedule-mode').value='dias';
    refreshScheduleMode();
  }

  function freq(m){
    if(m.modoProgramacao==='semanal_flexivel') return 'Semanal flexível';
    if(m.modoProgramacao==='mensal_flexivel') return 'Mensal flexível';
    const map={diaria:'Diária',semanal:'Semanal',mensal:'Mensal',anual:'Anual'};
    return map[m.frequencia]||m.frequencia||'Sem frequência';
  }

  function dayText(m){
    if(m.modoProgramacao==='semanal_flexivel'){
      const alvo=Math.max(1,Number(m.metaSemanal||m.quantidade||1));
      return `${alvo} vez${alvo===1?'':'es'} em qualquer dia · prazo domingo`;
    }
    if(m.modoProgramacao==='mensal_flexivel'){
      const alvo=Math.max(1,Number(m.metaMensal||m.quantidade||1));
      return `${alvo} vez${alvo===1?'':'es'} em qualquer dia · prazo fim do mês`;
    }
    const ds=m.diasSemana||[];
    if(ds.length===7)return'Todos os dias';
    return ds.map(i=>days[i]).join(', ')||'Sem dia definido';
  }

  function levelsText(m){
    if(m.modoProgramacao==='semanal_flexivel'||m.modoProgramacao==='mensal_flexivel') return '';
    const map=legacyLevels(m);
    const parts=(m.diasSemana||[]).filter(i=>map[String(i)]).map(i=>`${days[i]}: ${levels[map[String(i)]]||map[String(i)]}`);
    return parts.length?parts.join(' | '):'';
  }

  function categoryLabel(value){return String(value||'').trim()||'Sem grupo'}
  function categoryKey(value){const normalized=categoryLabel(value).toLocaleLowerCase('pt-BR');return normalized==='sem grupo'?'__sem_grupo__':normalized}

  function refreshCategoryFilter(){
    const select=$('#goal-category-filter');
    const previous=select.value||'todas';
    const categories=new Map();
    for(const meta of d.metas){const key=categoryKey(meta.categoria);if(!categories.has(key)) categories.set(key,categoryLabel(meta.categoria))}
    const ordered=[...categories.entries()].sort((a,b)=>a[1].localeCompare(b[1],'pt-BR',{sensitivity:'base'}));
    select.innerHTML='<option value="todas">Todos os grupos</option>'+ordered.map(([key,label])=>`<option value="${MMCDUI.esc(key)}">${MMCDUI.esc(label)}</option>`).join('');
    select.value=[...select.options].some(option=>option.value===previous)?previous:'todas';
  }

  function periodText(m){return `${MMCDUI.date(m.inicioVigencia)}${m.fimVigencia?' até '+MMCDUI.date(m.fimVigencia):' em diante'}`}

  function render(){
    mergeExtensions();
    refreshCategoryFilter();
    const statusFilter=$('#goal-filter').value;
    const categoryFilter=$('#goal-category-filter').value;
    const list=d.metas.filter(m=>{
      const statusOk=statusFilter==='todas'||(statusFilter==='ativas'&&m.ativa)||(statusFilter==='inativas'&&!m.ativa);
      const categoryOk=categoryFilter==='todas'||categoryKey(m.categoria)===categoryFilter;
      return statusOk&&categoryOk;
    }).sort((a,b)=>{
      const grupo=categoryLabel(a.categoria).localeCompare(categoryLabel(b.categoria),'pt-BR',{sensitivity:'base',numeric:true});
      if(grupo!==0)return grupo;
      return String(a.nome||'').localeCompare(String(b.nome||''),'pt-BR',{sensitivity:'base',numeric:true});
    });
    const activeCount=d.metas.filter(x=>x.ativa).length;
    $('#goal-count').textContent=`${list.length} exibidas · ${activeCount} ativas · ${d.metas.length} no total`;
    $('#goals-list').innerHTML=list.map(m=>{
      const levelDetails=levelsText(m);
      return `<article class="goal-item ${m.ativa?'':'inactive'}">
        <div class="goal-main-cell" data-label="Meta"><span class="goal-icon memory-goal-icon">${MMCDUI.esc(m.icone)}</span><div class="goal-info"><strong>${MMCDUI.esc(m.nome)}</strong>${m.descricao?`<p>${MMCDUI.esc(m.descricao)}</p>`:'<p class="goal-empty-description">Sem descrição</p>'}</div></div>
        <div class="goal-report-cell goal-category-cell" data-label="Grupo"><span class="category-pill">${MMCDUI.esc(categoryLabel(m.categoria))}</span>${m.associadaTreinoFisico?`<span class="workout-link-pill">🏋️ Musculação</span>`:''}</div>
        <div class="goal-report-cell goal-schedule-cell" data-label="Programação"><strong>${MMCDUI.esc(freq(m))}</strong><small>${MMCDUI.esc(dayText(m))}</small>${m.modoProgramacao==='semanal_flexivel'?'<span class="weekly-flex-pill">↻ Flexível</span>':m.modoProgramacao==='mensal_flexivel'?'<span class="weekly-flex-pill">◫ Flexível</span>':''}${levelDetails?`<small class="english-level-summary">${MMCDUI.esc(levelDetails)}</small>`:''}</div>
        <div class="goal-report-cell goal-period-cell" data-label="Vigência"><span>${MMCDUI.esc(periodText(m))}</span></div>
        <div class="goal-report-cell goal-status-cell" data-label="Status"><span class="status-pill ${m.ativa?'active':'inactive'}">${m.ativa?'Ativa':'Desativada'}</span></div>
        <div class="goal-actions" data-label="Ações"><button class="btn small" data-edit="${m.id}">Editar</button><button class="btn small" data-dup="${m.id}">Duplicar</button><button class="btn small" data-toggle="${m.id}">${m.ativa?'Desativar':'Ativar'}</button><button class="btn small danger" data-del="${m.id}">Excluir</button></div>
      </article>`;
    }).join('')||'<div class="empty">Nenhuma meta encontrada para os filtros selecionados.</div>';

    document.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>open(d.metas.find(x=>x.id===b.dataset.edit)));
    document.querySelectorAll('[data-dup]').forEach(b=>b.onclick=async()=>{
      const x=d.metas.find(x=>x.id===b.dataset.dup);const id=crypto.randomUUID();
      const copy={...x,id,nome:x.nome+' (cópia)',associadaTreinoFisico:false};d.metas.push(copy);
      extState.itens[id]={...extFor(x.id),associadaTreinoFisico:false};
      await MMCD.salvar(d);await saveExtensions();render();MMCDUI.toast('Meta duplicada');
    });
    document.querySelectorAll('[data-toggle]').forEach(b=>b.onclick=async()=>{const x=d.metas.find(x=>x.id===b.dataset.toggle);x.ativa=!x.ativa;await MMCD.salvar(d);setExtension(x);await saveExtensions();render()});
    document.querySelectorAll('[data-del]').forEach(b=>b.onclick=async()=>{
      if(confirm('Excluir esta meta e mantê-la fora das atividades futuras?')){d.metas=d.metas.filter(x=>x.id!==b.dataset.del);delete extState.itens[b.dataset.del];await MMCD.salvar(d);await saveExtensions();render()}
    });
  }

  $('#new-goal').onclick=()=>open();
  $('#close-form').onclick=$('#cancel-form').onclick=close;
  $('#goal-filter').onchange=render;
  $('#goal-category-filter').onchange=render;
  $('#goal-name').addEventListener('input',refreshEnglishLevels);
  $('#goal-category').addEventListener('input',refreshEnglishLevels);
  $('#goal-workout-link').addEventListener('change',refreshWorkoutIntegration);
  $('#goal-schedule-mode').addEventListener('change',refreshScheduleMode);
  document.querySelectorAll('#weekdays input').forEach(x=>x.addEventListener('change',refreshEnglishLevels));

  $('#goal-form').onsubmit=async e=>{
    e.preventDefault();
    const id=$('#goal-id').value||crypto.randomUUID();
    const flex=isFlexibleForm();
    const weeklyFlex=isWeeklyFlexibleForm();
    const monthlyFlex=isMonthlyFlexibleForm();
    const diasSemana=flex?[]:[...document.querySelectorAll('#weekdays input:checked')].map(x=>+x.value);
    if(!flex&&!diasSemana.length){MMCDUI.toast('Escolha ao menos um dia ou use uma meta flexível.');return}
    const nivelInglesPorDia={};
    if(isEnglishForm()&&!flex){for(const day of diasSemana){const sel=document.querySelector(`[data-english-level-day="${day}"]`);nivelInglesPorDia[String(day)]=sel?.value||'facil'}}
    const qtd=Math.max(1,+$('#goal-quantity').value||1);
    const obj={
      id,nome:$('#goal-name').value.trim(),categoria:$('#goal-category').value.trim(),icone:$('#goal-icon').value.trim()||'✓',tipo:$('#goal-type').value,
      frequencia:weeklyFlex?'semanal':monthlyFlex?'mensal':$('#goal-frequency').value,nivelInglesPorDia,descricao:$('#goal-description').value.trim(),diasSemana,quantidade:qtd,
      metaSemanal:weeklyFlex?qtd:qtd,metaMensal:monthlyFlex?qtd:qtd,modoProgramacao:weeklyFlex?'semanal_flexivel':monthlyFlex?'mensal_flexivel':'dias',unidade:$('#goal-unit').value.trim(),inicioVigencia:$('#goal-start').value,
      fimVigencia:$('#goal-end').value,ativa:$('#goal-active').value==='true',associadaTreinoFisico:$('#goal-workout-link').checked,associacaoTreinoTipo:'musculacao'
    };
    if(obj.fimVigencia&&obj.fimVigencia<obj.inicioVigencia){alert('A data final não pode ser anterior à data inicial.');return}
    const i=d.metas.findIndex(x=>x.id===id);i>=0?d.metas[i]=obj:d.metas.push(obj);
    setExtension(obj);
    try{await MMCD.salvar(d);await saveExtensions();close();render();MMCDUI.toast(weeklyFlex?'Meta semanal flexível salva':monthlyFlex?'Meta mensal flexível salva':'Meta salva')}
    catch(error){console.error(error);MMCDUI.toast(error.message||'Não foi possível salvar a meta.')}
  };

  refreshScheduleMode();
  render();
})().catch(error=>{console.error(error);window.MMCDUI?.toast?.(error.message||'Não foi possível carregar as metas.',5000)});
