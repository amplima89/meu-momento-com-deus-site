"use strict";
window.MemoryCare = window.MemoryCare || (()=>{
  const BUILD="MEMORY_CARE_BUILD_20260815";
  const esc=value=>window.MMCDUI?.esc?.(value) ?? String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const pad=n=>String(n).padStart(2,"0");
  const iso=date=>`${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}`;
  const parse=value=>{const d=new Date(`${value}T12:00:00`);return Number.isNaN(d.getTime())?null:d};
  const today=()=>{const d=new Date();d.setHours(12,0,0,0);return d};
  const daysBetween=(a,b)=>{const da=typeof a==="string"?parse(a):a;const db=typeof b==="string"?parse(b):b;if(!da||!db)return null;return Math.round((db-da)/86400000)};
  const addDays=(date,days)=>{const d=new Date(date);d.setDate(d.getDate()+days);return d};
  const range=(days,end=today())=>Array.from({length:days},(_,i)=>iso(addDays(end,-(days-1-i))));
  const clamp=(value,min=0,max=100)=>Math.max(min,Math.min(max,Number(value)||0));
  const normalizeName=value=>String(value||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
  const uuid=()=>crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const ready=async()=>{
    if(window.MemoryConfig)return window.MemoryConfig;
    if(window.MemoryConfigReady)return await window.MemoryConfigReady;
    throw new Error("Configurações do Memory ainda não estão disponíveis.");
  };
  const CARE_RELATIONS={
    memory_oracoes_v1:["spiritual","relationships","memories"],
    memory_circulo_cuidado_v1:["relationships"],
    memory_boas_acoes_v1:["relationships","development","memories"],
    memory_testemunhos_v1:["spiritual","memories"],
    memory_aniversarios_v1:["relationships","memories"],
    diario_rapido_v1:["spiritual","body","mind","relationships","development","memories"]
  };
  const CARE_REVISION_KEY="memory:care-map-revision";
  const read=async(key,fallback)=>{const cfg=await ready();return await cfg.read(key,fallback)};
  function relationDimensions(key){return [...(CARE_RELATIONS[key]||[])]}
  function careItemCount(value){
    if(Array.isArray(value?.itens))return value.itens.length;
    if(Array.isArray(value?.registros))return value.registros.length;
    return 0;
  }
  function notifyMap(key,value,action="write"){
    const dimensions=relationDimensions(key);
    if(!dimensions.length)return null;
    const detail={
      source:key,
      action,
      dimensions,
      count:careItemCount(value),
      at:new Date().toISOString(),
      revision:`${Date.now()}-${Math.random().toString(16).slice(2)}`
    };
    try{localStorage.setItem(CARE_REVISION_KEY,JSON.stringify(detail))}catch{}
    try{window.dispatchEvent(new CustomEvent("memory:care-changed",{detail}))}catch{}
    try{
      const channel=new BroadcastChannel("memory-care");
      channel.postMessage(detail);
      channel.close();
    }catch{}
    return detail;
  }
  const write=async(key,value)=>{
    const cfg=await ready();
    const result=await cfg.write(key,value);
    notifyMap(key,value,"write");
    return result;
  };
  const toast=(message,duration)=>window.MMCDUI?.toast?.(message,duration);
  const status=(el,message,type="")=>{if(!el)return;el.textContent=message||"";el.className=`memory-care-status${type?` is-${type}`:""}`};
  const fmtDate=value=>{const d=parse(value);return d?d.toLocaleDateString("pt-BR",{day:"2-digit",month:"short",year:"numeric"}):"—"};
  const fmtShort=value=>{const d=parse(value);return d?d.toLocaleDateString("pt-BR",{day:"2-digit",month:"2-digit"}):"—"};
  async function language(){
    const local=localStorage.getItem("memory:ui-language")||localStorage.getItem("memory:language")||"pt-BR";
    try{
      const value=await read("memory_idioma_v1",{idioma:local});
      const lang=String(value?.idioma||value?.language||local).toLowerCase();
      return lang.startsWith("en")?"en":"pt-BR";
    }catch{return String(local).toLowerCase().startsWith("en")?"en":"pt-BR"}
  }
  return {BUILD,esc,iso,parse,today,daysBetween,addDays,range,clamp,normalizeName,uuid,read,write,toast,status,fmtDate,fmtShort,language,CARE_RELATIONS,CARE_REVISION_KEY,relationDimensions,notifyMap};
})();
