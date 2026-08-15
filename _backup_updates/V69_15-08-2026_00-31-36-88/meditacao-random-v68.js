"use strict";

(async()=>{
  const LINKS_KEY="memory_meditacao_links_v1";
  const PICK_KEY="memory_meditacao_selecao_v1";
  if(window.MemoryConfigReady)await window.MemoryConfigReady;
  const config=window.MemoryConfig;
  if(!config)return;

  function youtubeId(url){
    try{
      const u=new URL(url);
      const host=u.hostname.toLowerCase();
      if(host.includes("youtu.be"))return u.pathname.split("/").filter(Boolean)[0]||"";
      if(host.includes("youtube.com")){
        if(u.pathname.startsWith("/embed/"))return u.pathname.split("/")[2]||"";
        if(u.pathname.startsWith("/shorts/"))return u.pathname.split("/")[2]||"";
        return u.searchParams.get("v")||"";
      }
    }catch{}
    return "";
  }

  function selectedMeditationDate(){
    const stored=localStorage.getItem("ultima-data-lida")||"";
    return /^\d{4}-\d{2}-\d{2}$/.test(stored)?stored:new Date().toISOString().slice(0,10);
  }

  function previousDate(iso){
    const date=new Date(`${iso}T12:00:00`);date.setDate(date.getDate()-1);
    return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
  }

  function randomItem(items){
    if(items.length<=1)return items[0]||null;
    try{const n=crypto.getRandomValues(new Uint32Array(1))[0];return items[n%items.length];}catch{return items[Math.floor(Math.random()*items.length)];}
  }

  function renderLink(item){
    const box=document.querySelector(".music-box");if(!box||!item)return;
    const iframe=box.querySelector(".youtube-player");const link=box.querySelector(".music-box__link");
    let title=box.querySelector(".memory-meditation-link-title");
    if(!title){title=document.createElement("strong");title.className="memory-meditation-link-title";const intro=box.querySelector(".muted")?.parentElement;intro?.append(title);}
    title.textContent=item.titulo;
    const id=youtubeId(item.url);
    if(id&&iframe){
      iframe.hidden=false;iframe.src=`https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?rel=0&loop=1&playlist=${encodeURIComponent(id)}&playsinline=1`;iframe.title=item.titulo;
      if(link){link.href=item.url;link.textContent="Abrir no YouTube ↗";link.hidden=false;}
    }else{
      if(iframe)iframe.hidden=true;
      if(link){link.href=item.url;link.textContent="Abrir conteúdo ↗";link.hidden=false;}
    }
    if(!document.querySelector("#memory-meditation-link-v68-style")){
      const style=document.createElement("style");style.id="memory-meditation-link-v68-style";style.textContent=".memory-meditation-link-title{display:block;margin-top:9px;font-size:.82rem;line-height:1.35;color:var(--text)}";document.head.append(style);
    }
  }

  let linksState;
  let picksState;
  async function ensureState(){
    linksState=linksState||await config.read(LINKS_KEY,{versao:1,itens:[]});
    picksState=picksState||await config.read(PICK_KEY,{versao:1,porData:{}});
    picksState={versao:1,porData:{...(picksState?.porData||{})}};
  }

  async function apply(){
    await ensureState();
    const active=(Array.isArray(linksState?.itens)?linksState.itens:[]).filter(item=>item?.ativo!==false&&item?.url);
    if(!active.length)return;
    const date=selectedMeditationDate();
    let chosen=active.find(item=>item.id===picksState.porData[date])||null;
    if(!chosen){
      const previousId=picksState.porData[previousDate(date)]||"";
      const candidates=active.length>1?active.filter(item=>item.id!==previousId):active;
      chosen=randomItem(candidates.length?candidates:active);
      if(chosen){
        picksState.porData[date]=chosen.id;
        const ordered=Object.keys(picksState.porData).sort().slice(-120);
        picksState.porData=Object.fromEntries(ordered.map(key=>[key,picksState.porData[key]]));
        config.write(PICK_KEY,{...picksState,atualizadoEm:new Date().toISOString()}).catch(error=>console.warn("Memory: não foi possível salvar o sorteio da meditação.",error));
      }
    }
    renderLink(chosen);
  }

  const selector=document.querySelector("#seletor-data");
  selector?.addEventListener("change",()=>setTimeout(apply,20));
  const dateLabel=document.querySelector("#data-meditacao");
  if(dateLabel){
    const observer=new MutationObserver(()=>setTimeout(()=>apply().catch(error=>console.warn("Memory: link da meditação indisponível.",error)),20));
    observer.observe(dateLabel,{childList:true,subtree:true,characterData:true});
  }
  let attempts=0;
  const wait=setInterval(()=>{
    attempts+=1;
    const ready=document.querySelector("#data-meditacao")?.textContent&&!/carregando/i.test(document.querySelector("#data-meditacao")?.textContent||"");
    if(ready||attempts>20){clearInterval(wait);apply().catch(error=>console.warn("Memory: link da meditação indisponível.",error));}
  },180);
})().catch(error=>console.warn("Memory: seleção de conteúdo da meditação indisponível.",error));
