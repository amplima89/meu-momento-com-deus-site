"use strict";
(async()=>{
  const C=window.MemoryCare;
  if(!C) return;
  const KEY="memory_boas_acoes_v1";
  const CATEGORIES={familia:"Família / Relacionamentos",generosidade:"Generosidade",servico:"Ajuda / Serviço",trabalho:"Trabalho",comunidade:"Comunidade",outro:"Outro"};
  const form=document.querySelector("#good-deeds-form");
  const dateInput=document.querySelector("#good-deeds-date");
  const categoryInput=document.querySelector("#good-deeds-category");
  const descriptionInput=document.querySelector("#good-deeds-description");
  const personInput=document.querySelector("#good-deeds-person");
  const monthInput=document.querySelector("#good-deeds-month");
  const history=document.querySelector("#good-deeds-history");
  const count=document.querySelector("#good-deeds-count");
  const summary=document.querySelector("#good-deeds-month-summary");
  const categoryReport=document.querySelector("#good-deeds-categories");
  const statusEl=document.querySelector("#good-deeds-save-status");
  if(!form||!dateInput||!history) return;

  let state={schemaVersion:1,itens:[],atualizadoEm:null};
  let editingId="";
  const pad=n=>String(n).padStart(2,"0");
  const today=()=>{const d=new Date();return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`};
  const monthNow=()=>today().slice(0,7);
  const fmtDate=value=>{const d=new Date(`${value}T12:00:00`);return Number.isNaN(d.getTime())?"—":d.toLocaleDateString("pt-BR",{day:"2-digit",month:"short"})};
  const normalize=value=>String(value||"").trim();
  const normalizeState=value=>({schemaVersion:1,itens:Array.isArray(value?.itens)?value.itens.filter(Boolean):[],atualizadoEm:value?.atualizadoEm||null});
  const setStatus=(text,type="")=>C.status(statusEl,text,type);

  async function persist(){
    state.atualizadoEm=new Date().toISOString();
    await C.write(KEY,JSON.parse(JSON.stringify(state)));
  }
  function sorted(){return [...state.itens].sort((a,b)=>String(b.data||"").localeCompare(String(a.data||""))||String(b.criadoEm||"").localeCompare(String(a.criadoEm||"")))}
  function selectedMonth(){return monthInput.value||monthNow()}
  function monthItems(month=selectedMonth()){return state.itens.filter(item=>String(item.data||"").slice(0,7)===month)}
  function previousMonth(month){const [y,m]=month.split("-").map(Number);const d=new Date(y,m-2,1);return `${d.getFullYear()}-${pad(d.getMonth()+1)}`}
  function labelCategory(id){return CATEGORIES[id]||CATEGORIES.outro}

  function renderSummary(){
    const month=selectedMonth();
    const items=monthItems(month);
    const prev=monthItems(previousMonth(month));
    const uniqueDays=new Set(items.map(x=>x.data).filter(Boolean)).size;
    const people=new Set(items.map(x=>normalize(x.pessoa).toLowerCase()).filter(Boolean)).size;
    const counts={};items.forEach(x=>{const k=CATEGORIES[x.categoria]?x.categoria:"outro";counts[k]=(counts[k]||0)+1});
    const top=Object.entries(counts).sort((a,b)=>b[1]-a[1])[0];
    const delta=items.length-prev.length;
    summary.innerHTML=`
      <article class="good-deeds-stat"><span>Boas ações no mês</span><strong>${items.length}</strong></article>
      <article class="good-deeds-stat"><span>Dias com algum gesto</span><strong>${uniqueDays}</strong></article>
      <article class="good-deeds-stat"><span>Categoria mais presente</span><strong class="textual">${top?C.esc(labelCategory(top[0])):"—"}</strong></article>
      <article class="good-deeds-stat"><span>Pessoas registradas</span><strong>${people}</strong></article>`;
    const max=Math.max(1,...Object.values(counts));
    const rows=Object.keys(CATEGORIES).map(key=>({key,label:CATEGORIES[key],value:counts[key]||0})).filter(x=>x.value>0);
    categoryReport.innerHTML=rows.length?rows.map(row=>`<div class="good-deeds-category-row"><span>${C.esc(row.label)}</span><div><i style="width:${Math.round(row.value/max*100)}%"></i></div><b>${row.value}</b></div>`).join(""):`<div class="good-deeds-empty">Nenhuma boa ação registrada neste mês.</div>`;
  }

  function renderHistory(){
    const rows=sorted();
    count.textContent=`${rows.length} ${rows.length===1?"registro":"registros"}`;
    history.innerHTML=rows.length?rows.map(item=>`<article class="good-deeds-row ${editingId===item.id?"good-deeds-editing":""}" data-good-deed-id="${C.esc(item.id)}"><div class="good-deeds-row__date"><strong>${C.esc(fmtDate(item.data))}</strong><small>${C.esc(String(item.data||"").slice(0,4))}</small></div><div class="good-deeds-row__copy"><strong>${C.esc(item.descricao||"")}</strong><div class="good-deeds-row__meta"><span class="good-deeds-chip">${C.esc(labelCategory(item.categoria))}</span>${item.pessoa?`<span class="good-deeds-chip">Para: ${C.esc(item.pessoa)}</span>`:""}</div></div><div class="good-deeds-row__actions"><button type="button" data-good-deed-edit>Editar</button><button type="button" class="danger" data-good-deed-delete>Excluir</button></div></article>`).join(""):`<div class="good-deeds-empty">Nenhuma boa ação registrada ainda.<br>Quando um gesto fizer sentido para você, registre aqui.</div>`;
  }
  function render(){renderSummary();renderHistory()}

  function resetForm(){editingId="";form.reset();dateInput.value=today();categoryInput.value="familia";descriptionInput.focus();renderHistory()}
  function loadIntoForm(item){editingId=item.id;dateInput.value=item.data||today();categoryInput.value=CATEGORIES[item.categoria]?item.categoria:"outro";descriptionInput.value=item.descricao||"";personInput.value=item.pessoa||"";renderHistory();form.scrollIntoView({behavior:"smooth",block:"start"});descriptionInput.focus()}

  form.addEventListener("submit",async event=>{
    event.preventDefault();
    const descricao=normalize(descriptionInput.value);
    if(!descricao){C.toast("Descreva a boa ação antes de salvar.");return}
    const now=new Date().toISOString();
    const item={id:editingId||C.uuid(),data:dateInput.value||today(),categoria:CATEGORIES[categoryInput.value]?categoryInput.value:"outro",descricao,pessoa:normalize(personInput.value),criadoEm:now,atualizadoEm:now};
    const before=JSON.parse(JSON.stringify(state));
    if(editingId){const index=state.itens.findIndex(x=>x.id===editingId);if(index>=0)item.criadoEm=state.itens[index].criadoEm||now;if(index>=0)state.itens[index]=item;else state.itens.push(item)}else state.itens.push(item);
    try{setStatus("Salvando…","saving");await persist();setStatus("Salvo no Supabase","saved");C.toast(editingId?"Boa ação atualizada.":"Boa ação registrada.");resetForm();render()}catch(error){state=before;console.error(error);setStatus("Erro ao salvar","error");C.toast(error.message||"Não foi possível salvar a boa ação.",4500)}
  });

  history.addEventListener("click",async event=>{
    const row=event.target.closest("[data-good-deed-id]");if(!row)return;const item=state.itens.find(x=>x.id===row.dataset.goodDeedId);if(!item)return;
    if(event.target.closest("[data-good-deed-edit]")){loadIntoForm(item);return}
    if(event.target.closest("[data-good-deed-delete]")){
      if(!confirm("Excluir esta boa ação do histórico?"))return;
      const before=JSON.parse(JSON.stringify(state));state.itens=state.itens.filter(x=>x.id!==item.id);
      try{setStatus("Salvando…","saving");await persist();if(editingId===item.id)resetForm();setStatus("Salvo no Supabase","saved");render();C.toast("Registro excluído.")}catch(error){state=before;setStatus("Erro ao salvar","error");render();C.toast(error.message||"Não foi possível excluir.",4500)}
    }
  });
  monthInput.addEventListener("change",renderSummary);

  try{
    dateInput.value=today();monthInput.value=monthNow();
    state=normalizeState(await C.read(KEY,{schemaVersion:1,itens:[]}));
    setStatus("Salvo no Supabase","saved");render();
  }catch(error){console.error(error);setStatus("Falha ao carregar","error");history.innerHTML=`<div class="good-deeds-empty">${C.esc(error.message||"Não foi possível carregar seus registros.")}</div>`}
})().catch(error=>{console.error(error);window.MMCDUI?.toast?.(error.message||"Não foi possível abrir Boas Ações.",4500)});
