"use strict";
(async()=>{
  const C=window.MemoryCare, KEY="memory_oracoes_v1";
  const $=s=>document.querySelector(s);
  let state={versao:1,itens:[]};
  const now=()=>new Date().toISOString();
  function normalize(value){
    return {versao:1,itens:Array.isArray(value?.itens)?value.itens.map(item=>({
      id:String(item?.id||C.uuid()),titulo:String(item?.titulo||"").trim(),categoria:String(item?.categoria||"Outro"),pessoa:String(item?.pessoa||"").trim(),notas:String(item?.notas||"").trim(),status:item?.status==="respondida"?"respondida":"ativa",criadoEm:item?.criadoEm||now(),atualizadoEm:item?.atualizadoEm||item?.criadoEm||now(),respondidoEm:item?.respondidoEm||"",resposta:String(item?.resposta||"").trim(),historico:Array.isArray(item?.historico)?item.historico:[]
    })).filter(x=>x.titulo):[]};
  }
  async function save(){state=normalize(state);await C.write(KEY,{...state,atualizadoEm:now()})}
  function reset(){
    $("#prayer-form").reset();$("#prayer-id").value="";$("#prayer-form-title").textContent="Novo pedido";$("#prayer-cancel").hidden=true;C.status($("#prayer-status"),"");
  }
  function itemHtml(item){
    const answered=item.status==="respondida";
    const historyCount=item.historico?.length||0;
    return `<article class="memory-care-row ${answered?"memory-prayer-answered":""}" data-prayer-id="${C.esc(item.id)}">
      <span class="memory-care-row__icon">${answered?"✨":"🙏"}</span>
      <div class="memory-care-row__copy"><strong>${C.esc(item.titulo)}</strong><div class="memory-circle-meta"><span>${C.esc(item.categoria||"Outro")}</span>${item.pessoa?`<span>👤 ${C.esc(item.pessoa)}</span>`:""}<span>${answered?`Respondida ${C.fmtShort(item.respondidoEm?.slice(0,10))}`:`Desde ${C.fmtShort(item.criadoEm?.slice(0,10))}`}</span></div>${item.notas?`<small>${C.esc(item.notas)}</small>`:""}${answered&&item.resposta?`<small><strong>Como eu percebi a resposta:</strong> ${C.esc(item.resposta)}</small>`:""}${historyCount?`<small>${historyCount} registro${historyCount===1?"":"s"} no histórico.</small>`:""}</div>
      <div class="memory-care-row__actions">${!answered?`<button class="memory-care-btn soft" type="button" data-action="answered">✨ Deus respondeu</button><button class="memory-care-btn" type="button" data-action="edit">Editar</button>`:`<button class="memory-care-btn" type="button" data-action="reopen">Reabrir</button>`}<button class="memory-care-btn danger" type="button" data-action="delete">Excluir</button></div>
    </article>`;
  }
  function bind(list){
    list.querySelectorAll("[data-prayer-id]").forEach(row=>{
      const id=row.dataset.prayerId;
      row.querySelector('[data-action="edit"]')?.addEventListener("click",()=>edit(id));
      row.querySelector('[data-action="answered"]')?.addEventListener("click",()=>answered(id));
      row.querySelector('[data-action="reopen"]')?.addEventListener("click",()=>reopen(id));
      row.querySelector('[data-action="delete"]')?.addEventListener("click",()=>remove(id));
    });
  }
  function render(){
    const active=state.itens.filter(x=>x.status!=="respondida").sort((a,b)=>String(b.atualizadoEm).localeCompare(String(a.atualizadoEm)));
    const memories=state.itens.filter(x=>x.status==="respondida").sort((a,b)=>String(b.respondidoEm).localeCompare(String(a.respondidoEm)));
    $("#prayer-active-count").textContent=String(active.length);$("#prayer-memory-count").textContent=String(memories.length);
    $("#prayer-active-list").innerHTML=active.length?active.map(itemHtml).join(""):'<div class="memory-care-note">Nenhum pedido ativo. Você pode começar com algo simples que esteja ocupando seu coração.</div>';
    $("#prayer-memory-list").innerHTML=memories.length?memories.map(itemHtml).join(""):'<div class="memory-care-note">Quando você marcar “Deus respondeu”, a história ficará guardada aqui.</div>';
    bind($("#prayer-active-list"));bind($("#prayer-memory-list"));
  }
  function edit(id){const item=state.itens.find(x=>x.id===id);if(!item)return;$("#prayer-id").value=item.id;$("#prayer-title").value=item.titulo;$("#prayer-category").value=item.categoria;$("#prayer-person").value=item.pessoa;$("#prayer-notes").value=item.notas;$("#prayer-form-title").textContent="Editar pedido";$("#prayer-cancel").hidden=false;window.scrollTo({top:0,behavior:"smooth"});$("#prayer-title").focus()}
  async function answered(id){
    const item=state.itens.find(x=>x.id===id);if(!item)return;
    const response=window.prompt("Como você percebeu que Deus respondeu? (opcional)",item.resposta||"");
    if(response===null)return;
    const prev=JSON.parse(JSON.stringify(item));item.status="respondida";item.respondidoEm=now();item.resposta=String(response||"").trim();item.atualizadoEm=now();item.historico.push({tipo:"respondida",em:item.respondidoEm,texto:item.resposta});
    try{await save();render();C.toast("✨ Guardado em Memórias de Deus")}catch(error){Object.assign(item,prev);render();C.toast(error.message,5000)}
  }
  async function reopen(id){const item=state.itens.find(x=>x.id===id);if(!item)return;const prev=JSON.parse(JSON.stringify(item));item.status="ativa";item.atualizadoEm=now();item.historico.push({tipo:"reaberta",em:item.atualizadoEm});try{await save();render();C.toast("Pedido reaberto")}catch(error){Object.assign(item,prev);render();C.toast(error.message,5000)}}
  async function remove(id){const item=state.itens.find(x=>x.id===id);if(!item||!confirm(`Excluir “${item.titulo}”?`))return;const prev=[...state.itens];state.itens=state.itens.filter(x=>x.id!==id);try{await save();render();reset();C.toast("Pedido removido")}catch(error){state.itens=prev;render();C.toast(error.message,5000)}}
  $("#prayer-form").addEventListener("submit",async event=>{
    event.preventDefault();const title=$("#prayer-title").value.trim();if(!title){C.status($("#prayer-status"),"Informe o pedido.","error");return}
    const id=$("#prayer-id").value||C.uuid();const existing=state.itens.find(x=>x.id===id);const prev=existing?JSON.parse(JSON.stringify(existing)):null;
    const item=existing||{id,status:"ativa",criadoEm:now(),respondidoEm:"",resposta:"",historico:[]};item.titulo=title;item.categoria=$("#prayer-category").value;item.pessoa=$("#prayer-person").value.trim();item.notas=$("#prayer-notes").value.trim();item.atualizadoEm=now();item.historico.push({tipo:existing?"editada":"criada",em:item.atualizadoEm});if(!existing)state.itens.push(item);
    C.status($("#prayer-status"),"Salvando…");try{await save();render();reset();C.status($("#prayer-status"),"Pedido salvo.","success");C.toast("Oração salva")}catch(error){if(prev)Object.assign(item,prev);else state.itens=state.itens.filter(x=>x.id!==id);render();C.status($("#prayer-status"),error.message,"error")}
  });
  $("#prayer-cancel").addEventListener("click",reset);

  // Modo Presença — somente cronômetro local e mensagens fixas.
  const layer=$("#presence-layer"), timerEl=$("#presence-timer"), guide=$("#presence-guide"), startBtn=$("#presence-start"), pauseBtn=$("#presence-pause");
  let seconds=0,tick=null,running=false;
  const guides=[
    [0,"Chegue como você está. Não precisa organizar tudo antes de falar com Deus."],
    [60,"Respire com calma. Agradeça por algo concreto deste dia."],
    [180,"Fale sobre o que está pesado sem tentar parecer forte."],
    [300,"Lembre das pessoas que você ama e coloque cada uma diante de Deus."],
    [480,"Fique alguns instantes em silêncio. Nem toda oração precisa ser preenchida com palavras."],
    [600,"Antes de terminar, escolha uma atitude simples para levar desta oração para o seu dia."]
  ];
  function renderPresence(){timerEl.textContent=`${String(Math.floor(seconds/60)).padStart(2,"0")}:${String(seconds%60).padStart(2,"0")}`;let text=guides[0][1];for(const [at,msg] of guides)if(seconds>=at)text=msg;guide.textContent=text;startBtn.textContent=seconds?"Continuar":"Começar";pauseBtn.disabled=!running}
  function stopTick(){if(tick)clearInterval(tick);tick=null;running=false;renderPresence()}
  $("#presence-open").addEventListener("click",()=>{layer.hidden=false;document.body.style.overflow="hidden";renderPresence()});
  $("#presence-close").addEventListener("click",()=>{stopTick();layer.hidden=true;document.body.style.overflow="";seconds=0;renderPresence()});
  startBtn.addEventListener("click",()=>{if(running)return;running=true;pauseBtn.disabled=false;tick=setInterval(()=>{seconds++;renderPresence()},1000);renderPresence()});
  pauseBtn.addEventListener("click",stopTick);

  try{state=normalize(await C.read(KEY,{versao:1,itens:[]}));render()}catch(error){console.error(error);$("#prayer-active-list").innerHTML=`<div class="memory-care-note">${C.esc(error.message)}</div>`;C.status($("#prayer-status"),error.message,"error")}
})().catch(error=>{console.error(error);window.MMCDUI?.toast?.(error.message||"Erro ao abrir Minhas Orações",5000)});
