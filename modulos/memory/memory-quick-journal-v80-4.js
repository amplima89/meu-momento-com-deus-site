"use strict";
(async()=>{
  const C=window.MemoryCare;
  if(!C)return;

  const KEY="diario_rapido_v1";
  const CATEGORIES=[
    ["Fé","🙏"],
    ["Família","❤️"],
    ["Trabalho","💼"],
    ["Pessoal","🧠"],
    ["Saúde","🏃"],
    ["Desenvolvimento","📚"]
  ];

  const text=document.querySelector("#quick-journal-text");
  const categories=document.querySelector("#quick-journal-categories");
  const save=document.querySelector("#quick-journal-save");
  const status=document.querySelector("#quick-journal-status");
  const sync=document.querySelector("#quick-journal-sync");
  const list=document.querySelector("#quick-journal-list");
  const count=document.querySelector("#quick-journal-count");
  const mic=document.querySelector("#quick-journal-mic");
  const micStatus=document.querySelector("#quick-journal-voice-status");
  if(!text||!categories||!save||!list||!count)return;

  let state={versao:1,registros:[],atualizadoEm:""};
  let category="Pessoal";
  let recognition=null;
  let listening=false;
  let speechBase="";
  let speechFinal="";

  const todayIso=()=>C.iso(C.today());
  const normalize=value=>String(value||"").trim();
  const shortDate=value=>{
    if(!value)return "";
    if(value===todayIso())return "Hoje";
    const d=C.parse(value);
    if(!d)return value;
    const yesterday=C.addDays(C.today(),-1);
    if(value===C.iso(yesterday))return "Ontem";
    return d.toLocaleDateString("pt-BR",{day:"2-digit",month:"2-digit"});
  };

  function setSync(message,type=""){
    if(!sync)return;
    sync.textContent=message;
    sync.dataset.kind=type;
  }

  function renderCategories(){
    categories.innerHTML=CATEGORIES.map(([name,icon])=>`
      <button class="quick-category ${name===category?"is-active":""}" type="button" data-quick-category="${C.esc(name)}">
        <span>${icon}</span>${C.esc(name)}
      </button>`).join("");
  }

  function recent(){
    return [...state.registros]
      .filter(item=>item?.texto)
      .sort((a,b)=>String(b.atualizadoEm||b.criadoEm||b.data||"").localeCompare(String(a.atualizadoEm||a.criadoEm||a.data||"")))
      .slice(0,30);
  }

  function renderHistory(){
    const rows=recent();
    count.textContent=String(rows.length);
    list.innerHTML=rows.length?rows.map(item=>`
      <article class="quick-journal-entry" data-quick-id="${C.esc(item.id)}">
        <div class="quick-journal-entry__meta">
          <span>${C.esc(shortDate(item.data))}</span>
          <span>${C.esc(item.categoria||"Pessoal")}</span>
        </div>
        <p>${C.esc(item.texto)}</p>
        <div class="quick-journal-entry__actions">
          <button class="text-link" type="button" data-quick-edit>Editar</button>
          <button class="text-link quick-delete" type="button" data-quick-delete>Excluir</button>
        </div>
      </article>`).join("")
      :`<div class="quick-journal-empty">Nenhum registro ainda. Quando algo importante acontecer, guarde em uma ou duas linhas.</div>`;
  }

  async function persist(){
    state.atualizadoEm=new Date().toISOString();
    state.registros=[...state.registros]
      .sort((a,b)=>String(b.atualizadoEm||b.criadoEm||b.data||"").localeCompare(String(a.atualizadoEm||a.criadoEm||a.data||"")))
      .slice(0,180);
    await C.write(KEY,state);
  }

  async function add(){
    if(listening)stopSpeech("Finalizando a transcrição antes de salvar...");
    const value=normalize(text.value);
    if(value.length<3){
      C.toast("Escreva algo antes de salvar.");
      text.focus();
      return;
    }
    const now=new Date().toISOString();
    const item={
      id:C.uuid(),
      data:todayIso(),
      categoria:category,
      texto:value,
      criadoEm:now,
      atualizadoEm:now
    };
    state.registros.unshift(item);
    save.disabled=true;
    status.textContent="Salvando no Supabase...";
    setSync("Salvando…","saving");
    try{
      await persist();
      text.value="";
      status.textContent="Salvo. O Mapa de Cuidado já pode usar este registro.";
      setSync("Supabase","saved");
      renderHistory();
      C.toast("Registro salvo e conectado ao Mapa de Cuidado.");
    }catch(error){
      state.registros=state.registros.filter(row=>row.id!==item.id);
      status.textContent="Não foi possível salvar.";
      setSync("Erro","error");
      C.toast(error.message||"Não foi possível salvar o registro.",4500);
    }finally{
      save.disabled=false;
    }
  }

  async function edit(item){
    const value=prompt("Edite o registro:",item.texto);
    if(value===null)return;
    const normalized=normalize(value);
    if(normalized.length<3){
      C.toast("O registro ficou vazio e não foi alterado.");
      return;
    }
    const before=item.texto;
    item.texto=normalized;
    item.atualizadoEm=new Date().toISOString();
    try{
      setSync("Atualizando…","saving");
      await persist();
      renderHistory();
      setSync("Supabase","saved");
      C.toast("Registro atualizado e mapa recalculável.");
    }catch(error){
      item.texto=before;
      setSync("Erro","error");
      C.toast(error.message||"Não foi possível atualizar.",4500);
    }
  }

  async function remove(item){
    if(!confirm("Excluir este registro rápido?"))return;
    const before=[...state.registros];
    state.registros=state.registros.filter(row=>row.id!==item.id);
    try{
      setSync("Salvando…","saving");
      await persist();
      renderHistory();
      setSync("Supabase","saved");
      C.toast("Registro excluído. O Mapa de Cuidado foi notificado.");
    }catch(error){
      state.registros=before;
      setSync("Erro","error");
      renderHistory();
      C.toast(error.message||"Não foi possível excluir.",4500);
    }
  }

  const Recognition=()=>window.SpeechRecognition||window.webkitSpeechRecognition||null;
  function setListening(active,message=""){
    listening=!!active;
    mic?.classList.toggle("is-listening",listening);
    mic?.setAttribute("aria-pressed",listening?"true":"false");
    const label=mic?.querySelector("[data-mic-label]");
    if(label)label.textContent=listening?"Parar transcrição":"Transcrever fala";
    if(micStatus&&message)micStatus.textContent=message;
  }
  function stopSpeech(message="Finalizando a transcrição..."){
    if(!recognition)return;
    setListening(false,message);
    try{recognition.stop()}catch{}
  }
  function toggleSpeech(){
    const R=Recognition();
    if(!R){
      C.toast("Use o microfone do teclado para ditar neste navegador.");
      text.focus();
      return;
    }
    if(listening){stopSpeech();return}

    speechBase=normalize(text.value);
    speechFinal="";
    recognition=new R();
    recognition.lang="pt-BR";
    recognition.continuous=true;
    recognition.interimResults=true;
    recognition.maxAlternatives=1;

    recognition.onstart=()=>setListening(true,"Ouvindo... o áudio não será armazenado.");
    recognition.onresult=event=>{
      let finalChunk="",interim="";
      for(let i=event.resultIndex;i<event.results.length;i++){
        const transcript=normalize(event.results[i][0]?.transcript);
        if(!transcript)continue;
        if(event.results[i].isFinal)finalChunk+=(finalChunk?" ":"")+transcript;
        else interim+=(interim?" ":"")+transcript;
      }
      if(finalChunk)speechFinal+=(speechFinal?" ":"")+finalChunk;
      text.value=[speechBase,speechFinal,interim].map(normalize).filter(Boolean).join(" ").slice(0,900);
    };
    recognition.onerror=event=>{
      const messages={
        "not-allowed":"Permita o acesso ao microfone para transcrever sua fala.",
        "audio-capture":"Não encontrei um microfone disponível.",
        "network":"A transcrição do navegador está indisponível agora.",
        "no-speech":"Não detectei fala. Tente novamente."
      };
      setListening(false,messages[event.error]||"Não foi possível transcrever.");
    };
    recognition.onend=()=>{
      recognition=null;
      setListening(false,"Transcrição encerrada. Revise o texto e salve quando quiser.");
    };
    try{recognition.start()}catch(error){
      recognition=null;
      setListening(false,"Não foi possível iniciar o microfone.");
    }
  }

  categories.addEventListener("click",event=>{
    const button=event.target.closest("[data-quick-category]");
    if(!button)return;
    category=button.dataset.quickCategory||"Pessoal";
    renderCategories();
  });
  save.addEventListener("click",add);
  mic?.addEventListener("click",toggleSpeech);

  list.addEventListener("click",event=>{
    const row=event.target.closest("[data-quick-id]");
    if(!row)return;
    const item=state.registros.find(entry=>entry.id===row.dataset.quickId);
    if(!item)return;
    if(event.target.closest("[data-quick-edit]"))edit(item);
    if(event.target.closest("[data-quick-delete]"))remove(item);
  });

  try{
    setSync("Carregando…");
    const loaded=await C.read(KEY,{versao:1,registros:[]});
    state={
      versao:1,
      registros:Array.isArray(loaded?.registros)?loaded.registros:[],
      atualizadoEm:loaded?.atualizadoEm||""
    };
    renderCategories();
    renderHistory();
    setSync("Supabase","saved");
  }catch(error){
    setSync("Erro","error");
    list.innerHTML=`<div class="quick-journal-empty">${C.esc(error.message||"Não foi possível carregar seus registros.")}</div>`;
  }

  if(!Recognition()&&micStatus){
    micStatus.textContent="Este navegador não oferece transcrição direta. No iPhone, use o microfone do teclado.";
  }
})().catch(error=>{
  console.error(error);
  window.MMCDUI?.toast?.(error.message||"Não foi possível abrir o Registro rápido.",4500);
});
