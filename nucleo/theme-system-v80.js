"use strict";

window.MMCDTheme = (() => {
  const db = window.MMCDSupabase;
  const USER_PREF_KEY = "tema_visual_v1";
  const SYSTEM_KEY = "temas_habilitados_v1";
  const USER_ENABLED_KEY = "temas_habilitados_usuario_v1";
  const LOCAL_ENABLED_KEY = "mmcd:themes:enabled";
  const LOCAL_THEME_KEY = "mmcd:tema";
  const REMOTE_SYNC_MIN_MS = 5000;
  const DEFAULT_THEME = "memory-original";
  const OFFICIAL_MIGRATION_KEY = "memory:official-theme:v80";

  const catalog = [
    {id:"memory-original",label:"Memory Oficial",short:"Oficial",swatch:"#A78BFA",surface:"#000717",dark:true,themeColor:"#000717",official:true},
    {id:"claro",label:"Branco + azul",short:"Azul",swatch:"#2563eb",surface:"#ffffff",dark:false,themeColor:"#f6f7f9"},
    {id:"azul",label:"Azul profundo",short:"Azul",swatch:"#2f6fed",surface:"#dce9ff",dark:false,themeColor:"#e8f1ff"},
    {id:"rosa",label:"Rosa claro",short:"Rosa",swatch:"#c85b8e",surface:"#fff8fb",dark:false,themeColor:"#fff3f8"},
    {id:"verde",label:"Verde claro",short:"Verde",swatch:"#2f8f6b",surface:"#f7fcf9",dark:false,themeColor:"#eef8f2"},
    {id:"laranja",label:"Laranja suave",short:"Laranja",swatch:"#d66a24",surface:"#fffaf5",dark:false,themeColor:"#fff5e9"},
    {id:"marsala",label:"Marsala",short:"Marsala",swatch:"#8f4156",surface:"#fff8fa",dark:false,themeColor:"#f8eef1"},
    {id:"azul-bebe",label:"Azul bebê",short:"Azul bebê",swatch:"#4d9fd8",surface:"#f7fcff",dark:false,themeColor:"#edf8ff"},
    {id:"lavanda",label:"Lavanda",short:"Lavanda",swatch:"#7c69b8",surface:"#fcfaff",dark:false,themeColor:"#f5f1ff"},
    {id:"areia",label:"Areia",short:"Areia",swatch:"#a67642",surface:"#fffdf9",dark:false,themeColor:"#f8f2e8"},
    {id:"turquesa",label:"Turquesa suave",short:"Turquesa",swatch:"#248d91",surface:"#f7fdfd",dark:false,themeColor:"#eaf8f7"},
    {id:"escuro",label:"Grafite + azul",short:"Escuro",swatch:"#6ea1ff",surface:"#13151a",dark:true,themeColor:"#0b0c0f"}
  ];

  const state = {
    user:null,
    enabled:catalog.map(x=>x.id),
    current:DEFAULT_THEME,
    admin:false,
    systemStorage:false,
    initialized:false,
    activePage:"",
    lastRemoteSync:0,
    remoteSyncBound:false
  };

  const esc = value => window.MMCDUI?.esc ? window.MMCDUI.esc(value) : String(value ?? "").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const validTheme = id => catalog.some(x=>x.id===id);
  const uniqValid = ids => [...new Set((Array.isArray(ids)?ids:[]).filter(validTheme))];
  const withOfficial = ids => [DEFAULT_THEME, ...uniqValid(ids).filter(id=>id!==DEFAULT_THEME)];
  const theme = id => catalog.find(x=>x.id===id) || catalog[0];

  function readLocalEnabled(){
    try{
      const parsed=JSON.parse(localStorage.getItem(LOCAL_ENABLED_KEY)||"null");
      const ids=uniqValid(parsed);
      return ids.length ? withOfficial(ids) : catalog.map(x=>x.id);
    }catch{return catalog.map(x=>x.id);}
  }

  function apply(id,{persistLocal=true}={}){
    let next=validTheme(id)?id:DEFAULT_THEME;
    if(state.enabled.length && !state.enabled.includes(next)) next=state.enabled[0];
    state.current=next;
    document.documentElement.dataset.tema=next;
    document.body?.classList.toggle("tema-escuro",theme(next).dark);
    if(persistLocal){
      localStorage.setItem(LOCAL_THEME_KEY,next);
      localStorage.setItem("tema-livro",next);
    }
    const meta=document.querySelector('meta[name="theme-color"]');
    if(meta) meta.setAttribute("content",theme(next).themeColor);
    document.querySelectorAll("#theme-toggle").forEach(btn=>{
      btn.textContent="🎨";
      btn.setAttribute("aria-label",`Tema atual: ${theme(next).label}. Escolher outro tema`);
      btn.title=`Tema: ${theme(next).label}`;
    });
    return next;
  }

  async function fetchRemoteUserPreference(){
    if(!db || !state.user) return null;
    const {data,error}=await db.from("configuracoes_usuario")
      .select("valor")
      .eq("user_id",state.user.id)
      .eq("chave",USER_PREF_KEY)
      .maybeSingle();
    if(error) throw error;
    const id=data?.valor?.tema;
    return validTheme(id) ? id : null;
  }

  async function loadUserPreference(){
    const local=localStorage.getItem(LOCAL_THEME_KEY)||DEFAULT_THEME;
    if(!db || !state.user) return local;
    try{
      return (await fetchRemoteUserPreference()) || local;
    }catch(error){
      console.warn("Temas: preferência remota indisponível.",error);
      return local;
    }
  }

  async function saveUserPreference(id){
    if(!db || !state.user) return false;
    const valor={tema:id,atualizadoEm:new Date().toISOString()};

    // Atualiza primeiro para não depender exclusivamente de índice/ON CONFLICT.
    const updated=await db.from("configuracoes_usuario")
      .update({valor})
      .eq("user_id",state.user.id)
      .eq("chave",USER_PREF_KEY)
      .select("user_id,chave");
    if(updated.error) throw updated.error;
    if(Array.isArray(updated.data) && updated.data.length) return true;

    const inserted=await db.from("configuracoes_usuario").insert({
      user_id:state.user.id,
      chave:USER_PREF_KEY,
      valor
    });
    if(!inserted.error) return true;

    // Se outro dispositivo criou a linha entre o UPDATE e o INSERT, tenta atualizar novamente.
    const retry=await db.from("configuracoes_usuario")
      .update({valor})
      .eq("user_id",state.user.id)
      .eq("chave",USER_PREF_KEY);
    if(retry.error) throw retry.error;
    return true;
  }

  async function syncThemeFromRemote({force=false}={}){
    if(!db || !state.user) return false;
    const now=Date.now();
    if(!force && now-state.lastRemoteSync<REMOTE_SYNC_MIN_MS) return false;
    state.lastRemoteSync=now;
    try{
      const remote=await fetchRemoteUserPreference();
      if(!remote) return false;
      if(remote!==state.current){
        apply(remote);
        renderPicker();
      }
      return true;
    }catch(error){
      console.warn("Temas: não foi possível atualizar a preferência entre dispositivos.",error);
      return false;
    }
  }

  function bindRemoteSync(){
    if(state.remoteSyncBound) return;
    state.remoteSyncBound=true;
    document.addEventListener("visibilitychange",()=>{
      if(document.visibilityState==="visible") syncThemeFromRemote({force:true});
    });
    window.addEventListener("pageshow",()=>syncThemeFromRemote({force:true}));
    window.addEventListener("focus",()=>syncThemeFromRemote());
  }

  async function detectAdmin(){
    // Enquanto o projeto possui uma única conta, o usuário autenticado administra
    // o próprio catálogo sem depender de tabelas administrativas adicionais.
    return !!state.user;
  }

  async function loadEnabled(){
    state.systemStorage=false;
    if(db && state.user){
      try{
        const {data,error}=await db.from("configuracoes_usuario")
          .select("valor")
          .eq("user_id",state.user.id)
          .eq("chave",USER_ENABLED_KEY)
          .maybeSingle();
        if(error) throw error;
        const ids=uniqValid(data?.valor?.enabled);
        if(ids.length){
          state.systemStorage=true;
          return withOfficial(ids);
        }
      }catch(error){
        console.info("Temas: catálogo da conta indisponível; usando catálogo local.");
      }
    }
    return withOfficial(readLocalEnabled());
  }

  async function init({active=""}={}){
    if(state.initialized){
      bindThemeButtons();
      return state;
    }
    state.activePage=active;
    // Aplica imediatamente a preferência local para evitar troca visual tardia.
    state.enabled=withOfficial(readLocalEnabled());
    apply(localStorage.getItem(LOCAL_THEME_KEY)||DEFAULT_THEME,{persistLocal:false});

    try{
      const session=await window.MMCDAuth?.requireSession?.();
      state.user=session?.user||null;
    }catch(error){
      console.warn("Temas: sessão indisponível.",error);
    }

    state.admin=await detectAdmin();
    state.enabled=withOfficial(await loadEnabled());
    localStorage.setItem(LOCAL_ENABLED_KEY,JSON.stringify(state.enabled));

    const firstOfficialRun=localStorage.getItem(OFFICIAL_MIGRATION_KEY)!=="1";
    if(firstOfficialRun){
      apply(DEFAULT_THEME);
      localStorage.setItem(OFFICIAL_MIGRATION_KEY,"1");
      try{ await saveUserPreference(DEFAULT_THEME); }catch(error){ console.info("Memory Original: sincronização inicial pendente.",error); }
    }else{
      const remoteTheme=await loadUserPreference();
      apply(remoteTheme);
    }
    state.lastRemoteSync=Date.now();
    bindThemeButtons();
    bindRemoteSync();
    state.initialized=true;
    return state;
  }

  async function setTheme(id){
    const next=apply(id);
    let synced=false;
    try{
      synced=await saveUserPreference(next);
      if(synced) state.lastRemoteSync=Date.now();
    }catch(error){
      console.warn("Temas: não foi possível sincronizar a preferência.",error);
      window.MMCDUI?.toast?.("Tema aplicado neste aparelho, mas a sincronização entre dispositivos falhou.",3600);
    }
    closePicker();
    return next;
  }

  async function saveEnabled(ids){
    const next=withOfficial(ids);
    if(!next.length) throw new Error("Mantenha pelo menos um tema habilitado.");
    state.enabled=next;
    localStorage.setItem(LOCAL_ENABLED_KEY,JSON.stringify(next));

    let savedGlobal=false;
    if(db && state.user){
      try{
        const valor={enabled:next,atualizadoEm:new Date().toISOString()};
        const updated=await db.from("configuracoes_usuario")
          .update({valor})
          .eq("user_id",state.user.id)
          .eq("chave",USER_ENABLED_KEY)
          .select("user_id,chave");
        if(updated.error) throw updated.error;
        if(!Array.isArray(updated.data) || !updated.data.length){
          const inserted=await db.from("configuracoes_usuario").insert({
            user_id:state.user.id,
            chave:USER_ENABLED_KEY,
            valor
          });
          if(inserted.error) throw inserted.error;
        }
        state.systemStorage=true;
        savedGlobal=true;
      }catch(error){
        console.info("Temas: sincronização do catálogo da conta indisponível; mantendo configuração local.",error);
      }
    }

    if(!state.enabled.includes(state.current)) await setTheme(state.enabled[0]);
    else renderPicker();
    return {savedGlobal,enabled:[...state.enabled]};
  }

  function closePicker(){
    document.querySelector("#mmcd-theme-picker")?.remove();
  }

  function renderPicker(){
    closePicker();
    const buttons=state.enabled.map(id=>{
      const item=theme(id);
      return `<button type="button" class="theme-picker__option ${state.current===id?"active":""}" data-theme-choice="${esc(id)}">
        <span class="theme-picker__swatch" style="--theme-swatch:${esc(item.swatch)};--theme-surface:${esc(item.surface)}"></span>
        <span><strong>${esc(item.label)}</strong><small>${state.current===id?"Em uso":"Aplicar tema"}</small></span>
        <b>${state.current===id?"✓":""}</b>
      </button>`;
    }).join("");
    const picker=document.createElement("div");
    picker.id="mmcd-theme-picker";
    picker.className="theme-picker";
    picker.innerHTML=`<div class="theme-picker__head"><div><strong>Aparência</strong><small>Escolha sua paleta</small></div><button type="button" data-theme-close aria-label="Fechar">×</button></div><div class="theme-picker__list">${buttons}</div>`;
    document.body.append(picker);
    picker.querySelectorAll("[data-theme-choice]").forEach(btn=>btn.addEventListener("click",()=>setTheme(btn.dataset.themeChoice)));
    picker.querySelector("[data-theme-close]")?.addEventListener("click",closePicker);
  }

  function bindThemeButtons(){
    document.querySelectorAll("#theme-toggle").forEach(btn=>{
      btn.textContent="🎨";
      btn.onclick=event=>{
        event.stopPropagation();
        if(document.querySelector("#mmcd-theme-picker")) closePicker();
        else renderPicker();
      };
    });
    if(!document.documentElement.dataset.themeOutsideBound){
      document.documentElement.dataset.themeOutsideBound="1";
      document.addEventListener("click",event=>{
        const picker=document.querySelector("#mmcd-theme-picker");
        if(picker && !picker.contains(event.target) && !event.target.closest("#theme-toggle")) closePicker();
      });
    }
  }

  function isDark(id=state.current){ return !!theme(id).dark; }
  function getCatalog(){ return catalog.map(x=>({...x})); }
  function getEnabled(){ return [...state.enabled]; }
  function getCurrent(){ return state.current; }
  function isAdmin(){ return !!state.admin; }
  function governanceMode(){ return state.systemStorage ? "account" : "local"; }
  function getOfficialTheme(){ return DEFAULT_THEME; }

  // Pré-aplicação síncrona para páginas que carregam o shell depois do CSS.
  state.enabled=withOfficial(readLocalEnabled());
  apply(localStorage.getItem(LOCAL_THEME_KEY)||DEFAULT_THEME,{persistLocal:false});

  return {init,apply,setTheme,saveEnabled,syncThemeFromRemote,bindThemeButtons,getCatalog,getEnabled,getCurrent,isAdmin,isDark,governanceMode,getOfficialTheme};
})();
