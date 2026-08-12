"use strict";

window.MMCDTheme = (() => {
  const db = window.MMCDSupabase;
  const USER_PREF_KEY = "tema_visual_v1";
  const SYSTEM_KEY = "temas_habilitados_v1";
  const LOCAL_ENABLED_KEY = "mmcd:themes:enabled";
  const LOCAL_THEME_KEY = "mmcd:tema";

  const catalog = [
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
    current:"claro",
    admin:false,
    systemStorage:false,
    initialized:false,
    activePage:""
  };

  const esc = value => window.MMCDUI?.esc ? window.MMCDUI.esc(value) : String(value ?? "").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const validTheme = id => catalog.some(x=>x.id===id);
  const uniqValid = ids => [...new Set((Array.isArray(ids)?ids:[]).filter(validTheme))];
  const theme = id => catalog.find(x=>x.id===id) || catalog[0];

  function readLocalEnabled(){
    try{
      const parsed=JSON.parse(localStorage.getItem(LOCAL_ENABLED_KEY)||"null");
      const ids=uniqValid(parsed);
      return ids.length ? ids : catalog.map(x=>x.id);
    }catch{return catalog.map(x=>x.id);}
  }

  function apply(id,{persistLocal=true}={}){
    let next=validTheme(id)?id:"claro";
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

  async function loadUserPreference(){
    if(!db || !state.user) return localStorage.getItem(LOCAL_THEME_KEY)||"claro";
    try{
      const {data,error}=await db.from("configuracoes_usuario")
        .select("valor")
        .eq("user_id",state.user.id)
        .eq("chave",USER_PREF_KEY)
        .maybeSingle();
      if(error) throw error;
      return data?.valor?.tema || localStorage.getItem(LOCAL_THEME_KEY) || "claro";
    }catch(error){
      console.warn("Temas: preferência remota indisponível.",error);
      return localStorage.getItem(LOCAL_THEME_KEY)||"claro";
    }
  }

  async function saveUserPreference(id){
    if(!db || !state.user) return;
    const {error}=await db.from("configuracoes_usuario").upsert({
      user_id:state.user.id,
      chave:USER_PREF_KEY,
      valor:{tema:id,atualizadoEm:new Date().toISOString()}
    },{onConflict:"user_id,chave"});
    if(error) throw error;
  }

  async function detectAdmin(){
    if(!db || !state.user) return false;
    try{
      let {data,error}=await db.from("mmcd_administradores")
        .select("user_id")
        .eq("user_id",state.user.id)
        .maybeSingle();
      if(error) throw error;
      if(data?.user_id) return true;

      // Em uma instalação nova, somente a página de Configurações tenta assumir o primeiro administrador.
      if(state.activePage==="treinos-config"){
        const claim=await db.rpc("mmcd_claim_first_admin");
        if(!claim.error && claim.data===true) return true;
      }
      return false;
    }catch(error){
      // Compatibilidade com a instalação atual, que ainda não possui as tabelas de governança.
      console.info("Temas: governança global ainda não instalada; usando modo compatível.");
      return state.activePage==="treinos-config";
    }
  }

  async function loadEnabled(){
    state.systemStorage=false;
    if(db && state.user){
      try{
        const {data,error}=await db.from("mmcd_configuracoes_sistema")
          .select("valor")
          .eq("chave",SYSTEM_KEY)
          .maybeSingle();
        if(error) throw error;
        state.systemStorage=true;
        const ids=uniqValid(data?.valor?.enabled);
        if(ids.length) return ids;
      }catch(error){
        console.info("Temas: catálogo compartilhado indisponível; usando catálogo local.");
      }
    }
    return readLocalEnabled();
  }

  async function init({active=""}={}){
    if(state.initialized){
      bindThemeButtons();
      return state;
    }
    state.activePage=active;
    // Aplica imediatamente a preferência local para evitar troca visual tardia.
    state.enabled=readLocalEnabled();
    apply(localStorage.getItem(LOCAL_THEME_KEY)||"claro",{persistLocal:false});

    try{
      const session=await window.MMCDAuth?.requireSession?.();
      state.user=session?.user||null;
    }catch(error){
      console.warn("Temas: sessão indisponível.",error);
    }

    state.admin=await detectAdmin();
    state.enabled=await loadEnabled();
    localStorage.setItem(LOCAL_ENABLED_KEY,JSON.stringify(state.enabled));
    const remoteTheme=await loadUserPreference();
    apply(remoteTheme);
    bindThemeButtons();
    state.initialized=true;
    return state;
  }

  async function setTheme(id){
    const next=apply(id);
    try{await saveUserPreference(next);}catch(error){console.warn("Temas: não foi possível sincronizar a preferência.",error);}
    closePicker();
    return next;
  }

  async function saveEnabled(ids){
    const next=uniqValid(ids);
    if(!next.length) throw new Error("Mantenha pelo menos um tema habilitado.");
    state.enabled=next;
    localStorage.setItem(LOCAL_ENABLED_KEY,JSON.stringify(next));

    let savedGlobal=false;
    if(db && state.user && state.admin){
      try{
        const {error}=await db.from("mmcd_configuracoes_sistema").upsert({
          chave:SYSTEM_KEY,
          valor:{enabled:next,atualizadoEm:new Date().toISOString()},
          atualizado_por:state.user.id,
          atualizado_em:new Date().toISOString()
        },{onConflict:"chave"});
        if(error) throw error;
        state.systemStorage=true;
        savedGlobal=true;
      }catch(error){
        console.info("Temas: salvamento global indisponível; mantendo configuração local.");
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
  function governanceMode(){ return state.systemStorage ? "global" : "local"; }

  // Pré-aplicação síncrona para páginas que carregam o shell depois do CSS.
  state.enabled=readLocalEnabled();
  apply(localStorage.getItem(LOCAL_THEME_KEY)||"claro",{persistLocal:false});

  return {init,apply,setTheme,saveEnabled,bindThemeButtons,getCatalog,getEnabled,getCurrent,isAdmin,isDark,governanceMode};
})();
