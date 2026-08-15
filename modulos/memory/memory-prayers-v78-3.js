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

  // Modo Presença V78.3 — cronômetro + orientação progressiva visível.
  const layer=$("#presence-layer"), timerEl=$("#presence-timer"), guide=$("#presence-guide"), phaseEl=$("#presence-phase"), guideTitle=$("#presence-guide-title"), nextEl=$("#presence-next"), progressEl=$("#presence-progress"), startBtn=$("#presence-start"), pauseBtn=$("#presence-pause");
  let seconds=0,tick=null,running=false,lastGuideIndex=-1;
  const guides=[
    {at:0,phase:"Chegada",title:"Chegue como você está",text:"Não tente organizar a oração antes de começar. Apenas reconheça que você está diante de Deus."},
    {at:20,phase:"Respiração",title:"Diminua o ritmo",text:"Respire devagar duas ou três vezes. Solte os ombros e permita que a pressa perca força."},
    {at:45,phase:"Gratidão",title:"Comece lembrando do que recebeu",text:"Agradeça por algo concreto deste dia — uma pessoa, uma proteção, uma oportunidade ou uma pequena alegria."},
    {at:75,phase:"Entrega",title:"Nomeie o que está pesado",text:"Fale com Deus sobre o que está ocupando espaço demais dentro de você. Não precisa parecer forte nem ter a frase certa."},
    {at:120,phase:"Escuta",title:"Pare de preencher todos os espaços",text:"Faça alguns segundos de silêncio. Pergunte: Senhor, o que meu coração precisa perceber agora?"},
    {at:180,phase:"Intercessão",title:"Traga alguém para perto",text:"Lembre de uma pessoa que precisa de cuidado. Coloque o nome dela diante de Deus e ore pelo que você sabe — e pelo que não sabe."},
    {at:240,phase:"Silêncio",title:"Permaneça sem resolver",text:"Não transforme este momento em uma lista de tarefas. Fique alguns instantes apenas presente diante de Deus."},
    {at:330,phase:"Confiança",title:"Entregue o que você não controla",text:"Escolha uma preocupação que você vem tentando governar sozinho e diga, com suas palavras, que ela está nas mãos de Deus."},
    {at:450,phase:"Direção",title:"Peça clareza para o próximo passo",text:"Não peça o mapa inteiro. Peça sabedoria para uma atitude concreta, fiel e possível para hoje."},
    {at:570,phase:"Encerramento",title:"Leve uma verdade com você",text:"Antes de terminar, escolha uma frase simples para carregar no restante do dia. Termine sem pressa."}
  ];
  function guideIndex(){let index=0;for(let i=0;i<guides.length;i++)if(seconds>=guides[i].at)index=i;return index}
  function formatSeconds(value){return `${String(Math.floor(value/60)).padStart(2,"0")}:${String(value%60).padStart(2,"0")}`}
  function renderGuide(index){
    const item=guides[index];if(!item)return;
    if(phaseEl)phaseEl.textContent=item.phase;if(guideTitle)guideTitle.textContent=item.title;if(guide)guide.textContent=item.text;
    if(progressEl)progressEl.innerHTML=guides.map((_,i)=>`<i class="${i<index?"done":i===index?"active":""}" aria-hidden="true"></i>`).join("");
    layer.querySelector(".memory-presence-guidance")?.classList.remove("is-changing");
    requestAnimationFrame(()=>layer.querySelector(".memory-presence-guidance")?.classList.add("is-visible"));
  }
  function renderPresence(){
    timerEl.textContent=formatSeconds(seconds);
    const index=guideIndex();
    if(index!==lastGuideIndex){const box=layer.querySelector(".memory-presence-guidance");box?.classList.add("is-changing");setTimeout(()=>{renderGuide(index);lastGuideIndex=index},160)}
    const next=guides[index+1];
    if(nextEl)nextEl.textContent=next?`Próxima orientação em ${formatSeconds(Math.max(0,next.at-seconds))}`:"Permaneça aqui pelo tempo que fizer sentido.";
    startBtn.textContent=seconds?(running?"Em andamento":"Continuar"):"Começar";pauseBtn.disabled=!running;
  }
  function stopTick(){if(tick)clearInterval(tick);tick=null;running=false;renderPresence()}
  $("#presence-open").addEventListener("click",()=>{layer.hidden=false;document.body.style.overflow="hidden";lastGuideIndex=-1;renderPresence()});
  $("#presence-close").addEventListener("click",()=>{stopTick();layer.hidden=true;document.body.style.overflow="";seconds=0;lastGuideIndex=-1;renderPresence()});
  startBtn.addEventListener("click",()=>{if(running)return;running=true;pauseBtn.disabled=false;tick=setInterval(()=>{seconds++;renderPresence()},1000);renderPresence()});
  pauseBtn.addEventListener("click",stopTick);

  try{state=normalize(await C.read(KEY,{versao:1,itens:[]}));render()}catch(error){console.error(error);$("#prayer-active-list").innerHTML=`<div class="memory-care-note">${C.esc(error.message)}</div>`;C.status($("#prayer-status"),error.message,"error")}
})().catch(error=>{console.error(error);window.MMCDUI?.toast?.(error.message||"Erro ao abrir Minhas Orações",5000)});
